-- Epic Team · SLA, cronometru pornit/oprit, solicitant vs agent.
-- Rulează după 0003_program.sql.

-- ───────────────────────── Cronometru ─────────────────────────
-- Un singur cronometru pornit pe om, garantat de cheia primară: nu de cod.
-- Adevărul stă pe server, nu în browser, ca să supraviețuiască închiderii
-- paginii, reîncărcării sau trecerii pe telefon. La oprire, rândul se șterge
-- și minutele se scriu în time_entries, adică exact acolo unde ajung și
-- minutele introduse manual — rapoartele nu trebuie să știe de unde vin.

create table public.timers (
  profile_id  uuid primary key references public.profiles(id) on delete cascade,
  ticket_id   bigint not null references public.tickets(id) on delete cascade,
  started_at  timestamptz not null default now()
);
create index timers_ticket_idx on public.timers (ticket_id);

-- ───────────────────────── SLA ─────────────────────────
-- Termenele se țin pe prioritate, într-un tabel și nu în cod, ca adminul să le
-- poată schimba din aplicație fără deploy.
--
-- Minutele se numără în timp calendaristic, nu în ore de program. E o alegere
-- deliberată pentru prima versiune: numărarea pe programul fiecărui om
-- (profiles.schedule) ar fi mai corectă, dar răspunsul la „cât mai am" ar
-- depinde atunci de cine se uită, iar un tichet urgent deschis vineri seara ar
-- arăta verde până luni. Dacă se dovedește că deranjează, se schimbă aici fără
-- să umble nimeni la interfață.

create table public.sla_policies (
  priority       text primary key check (priority in ('urgent', 'normal', 'scazut')),
  response_mins  int not null check (response_mins between 5 and 100000),
  resolve_mins   int not null check (resolve_mins between 5 and 1000000)
);

insert into public.sla_policies (priority, response_mins, resolve_mins) values
  ('urgent',  120,    480),     -- răspuns 2h, rezolvare 8h
  ('normal',  480,   4320),     -- răspuns 8h, rezolvare 3 zile
  ('scazut', 1440,  10080);     -- răspuns 24h, rezolvare 7 zile

-- Momentele față de care se măsoară. Ambele se completează din triggere, ca să
-- fie corecte oricum ar fi atins tichetul — din interfață, din cron sau direct
-- din SQL.
alter table public.tickets
  add column first_response_at timestamptz,
  add column resolved_at       timestamptz;

-- Primul răspuns = primul comentariu al altcuiva decât solicitantul. Un
-- comentariu al solicitantului pe propriul tichet nu oprește ceasul.
create or replace function public.mark_first_response() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update tickets
     set first_response_at = now()
   where id = new.ticket_id
     and first_response_at is null
     and created_by is distinct from new.author_id;
  return new;
end $$;

create trigger comments_mark_first_response
  after insert on public.comments
  for each row execute function public.mark_first_response();

-- Rezolvat = momentul intrării în „gata". Dacă tichetul e redeschis, se
-- golește, ca SLA-ul de rezolvare să repornească în loc să rămână bifat.
create or replace function public.mark_resolved() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'gata' and old.status is distinct from 'gata' then
    new.resolved_at := now();
  elsif new.status <> 'gata' and old.status = 'gata' then
    new.resolved_at := null;
  end if;
  return new;
end $$;

-- BEFORE, și după trigger-ul de jurnal din 0002: numele începe cu „tickets_m",
-- iar Postgres execută triggerele în ordine alfabetică, deci „tickets_log_update"
-- rulează primul și tot el pune updated_at.
create trigger tickets_mark_resolved before update on public.tickets
  for each row execute function public.mark_resolved();

-- ───────────────────────── RLS ─────────────────────────

alter table public.timers       enable row level security;
alter table public.sla_policies enable row level security;

-- Cronometrul e al fiecăruia. Îl vede toată echipa (ca să se vadă cine lucrează
-- acum la ce), dar îl pornește și îl oprește doar omul lui.
create policy timers_select on public.timers for select using (public.is_member());
create policy timers_insert on public.timers for insert
  with check (public.is_member() and profile_id = auth.uid());
create policy timers_update on public.timers for update
  using (profile_id = auth.uid() and public.is_member()) with check (profile_id = auth.uid());
create policy timers_delete on public.timers for delete
  using (profile_id = auth.uid() or public.is_admin());

-- Termenele le citesc toți, le schimbă adminul.
create policy sla_select on public.sla_policies for select using (public.is_member());
create policy sla_admin on public.sla_policies for all
  using (public.is_admin()) with check (public.is_admin());
