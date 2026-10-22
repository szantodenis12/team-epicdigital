import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_COLS } from "@/lib/data";
import type { Profile } from "@/lib/types";

// Utilizatorul curent + profilul lui. Redirecționează la login dacă nu e autentificat.
export const getMe = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  // Aceleași coloane ca în loadLookups, cu aceeași recădere dacă 0005 nu a fost
  // rulată încă: ThemeToggle și AvatarUpload au nevoie de `theme` și
  // `avatar_path` ca să știe ce să arate.
  const full = await supabase.from("profiles").select(PROFILE_COLS).eq("id", auth.user.id).single<Profile>();
  const { data: profile } = full.error
    ? await supabase.from("profiles").select("id, email, full_name, role, active, schedule").eq("id", auth.user.id).single<Profile>()
    : full;
  return { supabase, user: auth.user, profile };
});

// Pentru server actions: aruncă eroare în loc de redirect.
export async function requireMember() {
  const { supabase, profile } = await getMe();
  if (!profile?.active) throw new Error("Cont inactiv.");
  return { supabase, me: profile };
}

export async function requireAdmin() {
  const ctx = await requireMember();
  if (ctx.me.role !== "admin") throw new Error("Doar adminul poate face asta.");
  return ctx;
}
