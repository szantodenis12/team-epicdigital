import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyDigest, type DigestSection } from "@/lib/notify";
import { deadlineLabel, todayISO } from "@/lib/format";
import { weekdayOf } from "@/lib/schedule";
import type { Profile, Recurring, Ticket } from "@/lib/types";

// Rulat zilnic de Vercel Cron (vezi vercel.json), ~08:00 ora României:
// 1. creează tichetele lunare care pică azi; 2. trimite fiecăruia rezumatul zilei.
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const today = todayISO();
  const created = await runRecurring(admin, today);
  const sent = await sendDigests(admin, today);
  return NextResponse.json({ created, sent });
}

type Admin = ReturnType<typeof createAdminClient>;
const addDays = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

async function runRecurring(admin: Admin, today: string) {
  const day = Number(today.slice(8, 10));
  const { data } = await admin.from("recurring").select("*").eq("active", true).eq("day_of_month", day);
  let created = 0;
  for (const r of (data ?? []) as (Recurring & { created_by: string })[]) {
    // O singură dată pe lună, chiar dacă cron-ul rulează de două ori.
    if (r.last_run && r.last_run.slice(0, 7) === today.slice(0, 7)) continue;
    const { data: t, error } = await admin
      .from("tickets")
      .insert({
        title: r.title,
        description: r.description,
        client_id: r.client_id,
        department_id: r.department_id,
        assignee_id: r.assignee_id,
        type: r.type,
        priority: r.priority,
        links: r.links,
        brief: r.brief,
        deadline: addDays(today, r.due_days),
        created_by: r.created_by,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[cron] recurring", r.id, error.message);
      continue;
    }
    if (r.checklist.length) {
      await admin.from("checklist_items").insert(r.checklist.map((body, position) => ({ ticket_id: t.id, body, position })));
    }
    await admin.from("recurring").update({ last_run: today }).eq("id", r.id);
    created++;
  }
  return created;
}

async function sendDigests(admin: Admin, today: string) {
  const tomorrow = addDays(today, 1);
  const [{ data: people }, { data: open }, { data: depts }] = await Promise.all([
    admin.from("profiles").select("id, email, full_name, role, active, schedule").eq("active", true),
    admin.from("tickets").select("id, title, deadline, status, assignee_id, department_id").neq("status", "gata"),
    admin.from("departments").select("id, lead_id"),
  ]);
  const tickets = (open ?? []) as Pick<Ticket, "id" | "title" | "deadline" | "status" | "assignee_id" | "department_id">[];
  const leadOf = Object.fromEntries((depts ?? []).map((d) => [d.id, d.lead_id]));
  const item = (t: (typeof tickets)[number]) => ({ id: t.id, title: t.title, when: t.deadline ? deadlineLabel(t.deadline) : "fără termen" });

  let sent = 0;
  for (const p of (people ?? []) as Profile[]) {
    // Nu deranjăm pe nimeni în ziua lui liberă.
    if (p.schedule && !p.schedule[weekdayOf(today)]) continue;
    const mine = tickets.filter((t) => t.assignee_id === p.id && t.deadline);
    const sections: DigestSection[] = [
      { title: "Întârziate", tickets: mine.filter((t) => t.deadline! < today).map(item) },
      { title: "Azi", tickets: mine.filter((t) => t.deadline === today).map(item) },
      { title: "Mâine", tickets: mine.filter((t) => t.deadline === tomorrow).map(item) },
      {
        title: "De aprobat",
        tickets: tickets
          .filter((t) => t.status === "review" && (p.role === "admin" || (t.department_id && leadOf[t.department_id] === p.id)))
          .map(item),
      },
    ];
    if (sections.some((s) => s.tickets.length) && (await notifyDigest(p.email, p.full_name, sections))) sent++;
  }
  return sent;
}
