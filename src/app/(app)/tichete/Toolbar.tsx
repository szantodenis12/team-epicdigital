"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, List, Search, Ticket, X } from "lucide-react";
import { setView } from "@/app/actions/account";
import { displayName } from "@/lib/format";
import { TABS, VIEWS, listQuery, type ListParams, type Tab, type View } from "@/lib/tickets";
import { PRIORITIES, type Client, type Department, type Profile } from "@/lib/types";

const VIEW_ICONS = { lista: List, bilete: Ticket, calendar: CalendarDays };

function Pill({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label
      className={`relative inline-flex items-center rounded-lg border text-[13px] font-medium transition ${
        value ? "border-emerald/50 bg-emerald/10 text-emerald" : "border-line text-fg hover:border-fg/30"
      }`}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent py-1.5 pl-3 pr-8 outline-none"
      >
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 opacity-60" />
    </label>
  );
}

export function Toolbar({ view, tab, counts, clients, people, departments, params }: {
  view: View;
  tab: Tab;
  counts: Record<Tab, number>;
  clients: Client[];
  people: Profile[];
  departments: Department[];
  params: ListParams;
}) {
  const router = useRouter();
  const path = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = (patch: Partial<ListParams>) => router.replace(`${path}${listQuery(params, patch)}`);

  const [, start] = useTransition();

  const filtered = !!(params.q || params.client || params.dep || params.persoana || params.prioritate);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-panel p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => go({ tab: t.key === "deschise" ? undefined : t.key })}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === t.key ? "bg-raise text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {t.label}
              <span className="text-xs opacity-60">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl bg-panel p-1">
          {VIEWS.map((v) => {
            const Icon = VIEW_ICONS[v.key];
            return (
              <button
                key={v.key}
                onClick={() => v.key !== view && start(() => setView(v.key))}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  view === v.key ? "bg-emerald text-bg" : "text-muted hover:text-fg"
                }`}
                title={`Vezi ca ${v.label.toLowerCase()}`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-48 flex-1 items-center sm:max-w-72 sm:flex-none">
          <Search size={15} className="pointer-events-none absolute left-3 text-muted" />
          <input
            key={params.q ?? ""}
            defaultValue={params.q ?? ""}
            placeholder="Caută tichet, client sau #nr"
            className="w-full rounded-lg border border-line bg-panel py-1.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted focus:border-emerald/60"
            onChange={(e) => {
              const q = e.target.value;
              clearTimeout(timer.current);
              timer.current = setTimeout(() => go({ q: q.trim() || undefined }), 300);
            }}
          />
        </label>
        <Pill value={params.client ?? ""} onChange={(v) => go({ client: v || undefined })}>
          <option value="">Toți clienții</option>
          <option value="intern">Intern (fără client)</option>
          {clients.filter((c) => c.active).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Pill>
        <Pill value={params.dep ?? ""} onChange={(v) => go({ dep: v || undefined })}>
          <option value="">Toate departamentele</option>
          {departments.filter((d) => d.active).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
          <option value="fara">Fără departament</option>
        </Pill>
        <Pill value={params.persoana ?? ""} onChange={(v) => go({ persoana: v || undefined })}>
          <option value="">Toată echipa</option>
          <option value="neatribuit">Neatribuite</option>
          {people.filter((p) => p.active).map((p) => (
            <option key={p.id} value={p.id}>{displayName(p)}</option>
          ))}
        </Pill>
        <Pill value={params.prioritate ?? ""} onChange={(v) => go({ prioritate: v || undefined })}>
          <option value="">Orice prioritate</option>
          {PRIORITIES.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </Pill>
        {filtered && (
          <button
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition hover:text-fg"
            onClick={() => go({ q: undefined, client: undefined, dep: undefined, persoana: undefined, prioritate: undefined })}
          >
            <X size={13} /> Resetează
          </button>
        )}
      </div>
    </div>
  );
}
