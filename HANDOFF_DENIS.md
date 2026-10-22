# Epic Team: handoff pentru Denis

21.10.2026 · de la Roland

Denis, ăsta e codul pentru platforma noastră internă de tichete. Trebuie pusă pe **team.epicdigitalhub.ro**, pe Vercel-ul tău. Merge local și e testată (27/27 teste pe RLS, storage și auth). N-a fost încă pusă online.

**Stack:** Next.js 16 (App Router, `src/proxy.ts` în loc de middleware) · Supabase (Auth, Postgres cu RLS, Storage) · Resend · Vercel Cron.

În zip nu sunt `node_modules`, `.next`, `.git` și `.env.local`. Rulezi `npm install` și pornești de la `.env.example`.

## Pașii

### 1. GitHub
Repo nou, privat, `epic-tickets`. Urci conținutul zip-ului. Fișierul cu parole **nu** intră în repo.

### 2. Supabase (regiune Frankfurt, `eu-central-1`)
1. Proiect nou.
2. SQL Editor: rulezi în ordine `supabase/migrations/0001_init.sql`, `0002_departamente.sql`, `0003_program.sql`.
3. Authentication → Email: **dezactivezi** „Allow new users to sign up”. Conturile se fac doar prin invitație.
4. Authentication → URL Configuration: Site URL = `https://team.epicdigitalhub.ro`.
5. Project Settings → API: iei `URL`, `anon` key și `service_role` key.

### 3. Vercel
1. Import repo, framework Next.js, fără alte setări.
2. Environment Variables, toate din `.env.example`:

| Variabilă | Valoare |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | din Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | din Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | din Supabase (doar pe server) |
| `NEXT_PUBLIC_SITE_URL` | `https://team.epicdigitalhub.ro` |
| `RESEND_API_KEY` | pasul 5; poate rămâne gol la început |
| `EMAIL_FROM` | `Epic Team <team@epicdigitalhub.ro>` |
| `CRON_SECRET` | un șir lung aleator (`openssl rand -hex 32`) |

3. Domains: `team.epicdigitalhub.ro`, iar în DNS `CNAME team → cname.vercel-dns.com`.
4. Cron-ul e deja în `vercel.json`: `/api/cron/zilnic` la 06:00 UTC. Face tichetele lunare și rezumatul de dimineață.

### 4. Conturile echipei
Roland îți trimite separat `ACCES_EPIC_TEAM.txt` (email + parolă pentru Roland, Denis, Daria, Tiberiu). Cu `.env.local` pe cheile de producție:

```bash
npm install
node --env-file=.env.local scripts/create-team.mjs /cale/catre/ACCES_EPIC_TEAM.txt
```

Scriptul face cele 4 conturi cu parolele din fișier (Roland admin, restul member) și adaugă cele 6 șabloane de pornire. Dacă îl rulezi fără fișier, generează parole noi și le afișează o singură dată. După rulare, fișierul cu parole se șterge de pe calculator.

### 5. Email (Resend)
1. resend.com → Domains → `epicdigitalhub.ro` → pui recordurile DNS (SPF/DKIM).
2. API Keys → cheie nouă → `RESEND_API_KEY` în Vercel → redeploy.

Fără cheie aplicația merge, doar că nu trimite emailuri. La invitații apare un link de copiat.

### 6. Verificare după deploy
- [ ] Login cu contul tău, pe desktop și pe telefon
- [ ] Tichet nou cu un zip atașat (max 50 MB), descărcare din alt cont
- [ ] Review → Gata se poate aproba doar de șeful de departament sau de admin
- [ ] Un cont `member` nu vede pagina Echipă cu drepturi de admin
- [ ] Endpoint-ul de cron dă 401 fără `CRON_SECRET`
- [ ] Email la atribuire (după ce e pus Resend)

## De stabilit cu Roland
- Cine intră în ce departament (Site / Social Media / Video) și cine e șef. Se setează din pagina Echipă după deploy.
- Dacă există deja căsuțele roland@ / denis@ / daria@ / tiberiu@epicdigitalhub.ro. Login-ul merge și fără ele, dar emailurile de notificare nu ajung.

## Limite plan gratuit Supabase
1 GB stocare, 50 MB pe fișier. Proiectul gratuit intră pe pauză după 7 zile fără activitate. Dacă ne trebuie mai mult, trecem pe Pro (25 $/lună).

Detalii de setup și structură în `README.md`.
