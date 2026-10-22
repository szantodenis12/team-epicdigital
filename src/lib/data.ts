import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SLA, type SlaPolicies, type SlaPolicy } from "@/lib/sla";
import type { Client, Department, Profile } from "@/lib/types";

/* Coloanele de profil, în două variante.

   Migrațiile se aplică de mână, lipite în SQL editor, deci codul ajunge pe
   server înaintea schemei. Dacă interogarea cere o coloană care încă nu există,
   PostgREST răspunde cu eroare pe TOT rândul, iar `people` rămâne gol - adică
   dispar oamenii de pe fiecare ecran, nu doar poza lor. S-a întâmplat exact
   așa, între 0005 scrisă și 0005 rulată.

   De aceea se încearcă varianta completă și, la eroare, se recade pe cea veche.
   Un apel în plus doar în fereastra dintre deploy și migrație. */
export const PROFILE_COLS = "id, email, full_name, role, active, schedule, theme, avatar_path";
const PROFILE_COLS_FARA_0005 = "id, email, full_name, role, active, schedule";

export async function selectProfiles(supabase: SupabaseClient) {
  const full = await supabase.from("profiles").select(PROFILE_COLS).order("full_name");
  if (!full.error) return full;
  return supabase.from("profiles").select(PROFILE_COLS_FARA_0005).order("full_name");
}

// Oamenii, clienții și departamentele, folosite aproape pe fiecare ecran.
export const loadLookups = cache(async (supabase: SupabaseClient) => {
  const [{ data: people }, { data: clients }, { data: departments }, { data: members }, { data: sla }] = await Promise.all([
    selectProfiles(supabase),
    supabase.from("clients").select("id, name, active, drive_url, notes").order("name"),
    supabase.from("departments").select("id, name, color, lead_id, active").order("name"),
    supabase.from("department_members").select("department_id, profile_id"),
    supabase.from("sla_policies").select("priority, response_mins, resolve_mins"),
  ]);
  // profil → departamentele lui
  const memberOf: Record<string, string[]> = {};
  for (const m of members ?? []) (memberOf[m.profile_id] ??= []).push(m.department_id);
  // Dacă tabelul e gol sau migrația 0004 nu a rulat încă, se merge pe valorile
  // implicite în loc să crape ecranul: SLA-ul e informativ, nu blocant.
  const policies: SlaPolicies = { ...DEFAULT_SLA };
  for (const row of (sla ?? []) as SlaPolicy[]) policies[row.priority] = row;

  /* Adresele semnate pentru poze, într-un singur apel pentru toată echipa.

     Bucket-ul e privat, deci `getPublicUrl` nu ar merge. O oră e mai mult decât
     ține orice pagină deschisă, iar paginile sunt randate pe server la fiecare
     cerere, așa că adresa e mereu proaspătă când ajunge în HTML. */
  const withAvatars = (people ?? []) as Profile[];
  const paths = withAvatars.filter((p) => p.avatar_path).map((p) => p.avatar_path!);
  if (paths.length) {
    // Fără bucket (0005 nerulată) se întoarce eroare; pozele lipsesc, dar
    // oamenii rămân la locul lor.
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrls(paths, 3600);
    const byPath = new Map((signed ?? []).map((x) => [x.path, x.signedUrl]));
    for (const person of withAvatars) {
      if (person.avatar_path) person.avatar_url = byPath.get(person.avatar_path) ?? null;
    }
  }

  return {
    people: withAvatars,
    clients: (clients ?? []) as Client[],
    departments: (departments ?? []) as Department[],
    memberOf,
    sla: policies,
  };
});
