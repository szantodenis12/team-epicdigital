// Creează conturile echipei cu parole puternice, generate aleator, și le afișează o singură dată.
// Dacă un cont există deja, îi pune o parolă nouă (și îl reactivează).
// Rulare: node --env-file=.env.local scripts/create-team.mjs [fișier-parole.txt]
// Cu fișier: ia parolele de acolo (rânduri „email parolă”) în loc să le genereze.
import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const TEAM = [
  { email: "roland@epicdigitalhub.ro", full_name: "Roland", role: "admin" },
  { email: "denis@epicdigitalhub.ro", full_name: "Denis", role: "member" },
  { email: "daria@epicdigitalhub.ro", full_name: "Daria", role: "member" },
  { email: "tiberiu@epicdigitalhub.ro", full_name: "Tiberiu", role: "member" },
];

// Fără caractere care se confundă (0/O, 1/l/I). Ex: Kp7m-Xq2r-Tz9w-Bn4h
const CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const password = () =>
  Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => CHARS[randomInt(CHARS.length)]).join("")).join("-");

const given = {};
if (process.argv[2]) {
  for (const [, email, pass] of readFileSync(process.argv[2], "utf8").matchAll(/^\s*(\S+@\S+)\s+(\S+)/gm)) given[email.toLowerCase()] = pass;
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) throw listErr;

const rows = [];
for (const m of TEAM) {
  const pass = given[m.email] ?? password();
  const { error: invErr } = await admin.from("invites").upsert({ email: m.email, full_name: m.full_name, role: m.role });
  if (invErr) throw invErr;

  const existing = list.users.find((u) => u.email?.toLowerCase() === m.email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password: pass, email_confirm: true, ban_duration: "none" });
    if (error) throw error;
    const { error: pErr } = await admin.from("profiles").update({ full_name: m.full_name, role: m.role, active: true }).eq("id", existing.id);
    if (pErr) throw pErr;
  } else {
    const { error } = await admin.auth.admin.createUser({ email: m.email, password: pass, email_confirm: true });
    if (error) throw error;
  }
  rows.push({ nume: m.full_name, email: m.email, parola: pass, rol: m.role });
}

// Șabloanele de pornire, doar dacă nu există încă niciunul.
const { count } = await admin.from("templates").select("id", { count: "exact", head: true });
if (!count) {
  const { data: depts } = await admin.from("departments").select("id, name");
  const dep = (name) => depts?.find((d) => d.name === name)?.id ?? null;
  const { data: owner } = await admin.from("profiles").select("id").eq("email", TEAM[0].email).single();
  const social = (format, slides = 0) => ({
    kind: "social", format, platforms: ["Facebook", "Instagram"], language: "RO", objective: "", idea: "",
    slides: Array.from({ length: slides }, () => ({ text: "", visual: "" })), caption: "", hashtags: "", cta: "", publish_date: "", references: [],
  });
  const productie = (media, style, aspects, scenes) => ({
    kind: "productie", media, style, aspects, duration: "", shoot_date: "", location: "", people: "", mood: "",
    scenes: scenes.map((label) => ({ label, text: "", visual: "" })), shots: "", references: [],
  });
  const templates = [
    { name: "Postare social", department_id: dep("Social Media"), type: "continut", brief: social("post"),
      checklist: ["Text + caption", "Grafică / poze", "Aprobare client", "Programare"] },
    { name: "Carusel", department_id: dep("Social Media"), type: "continut", brief: social("carusel", 5),
      checklist: ["Texte pe slide-uri", "Design", "Aprobare client", "Programare"] },
    { name: "Reel / video", department_id: dep("Video"), type: "continut", brief: productie("video", "ugc", ["9:16"], ["Hook", "Corp", "CTA"]),
      checklist: ["Script aprobat", "Filmare", "Montaj", "Subtitrări", "Aprobare client", "Publicare"] },
    { name: "Ședință foto", department_id: dep("Video"), type: "continut", brief: productie("foto", "foto-produs", ["4:5"], []),
      checklist: ["Shot list", "Ședință", "Selecție", "Editare", "Livrare în Drive"] },
    { name: "Bug site", department_id: dep("Site"), type: "bug", brief: null,
      checklist: ["Reprodus", "Rezolvat", "Testat pe mobil", "Live"] },
    { name: "Pagină nouă site", department_id: dep("Site"), type: "website", brief: null,
      checklist: ["Text", "Design", "Implementare", "SEO: title, meta, schema", "Testat pe mobil", "Live"] },
  ].map((t) => ({ ...t, title: "", description: "", priority: "normal", created_by: owner.id }));
  const { error } = await admin.from("templates").insert(templates);
  if (error) throw error;
  console.log(`${templates.length} șabloane de pornire adăugate.`);
}

console.table(rows);
console.log("Trimite fiecăruia datele lui pe privat. Parola se poate schimba din Cont.");
