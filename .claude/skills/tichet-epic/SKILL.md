---
name: tichet-epic
description: Deschide tichete pe Epic Team (team.epicdigitalhub.ro) din conversație — unul sau mai multe deodată, cu pași de checklist și fișiere atașate. Folosește-o când cineva cere „fă-i un tichet lui X", „deschide tichete pentru...", „trimite-i asta lui Roland/Daria/Tiberiu ca task", sau descrie o treabă care trebuie dată cuiva din echipă.
---

# Tichete pe Epic Team

Tichetele se deschid cu `scripts/tichet.mjs` din repo-ul `team-epicdigital`. Scriptul
intră cu **contul omului care cere**, nu cu o cheie de administrator: solicitantul
iese corect, „Cerute de mine" funcționează, iar notificarea pe email ajunge la
responsabil.

## Înainte de prima rulare

Omul are nevoie, o singură dată, de un fișier `.env` cu patru valori:

```
NEXT_PUBLIC_SUPABASE_URL=https://uygrrwfgewfuftlxxerb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<cheia publishable>
EPIC_EMAIL=prenume@epicdigitalhub.ro
EPIC_PAROLA=<parola lui de pe platformă>
```

Primele două pot fi date oricui — cheia publishable e făcută să stea în browser.
Ultimele două sunt personale. Dacă lipsesc, scriptul spune exact ce lipsește; nu
le cere în chat și nu le scrie nicăieri.

## O singură treabă

```bash
node --env-file=.env scripts/tichet.mjs \
  --titlu "Actualizează textul emailului de confirmare comandă" \
  --descriere "Preview-ul atașat. Trebuie rescris paragraful de mulțumire." \
  --agent Roland \
  --client "Alexia" \
  --tip continut \
  --prioritate normal \
  --termen 2026-11-03 \
  --pasi "Text rescris|Aprobat|Pus în Shopify" \
  --fisier ./preview-confirmare.png
```

## Mai multe deodată

Pune-le într-un JSON și dă-l cu `--din`. E modul potrivit când cineva descrie
cinci-șase treburi dintr-un foc — un singur apel, un singur rezumat.

```json
[
  {
    "titlu": "Email: confirmare comandă",
    "descriere": "Rescrie paragraful de mulțumire.",
    "agent": "Roland",
    "client": "Alexia",
    "tip": "continut",
    "pasi": ["Text rescris", "Aprobat", "Pus în Shopify"],
    "fisiere": ["./preview-confirmare.png"]
  },
  { "titlu": "Email: expediere", "agent": "Roland", "client": "Alexia", "tip": "continut" }
]
```

## Ce accepta campurile

| Câmp | Valori |
|---|---|
| `tip` | `website` `seo` `tracking` `ads` `design` `continut` `bug` `altele` |
| `prioritate` | `urgent` `normal` `scazut` |
| `termen` | `AAAA-LL-ZZ` |
| `agent`, `client`, `departament` | nume parțial, nu uuid — „Roland", „Alexia", „Site" |

Numele se potrivesc parțial și fără diacritice. Dacă un nume se potrivește la mai
multe lucruri, scriptul se oprește și le enumeră în loc să ghicească — citește
lista și reia cu un nume mai precis.

Cu `--agent` tichetul pleacă direct în **În lucru**; fără, rămâne **Nou** și
neatribuit.

## Cum sa lucrezi cu ea

- **Verifică întâi cu `--dry`** când faci mai multe deodată. Arată ce ar crea,
  fără să scrie nimic. Un tichet greșit se poate șterge, dar notificarea pe email
  a plecat deja.
- **Scrie titluri scurte și concrete.** Ele apar în listă și în subiectul
  emailului; „Email: confirmare comandă" se citește, „Update texte" nu.
- **Pune pașii când treaba are etape clare.** Checklistul se vede pe tichet și
  arată progresul fără să mai întrebe cineva.
- **Atașează ce ai.** Preview-uri, capturi, PDF-uri — ajung direct pe tichet, iar
  responsabilul nu mai umblă după ele prin alte conversații.
- **Nu inventa termene.** Dacă omul n-a spus până când, lasă fără termen și
  întreabă-l, mai ales la `urgent`: SLA-ul începe să numere de la deschidere.
- **Spune-i omului că emailul nu pleacă.** Scriptul scrie direct în baza de date,
  iar emailul de atribuire îl trimite aplicația. Tichetul apare imediat și e
  corect, dar responsabilul nu primește nimic pe email până nu lasă cineva un
  comentariu pe tichet din platformă. Dacă trebuie anunțat acum, spune-i să
  comenteze după ce creezi tichetul.
- **Dă link-ul la final.** Scriptul tipărește adresa fiecărui tichet; pune-le în
  răspuns, ca omul să poată deschide direct ce ai creat.
