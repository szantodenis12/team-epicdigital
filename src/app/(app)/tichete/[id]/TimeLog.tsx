"use client";

import { useState, useTransition } from "react";
import { CalendarDays, X } from "lucide-react";
import { addTime, deleteTime } from "@/app/actions/tickets";
import { displayName, fmtDate, fmtMinutes, todayISO } from "@/lib/format";
import type { Profile, TimeEntry, Timer as TimerRow } from "@/lib/types";
import { Timer } from "./Timer";
import { userMessage } from "@/lib/errors";

const QUICK = [15, 30, 60, 120];

// „1h30", „1:30", „90", „1.5h" → minute
function parseDuration(raw: string) {
  const v = raw.trim().toLowerCase().replace(",", ".");
  let m = v.match(/^(\d+(?:\.\d+)?)\s*h(?:\s*(\d+)\s*m?)?$/);
  if (m) return Math.round(Number(m[1]) * 60 + Number(m[2] ?? 0));
  m = v.match(/^(\d+):(\d{1,2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = v.match(/^(\d+)\s*m?$/);
  if (m) return Number(m[1]);
  return NaN;
}

export function TimeLog({ ticketId, entries, people, meId, isAdmin, timerMine, timerOthers }: {
  ticketId: number;
  entries: TimeEntry[];
  people: Record<string, Profile>;
  meId: string;
  isAdmin: boolean;
  timerMine: TimerRow | null;
  timerOthers: TimerRow[];
}) {
  const [pending, start] = useTransition();
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  /* O singură dată pentru tot blocul, nu una per buton: și „+30m", și ora
     scrisă de mână se trec pe ziua aleasă aici. Altfel ai apăsa „+30m"
     crezând că merge pe ieri, cum ai setat mai jos, și s-ar duce pe azi. */
  const azi = todayISO();
  const [data, setData] = useState(azi);
  const total = entries.reduce((n, e) => n + e.minutes, 0);

  const log = (minutes: number) =>
    start(async () => {
      try {
        await addTime(ticketId, minutes, note, data === azi ? undefined : data);
        setCustom("");
        setNote("");
        setError("");
      } catch (e) {
        setError(userMessage(e, "Eroare."));
      }
    });

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
        Timp lucrat {total > 0 && <span className="ml-1 text-fg">{fmtMinutes(total)}</span>}
      </h2>
      <Timer ticketId={ticketId} mine={timerMine} others={timerOthers} people={people} />
      {entries.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm">
          {entries.map((e) => (
            <li key={e.id} className="group flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-raise">
              <span className="w-16 shrink-0 font-semibold">{fmtMinutes(e.minutes)}</span>
              <span className="min-w-0 flex-1 truncate text-muted">
                {displayName(people[e.profile_id])} · {fmtDate(e.spent_on)}{e.note && ` · ${e.note}`}
              </span>
              {(isAdmin || e.profile_id === meId) && (
                <button className="text-muted opacity-0 hover:text-danger group-hover:opacity-100" aria-label="Șterge" onClick={() => start(() => deleteTime(e.id, ticketId))}>
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {QUICK.map((m) => (
          <button key={m} className="btn-ghost !px-3 !py-1.5 text-sm" disabled={pending} onClick={() => log(m)}>+{fmtMinutes(m)}</button>
        ))}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const m = parseDuration(custom);
            if (Number.isNaN(m)) setError("Scrie ca 1h30, 45 sau 2:15.");
            else log(m);
          }}
        >
          <input className="field !w-24 !py-1.5 text-sm" placeholder="1h30" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button className="btn-ghost !py-1.5 text-sm" disabled={pending || !custom}>Adaugă</button>
        </form>
        <input className="field !py-1.5 text-sm sm:max-w-64" placeholder="Pe ce (opțional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <label className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 text-sm transition ${
          data === azi ? "border-line text-muted" : "border-emerald/60 bg-emerald/10 text-emerald"
        }`}>
          <CalendarDays size={14} />
          <span className="sr-only">Ziua în care ai lucrat</span>
          <input
            type="date"
            className="bg-transparent text-sm outline-none [color-scheme:inherit]"
            value={data}
            max={azi}
            onChange={(e) => setData(e.target.value || azi)}
          />
        </label>
        {data !== azi && (
          <button type="button" className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline" onClick={() => setData(azi)}>
            înapoi la azi
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  );
}
