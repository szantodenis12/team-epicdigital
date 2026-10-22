import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMe } from "@/lib/session";
import { loadBoard } from "@/lib/board";
import { displayName, fmtDateTime } from "@/lib/format";
import { Avatar, SlaBadge, StatusPill, UrgentTag } from "@/components/Badges";
import { slaFor } from "@/lib/sla";
import type { ListParams } from "@/lib/tickets";
import type { Activity, ChecklistItem, Comment, Ticket, TicketFile, TimeEntry, Timer as TimerRow } from "@/lib/types";
import { Shell } from "../Shell";
import { ListView, Split } from "../Views";
import { Body } from "./Body";
import { BriefSection } from "./BriefSection";
import { Checklist } from "./Checklist";
import { ActionBar, DeleteTicket, Fields } from "./Fields";
import { Transitions } from "./Transitions";
import { Files } from "./Files";
import { Timeline } from "./Timeline";
import { TimeLog } from "./TimeLog";
import { Tools } from "./Tools";

export default async function TicketPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ListParams>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const listParams = await searchParams;
  const { supabase, profile } = await getMe();

  const [b, { data: t }, { data: files }, { data: comments }, { data: activity }, { data: checklist }, { data: time }, { data: timers }] = await Promise.all([
    loadBoard(listParams),
    supabase.from("tickets").select("*").eq("id", id).maybeSingle<Ticket>(),
    supabase.from("ticket_files").select("*").eq("ticket_id", id).order("created_at"),
    supabase.from("comments").select("*").eq("ticket_id", id).order("created_at"),
    supabase.from("activity").select("*").eq("ticket_id", id).order("created_at"),
    supabase.from("checklist_items").select("*").eq("ticket_id", id).order("position"),
    supabase.from("time_entries").select("*").eq("ticket_id", id).order("spent_on").order("created_at"),
    // Cronometrele: al meu oriunde ar fi pornit, plus ale celorlalți de pe
    // tichetul ăsta. Al meu de pe alt tichet contează, ca să pot fi avertizat
    // înainte să pornesc un al doilea.
    supabase.from("timers").select("profile_id, ticket_id, started_at").or(`profile_id.eq.${profile?.id ?? ""},ticket_id.eq.${id}`),
  ]);
  if (!t || !profile) notFound();

  const isAdmin = profile.role === "admin";
  const inSplit = b.view === "lista";
  const dept = t.department_id ? b.deptById[t.department_id] : undefined;
  const lead = dept?.lead_id ? b.peopleById[dept.lead_id] : undefined;
  const canApprove = isAdmin || (!!lead?.active && lead.id === profile.id);
  const client = t.client_id ? b.clients.find((c) => c.id === t.client_id) : undefined;
  const allTimers = (timers ?? []) as TimerRow[];
  const timerMine = allTimers.find((x) => x.profile_id === profile.id) ?? null;
  const timerOthers = allTimers.filter((x) => x.ticket_id === t.id && x.profile_id !== profile.id);
  const sla = slaFor(t, b.sla);

  const detail = (
    <div className="p-5 sm:p-8">
      <Link href={`/tichete${b.qs}`} className={`mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg ${inSplit ? "lg:hidden" : ""}`}>
        <ArrowLeft size={15} /> Toate tichetele
      </Link>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-muted">#{t.id}</span>
        {client && (
          <Link href={`/clienti/${client.id}`} className="text-sm font-semibold text-muted hover:text-fg">{client.name} →</Link>
        )}
        <StatusPill status={t.status} />
        {t.priority === "urgent" && t.status !== "gata" && <UrgentTag />}
        <SlaBadge clock={sla} />
        <span className="ml-auto text-xs text-muted">{fmtDateTime(t.created_at)}</span>
      </div>
      {/* Solicitant și agent, unul lângă altul. Datele existau dinainte
          (`created_by` și `assignee_id`), dar pagina spunea doar „Deschis de X"
          undeva în colț - iar cine răspunde de tichet e prima întrebare pe care
          o pune oricine îl deschide. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-raise px-3 py-2 text-sm">
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Solicitant</span>
          <Avatar person={b.peopleById[t.created_by]} size={20} />
          <span className="font-semibold">{displayName(b.peopleById[t.created_by])}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Agent</span>
          <Avatar person={t.assignee_id ? b.peopleById[t.assignee_id] : null} size={20} />
          <span className={t.assignee_id ? "font-semibold" : "text-muted"}>
            {t.assignee_id ? displayName(b.peopleById[t.assignee_id]) : "neatribuit"}
          </span>
        </span>
        {t.first_response_at && (
          <span className="text-xs text-muted">Primul răspuns · {fmtDateTime(t.first_response_at)}</span>
        )}
      </div>
      <Transitions t={t} meId={profile.id} canApprove={canApprove} approverName={lead?.active ? displayName(lead) : "admin"} />
      <ActionBar t={t} canApprove={canApprove} approverName={lead?.active ? displayName(lead) : "admin"} />
      <div className="space-y-10">
        <Body t={t} fields={<Fields t={t} clients={b.clients} people={b.people} departments={b.departments} canApprove={canApprove} />} />
        <BriefSection ticketId={t.id} brief={t.brief} />
        <Checklist ticketId={t.id} items={(checklist ?? []) as ChecklistItem[]} />
        <Files ticketId={t.id} files={(files ?? []) as TicketFile[]} people={b.peopleById} meId={profile.id} isAdmin={isAdmin} />
        <Timeline ticketId={t.id} comments={(comments ?? []) as Comment[]} activity={(activity ?? []) as Activity[]} people={b.peopleById} meId={profile.id} isAdmin={isAdmin} />
        <TimeLog
          ticketId={t.id}
          entries={(time ?? []) as TimeEntry[]}
          people={b.peopleById}
          meId={profile.id}
          isAdmin={isAdmin}
          timerMine={timerMine}
          timerOthers={timerOthers}
        />
        <div className="space-y-4 border-t border-line pt-6">
          <Tools ticketId={t.id} title={t.title} isAdmin={isAdmin} />
          {(isAdmin || t.created_by === profile.id) && <DeleteTicket id={t.id} />}
        </div>
      </div>
    </div>
  );

  if (!inSplit) {
    return <div className="mx-auto max-w-4xl rounded-2xl border border-line bg-panel">{detail}</div>;
  }
  return (
    <Shell b={b} params={listParams} detail>
      <Split list={<ListView b={b} activeId={id} />} detail={detail} />
    </Shell>
  );
}
