-- Epic Team · tema fiecăruia și poza de profil.
-- Rulează după 0004_sla_timer.sql.

alter table public.profiles
  add column theme       text not null default 'dark' check (theme in ('dark', 'light')),
  add column avatar_path text not null default '';

-- Fiecare și le schimbă pe ale lui; politica profiles_update_self din 0001 l-a
-- limitat deja la propriul rând, iar `grant` alege exact ce coloane poate atinge.
grant update (theme, avatar_path) on public.profiles to authenticated;

-- ───────────────────────── Pozele ─────────────────────────
-- Bucket PRIVAT, nu public. O poză de profil e tot un dat personal, iar un
-- bucket public înseamnă o adresă care merge pentru oricine o are, la nesfârșit
-- și în afara echipei. Paginile sunt randate pe server oricum, așa că adresele
-- semnate nu costă nimic în plus: se cer în același loc în care se încarcă
-- oamenii.
--
-- 2 MB și doar formate de imagine: un avatar de 40px nu are nevoie de mai mult,
-- iar limita ține bucket-ul curat fără să fie nevoie de verificări în cod.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Fișierele stau în <uid>/<ceva>, iar politicile se uită la primul segment din
-- cale. Așa nimeni nu poate scrie peste poza altuia, fără să fie nevoie de o
-- coloană de proprietar și fără să ne bazăm pe `owner_id`, care rămâne corect
-- doar cât timp încărcarea trece prin clientul utilizatorului.
create policy "avatars read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.is_member());

create policy "avatars write own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and public.is_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars delete own" on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );
