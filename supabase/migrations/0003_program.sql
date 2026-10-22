-- Epic Team · Program de lucru pe om.
-- schedule = 7 zile, de luni la duminică; fiecare zi e ["09:00","17:00"] sau null (liber).

alter table public.profiles
  add column schedule jsonb not null
  default '[["09:00","17:00"],["09:00","17:00"],["09:00","17:00"],["09:00","17:00"],["09:00","17:00"],null,null]'::jsonb
  check (jsonb_typeof(schedule) = 'array' and jsonb_array_length(schedule) = 7);

-- Fiecare își poate schimba propriul program (politica profiles_update_self limitează la rândul lui).
grant update (schedule) on public.profiles to authenticated;
