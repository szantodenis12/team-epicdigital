import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMe } from "@/lib/session";
import { loadLookups } from "@/lib/data";
import { tone } from "@/lib/colors";
import { displayName, fmtDate, fmtMinutes, todayISO } from "@/lib/format";
import {
  DAYS_SHORT, DEFAULT_SCHEDULE, addDaysISO, mondayOf, nowStatus, scheduledBetween, slotMinutes, type Schedule,
} from "@/lib/schedule";
import { Avatar } from "@/components/Badges";
import type { Profile } from "@/lib/types";
import { PersonSchedule } from "./PersonSchedule";

type Entry = { minutes: number; profile_id: string; spent_on: string; tickets: { client_id: string | null } };

export default async function HoursPage({ searchParams }: { searchParams: Promise<{ sapt?: string }> }) {
  const { sapt } = await searchParams;
  const { supabase, profile } = await getMe();
  const today = todayISO();
  const monday = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(sapt ?? "") ? sapt! : today);
  const sunday = addDaysISO(monday, 6);
  const week = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
  const monthStart = today.slice(0, 7) + "-01";
  const from = monday < monthStart ? monday : monthStart;
  const to = sunday > today ? sunday : today;

  const [{ people, clients }, { data }] = await Promise.all([
    loadLookups(supabase),
    supabase.from("time_entries").select("minutes, profile_id, spent_on, tickets!inner(client_id)").gte("spent_on", from).lte("spent_on", to),
  ]);
  const entries = (data ?? []) as unknown as Entry[];
  const clientName = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const isAdmin = profile?.role === "admin";

  const rows: Row[] = people.filter((p) => p.active).map((p) => {
    const schedule = p.schedule ?? DEFAULT_SCHEDULE;
    const mine = entries.filter((e) => e.profile_id === p.id);
    const inWeek = mine.filter((e) => e.spent_on >= monday && e.spent_on <= sunday);
    const perDay = week.map((d) => inWeek.filter((e) => e.spent_on === d).reduce((a, e) => a + e.minutes, 0));
    const perClient: Record<string, number> = {};
    for (const e of inWeek) {
      const k = e.tickets.client_id ? clientName[e.tickets.client_id] ?? "—" : "Intern";
      perClient[k] = (perClient[k] ?? 0) + e.minutes;
    }
    const logged = perDay.reduce((a, b) => a + b, 0);
    const planned = scheduledBetween(schedule, monday, sunday);
    const month = mine.filter((e) => e.spent_on >= monthStart && e.spent_on <= today).reduce((a, e) => a + e.minutes, 0);
    const monthPlanned = scheduledBetween(schedule, monthStart, today);
    return { p, schedule, perDay, perClient, logged, planned, month, monthPlanned, now: nowStatus(schedule) };
  });

  const weekLabel = `${fmtDate(monday).slice(0, 5)} – ${fmtDate(sunday)}`;
  const isThisWeek = monday === mondayOf(today);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Ore</h1>
          <p className="text-sm text-muted">Programul fiecăruia și orele trecute pe tichete. Orele se adaugă din tichet, la „Timp”.</p>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/ore?sapt=${addDaysISO(monday, -7)}`} className="btn-ghost !px-2" aria-label="Săptămâna trecută"><ChevronLeft size={16} /></Link>
          <Link href="/ore" className={`btn-ghost !py-1.5 text-sm ${isThisWeek ? "pointer-events-none opacity-50" : ""}`}>Săptămâna asta</Link>
          <Link href={`/ore?sapt=${addDaysISO(monday, 7)}`} className="btn-ghost !px-2" aria-label="Săptămâna următoare"><ChevronRight size={16} /></Link>
          <span className="ml-2 text-sm font-semibold">{weekLabel}</span>
        </div>
      </div>

      {/* Desktop: tabel om × zi */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-panel md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="px-4 py-3 text-left font-medium">Om</th>
              {week.map((d, i) => (
                <th key={d} className={`w-[84px] px-1 py-3 text-center font-medium ${d === today ? "text-emerald" : ""}`}>
                  {DAYS_SHORT[i]} <span className="opacity-70">{d.slice(8)}</span>
                </th>
              ))}
              <th className="w-44 px-4 py-3 text-right font-medium">Săptămâna</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.p.id} className="align-top">
                <td className="px-4 py-3"><Person r={r} canEdit={isAdmin || r.p.id === profile?.id} /></td>
                {week.map((d, i) => {
                  const slot = r.schedule[i];
                  const m = r.perDay[i];
                  return (
                    <td key={d} className={`whitespace-nowrap px-1 py-3 text-center ${slot ? "" : "bg-bg/60"}`}>
                      <p className={`font-semibold ${m ? "" : "text-muted/50"}`}>{m ? fmtMinutes(m) : "·"}</p>
                      <p className="text-[11px] text-muted">{slot ? `${slot[0]}–${slot[1]}` : "liber"}</p>
                      {slot && m > 0 && (
                        <span className="mx-auto mt-1 block h-1 w-12 overflow-hidden rounded-full bg-raise">
                          <span className="block h-full bg-emerald" style={{ width: `${Math.min(100, (m / slotMinutes(slot)) * 100)}%` }} />
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right"><Totals r={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Telefon: câte un card pe om */}
      <div className="space-y-3 md:hidden">
        {rows.map((r) => (
          <div key={r.p.id} className="rounded-2xl border border-line bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <Person r={r} canEdit={isAdmin || r.p.id === profile?.id} />
              <div className="shrink-0 text-right"><Totals r={r} /></div>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
              {week.map((d, i) => (
                <div key={d} className={`rounded-lg py-1.5 ${r.schedule[i] ? "bg-raise" : "bg-bg/60"} ${d === today ? "ring-1 ring-emerald/60" : ""}`}>
                  <p className="text-[10px] text-muted">{DAYS_SHORT[i]}</p>
                  <p className={`text-xs font-semibold ${r.perDay[i] ? "" : "text-muted/50"}`}>{r.perDay[i] ? fmtMinutes(r.perDay[i]).replace(" ", "") : "·"}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        „În program” = orele din programul fiecăruia. Orele trecute pe tichete arată pe ce s-a lucrat, nu pontajul.
        {isAdmin ? " Ca admin, poți schimba programul oricui (creionul de lângă program)." : " Îți poți schimba programul din creionul de lângă el."}
      </p>
    </div>
  );
}

type Row = {
  p: Profile;
  schedule: Schedule;
  perDay: number[];
  perClient: Record<string, number>;
  logged: number;
  planned: number;
  month: number;
  monthPlanned: number;
  now: { on: boolean; label: string };
};

function Person({ r, canEdit }: { r: Row; canEdit: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Avatar person={r.p} size={30} />
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium">
          {displayName(r.p)}
          <span className={`size-2 rounded-full ${r.now.on ? "bg-emerald" : "bg-muted/50"}`} />
        </p>
        <p className={`text-xs ${r.now.on ? "text-emerald" : "text-muted"}`}>{r.now.label}</p>
        <PersonSchedule userId={r.p.id} schedule={r.schedule} canEdit={canEdit} />
        {Object.keys(r.perClient).length > 0 && (
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
            {Object.entries(r.perClient).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, m]) => (
              <span key={name} className="flex items-center gap-1">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: tone(name) }} />
                {name} {fmtMinutes(m)}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}

function Totals({ r }: { r: Row }) {
  const pct = r.planned ? Math.min(100, Math.round((r.logged / r.planned) * 100)) : 0;
  return (
    <>
      <p className="font-display text-lg font-bold">{fmtMinutes(r.logged)}</p>
      <p className="whitespace-nowrap text-xs text-muted">din {fmtMinutes(r.planned)} în program</p>
      <span className="ml-auto mt-1.5 block h-1.5 w-24 overflow-hidden rounded-full bg-raise">
        <span className="block h-full rounded-full bg-emerald" style={{ width: `${pct}%` }} />
      </span>
      <p className="mt-2 whitespace-nowrap text-xs text-muted">Luna asta: <b className="text-fg">{fmtMinutes(r.month)}</b> / {fmtMinutes(r.monthPlanned)}</p>
    </>
  );
}
