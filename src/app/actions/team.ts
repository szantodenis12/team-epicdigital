"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireMember } from "@/lib/session";
import { cleanSchedule } from "@/lib/schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import { displayName } from "@/lib/format";
import { sendInvite } from "@/lib/notify";
import type { Role } from "@/lib/types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type InviteResult = { ok: true; emailed: boolean; link?: string } | { ok: false; error: string };

export async function inviteMember(_: InviteResult | null, formData: FormData): Promise<InviteResult> {
  try {
    const { me } = await requireAdmin();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const fullName = String(formData.get("full_name") ?? "").trim();
    const role = (formData.get("role") === "admin" ? "admin" : "member") as Role;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Email invalid." };

    const admin = createAdminClient();
    const { error: invErr } = await admin
      .from("invites")
      .upsert({ email, full_name: fullName, role, invited_by: me.id });
    if (invErr) return { ok: false, error: invErr.message };

    const { data: existing } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
    if (existing) {
      // Cont existent (ex. dezactivat anterior): îl reactivăm și îi trimitem link de parolă.
      await admin.from("profiles").update({ active: true, role, ...(fullName && { full_name: fullName }) }).eq("id", existing.id);
    }

    const { data, error } = existing
      ? await admin.auth.admin.generateLink({ type: "recovery", email })
      : await admin.auth.admin.generateLink({ type: "invite", email, options: { data: { full_name: fullName } } });
    if (error) return { ok: false, error: error.message };

    const link = `${SITE}/auth/confirm?token_hash=${data.properties.hashed_token}&type=${existing ? "recovery" : "invite"}`;
    const emailed = await sendInvite(email, fullName, displayName(me), link);
    revalidatePath("/echipa");
    return { ok: true, emailed, link: emailed ? undefined : link };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Eroare." };
  }
}

export async function setRole(userId: string, role: Role) {
  const { me } = await requireAdmin();
  if (userId === me.id) throw new Error("Nu-ți poți schimba propriul rol.");
  await createAdminClient().from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/echipa");
}

export async function setActive(userId: string, active: boolean) {
  const { me } = await requireAdmin();
  if (userId === me.id) throw new Error("Nu te poți dezactiva singur.");
  const admin = createAdminClient();
  await admin.from("profiles").update({ active }).eq("id", userId);
  // Dezactivat = deconectat de pe toate dispozitivele.
  await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
  revalidatePath("/echipa");
}

export async function addClient(formData: FormData) {
  const { supabase } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { error } = await supabase.from("clients").insert({ name });
  if (error) throw new Error(error.code === "23505" ? "Clientul există deja." : error.message);
  revalidatePath("/echipa");
}

export async function setClientActive(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from("clients").update({ active }).eq("id", id);
  revalidatePath("/echipa");
}

// ───────── Departamente ─────────

export async function addDepartment(formData: FormData) {
  const { supabase } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { error } = await supabase.from("departments").insert({ name: name.slice(0, 40), color: String(formData.get("color") || "#1FDC93") });
  if (error) throw new Error(error.code === "23505" ? "Departamentul există deja." : error.message);
  revalidatePath("/echipa");
}

export async function updateDepartment(id: string, patch: Partial<{ name: string; color: string; lead_id: string | null; active: boolean }>) {
  const { supabase } = await requireAdmin();
  if (patch.name !== undefined && !patch.name.trim()) throw new Error("Numele nu poate fi gol.");
  const { error } = await supabase.from("departments").update(patch).eq("id", id);
  if (error) throw new Error(error.code === "23505" ? "Există deja un departament cu numele ăsta." : error.message);
  revalidatePath("/echipa");
}

export async function setDepartmentMember(departmentId: string, profileId: string, on: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = on
    ? await supabase.from("department_members").upsert({ department_id: departmentId, profile_id: profileId })
    : await supabase.from("department_members").delete().eq("department_id", departmentId).eq("profile_id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/echipa");
}

// ───────── Șabloane și tichete lunare ─────────

export async function deleteTemplate(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("templates").delete().eq("id", id);
  revalidatePath("/echipa");
  revalidatePath("/tichete/nou");
}

export async function setRecurringActive(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from("recurring").update({ active }).eq("id", id);
  revalidatePath("/echipa");
}

export async function deleteRecurring(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("recurring").delete().eq("id", id);
  revalidatePath("/echipa");
}

// ───────── Clienți ─────────

export async function updateClient(id: string, patch: Partial<{ drive_url: string; notes: string }>) {
  const { supabase } = await requireAdmin();
  if (patch.drive_url && !/^https?:\/\//i.test(patch.drive_url.trim())) throw new Error("Linkul trebuie să înceapă cu https://");
  const { error } = await supabase.from("clients").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/clienti/${id}`);
  revalidatePath("/clienti");
}

// Programul de lucru: fiecare și-l schimbă pe al lui, adminul pe al oricui.
export async function setSchedule(userId: string, schedule: unknown) {
  const { supabase, me } = await requireMember();
  const clean = cleanSchedule(schedule);
  if (userId === me.id) {
    const { error } = await supabase.from("profiles").update({ schedule: clean }).eq("id", me.id);
    if (error) throw new Error(error.message);
  } else {
    if (me.role !== "admin") throw new Error("Doar adminul poate schimba programul altcuiva.");
    await createAdminClient().from("profiles").update({ schedule: clean }).eq("id", userId);
  }
  revalidatePath("/", "layout");
}
