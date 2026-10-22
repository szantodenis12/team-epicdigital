"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReset } from "@/lib/notify";
import { parseView } from "@/lib/tickets";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type FormState = { error?: string; ok?: string } | null;

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "Email sau parolă greșită." };
  redirect("/tichete");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Scrie emailul." };
  const admin = createAdminClient();
  // Trimitem doar dacă e un membru activ, dar răspundem la fel în orice caz.
  const { data: p } = await admin.from("profiles").select("id").ilike("email", email).eq("active", true).maybeSingle();
  if (p) {
    const { data } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (data?.properties) {
      await sendReset(email, `${SITE}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery`);
    }
  }
  return { ok: "Dacă adresa are cont, ți-am trimis un link pe email." };
}

export async function updateName(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Numele nu poate fi gol." };
  const { error } = await supabase.from("profiles").update({ full_name }).eq("id", auth.user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: "Salvat." };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Parola trebuie să aibă minim 8 caractere." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "Parolele nu coincid." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: "Parola a fost setată." };
}

// Fiecare își alege vederea (listă, bilete, calendar); ținem minte în browser.
export async function setView(view: string) {
  (await cookies()).set("view", parseView(view), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

/* ───────── Tema ─────────

   Tema stă pe profil, nu într-un cookie, pentru că e o preferință a OMULUI, nu
   a browserului: dacă intri de pe telefon vrei aceeași temă ca pe laptop.

   Se scrie și într-un cookie pe lângă, dar doar ca să poată fi citită ÎNAINTE
   de prima pictare, în scriptul din layout. Fără el, pagina ar apărea o clipă
   în tema greșită la fiecare încărcare - sursa adevărului rămâne profilul. */
export async function setTheme(theme: "dark" | "light") {
  if (theme !== "dark" && theme !== "light") throw new Error("Temă necunoscută.");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { error } = await supabase.from("profiles").update({ theme }).eq("id", auth.user.id);
  if (error) throw new Error(error.message);
  (await cookies()).set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

/* ───────── Poza de profil ─────────

   Încărcarea se face din browser direct în Storage, ca la fișierele de pe
   tichet, iar aici se înregistrează doar calea. Bucket-ul e privat: politicile
   din 0005 cer ca primul segment din cale să fie uid-ul celui care scrie, deci
   nimeni nu poate pune o poză în dreptul altcuiva. */
export async function setAvatar(path: string): Promise<FormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  // Verificarea se repetă aici, nu doar în politică: o cale greșită ar fi scrisă
  // în profil chiar dacă fișierul nu i-ar aparține.
  if (path && !path.startsWith(`${auth.user.id}/`)) return { error: "Cale nepermisă." };
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", auth.user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: path ? "Poza a fost schimbată." : "Poza a fost ștearsă." };
}

export async function removeAvatar(): Promise<FormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("avatar_path").eq("id", auth.user.id).single<{ avatar_path: string }>();
  if (me?.avatar_path) await supabase.storage.from("avatars").remove([me.avatar_path]);
  return setAvatar("");
}
