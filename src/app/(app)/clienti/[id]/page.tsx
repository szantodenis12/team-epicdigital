import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMe } from "@/lib/session";
import { loadLookups } from "@/lib/data";
import { tone } from "@/lib/colors";
import { daysAgoISO, displayName, fmtMinutes, todayISO } from "@/lib/format";
import { Avatar, DeadlineText, StatusPill } from "@/components/Badges";
import type { Ticket } from "@/lib/types";
import { ClientInfo } from "./ClientInfo";

const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getMe();
  const today = todayISO();
  const monthStart = today.slice(0, 7) + "-01";

  const [{ clients, people, departments }, { data: tickets }, { data: time }] = await Promise.all([
    loadLookups(supabase),
    supabase.from("tickets").select("*").eq("client_id", id).or(`status.neq.gata,updated_at.gte.${daysAgoISO(120)}`),
    supabase.from("time_entries").select("minutes, profile_id, tickets!inner(client_id)").eq("tickets.client_id", id).gte("spent_on", monthStart),
  ]);
  const client = clients.find((c) => c.id === id);
  if (!client) notFound();

  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));
  const deptById = Object.fromEntries(departments.map((d) => [d.id, d]));
  const all = (tickets ?? []) as Ticket[];
  const open = all.filter((t) => t.status !== "gata").sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
  const done = all.filter((t) => t.status === "gata").sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const doneThisMonth = done.filter((t) => t.updated_at.slice(0, 10) >= monthStart).length;

  const byPerson: Record<string, number> = {};
  for (const e of (time ?? []) as { minutes: number; profile_id: string }[]) byPerson[e.profile_id] = (byPerson[e.profile_id] ?? 0) + e.minutes;
  const totalMinutes = Object.values(byPerson).reduce((a, b) => a + b, 0);

  const stats = [
    { label: "Deschise", value: String(open.length) },
    { label: "Întârziate", value: String(open.filter((t) => t.deadline && t.deadline < today).length), alert: true },
    { label: `Gata în ${MONTHS[Number(today.slice(5, 7)) - 1]}`, value: String(doneThisMonth) },
    { label: `Ore în ${MONTHS[Number(today.slice(5, 7)) - 1]}`, value: totalMinutes ? fmtMinutes(totalMinutes) : "0" },
  ];

  const row = (t: Ticket) => {
    const d = t.department_id ? deptById[t.department_id] : undefined;
    return (
      <li key={t.id}>
        <Link href={`/tichete/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition hover:bg-raise/60">
          <span className="w-10 font-mono text-xs text-muted">#{t.id}</span>
          <span className={`min-w-0 flex-1 font-medium ${t.status === "gata" ? "text-muted line-through" : ""}`}>{t.title}</span>
          {d && <span className="text-xs font-semibold" style={{ color: d.color }}>{d.name}</span>}
          <DeadlineText deadline={t.deadline} done={t.status === "gata"} />
          <StatusPill status={t.status} />
          <Avatar person={t.assignee_id ? peopleById[t.assignee_id] : null} size={24} />
        </Link>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link href="/clienti" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft size={15} /> Clienți</Link>
        <div className="flex items-center gap-3">
          <span className="size-3 rounded-full" style={{ backgroundColor: tone(client.name) }} />
          <h1 className="font-display text-2xl font-bold tracking-tight">{client.name}</h1>
        </div>
      </div>

      <ClientInfo client={client} isAdmin={profile?.role === "admin"} />

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl px-4 py-3 ${s.alert && s.value !== "0" ? "bg-danger/15 text-danger" : "bg-panel"}`}>
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="font-display text-xl font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>

      {totalMinutes > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Cine a lucrat luna asta</h2>
          <div className="space-y-2">
            {Object.entries(byPerson).sort((a, b) => b[1] - a[1]).map(([pid, m]) => (
              <div key={pid} className="flex items-center gap-3 text-sm">
                <Avatar person={peopleById[pid]} size={22} />
                <span className="w-28 truncate">{displayName(peopleById[pid])}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-raise">
                  <span className="block h-full rounded-full bg-emerald" style={{ width: `${(m / totalMinutes) * 100}%` }} />
                </span>
                <span className="w-20 text-right font-semibold">{fmtMinutes(m)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">În lucru · {open.length}</h2>
        {open.length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">{open.map(row)}</ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">Nimic deschis.</p>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Făcute recent · {done.length}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">{done.slice(0, 30).map(row)}</ul>
        </section>
      )}
    </div>
  );
}
