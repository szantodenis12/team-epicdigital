"use client";

import { useState, useTransition } from "react";
import { setSchedule } from "@/app/actions/team";
import { fmtMinutes } from "@/lib/format";
import { DAYS, DEFAULT_SCHEDULE, cleanSchedule, weekMinutes, type Schedule } from "@/lib/schedule";
import { userMessage } from "@/lib/errors";

const PRESETS: { label: string; s: Schedule }[] = [
  { label: "L–V 9–17", s: DEFAULT_SCHEDULE },
  { label: "L–V 10–18", s: [...Array(5).fill(["10:00", "18:00"]), null, null] },
  { label: "L–V 9–13", s: [...Array(5).fill(["09:00", "13:00"]), null, null] },
];

// Din jumătate în jumătate de oră, 06:00 → 23:30. Ora 24h arată la fel pe orice telefon.
const TIMES = Array.from({ length: 36 }, (_, i) => `${String(6 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = TIMES.includes(value) ? TIMES : [...TIMES, value].sort();
  return (
    <select className="field !w-auto !py-1 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

export function ScheduleEditor({ userId, schedule, onDone }: { userId: string; schedule: Schedule; onDone?: () => void }) {
  const [days, setDays] = useState<Schedule>(schedule);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const set = (i: number, slot: Schedule[number]) => setDays((d) => d.map((x, j) => (j === i ? slot : x)));
  const clean = cleanSchedule(days);
  const invalid = days.some((d, i) => d && !clean[i]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted hover:text-fg" onClick={() => setDays(p.s)}>
            {p.label}
          </button>
        ))}
      </div>
      <ul className="space-y-1.5">
        {days.map((slot, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <label className="flex w-24 shrink-0 items-center gap-2">
              <input
                type="checkbox"
                className="accent-emerald"
                checked={!!slot}
                onChange={(e) => set(i, e.target.checked ? ["09:00", "17:00"] : null)}
              />
              <span className={slot ? "" : "text-muted"}>{DAYS[i]}</span>
            </label>
            {slot ? (
              <>
                <TimeSelect value={slot[0]} onChange={(v) => set(i, [v, slot[1]])} />
                <span className="text-muted">–</span>
                <TimeSelect value={slot[1]} onChange={(v) => set(i, [slot[0], v])} />
                {!clean[i] && <span className="text-xs text-danger">finalul e înainte de început</span>}
              </>
            ) : (
              <span className="text-xs text-muted">liber</span>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn"
          disabled={pending || invalid}
          onClick={() =>
            start(async () => {
              try {
                await setSchedule(userId, days);
                setMsg({ ok: "Salvat." });
                onDone?.();
              } catch (e) {
                setMsg({ error: userMessage(e, "Eroare.") });
              }
            })
          }
        >
          Salvează programul
        </button>
        {onDone && <button type="button" className="btn-ghost" onClick={onDone}>Renunță</button>}
        <span className="text-sm text-muted">{fmtMinutes(weekMinutes(clean))} pe săptămână</span>
        {msg.ok && <span className="text-sm text-forest">{msg.ok}</span>}
        {msg.error && <span className="text-sm text-danger">{msg.error}</span>}
      </div>
    </div>
  );
}
