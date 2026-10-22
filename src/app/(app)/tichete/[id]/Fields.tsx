"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteTicket, updateTicket } from "@/app/actions/tickets";
import { deadlineTone } from "@/components/Badges";
import { STATUS_TONE } from "@/lib/colors";
import { displayName } from "@/lib/format";
import { PRIORITIES, STATUSES, TYPES, type Client, type Department, type Profile, type Ticket } from "@/lib/types";

const control = "w-full cursor-pointer appearance-none bg-transparent text-[15px] font-semibold outline-none";

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-xl bg-raise px-3 py-2 transition focus-within:ring-1 focus-within:ring-emerald/50 hover:bg-[#202924]">
      <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}

// Câmpurile tichetului; orice schimbare se salvează pe loc.
export function Fields({ t, clients, people, departments, canApprove }: {
  t: Ticket;
  clients: Client[];
  people: Profile[];
  departments: Department[];
  canApprove: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const save = (patch: Parameters<typeof updateTicket>[1]) =>
    start(async () => {
      try {
        await updateTicket(t.id, patch);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Eroare.");
      }
    });

  return (
    <div className={pending ? "opacity-70" : ""}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Status">
          <select className={control} style={{ color: STATUS_TONE[t.status] }} value={t.status} onChange={(e) => save({ status: e.target.value as Ticket["status"] })}>
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key} disabled={s.key === "gata" && !canApprove && t.status !== "gata"}>
                {s.label}{s.key === "gata" && !canApprove ? " (aprobă șeful)" : ""}
              </option>
            ))}
          </select>
        </Tile>
        <Tile label="Cine se ocupă">
          <select className={control} value={t.assignee_id ?? ""} onChange={(e) => save({ assignee_id: e.target.value || null })}>
            <option value="">Neatribuit</option>
            {people.filter((p) => p.active || p.id === t.assignee_id).map((p) => (
              <option key={p.id} value={p.id}>{displayName(p)}</option>
            ))}
          </select>
        </Tile>
        <Tile label="Termen">
          <input
            key={t.deadline ?? ""}
            type="date"
            className={`${control} ${deadlineTone(t.deadline, t.status === "gata")}`}
            defaultValue={t.deadline ?? ""}
            onBlur={(e) => (e.target.value || null) !== t.deadline && save({ deadline: e.target.value || null })}
          />
        </Tile>
        <Tile label="Client">
          <select className={control} value={t.client_id ?? ""} onChange={(e) => save({ client_id: e.target.value || null })}>
            <option value="">Intern (Epic)</option>
            {clients.filter((c) => c.active || c.id === t.client_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Tile>
        <Tile label="Departament">
          <select
            className={control}
            style={{ color: departments.find((d) => d.id === t.department_id)?.color }}
            value={t.department_id ?? ""}
            onChange={(e) => save({ department_id: e.target.value || null })}
          >
            <option value="">Fără</option>
            {departments.filter((d) => d.active || d.id === t.department_id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Tile>
        <Tile label="Tip">
          <select className={control} value={t.type} onChange={(e) => save({ type: e.target.value as Ticket["type"] })}>
            {TYPES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
        </Tile>
        <Tile label="Prioritate">
          <select
            className={`${control} ${t.priority === "urgent" ? "text-danger" : ""}`}
            value={t.priority}
            onChange={(e) => save({ priority: e.target.value as Ticket["priority"] })}
          >
            {PRIORITIES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
        </Tile>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function DeleteTicket({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="flex items-center gap-1.5 text-xs text-muted hover:text-danger"
      onClick={() => confirm(`Ștergi definitiv #${id} cu tot cu fișiere?`) && start(() => deleteTicket(id))}
    >
      <Trash2 size={13} /> Șterge tichetul
    </button>
  );
}

// Bara de sus: „preiau eu" pe tichetele nimănui și aprobarea celor din Review.
export function ActionBar({ t, canApprove, approverName }: {
  t: Ticket;
  canApprove: boolean;
  approverName: string;
}) {
  /* Doar contextul, nu și butoanele: pașii se apasă din `Transitions`, de
     deasupra. Banda asta rămâne pentru ce un buton nu poate spune - cine
     trebuie să aprobe, când nu ești tu acela. */
  const bar = "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm";
  let content: React.ReactNode = null;
  if (t.status === "review") {
    content = (
      <div className={`${bar} border-warn/40 bg-warn/10 text-warn`}>
        {canApprove ? "Așteaptă aprobarea ta." : `Trimis la aprobare. Așteaptă OK de la ${approverName}.`}
      </div>
    );
  }
  if (!content) return null;
  return <div className="mb-5">{content}</div>;
}
