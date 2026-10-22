import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, MousePointerClick } from "lucide-react";
import type { Board } from "@/lib/board";
import { Avatar, ClientName, DeadlineText, StatusPill } from "@/components/Badges";
import { tone } from "@/lib/colors";
import { daysUntil, todayISO } from "@/lib/format";
import { listQuery, type ListParams } from "@/lib/tickets";
import type { Ticket } from "@/lib/types";

function DeptTag({ b, t }: { b: Board; t: Ticket }) {
  const d = t.department_id ? b.deptById[t.department_id] : undefined;
  if (!d) return null;
  return (
    <span className="rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wider" style={{ color: d.color, backgroundColor: `${d.color}1f` }}>
      {d.name}
    </span>
  );
}

const MONTHS = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
const WEEKDAYS = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];

const href = (b: Board, t: Ticket) => `/tichete/${t.id}${b.qs}`;

function Empty() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-sm text-muted">
      <Inbox size={22} />
      Niciun tichet aici.
    </div>
  );
}

// ───────── Listă (stânga) + detalii (dreapta) ─────────

export function Split({ list, detail }: { list: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div className="flex overflow-hidden rounded-2xl border border-line bg-panel lg:h-full">
      <aside className={`${detail ? "hidden lg:block" : "block"} w-full overflow-y-auto border-line lg:w-[400px] lg:shrink-0 lg:border-r`}>
        {list}
      </aside>
      <section className={`${detail ? "block" : "hidden lg:block"} min-w-0 flex-1 overflow-y-auto`}>
        {detail ?? <Welcome />}
      </section>
    </div>
  );
}

function Welcome() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center text-muted">
      <MousePointerClick size={28} />
      <p className="text-sm">Alege un tichet din listă și îl vezi aici.</p>
    </div>
  );
}

export function ListView({ b, activeId }: { b: Board; activeId?: number }) {
  if (!b.rows.length) return <Empty />;
  return (
    <ul>
      {b.rows.map((t) => {
        const sel = t.id === activeId;
        const done = t.status === "gata";
        return (
          <li key={t.id}>
            <Link
              href={href(b, t)}
              className={`block border-b border-l-[3px] border-b-line/70 px-4 py-3.5 transition ${
                sel ? "border-l-emerald bg-emerald/[.07]" : "border-l-transparent hover:bg-raise/60"
              } ${done ? "opacity-60" : ""}`}
            >
              <div className="mb-1 flex justify-between gap-3 text-xs text-muted">
                <ClientName name={t.client_id ? b.clientNames[t.client_id] : undefined} />
                <span className="flex shrink-0 items-center gap-2">
                  <DeptTag b={b} t={t} />
                  <span className="font-mono">#{t.id}</span>
                </span>
              </div>
              <p className={`mb-2 text-[15px] font-semibold leading-snug ${done ? "line-through decoration-muted/50" : ""}`}>
                {t.priority === "urgent" && !done && <span className="mr-1.5 text-danger">●</span>}
                {t.title}
              </p>
              <div className="flex items-center justify-between gap-2">
                <DeadlineText deadline={t.deadline} done={done} />
                <span className="flex items-center gap-2">
                  <StatusPill status={t.status} />
                  <Avatar person={t.assignee_id ? b.peopleById[t.assignee_id] : null} size={24} />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ───────── Bilete ─────────

function stubLook(t: Ticket) {
  if (t.status === "gata") return { cls: "bg-forest text-fg", top: "gata" };
  if (!t.deadline) return { cls: "bg-raise text-muted", top: "fără" };
  const d = daysUntil(t.deadline);
  if (d < 0) return { cls: "bg-danger text-bg", top: "întârziat" };
  if (d === 0) return { cls: "bg-danger text-bg", top: "azi" };
  if (d <= 2) return { cls: "bg-warn text-bg", top: d === 1 ? "mâine" : "termen" };
  return { cls: "bg-fg text-bg", top: "termen" };
}

export function StubsView({ b }: { b: Board }) {
  if (!b.rows.length) return <Empty />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {b.rows.map((t) => {
        const look = stubLook(t);
        const client = t.client_id ? b.clientNames[t.client_id] : undefined;
        const person = t.assignee_id ? b.peopleById[t.assignee_id] : null;
        return (
          <Link key={t.id} href={href(b, t)} className="group flex transition hover:-translate-y-0.5">
            <div className="stub-body min-w-0 flex-1 rounded-l-xl bg-raise px-4 py-4 transition group-hover:bg-[#202924]">
              <div className="flex justify-between gap-3 text-[11px] font-bold uppercase tracking-wider">
                <span className="truncate" style={{ color: client ? tone(client) : "var(--muted)" }}>{client ?? "Intern"}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <DeptTag b={b} t={t} />
                  <span className="font-mono font-medium text-muted">#{t.id}</span>
                </span>
              </div>
              <p className="my-2.5 line-clamp-2 font-display text-[15px] font-semibold leading-snug">{t.title}</p>
              <div className="flex items-center gap-2 text-sm text-muted">
                <Avatar person={person} size={24} />
                <span className="truncate">{person ? person.full_name.split(" ")[0] || person.email : "Neatribuit"}</span>
                <span className="ml-auto"><StatusPill status={t.status} /></span>
              </div>
            </div>
            <div className={`stub-side flex w-24 shrink-0 flex-col items-center justify-center rounded-r-xl border-l-2 border-dashed border-bg/40 px-1 text-center ${look.cls}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider">{look.top}</span>
              {t.deadline ? (
                <>
                  <span className="font-display text-[26px] font-bold leading-none">{t.deadline.slice(8, 10)}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{MONTHS[Number(t.deadline.slice(5, 7)) - 1].slice(0, 3)}</span>
                </>
              ) : (
                <span className="font-display text-xl font-bold leading-tight">—</span>
              )}
              {t.priority === "urgent" && t.status !== "gata" && <span className="mt-1 text-[10px] font-bold uppercase">urgent</span>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ───────── Calendar ─────────

function CalendarChip({ b, t, today }: { b: Board; t: Ticket; today: string }) {
  const client = t.client_id ? b.clientNames[t.client_id] : undefined;
  const person = t.assignee_id ? b.peopleById[t.assignee_id] : null;
  const done = t.status === "gata";
  const late = !done && t.deadline! < today;
  return (
    <Link
      href={href(b, t)}
      title={`#${t.id} ${t.title}\n${client ?? "Intern"} · ${person?.full_name || "Neatribuit"}${t.department_id ? ` · ${b.deptById[t.department_id]?.name}` : ""}`}
      className={`flex items-center gap-1.5 rounded-md border-l-[3px] bg-raise px-1.5 py-1 text-xs transition hover:bg-[#232c27] ${done ? "opacity-50" : ""}`}
      style={{ borderLeftColor: client ? tone(client) : "var(--muted)" }}
    >
      {t.priority === "urgent" && !done && <span className="size-1.5 shrink-0 rounded-full bg-danger" />}
      <span className={`min-w-0 flex-1 truncate ${late ? "text-danger" : ""} ${done ? "line-through" : ""}`}>{t.title}</span>
      <Avatar person={person} size={16} />
    </Link>
  );
}

export function CalendarView({ b, params }: { b: Board; params: ListParams }) {
  const today = todayISO();
  const month = /^\d{4}-\d{2}$/.test(params.luna ?? "") ? params.luna! : today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => new Date(Date.UTC(y, m - 1, 1 - offset + i)).toISOString().slice(0, 10));

  const byDay: Record<string, Ticket[]> = {};
  for (const t of b.rows) if (t.deadline) (byDay[t.deadline] ??= []).push(t);
  const noDate = b.rows.filter((t) => !t.deadline);
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    return `/tichete${listQuery(params, { luna: d.toISOString().slice(0, 7) })}`;
  };
  const daysWithTickets = cells.filter((d) => d.startsWith(month) && byDay[d]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="mr-2 font-display text-lg font-bold">{MONTHS[m - 1]} {y}</h2>
        <Link href={shift(-1)} className="btn-ghost !p-1.5" aria-label="Luna trecută"><ChevronLeft size={16} /></Link>
        <Link href={`/tichete${listQuery(params, { luna: undefined })}`} className="btn-ghost !px-3 !py-1.5">Azi</Link>
        <Link href={shift(1)} className="btn-ghost !p-1.5" aria-label="Luna viitoare"><ChevronRight size={16} /></Link>
      </div>

      {/* Desktop: grila lunii */}
      <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
        <div className="grid grid-cols-7 border-b border-line bg-panel">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const inMonth = d.startsWith(month);
            const list = byDay[d] ?? [];
            const weekend = i % 7 >= 5;
            return (
              <div
                key={d}
                className={`min-h-28 border-line p-1.5 ${i % 7 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""} ${
                  weekend ? "bg-panel/60" : "bg-bg"
                } ${inMonth ? "" : "opacity-40"}`}
              >
                <div className="mb-1 flex justify-end px-1">
                  <span
                    className={`grid size-6 place-items-center rounded-full text-xs ${
                      d === today ? "bg-emerald font-bold text-bg" : "text-muted"
                    }`}
                  >
                    {Number(d.slice(8))}
                  </span>
                </div>
                <div className="space-y-1">
                  {list.slice(0, 4).map((t) => <CalendarChip key={t.id} b={b} t={t} today={today} />)}
                  {list.length > 4 && <p className="px-1.5 text-[11px] text-muted">+{list.length - 4} încă</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Telefon: agendă pe zile */}
      <div className="space-y-4 md:hidden">
        {daysWithTickets.length === 0 && <Empty />}
        {daysWithTickets.map((d) => (
          <div key={d}>
            <p className={`mb-1.5 text-xs font-semibold uppercase tracking-wider ${d === today ? "text-emerald" : "text-muted"}`}>
              {WEEKDAYS[(new Date(d).getUTCDay() + 6) % 7]} {Number(d.slice(8))} {MONTHS[m - 1].slice(0, 3)}
              {d === today && " · azi"}
            </p>
            <div className="space-y-1.5">
              {byDay[d].map((t) => <CalendarChip key={t.id} b={b} t={t} today={today} />)}
            </div>
          </div>
        ))}
      </div>

      {noDate.length > 0 && (
        <div className="rounded-2xl border border-line bg-panel p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Fără termen · {noDate.length}</p>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
            {noDate.map((t) => <CalendarChip key={t.id} b={b} t={t} today={today} />)}
          </div>
        </div>
      )}
    </div>
  );
}
