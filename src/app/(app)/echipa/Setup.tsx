"use client";

import { useState, useTransition } from "react";
import { Pause, Play, Plus, Trash2 } from "lucide-react";
import {
  addDepartment, deleteRecurring, deleteTemplate, setDepartmentMember, setRecurringActive, updateDepartment,
} from "@/app/actions/team";
import { displayName } from "@/lib/format";
import type { Client, Department, Profile, Recurring, Template } from "@/lib/types";
import { userMessage } from "@/lib/errors";

const COLORS = ["#3CC4B4", "#E26C8A", "#E0A43A", "#4CC38A", "#B38BD1", "#E8794A", "#9BC24A", "#C9B48A"];

function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      try {
        await fn();
        setError("");
      } catch (e) {
        setError(userMessage(e, "Eroare."));
      }
    });
  return { pending, error, run };
}

// ───────── Departamente ─────────

export function Departments({ departments, people, memberOf }: {
  departments: Department[];
  people: Profile[];
  memberOf: Record<string, string[]>;
}) {
  const { pending, error, run } = useRun();
  const active = people.filter((p) => p.active);
  return (
    <div className="space-y-3">
      {departments.map((d) => (
        <div key={d.id} className={`rounded-2xl border border-line bg-panel p-4 ${d.active ? "" : "opacity-50"} ${pending ? "opacity-70" : ""}`}>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Culoare ${c}`}
                  onClick={() => c !== d.color && run(() => updateDepartment(d.id, { color: c }))}
                  className={`size-4 rounded-full transition ${c === d.color ? "ring-2 ring-fg ring-offset-2 ring-offset-panel" : "opacity-50 hover:opacity-100"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input
              key={d.name}
              defaultValue={d.name}
              className="field !w-auto flex-1 !py-1.5 font-semibold"
              style={{ color: d.color }}
              onBlur={(e) => e.target.value.trim() !== d.name && run(() => updateDepartment(d.id, { name: e.target.value.trim() }))}
            />
            <label className="flex items-center gap-2 text-sm text-muted">
              Șef (aprobă)
              <select
                className="field !w-auto !py-1.5 text-sm text-fg"
                value={d.lead_id ?? ""}
                onChange={(e) => run(() => updateDepartment(d.id, { lead_id: e.target.value || null }))}
              >
                <option value="">— doar adminul</option>
                {active.map((p) => <option key={p.id} value={p.id}>{displayName(p)}</option>)}
              </select>
            </label>
            <button className="text-xs text-muted hover:text-fg" onClick={() => run(() => updateDepartment(d.id, { active: !d.active }))}>
              {d.active ? "Arhivează" : "Reactivează"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted">Oameni:</span>
            {active.map((p) => {
              const on = (memberOf[p.id] ?? []).includes(d.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => run(() => setDepartmentMember(d.id, p.id, !on))}
                  className={`rounded-lg border px-3 py-1 text-sm transition ${on ? "text-bg" : "border-line text-muted hover:text-fg"}`}
                  style={on ? { backgroundColor: d.color, borderColor: d.color } : undefined}
                >
                  {displayName(p)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <form className="flex gap-2" action={(fd) => run(() => addDepartment(fd))}>
        <input name="name" required className="field" placeholder="Departament nou (ex. Ads)" />
        <input type="hidden" name="color" value={COLORS[departments.length % COLORS.length]} />
        <button className="btn" disabled={pending}><Plus size={15} /> Adaugă</button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

// ───────── Șabloane ─────────

export function Templates({ templates, departments }: { templates: Template[]; departments: Department[] }) {
  const { run } = useRun();
  if (!templates.length) {
    return <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">Niciun șablon. Deschide un tichet bun și apasă „Salvează ca șablon”.</p>;
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-raise">
      {templates.map((t) => {
        const d = departments.find((x) => x.id === t.department_id);
        return (
          <li key={t.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <span className="flex-1 font-medium">{t.name}</span>
            {d && <span className="text-xs font-semibold" style={{ color: d.color }}>{d.name}</span>}
            {t.brief && <span className="text-xs text-muted">cu brief</span>}
            {t.checklist.length > 0 && <span className="text-xs text-muted">{t.checklist.length} pași</span>}
            <button className="text-muted hover:text-danger" aria-label="Șterge șablonul" onClick={() => confirm(`Ștergi șablonul „${t.name}"?`) && run(() => deleteTemplate(t.id))}>
              <Trash2 size={14} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ───────── Tichete lunare ─────────

export function RecurringList({ items, clients, people }: { items: Recurring[]; clients: Client[]; people: Profile[] }) {
  const { run } = useRun();
  if (!items.length) {
    return <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">Nimic programat. Pe orice tichet, adminul are butonul „Repetă lunar”.</p>;
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-raise">
      {items.map((r) => (
        <li key={r.id} className={`flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm ${r.active ? "" : "opacity-50"}`}>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{r.title}</p>
            <p className="text-xs text-muted">
              Pe {r.day_of_month} ale lunii · termen +{r.due_days} zile
              {r.client_id && ` · ${clients.find((c) => c.id === r.client_id)?.name ?? ""}`}
              {r.assignee_id && ` · ${displayName(people.find((p) => p.id === r.assignee_id))}`}
            </p>
          </div>
          <button className="btn-ghost !px-2 !py-1" title={r.active ? "Pune pe pauză" : "Pornește"} onClick={() => run(() => setRecurringActive(r.id, !r.active))}>
            {r.active ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button className="text-muted hover:text-danger" aria-label="Șterge" onClick={() => confirm("Ștergi tichetul lunar?") && run(() => deleteRecurring(r.id))}>
            <Trash2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}
