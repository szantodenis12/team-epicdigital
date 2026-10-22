-- Epic Team — schema inițială
-- Rulează o singură dată în Supabase → SQL Editor (sau `supabase db push`).

-- ───────────────────────── Tabele ─────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        text not null default 'member' check (role in ('admin', 'member')),
  active      boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Invitațiile sunt scrise doar de server (service role). Trigger-ul de mai jos
-- citește rolul de aici, nu din metadata trimisă de utilizator.
create table public.invites (
  email       text primary key,
  full_name   text not null default '',
  role        text not null default 'member' check (role in ('admin', 'member')),
  invited_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.tickets (
  id           bigint generated always as identity primary key,
  title        text not null check (length(title) between 1 and 200),
  description  text not null default '',
  client_id    uuid references public.clients(id),
  type         text not null default 'altele'
               check (type in ('website', 'seo', 'tracking', 'ads', 'design', 'continut', 'bug', 'altele')),
  priority     text not null default 'normal' check (priority in ('urgent', 'normal', 'scazut')),
  status       text not null default 'nou' check (status in ('nou', 'lucru', 'review', 'gata', 'blocat')),
  assignee_id  uuid references public.profiles(id),
  created_by   uuid not null references public.profiles(id) default auth.uid(),
  deadline     date,
  links        text[] not null default '{}',
  reminded_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index tickets_status_idx on public.tickets (status);
create index tickets_assignee_idx on public.tickets (assignee_id);
create index tickets_deadline_idx on public.tickets (deadline);

create table public.ticket_files (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    bigint not null references public.tickets(id) on delete cascade,
  path         text not null unique,
  name         text not null,
  size         bigint not null default 0,
  mime         text not null default '',
  uploaded_by  uuid not null references public.profiles(id) default auth.uid(),
  created_at   timestamptz not null default now()
);
create index ticket_files_ticket_idx on public.ticket_files (ticket_id);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   bigint not null references public.tickets(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) default auth.uid(),
  body        text not null check (length(body) between 1 and 10000),
  created_at  timestamptz not null default now()
);
create index comments_ticket_idx on public.comments (ticket_id);

create table public.activity (
  id          bigint generated always as identity primary key,
  ticket_id   bigint not null references public.tickets(id) on delete cascade,
  actor_id    uuid references public.profiles(id),
  action      text not null,
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index activity_ticket_idx on public.activity (ticket_id);

-- ───────────────────────── Funcții ajutătoare ─────────────────────────

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active and role = 'admin');
$$;

-- Profil nou la crearea contului. Activ doar dacă există invitație.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv invites%rowtype;
begin
  select * into inv from invites where lower(email) = lower(new.email);
  insert into profiles (id, email, full_name, role, active)
  values (new.id, new.email, coalesce(inv.full_name, ''), coalesce(inv.role, 'member'), inv.email is not null);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Jurnal automat de modificări pe tichet.
create or replace function public.log_ticket_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into activity (ticket_id, actor_id, action) values (new.id, auth.uid(), 'creat');
    return new;
  end if;
  new.updated_at := now();
  if new.status is distinct from old.status then
    insert into activity (ticket_id, actor_id, action, meta)
    values (new.id, auth.uid(), 'status', jsonb_build_object('din', old.status, 'in', new.status));
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    insert into activity (ticket_id, actor_id, action, meta)
    values (new.id, auth.uid(), 'asignat', jsonb_build_object('din', old.assignee_id, 'in', new.assignee_id));
  end if;
  if new.deadline is distinct from old.deadline then
    insert into activity (ticket_id, actor_id, action, meta)
    values (new.id, auth.uid(), 'deadline', jsonb_build_object('din', old.deadline, 'in', new.deadline));
    new.reminded_at := null;
  end if;
  if new.priority is distinct from old.priority then
    insert into activity (ticket_id, actor_id, action, meta)
    values (new.id, auth.uid(), 'prioritate', jsonb_build_object('din', old.priority, 'in', new.priority));
  end if;
  return new;
end $$;

create trigger tickets_log_insert after insert on public.tickets
  for each row execute function public.log_ticket_change();
create trigger tickets_log_update before update on public.tickets
  for each row execute function public.log_ticket_change();

-- ───────────────────────── Row Level Security ─────────────────────────

alter table public.profiles     enable row level security;
alter table public.invites      enable row level security;
alter table public.clients      enable row level security;
alter table public.tickets      enable row level security;
alter table public.ticket_files enable row level security;
alter table public.comments     enable row level security;
alter table public.activity     enable row level security;

-- profiles: toți membrii activi se văd între ei; fiecare își vede propriul profil
-- (și când e dezactivat, ca aplicația să-i poată spune asta).
create policy profiles_select on public.profiles for select
  using (public.is_member() or id = auth.uid());
-- Membrii își pot schimba doar numele. Rolul și starea se schimbă din server (service role).
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid() and public.is_member()) with check (id = auth.uid());

-- invites: niciun acces din client (doar service role).

-- clients
create policy clients_select on public.clients for select using (public.is_member());
create policy clients_admin_write on public.clients for all
  using (public.is_admin()) with check (public.is_admin());

-- tickets
create policy tickets_select on public.tickets for select using (public.is_member());
create policy tickets_insert on public.tickets for insert
  with check (public.is_member() and created_by = auth.uid());
create policy tickets_update on public.tickets for update
  using (public.is_member()) with check (public.is_member());
create policy tickets_delete on public.tickets for delete
  using (public.is_admin() or (public.is_member() and created_by = auth.uid()));

-- ticket_files
create policy files_select on public.ticket_files for select using (public.is_member());
create policy files_insert on public.ticket_files for insert
  with check (public.is_member() and uploaded_by = auth.uid());
create policy files_delete on public.ticket_files for delete
  using (public.is_admin() or (public.is_member() and uploaded_by = auth.uid()));

-- comments
create policy comments_select on public.comments for select using (public.is_member());
create policy comments_insert on public.comments for insert
  with check (public.is_member() and author_id = auth.uid());
create policy comments_delete on public.comments for delete
  using (public.is_admin() or (public.is_member() and author_id = auth.uid()));

-- activity: doar citire (scrie trigger-ul).
create policy activity_select on public.activity for select using (public.is_member());
create policy activity_insert on public.activity for insert
  with check (public.is_member() and actor_id = auth.uid());

-- ───────────────────────── Storage ─────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('ticket-files', 'ticket-files', false, 52428800)
on conflict (id) do nothing;

create policy "ticket files read" on storage.objects for select to authenticated
  using (bucket_id = 'ticket-files' and public.is_member());
create policy "ticket files upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-files' and public.is_member());
create policy "ticket files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'ticket-files' and (public.is_admin() or owner_id = auth.uid()::text));
