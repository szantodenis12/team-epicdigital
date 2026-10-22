const TZ = "Europe/Bucharest";

export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

// "2026-10-21" → "21.10.2026"
export function fmtDate(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

export function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function daysUntil(iso: string) {
  const a = Date.parse(todayISO() + "T00:00:00Z");
  const b = Date.parse(iso.slice(0, 10) + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

export type DeadlineState = "overdue" | "soon" | "ok" | "none";

export function deadlineState(iso: string | null, done: boolean): DeadlineState {
  if (!iso || done) return "none";
  const d = daysUntil(iso);
  if (d < 0) return "overdue";
  if (d <= 2) return "soon";
  return "ok";
}

export function deadlineLabel(iso: string) {
  const d = daysUntil(iso);
  if (d === 0) return "azi";
  if (d === 1) return "mâine";
  if (d === -1) return "ieri";
  if (d < 0) return `întârziat ${-d} zile`;
  if (d <= 6) return `în ${d} zile`;
  return fmtDate(iso);
}

export function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function initials(name: string, email = "") {
  const src = name.trim() || email;
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function displayName(p: { full_name: string; email: string } | undefined | null) {
  if (!p) return "—";
  return p.full_name.trim() || p.email;
}

export function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

// 90 → "1h 30m", 45 → "45m", 120 → "2h"
export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}
