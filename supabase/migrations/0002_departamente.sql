-- Epic Team — departamente, checklist, șabloane, tichete lunare, aprobare, ore lucrate, pagini de client.
-- Rulează după 0001_init.sql.

-- ───────────────────────── Departamente ─────────────────────────

create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  color       text not null default '#1FDC93',
  lead_id     uuid references public.profiles(id) on delete set null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
insert into public.departments (name, color) values
  ('Site', '#3CC4B4'),
  ('Social Media', '#E26C8A'),
  ('Video', '#E0A43A');

create table public.department_members (
  department_id  uuid not null references public.departments(id) on delete cascade,
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  primary key (department_id, profile_id)
);

alter table public.tickets add column department_id uuid references public.departments(id) on delete set null;
create index tickets_department_idx on public.tickets (department_id);

alter table public.clients
  add column drive_url text not null default '',
  add column notes     text not null default '';

-- ───────────────────────── Checklist ─────────────────────────

create table public.checklist_items (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   bigint not null references public.tickets(id) on delete cascade,
  body        text not null check (length(body) between 1 and 300),
  done        boolean not null default false,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index checklist_ticket_idx on public.checklist_items (ticket_id);

-- ───────────────────────── Șabloane ─────────────────────────

create table public.templates (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(name) between 1 and 80),
  title          text not null default '',
  description    text not null default '',
  type           text not null default 'altele'
                 check (type in ('website', 'seo', 'tracking', 'ads', 'design', 'continut', 'bug', 'altele')),
  priority       text not null default 'normal' check (priority in ('urgent', 'normal', 'scazut')),
  department_id  uuid references public.departments(id) on delete set null,
  checklist      text[] not null default '{}',
  created_by     uuid not null references public.profiles(id) default auth.uid(),
  created_at     timestamptz not null default now()
);

-- ───────────────────────── Tichete lunare ─────────────────────────
-- Cron-ul zilnic creează tichetul în ziua `day_of_month`, cu termen peste `due_days` zile.

create table public.recurring (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (length(title) between 1 and 200),
  description    text not null default '',
  client_id      uuid references public.clients(id) on delete set null,
  department_id  uuid references public.departments(id) on delete set null,
  assignee_id    uuid references public.profiles(id) on delete set null,
  type           text not null default 'altele'
                 check (type in ('website', 'seo', 'tracking', 'ads', 'design', 'continut', 'bug', 'altele')),
  priority       text not null default 'normal' check (priority in ('urgent', 'normal', 'scazut')),
  checklist      text[] not null default '{}',
  links          text[] not null default '{}',
  day_of_month   int not null check (day_of_month between 1 and 28),
  due_days       int not null default 5 check (due_days between 0 and 60),
  active         boolean not null default true,
  last_run       date,
  created_by     uuid not null references public.profiles(id) default auth.uid(),
  created_at     timestamptz not null default now()
);

-- ───────────────────────── Ore lucrate ─────────────────────────

create table public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   bigint not null references public.tickets(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) default auth.uid(),
  minutes     int not null check (minutes between 1 and 1440),
  note        text not null default '',
  spent_on    date not null default (now() at time zone 'Europe/Bucharest')::date,
  created_at  timestamptz not null default now()
);
create index time_ticket_idx on public.time_entries (ticket_id);
create index time_spent_idx on public.time_entries (spent_on);

-- ───────────────────────── Aprobare ─────────────────────────
-- Doar adminul sau șeful departamentului poate muta un tichet în „Gata".

create or replace function public.can_approve(dept uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from departments d join profiles p on p.id = d.lead_id
                 where d.id = dept and d.lead_id = auth.uid() and p.active);
$$;

create or replace function public.check_approval() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() e null doar pentru server (service role), ex. cron-ul.
  if new.status = 'gata' and old.status is distinct from 'gata'
     and auth.uid() is not null and not public.can_approve(new.department_id) then
    raise exception 'Doar adminul sau șeful de departament poate marca tichetul ca Gata.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger tickets_check_approval before update on public.tickets
  for each row execute function public.check_approval();

-- Jurnalul notează și schimbarea de departament.
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
  if new.department_id is distinct from old.department_id then
    insert into activity (ticket_id, actor_id, action, meta)
    values (new.id, auth.uid(), 'departament', jsonb_build_object('din', old.department_id, 'in', new.department_id));
  end if;
  return new;
end $$;

-- ───────────────────────── Row Level Security ─────────────────────────

alter table public.departments        enable row level security;
alter table public.department_members enable row level security;
alter table public.checklist_items    enable row level security;
alter table public.templates          enable row level security;
alter table public.recurring          enable row level security;
alter table public.time_entries       enable row level security;

create policy departments_select on public.departments for select using (public.is_member());
create policy departments_admin on public.departments for all
  using (public.is_admin()) with check (public.is_admin());

create policy dept_members_select on public.department_members for select using (public.is_member());
create policy dept_members_admin on public.department_members for all
  using (public.is_admin()) with check (public.is_admin());

create policy checklist_select on public.checklist_items for select using (public.is_member());
create policy checklist_insert on public.checklist_items for insert with check (public.is_member());
create policy checklist_update on public.checklist_items for update using (public.is_member()) with check (public.is_member());
create policy checklist_delete on public.checklist_items for delete using (public.is_member());

create policy templates_select on public.templates for select using (public.is_member());
create policy templates_insert on public.templates for insert
  with check (public.is_member() and created_by = auth.uid());
create policy templates_delete on public.templates for delete
  using (public.is_admin() or (public.is_member() and created_by = auth.uid()));

create policy recurring_select on public.recurring for select using (public.is_member());
create policy recurring_admin on public.recurring for all
  using (public.is_admin()) with check (public.is_admin());

create policy time_select on public.time_entries for select using (public.is_member());
create policy time_insert on public.time_entries for insert
  with check (public.is_member() and profile_id = auth.uid());
create policy time_delete on public.time_entries for delete
  using (public.is_admin() or (public.is_member() and profile_id = auth.uid()));

-- ───────────────────────── Brief (social / foto-video) ─────────────────────────
-- Structura e în aplicație (src/lib/brief.ts); aici doar JSON.

alter table public.tickets   add column brief jsonb;
alter table public.templates add column brief jsonb;
alter table public.recurring add column brief jsonb;

-- Cine primește „de aprobat": șeful departamentului (dacă există) plus adminii.
create or replace function public.approvers_for(dept uuid) returns table (id uuid, email text)
language sql stable security definer set search_path = public as $$
  select p.id, p.email from profiles p
  where p.active and public.is_member()
    and (p.role = 'admin' or p.id = (select lead_id from departments where departments.id = dept));
$$;
