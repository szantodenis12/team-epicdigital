// Deschide tichete din linia de comandă, ca să poată fi deschise și de Claude.
//
// Rulare:
//   node --env-file=.env.local scripts/tichet.mjs --titlu "..." --agent Roland [...]
//   node --env-file=.env.local scripts/tichet.mjs --din lista.json
//
// Intră cu CONTUL TĂU (EPIC_EMAIL + EPIC_PAROLA), nu cu cheia de service.
// Trei motive, toate practice:
//   - „Cerute de mine" și notificările au nevoie de un solicitant real; cheia de
//     service nu are `auth.uid()`, deci tichetul ar rămâne fără autor;
//   - RLS rămâne în vigoare, deci scriptul nu poate face mai mult decât omul;
//   - cheia de service nu trebuie împărțită echipei, iar adresa proiectului și
//     cheia publishable pot fi date oricui - asta e tot ce-i mai trebuie.
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://team.epicdigitalhub.ro";
const EMAIL = process.env.EPIC_EMAIL;
const PAROLA = process.env.EPIC_PAROLA;

const TIPURI = ["website", "seo", "tracking", "ads", "design", "continut", "bug", "altele"];
const PRIORITATI = ["urgent", "normal", "scazut"];

function usage(msg) {
  console.error(`${msg}

  node --env-file=.env.local scripts/tichet.mjs [optiuni]

    --titlu "..."          obligatoriu (max 200 caractere)
    --descriere "..."      textul tichetului
    --agent Roland        cine se ocupa (nume partial)
    --client "Alexia"     numele clientului; omis = intern
    --departament Site    Site | Social Media | Video
    --tip continut        ${TIPURI.join(" | ")}
    --prioritate normal   ${PRIORITATI.join(" | ")}
    --termen 2026-11-03   data limita (AAAA-LL-ZZ)
    --pasi "a|b|c"        checklist, separat prin |
    --link https://...    se poate repeta
    --fisier ./poza.png   se ataseaza; se poate repeta
    --din lista.json      mai multe tichete deodata (vezi README)
    --dry                 arata ce ar face, fara sa scrie nimic
`);
  process.exit(1);
}

// ───────── argumente ─────────
// Numele sunt verificate, nu doar citite: un `--titluu` scris gresit altfel s-ar
// aseza tacut in obiect, iar eroarea raportata ar fi „lipseste --titlu" - adica
// exact lucrul pe care crezi ca l-ai scris.
const CHEI = ["titlu", "descriere", "agent", "client", "departament", "tip", "prioritate", "termen", "pasi", "link", "fisier", "din", "dry"];
const argv = process.argv.slice(2);
const args = { link: [], fisier: [] };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith("--")) usage(`Argument neasteptat: ${a}`);
  const key = a.slice(2);
  if (!CHEI.includes(key)) usage(`Optiune necunoscuta: --${key}`);
  if (key === "dry") { args.dry = true; continue; }
  const val = argv[++i];
  if (val === undefined) usage(`Lipseste valoarea pentru --${key}`);
  if (key === "link" || key === "fisier") args[key].push(val);
  else args[key] = val;
}

if (!URL || !ANON) usage("Lipsesc NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");

/** Un tichet, din argumente sau dintr-un obiect din fisierul JSON. */
const normalize = (o) => ({
  titlu: o.titlu,
  descriere: o.descriere ?? "",
  agent: o.agent ?? null,
  client: o.client ?? null,
  departament: o.departament ?? null,
  tip: o.tip ?? "altele",
  prioritate: o.prioritate ?? "normal",
  termen: o.termen ?? null,
  pasi: Array.isArray(o.pasi) ? o.pasi : o.pasi ? String(o.pasi).split("|").map((s) => s.trim()).filter(Boolean) : [],
  linkuri: o.linkuri ?? o.link ?? [],
  fisiere: o.fisiere ?? o.fisier ?? [],
});

let cereri;
if (args.din) {
  const parsed = JSON.parse(readFileSync(args.din, "utf8"));
  cereri = (Array.isArray(parsed) ? parsed : [parsed]).map(normalize);
} else {
  if (!args.titlu) usage("Lipseste --titlu.");
  cereri = [normalize({ ...args, linkuri: args.link, fisiere: args.fisier })];
}

for (const c of cereri) {
  if (!c.titlu || c.titlu.length > 200) usage(`Titlu lipsa sau peste 200 de caractere: ${c.titlu?.slice(0, 40)}`);
  if (!TIPURI.includes(c.tip)) usage(`Tip necunoscut: ${c.tip}`);
  if (!PRIORITATI.includes(c.prioritate)) usage(`Prioritate necunoscuta: ${c.prioritate}`);
  if (c.termen && !/^\d{4}-\d{2}-\d{2}$/.test(c.termen)) usage(`Termen gresit (AAAA-LL-ZZ): ${c.termen}`);
}

// ───────── autentificare ─────────
// Abia aici: altfel o comanda gresit scrisa iti raporteaza intai ca n-ai cont,
// iar greseala din comanda o afli de-abia dupa ce-l configurezi.
if (!EMAIL || !PAROLA) usage("Lipsesc EPIC_EMAIL / EPIC_PAROLA (contul tau de pe platforma).");

const sb = createClient(URL, ANON, { auth: { persistSession: false } });
const { data: sesiune, error: errLogin } = await sb.auth.signInWithPassword({ email: EMAIL, password: PAROLA });
if (errLogin) {
  console.error(`Nu m-am putut autentifica cu ${EMAIL}: ${errLogin.message}`);
  process.exit(1);
}
const eu = sesiune.user.id;

// ───────── cine si ce exista ─────────
const [{ data: oameni }, { data: clienti }, { data: departamente }] = await Promise.all([
  sb.from("profiles").select("id, full_name, email, active"),
  sb.from("clients").select("id, name, active"),
  sb.from("departments").select("id, name, active"),
]);

/* Potrivire pe nume, nu pe id: un om care scrie un tichet se gandeste la
   „Roland", nu la un uuid. Ambiguitatea se raporteaza, nu se ghiceste. */
function gaseste(lista, cautat, eticheta, camp = "name") {
  if (!cautat) return null;
  const q = cautat.trim().toLowerCase();
  const active = lista.filter((x) => x.active !== false);
  const exact = active.filter((x) => (x[camp] ?? "").toLowerCase() === q || (x.email ?? "").toLowerCase() === q);
  const pool = exact.length ? exact : active.filter((x) => (x[camp] ?? "").toLowerCase().includes(q));
  if (!pool.length) {
    console.error(`Nu am gasit ${eticheta} „${cautat}". Exista: ${active.map((x) => x[camp]).join(", ")}`);
    process.exit(1);
  }
  if (pool.length > 1) {
    console.error(`„${cautat}" se potriveste la mai multe ${eticheta}: ${pool.map((x) => x[camp]).join(", ")}. Fii mai precis.`);
    process.exit(1);
  }
  return pool[0];
}

const safeName = (n) =>
  n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-120);

// ───────── treaba propriu-zisa ─────────
const rezultate = [];
for (const c of cereri) {
  const agent = gaseste(oameni ?? [], c.agent, "persoana", "full_name");
  const client = gaseste(clienti ?? [], c.client, "client");
  const dep = gaseste(departamente ?? [], c.departament, "departament");

  const rand = {
    title: c.titlu,
    description: c.descriere,
    client_id: client?.id ?? null,
    department_id: dep?.id ?? null,
    assignee_id: agent?.id ?? null,
    created_by: eu,
    type: c.tip,
    priority: c.prioritate,
    deadline: c.termen,
    links: c.linkuri,
    status: agent ? "lucru" : "nou",
  };

  if (args.dry) {
    console.log(`[dry] ${c.titlu}\n      agent=${agent?.full_name ?? "-"} client=${client?.name ?? "intern"} dep=${dep?.name ?? "-"} tip=${c.tip} prioritate=${c.prioritate} termen=${c.termen ?? "-"}\n      pasi=${c.pasi.length} fisiere=${c.fisiere.length}`);
    continue;
  }

  const { data: t, error } = await sb.from("tickets").insert(rand).select("id, title").single();
  if (error) {
    console.error(`„${c.titlu}" nu a putut fi creat: ${error.message}`);
    process.exit(1);
  }

  if (c.pasi.length) {
    const { error: e2 } = await sb
      .from("checklist_items")
      .insert(c.pasi.map((body, i) => ({ ticket_id: t.id, body: body.slice(0, 300), position: i })));
    if (e2) console.error(`  pasii nu au intrat: ${e2.message}`);
  }

  const atasate = [];
  for (const f of c.fisiere) {
    try {
      const buf = readFileSync(f);
      const nume = basename(f);
      const path = `${t.id}/${crypto.randomUUID()}-${safeName(nume)}`;
      const { error: e3 } = await sb.storage.from("ticket-files").upload(path, buf, {
        contentType: nume.endsWith(".png") ? "image/png"
          : /\.jpe?g$/i.test(nume) ? "image/jpeg"
          : nume.endsWith(".pdf") ? "application/pdf"
          : nume.endsWith(".webp") ? "image/webp"
          : "application/octet-stream",
      });
      if (e3) throw new Error(e3.message);
      const { error: e4 } = await sb.from("ticket_files").insert({
        ticket_id: t.id, path, name: nume, size: buf.length, mime: "", uploaded_by: eu,
      });
      if (e4) throw new Error(e4.message);
      atasate.push(nume);
    } catch (e) {
      console.error(`  fisierul ${f} nu a mers: ${e.message}`);
    }
  }

  rezultate.push({ id: t.id, titlu: t.title, agent: agent?.full_name ?? "neatribuit", fisiere: atasate.length });
}

if (!args.dry) {
  console.log(`\nGata, ${rezultate.length} tichet${rezultate.length === 1 ? "" : "e"}:`);
  for (const r of rezultate) {
    console.log(`  #${r.id}  ${r.titlu}  → ${r.agent}${r.fisiere ? ` (${r.fisiere} fisiere)` : ""}`);
    console.log(`         ${SITE}/tichete/${r.id}`);
  }
}
