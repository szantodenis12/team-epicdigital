"use client";

import { useEffect, useState, useTransition } from "react";
import { Pause, Play } from "lucide-react";
import { startTimer, stopTimer } from "@/app/actions/tickets";
import { displayName } from "@/lib/format";
import type { Profile, Timer as TimerRow } from "@/lib/types";

/** hh:mm:ss din secunde. */
function clock(seconds: number) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}:` : ""}${h > 0 ? String(m).padStart(2, "0") : m}:${String(sec).padStart(2, "0")}`;
}

/* Secundele se desenează aici, dar nu se CALCULEAZĂ aici: fiecare tic
   recitește `started_at`, ora de start trimisă de server, în loc să adune 1 la
   un contor. Un contor care se adună pe sine rămâne în urmă de fiecare dată
   când tab-ul e în fundal, pentru că browserele încetinesc temporizatoarele
   acolo - iar la un cronometru de pontaj „a rămas în urmă" înseamnă ore
   lipsă. */
function useElapsed(startedAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return 0;
  return Math.floor((now - new Date(startedAt).getTime()) / 1000);
}

export function Timer({ ticketId, mine = null, others = [], people = {} }: {
  ticketId: number;
  /** Cronometrul meu, dacă e pornit - pe acest tichet sau pe altul. */
  mine?: TimerRow | null;
  /** Cronometrele celorlalți, pe acest tichet. */
  others?: TimerRow[];
  people?: Record<string, Profile>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const onThis = mine?.ticket_id === ticketId;
  const elapsed = useElapsed(onThis && mine ? mine.started_at : null);

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      try {
        await fn();
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Eroare.");
      }
    });

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      {onThis ? (
        <>
          <span className="inline-flex items-center gap-2 rounded-lg bg-emerald/15 px-3 py-1.5 font-display text-lg font-bold tabular-nums text-emerald">
            <span className="size-2 animate-pulse rounded-full bg-emerald" />
            {clock(elapsed)}
          </span>
          <button className="btn-ghost !py-1.5 text-sm" disabled={pending} onClick={() => run(() => stopTimer(ticketId))}>
            <Pause size={14} className="mr-1.5 inline" />
            Oprește
          </button>
        </>
      ) : (
        <button className="btn-ghost !py-1.5 text-sm" disabled={pending} onClick={() => run(() => startTimer(ticketId))}>
          <Play size={14} className="mr-1.5 inline" />
          Pornește cronometrul
        </button>
      )}

      {/* Cronometrul pornit în altă parte: altfel ai porni unul nou fără să
          știi că primul se oprește, iar minutele ar părea că dispar. */}
      {mine && !onThis && (
        <span className="text-xs text-muted">
          Ai cronometrul pornit pe #{mine.ticket_id}. Dacă pornești aici, acela se oprește și timpul se salvează.
        </span>
      )}

      {others.length > 0 && (
        <span className="text-xs text-muted">
          Lucrează acum: {others.map((o) => displayName(people[o.profile_id])).join(", ")}
        </span>
      )}

      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}
