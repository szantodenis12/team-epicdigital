import { deadlineLabel, daysUntil, initials } from "@/lib/format";
import { STATUS_TONE, tone } from "@/lib/colors";
import { fmtLeft, SLA_LABEL, SLA_TONE, type SlaClock } from "@/lib/sla";
import { STATUSES, label, type Profile, type Status } from "@/lib/types";

export function StatusPill({ status }: { status: Status }) {
  const c = STATUS_TONE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold"
      /* `${c}1f` nu mai merge: `c` e acum o variabilă CSS, nu un hex de lipit. */
      style={{ color: c, backgroundColor: `color-mix(in srgb, ${c} 12%, transparent)` }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: c }} />
      {label(STATUSES, status)}
    </span>
  );
}

export function UrgentTag() {
  return <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-bg">Urgent</span>;
}

// Roșu = întârziat sau azi, galben = în 1–2 zile.
export function deadlineTone(deadline: string | null, done: boolean) {
  if (!deadline || done) return "text-muted";
  const d = daysUntil(deadline);
  return d <= 0 ? "text-danger font-semibold" : d <= 2 ? "text-warn font-semibold" : "text-muted";
}

export function DeadlineText({ deadline, done }: { deadline: string | null; done: boolean }) {
  if (!deadline) return <span className="text-sm text-muted/60">fără termen</span>;
  return <span className={`text-sm ${deadlineTone(deadline, done)}`}>{deadlineLabel(deadline)}</span>;
}

export function ClientName({ name }: { name?: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: name ? tone(name) : "var(--muted)" }} />
      <span className="truncate">{name ?? "Intern"}</span>
    </span>
  );
}

export function Avatar({ person, size = 26 }: { person?: Profile | null; size?: number }) {
  if (!person) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-muted/50 text-muted"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        title="Neatribuit"
      >
        ?
      </span>
    );
  }
  const name = person.full_name || person.email;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-bg"
      style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: tone(name) }}
      title={name}
    >
      {initials(person.full_name, person.email).slice(0, 1)}
      {/* Poza stă PESTE inițială, nu în locul ei, și e pusă ca fundal, nu ca <img>:
          adresa semnată expiră într-o oră, iar un <img> care nu se încarcă desenează
          pictograma de imagine ruptă peste tot. Un fundal care lipsește nu desenează
          nimic, așa că rămâne inițiala - fără onError, deci merge și pe server. */}
      {person.avatar_url && (
        <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${person.avatar_url}")` }} />
      )}
    </span>
  );
}

/* Insigna de SLA.

   Arată UN singur ceas, cel care contează acum: al răspunsului cât nu a
   răspuns nimeni, al rezolvării după aceea. Două ceasuri deodată nu ajută pe
   nimeni să decidă ce face în minutul următor.

   Depășit se scrie cu „+" în loc de minus, pentru că întrebarea pe care și-o
   pune cineva care se uită la un tichet depășit nu e „cât mai am" ci „cu cât
   am întârziat". */
export function SlaBadge({ clock, compact = false }: { clock: SlaClock; compact?: boolean }) {
  const { state, kind, minutesLeft } = clock;
  if (state === "indeplinit" && compact) return null;
  const text =
    state === "indeplinit"
      ? "în termen"
      : state === "depasit"
        ? `${fmtLeft(minutesLeft)} peste`
        : fmtLeft(minutesLeft);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${SLA_TONE[state]}`}
      title={`${SLA_LABEL[kind]}: termen ${clock.dueAt.toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })}`}
    >
      {state === "depasit" && <span className="size-1.5 rounded-full bg-danger" />}
      {!compact && <span className="font-normal text-muted">{SLA_LABEL[kind]}</span>}
      {text}
    </span>
  );
}
