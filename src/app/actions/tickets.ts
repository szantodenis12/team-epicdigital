"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireMember } from "@/lib/session";
import { fmtDate, displayName } from "@/lib/format";
import { notifyApproval, notifyAssigned, notifyComment, notifyMention, notifyStatus } from "@/lib/notify";
import { cleanBrief, type Brief } from "@/lib/brief";
import { STATUSES, label, type Priority, type Status, type TicketType, type Profile } from "@/lib/types";

const s = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

const parseLines = (raw: string, max = 50) =>
  raw.split("\n").map((l) => l.trim().slice(0, 300)).filter(Boolean).slice(0, max);

function parseBrief(raw: string) {
  if (!raw) return null;
  try {
    return cleanBrief(JSON.parse(raw));
  } catch {
    return null;
  }
}

function parseLinks(raw: string) {
  return raw
    .split(/\s+/)
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\//i.test(l))
    .slice(0, 20);
}

async function profileOf(supabase: Awaited<ReturnType<typeof requireMember>>["supabase"], id: string | null) {
  if (!id) return null;
  const { data } = await supabase.from("profiles").select("id, email, full_name, role, active").eq("id", id).single<Profile>();
  return data;
}

export async function createTicket(formData: FormData) {
  const { supabase, me } = await requireMember();
  const title = s(formData.get("title"));
  if (!title) throw new Error("Titlul e obligatoriu.");

  const row = {
    title,
    description: s(formData.get("description")),
    client_id: s(formData.get("client_id")) || null,
    department_id: s(formData.get("department_id")) || null,
    brief: parseBrief(s(formData.get("brief"))),
    type: (s(formData.get("type")) || "altele") as TicketType,
    priority: (s(formData.get("priority")) || "normal") as Priority,
    assignee_id: s(formData.get("assignee_id")) || null,
    deadline: s(formData.get("deadline")) || null,
    links: parseLinks(s(formData.get("links"))),
    created_by: me.id,
  };

  const { data, error } = await supabase.from("tickets").insert(row).select("id, title").single();
  if (error) throw new Error(error.message);

  const checklist = parseLines(s(formData.get("checklist")));
  if (checklist.length) {
    await supabase.from("checklist_items").insert(checklist.map((body, position) => ({ ticket_id: data.id, body, position })));
  }

  if (row.assignee_id && row.assignee_id !== me.id) {
    const a = await profileOf(supabase, row.assignee_id);
    if (a) await notifyAssigned(a.email, data, displayName(me), fmtDate(row.deadline));
  }
  revalidatePath("/tichete", "layout");
  return data.id as number;
}

export async function updateTicket(
  id: number,
  patch: Partial<{
    title: string;
    description: string;
    client_id: string | null;
    department_id: string | null;
    brief: Brief | null;
    type: TicketType;
    priority: Priority;
    status: Status;
    assignee_id: string | null;
    deadline: string | null;
    links: string[];
  }>,
) {
  const { supabase, me } = await requireMember();
  if (patch.title !== undefined && !patch.title.trim()) throw new Error("Titlul e obligatoriu.");
  if (patch.brief !== undefined) patch = { ...patch, brief: cleanBrief(patch.brief) };

  const { data: before } = await supabase.from("tickets").select("*").eq("id", id).single();
  if (!before) throw new Error("Tichetul nu există.");

  const { data: t, error } = await supabase.from("tickets").update(patch).eq("id", id).select("*").single();
  // 42501 = blocat de regula de aprobare din baza de date
  if (error) throw new Error(error.code === "42501" ? "Doar adminul sau șeful de departament poate marca Gata." : error.message);

  if (patch.assignee_id && patch.assignee_id !== before.assignee_id && patch.assignee_id !== me.id) {
    const a = await profileOf(supabase, patch.assignee_id);
    if (a) await notifyAssigned(a.email, t, displayName(me), fmtDate(t.deadline));
  }
  // Când ceva ajunge în Review sau Gata, aflăm cine l-a cerut.
  if (patch.status && patch.status !== before.status && ["review", "gata"].includes(patch.status) && t.created_by !== me.id) {
    const c = await profileOf(supabase, t.created_by);
    if (c) await notifyStatus(c.email, t, displayName(me), label(STATUSES, patch.status));
  }

  // Intrat în Review: anunțăm cine poate aproba (șeful departamentului sau adminii).
  if (patch.status === "review" && before.status !== "review") {
    const { data: approvers } = await supabase.rpc("approvers_for", { dept: t.department_id });
    const to = ((approvers ?? []) as { id: string; email: string }[]).filter((a) => a.id !== me.id).map((a) => a.email);
    if (to.length) await notifyApproval(to, t, displayName(me));
  }

  revalidatePath("/tichete", "layout");
  revalidatePath(`/tichete/${id}`);
}

export async function deleteTicket(id: number) {
  const { supabase } = await requireMember();
  const { data: files } = await supabase.from("ticket_files").select("path").eq("ticket_id", id);
  if (files?.length) await supabase.storage.from("ticket-files").remove(files.map((f) => f.path));
  const { error, count } = await supabase.from("tickets").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Doar cine a creat tichetul (sau adminul) îl poate șterge.");
  revalidatePath("/tichete", "layout");
  redirect("/tichete");
}

export async function addComment(ticketId: number, body: string) {
  const { supabase, me } = await requireMember();
  const text = body.trim();
  if (!text) return;
  const { error } = await supabase.from("comments").insert({ ticket_id: ticketId, body: text, author_id: me.id });
  if (error) throw new Error(error.message);

  const { data: t } = await supabase.from("tickets").select("id, title, assignee_id, created_by").eq("id", ticketId).single();
  if (t) {
    const { data: people } = await supabase.from("profiles").select("id, email, full_name").eq("active", true);
    const team = (people ?? []) as Pick<Profile, "id" | "email" | "full_name">[];
    // @Prenume în text → emailul lui separat („te-a menționat").
    const mentioned = team.filter((p) => {
      const first = p.full_name.trim().split(/\s+/)[0];
      return p.id !== me.id && first && new RegExp(`@${first}(?![\\p{L}])`, "iu").test(text);
    });
    const watchers = team.filter(
      (p) => p.id !== me.id && (p.id === t.assignee_id || p.id === t.created_by) && !mentioned.some((m) => m.id === p.id),
    );
    if (mentioned.length) await notifyMention(mentioned.map((p) => p.email), t, displayName(me), text);
    if (watchers.length) await notifyComment(watchers.map((p) => p.email), t, displayName(me), text);
  }
  revalidatePath(`/tichete/${ticketId}`);
}

export async function deleteComment(id: string, ticketId: number) {
  const { supabase } = await requireMember();
  await supabase.from("comments").delete().eq("id", id);
  revalidatePath(`/tichete/${ticketId}`);
}

// Fișierul e urcat direct din browser în Storage; aici doar îl înregistrăm.
export async function registerFile(ticketId: number, f: { path: string; name: string; size: number; mime: string }) {
  const { supabase, me } = await requireMember();
  if (!f.path.startsWith(`${ticketId}/`)) throw new Error("Cale invalidă.");
  const { error } = await supabase.from("ticket_files").insert({ ticket_id: ticketId, ...f, uploaded_by: me.id });
  if (error) {
    await supabase.storage.from("ticket-files").remove([f.path]);
    throw new Error(error.message);
  }
  await supabase.from("activity").insert({ ticket_id: ticketId, actor_id: me.id, action: "fisier", meta: { nume: f.name } });
  revalidatePath(`/tichete/${ticketId}`);
}

export async function deleteFile(id: string) {
  const { supabase } = await requireMember();
  const { data: f } = await supabase.from("ticket_files").select("path, ticket_id").eq("id", id).single();
  if (!f) return;
  const { error, count } = await supabase.from("ticket_files").delete({ count: "exact" }).eq("id", id);
  if (error || !count) throw new Error("Doar cine a urcat fișierul (sau adminul) îl poate șterge.");
  await supabase.storage.from("ticket-files").remove([f.path]);
  revalidatePath(`/tichete/${f.ticket_id}`);
}

export async function fileDownloadUrl(id: string) {
  const { supabase } = await requireMember();
  const { data: f } = await supabase.from("ticket_files").select("path, name").eq("id", id).single();
  if (!f) throw new Error("Fișierul nu există.");
  const { data, error } = await supabase.storage.from("ticket-files").createSignedUrl(f.path, 120, { download: f.name });
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// ───────── Checklist ─────────

export async function addChecklistItem(ticketId: number, body: string) {
  const { supabase } = await requireMember();
  const lines = parseLines(body);
  if (!lines.length) return;
  const { data: last } = await supabase
    .from("checklist_items").select("position").eq("ticket_id", ticketId).order("position", { ascending: false }).limit(1).maybeSingle();
  const start = (last?.position ?? -1) + 1;
  const { error } = await supabase.from("checklist_items").insert(lines.map((b, i) => ({ ticket_id: ticketId, body: b, position: start + i })));
  if (error) throw new Error(error.message);
  revalidatePath(`/tichete/${ticketId}`);
}

export async function toggleChecklistItem(id: string, done: boolean, ticketId: number) {
  const { supabase } = await requireMember();
  await supabase.from("checklist_items").update({ done }).eq("id", id);
  revalidatePath(`/tichete/${ticketId}`);
}

export async function deleteChecklistItem(id: string, ticketId: number) {
  const { supabase } = await requireMember();
  await supabase.from("checklist_items").delete().eq("id", id);
  revalidatePath(`/tichete/${ticketId}`);
}

// ───────── Ore lucrate ─────────

export async function addTime(ticketId: number, minutes: number, note: string, spentOn?: string) {
  const { supabase, me } = await requireMember();
  const m = Math.round(minutes);
  if (!Number.isFinite(m) || m < 1 || m > 1440) throw new Error("Între 1 minut și 24 de ore.");
  const row = { ticket_id: ticketId, profile_id: me.id, minutes: m, note: note.trim().slice(0, 300), ...(spentOn && { spent_on: spentOn }) };
  const { error } = await supabase.from("time_entries").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath(`/tichete/${ticketId}`);
}

export async function deleteTime(id: string, ticketId: number) {
  const { supabase } = await requireMember();
  const { count } = await supabase.from("time_entries").delete({ count: "exact" }).eq("id", id);
  if (!count) throw new Error("Poți șterge doar orele tale.");
  revalidatePath(`/tichete/${ticketId}`);
}

/* ───────── Cronometru ─────────

   Pornit/oprit, cu adevărul pe server. Browserul doar desenează secundele care
   trec; dacă închizi pagina, pleci de pe laptop sau treci pe telefon,
   cronometrul merge mai departe, pentru că el e un rând în baza de date, nu un
   `setInterval`.

   La oprire, minutele ajung în `time_entries`, acolo unde ajung și cele
   introduse manual. E deliberat: rapoartele și pagina de Ore nu trebuie să știe
   dacă timpul a fost cronometrat sau scris de mână. */

export async function startTimer(ticketId: number) {
  const { supabase, me } = await requireMember();
  // Cheia primară e profile_id, deci un upsert mută cronometrul pe tichetul nou
  // dacă omul avea deja unul pornit în altă parte - fără să piardă nimic, pentru
  // că `stopTimer` scrie minutele abia la oprire.
  const { data: current } = await supabase.from("timers").select("ticket_id").eq("profile_id", me.id).maybeSingle();
  if (current && current.ticket_id !== ticketId) {
    // Mutarea pe alt tichet închide întâi ce era pornit, ca timpul să nu se piardă.
    await stopTimer(current.ticket_id);
  }
  const { error } = await supabase
    .from("timers")
    .upsert({ profile_id: me.id, ticket_id: ticketId, started_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  revalidatePath(`/tichete/${ticketId}`);
}

export async function stopTimer(ticketId: number, note = "") {
  const { supabase, me } = await requireMember();
  const { data: timer } = await supabase
    .from("timers")
    .select("ticket_id, started_at")
    .eq("profile_id", me.id)
    .maybeSingle<{ ticket_id: number; started_at: string }>();
  if (!timer) return;

  const minutes = Math.round((Date.now() - new Date(timer.started_at).getTime()) / 60_000);
  await supabase.from("timers").delete().eq("profile_id", me.id);

  // Sub un minut nu se scrie nimic: o apăsare greșită nu trebuie să lase urme.
  // Peste 24 de ore înseamnă aproape sigur un cronometru uitat pornit, așa că se
  // taie la 24h în loc să fie respins - altfel timpul s-ar pierde de tot.
  if (minutes >= 1) {
    const { error } = await supabase.from("time_entries").insert({
      ticket_id: timer.ticket_id,
      profile_id: me.id,
      minutes: Math.min(minutes, 1440),
      note: note.trim().slice(0, 300),
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/tichete/${timer.ticket_id}`);
  if (timer.ticket_id !== ticketId) revalidatePath(`/tichete/${ticketId}`);
}

// ───────── Șablon și tichet lunar, pornind de la un tichet existent ─────────

async function blueprintOf(supabase: Awaited<ReturnType<typeof requireMember>>["supabase"], ticketId: number) {
  const [{ data: t }, { data: items }] = await Promise.all([
    supabase.from("tickets").select("*").eq("id", ticketId).single(),
    supabase.from("checklist_items").select("body").eq("ticket_id", ticketId).order("position"),
  ]);
  if (!t) throw new Error("Tichetul nu există.");
  return {
    t,
    base: {
      title: t.title as string,
      description: t.description as string,
      type: t.type as TicketType,
      priority: t.priority as Priority,
      department_id: t.department_id as string | null,
      brief: t.brief,
      checklist: (items ?? []).map((i) => i.body as string),
    },
  };
}

export async function saveTemplate(ticketId: number, name: string) {
  const { supabase, me } = await requireMember();
  const n = name.trim();
  if (!n) throw new Error("Dă-i un nume șablonului.");
  const { base } = await blueprintOf(supabase, ticketId);
  const { error } = await supabase.from("templates").insert({ ...base, name: n.slice(0, 80), created_by: me.id });
  if (error) throw new Error(error.message);
  revalidatePath("/tichete/nou");
  revalidatePath("/echipa");
}

export async function makeRecurring(ticketId: number, dayOfMonth: number, dueDays: number) {
  const { supabase, me } = await requireAdmin();
  if (!(dayOfMonth >= 1 && dayOfMonth <= 28)) throw new Error("Ziua trebuie să fie între 1 și 28.");
  const { t, base } = await blueprintOf(supabase, ticketId);
  const { error } = await supabase.from("recurring").insert({
    ...base,
    client_id: t.client_id,
    assignee_id: t.assignee_id,
    links: t.links,
    day_of_month: dayOfMonth,
    due_days: Math.max(0, Math.min(60, Math.round(dueDays))),
    created_by: me.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/echipa");
}
