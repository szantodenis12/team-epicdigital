import type { Ticket } from "@/lib/types";

export const VIEWS = [
  { key: "lista", label: "Listă" },
  { key: "bilete", label: "Bilete" },
  { key: "calendar", label: "Calendar" },
] as const;
export type View = (typeof VIEWS)[number]["key"];

export const TABS = [
  { key: "deschise", label: "Deschise" },
  { key: "mele", label: "Ale mele" },
  { key: "cerute", label: "Cerute de mine" },
  { key: "departament", label: "Departamentul meu" },
  { key: "neatribuite", label: "Neatribuite" },
  { key: "gata", label: "Gata" },
] as const;
export type Tab = (typeof TABS)[number]["key"];

// Filtrele stau în URL, ca un link să arate exact aceeași listă.
export type ListParams = {
  tab?: string;
  q?: string;
  client?: string;
  dep?: string;
  persoana?: string;
  prioritate?: string;
  luna?: string;
};
const PARAM_KEYS = ["tab", "q", "client", "dep", "persoana", "prioritate", "luna"] as const;

export const parseView = (v?: string): View => (VIEWS.some((x) => x.key === v) ? (v as View) : "lista");
export const parseTab = (v?: string): Tab => (TABS.some((x) => x.key === v) ? (v as Tab) : "deschise");

export function listQuery(p: ListParams, patch: Partial<ListParams> = {}) {
  const next = new URLSearchParams();
  const merged = { ...p, ...patch };
  for (const k of PARAM_KEYS) if (merged[k]) next.set(k, merged[k]!);
  const s = next.toString();
  return s ? `?${s}` : "";
}

const PRIORITY_RANK = { urgent: 0, normal: 1, scazut: 2 };

const byDeadline = (a: Ticket, b: Ticket) =>
  (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") ||
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
  b.id - a.id;

const byUpdated = (a: Ticket, b: Ticket) => b.updated_at.localeCompare(a.updated_at);

export function filterTickets(
  all: Ticket[],
  p: ListParams,
  me: string,
  myDepts: string[],
  clientNames: Record<string, string>,
) {
  const q = p.q?.trim().toLowerCase().replace(/^#/, "");
  const base = all.filter(
    (t) =>
      (!p.client || (p.client === "intern" ? !t.client_id : t.client_id === p.client)) &&
      (!p.dep || (p.dep === "fara" ? !t.department_id : t.department_id === p.dep)) &&
      (!p.persoana || (p.persoana === "neatribuit" ? !t.assignee_id : t.assignee_id === p.persoana)) &&
      (!p.prioritate || t.priority === p.prioritate) &&
      (!q ||
        t.title.toLowerCase().includes(q) ||
        String(t.id) === q ||
        (t.client_id && clientNames[t.client_id]?.toLowerCase().includes(q))),
  );
  const inTab = (tab: Tab, t: Ticket) => {
    if (tab === "gata") return t.status === "gata";
    if (t.status === "gata") return false;
    // „Ale mele" = ce lucrez (agent). „Cerute de mine" = ce am deschis
    // (solicitant). Un tichet poate fi în amândouă, dacă ți l-ai deschis singur.
    if (tab === "mele") return t.assignee_id === me;
    if (tab === "cerute") return t.created_by === me;
    if (tab === "departament") return !!t.department_id && myDepts.includes(t.department_id);
    if (tab === "neatribuite") return !t.assignee_id;
    return true;
  };

  const tab = parseTab(p.tab);
  const counts = Object.fromEntries(TABS.map((x) => [x.key, base.filter((t) => inTab(x.key, t)).length])) as Record<Tab, number>;
  const rows = base.filter((t) => inTab(tab, t)).sort(tab === "gata" ? byUpdated : byDeadline);
  return { tab, counts, rows };
}
