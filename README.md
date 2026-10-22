# Epic Team

Platforma internă de tichete a Epic Digital Hub: **team.epicdigitalhub.ro**.

Cine cere ceva deschide un tichet: alege clientul, ce trebuie făcut, cine se ocupă și până când. Fișierele (zip, pdf, imagini, max 50 MB) se urcă direct pe tichet. Restul discuției se ține în comentariile tichetului.

- **Stack:** Next.js 16 (App Router) · Supabase (Auth, Postgres cu RLS, Storage) · Resend (email) · Vercel (hosting + cron)
- **Conturi:** doar prin invitație din pagina *Echipă*. Roluri: `admin` (gestionează echipa și clienții) și `member`.
- **Statusuri:** Nou → În lucru → Review → Gata, plus Blocat. Fiecare status își propune pașii următori ca butoane, pe tichet; meniul „Status" rămâne pentru sărituri neobișnuite.
- **SLA:** termene de răspuns și de rezolvare pe prioritate, schimbabile din `sla_policies` fără deploy. Se afișează un singur ceas, cel care contează: al răspunsului cât nu a răspuns nimeni, al rezolvării după aceea. Primul răspuns se marchează automat la primul comentariu al altcuiva decât solicitantul.
- **Timp lucrat:** cronometru pornit/oprit (starea stă pe server, deci merge mai departe dacă închizi pagina sau treci pe telefon) sau introdus de mână. Ambele ajung în `time_entries`.
- **Solicitant și agent:** cine a cerut (`created_by`) și cine lucrează (`assignee_id`), cu tab-urile „Cerute de mine" și „Ale mele".
- **Fiecare își alege:** tema (închis / deschis) și poza de profil, din *Cont*.

## Notificări pe email

| Când | Cine primește |
|---|---|
| Ți se atribuie un tichet | responsabilul |
| Comentariu nou | responsabilul + cine a deschis tichetul (fără autor) |
| Tichetul ajunge în Review sau Gata | cine a deschis tichetul |
| Rezumatul dimineții (~08:00 RO): întârziate, azi, mâine, de aprobat | fiecare om, doar dacă are ceva |
| Tichet trimis în Review | șeful departamentului (sau adminii) |
| @Prenume într-un comentariu | omul menționat |

Fără `RESEND_API_KEY` aplicația merge normal, doar că nu trimite emailuri; la invitații primești un link de copiat.

## Setup (o singură dată)

### 1. Supabase
1. Cont nou pe supabase.com → **New project** (regiune: Frankfurt, `eu-central-1`).
2. **SQL Editor** → lipește tot din `supabase/migrations/0001_init.sql` → Run. Apoi, în ordine, la fel cu `0002_departamente.sql`, `0003_program.sql`, `0004_sla_timer.sql` și `0005_tema_avatar.sql`.
3. **Authentication → Sign In / Providers → Email:** dezactivează **Allow new users to sign up** (conturile se fac doar prin invitație).
4. **Authentication → URL Configuration:** Site URL = `https://team.epicdigitalhub.ro`.
5. **Project Settings → API:** copiază `URL`, `anon` key și `service_role` key.

### 2. Vercel (contul lui Denis)
1. Import repo `epic-tickets` → framework Next.js, fără alte setări.
2. **Environment Variables:** toate din `.env.example` (`CRON_SECRET` = un șir lung aleator).
3. **Domains:** `team.epicdigitalhub.ro` → în DNS, record `CNAME team → cname.vercel-dns.com`.

### 3. Primul admin
```bash
cp .env.example .env.local   # completează cheile
npm install
node --env-file=.env.local scripts/create-admin.mjs roland@... "Roland Șipoș" 'parola-temporara'
```
Apoi intri pe site, schimbi parola din *Cont* și inviți restul echipei din *Echipă*.

Sau, ca să faci dintr-o dată conturile pentru Roland, Denis, Daria și Tiberiu (adrese @epicdigitalhub.ro, parole generate):
```bash
node --env-file=.env.local scripts/create-team.mjs
```
Parolele apar o singură dată în terminal. Trimite-le pe privat; fiecare și-o poate schimba din *Cont*.

### 4. Email (Resend)
1. resend.com → **Domains** → adaugă `epicdigitalhub.ro` → pune recordurile DNS cerute (SPF/DKIM).
2. **API Keys** → cheie nouă → `RESEND_API_KEY` în Vercel. `EMAIL_FROM` = `Epic Team <team@epicdigitalhub.ro>`.

## Dezvoltare locală

```bash
npm install
npx supabase start          # Supabase local în Docker; aplică migrările
cp .env.example .env.local  # pune URL + chei din `npx supabase status`
npm run dev
```

## Structură

```
supabase/migrations/   schema, RLS, storage
src/proxy.ts           sesiune + redirect la /login
src/app/(app)/         tablou, ale-mele, tichete, echipa, cont
src/app/actions/       server actions (tichete, echipă, cont)
src/app/api/cron/      zilnic: tichete lunare + rezumatul dimineții (Vercel Cron, vezi vercel.json)
src/lib/notify.ts      emailuri (Resend)
src/lib/sla.ts         termenele și ceasul afișat pe tichet
src/lib/colors.ts      tonurile generate din nume; valorile stau ca variabile CSS în globals.css, ca să se schimbe cu tema
```

**Două bucket-uri de storage, amândouă private:** `ticket-files` (50 MB/fișier) și `avatars` (2 MB, doar jpeg/png/webp). Pozele se servesc prin adrese semnate, generate la încărcarea paginii — o poză de profil e tot un dat personal, iar un bucket public ar însemna o adresă care merge pentru oricine o are.

## Limite plan gratuit Supabase
1 GB stocare, 50 MB per fișier, 50.000 utilizatori activi/lună. Proiectele gratuite se pun pe pauză după 7 zile fără activitate. Dacă echipa o folosește zilnic nu e problemă, altfel trecem pe Pro (25 $/lună, 100 GB).
