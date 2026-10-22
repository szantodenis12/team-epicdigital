import type { Priority, Ticket } from "@/lib/types";

/** Termenele pe prioritate, din tabelul `sla_policies`. */
export type SlaPolicy = { priority: Priority; response_mins: number; resolve_mins: number };
export type SlaPolicies = Record<Priority, SlaPolicy>;

export const DEFAULT_SLA: SlaPolicies = {
  urgent: { priority: "urgent", response_mins: 120, resolve_mins: 480 },
  normal: { priority: "normal", response_mins: 480, resolve_mins: 4320 },
  scazut: { priority: "scazut", response_mins: 1440, resolve_mins: 10080 },
};

export type SlaState = "ok" | "aproape" | "depasit" | "indeplinit";

export type SlaClock = {
  /** Ce măsoară: primul răspuns sau rezolvarea. */
  kind: "raspuns" | "rezolvare";
  state: SlaState;
  /** Minute rămase până la termen; negativ înseamnă depășit. */
  minutesLeft: number;
  dueAt: Date;
  /** Momentul în care a fost îndeplinit, dacă a fost. */
  metAt: Date | null;
};

/* Un tichet are DOUĂ ceasuri, dar numai unul contează la un moment dat.

   Cât nu a răspuns nimeni, ceasul care contează e al răspunsului. După primul
   răspuns rămâne cel al rezolvării. După „gata" nu mai contează niciunul, dar
   păstrăm starea finală ca să se vadă în rapoarte dacă s-a încadrat sau nu. */
export function slaFor(t: Ticket, policies: SlaPolicies, now = new Date()): SlaClock {
  const policy = policies[t.priority] ?? DEFAULT_SLA[t.priority];
  const opened = new Date(t.created_at);
  const responded = t.first_response_at ? new Date(t.first_response_at) : null;
  const resolved = t.resolved_at ? new Date(t.resolved_at) : null;

  const clock = (kind: SlaClock["kind"], mins: number, metAt: Date | null): SlaClock => {
    const dueAt = new Date(opened.getTime() + mins * 60_000);
    // Îndeplinit se judecă față de momentul îndeplinirii, nu față de „acum":
    // un tichet rezolvat la timp acum trei săptămâni nu devine depășit între timp.
    const against = metAt ?? now;
    const minutesLeft = Math.round((dueAt.getTime() - against.getTime()) / 60_000);
    let state: SlaState;
    if (metAt) state = minutesLeft < 0 ? "depasit" : "indeplinit";
    else if (minutesLeft < 0) state = "depasit";
    else if (minutesLeft <= Math.max(15, mins * 0.2)) state = "aproape";
    else state = "ok";
    return { kind, state, minutesLeft, dueAt, metAt };
  };

  if (!responded) return clock("raspuns", policy.response_mins, null);
  return clock("rezolvare", policy.resolve_mins, resolved);
}

/** „2h 15m", „-45m" (depășit), „3 zile". Scurt, pentru insignă. */
export function fmtLeft(minutes: number) {
  const neg = minutes < 0;
  const m = Math.abs(minutes);
  const out =
    m >= 2880 ? `${Math.round(m / 1440)} zile` : m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;
  return neg ? `+${out}` : out;
}

export const SLA_LABEL: Record<SlaClock["kind"], string> = {
  raspuns: "Răspuns",
  rezolvare: "Rezolvare",
};

// Tokenii din globals.css: --color-warn, --color-danger, --color-emerald.
export const SLA_TONE: Record<SlaState, string> = {
  ok: "text-muted",
  aproape: "text-warn",
  depasit: "text-danger",
  indeplinit: "text-emerald",
};
