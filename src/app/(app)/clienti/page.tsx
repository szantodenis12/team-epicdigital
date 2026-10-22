import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { getMe } from "@/lib/session";
import { loadLookups } from "@/lib/data";
import { tone } from "@/lib/colors";
import { fmtMinutes, todayISO } from "@/lib/format";

export default async function ClientsPage() {
  const { supabase } = await getMe();
  const monthStart = todayISO().slice(0, 7) + "-01";
  const [{ clients }, { data: open }, { data: time }] = await Promise.all([
    loadLookups(supabase),
    supabase.from("tickets").select("client_id, deadline").neq("status", "gata"),
    supabase.from("time_entries").select("minutes, tickets!inner(client_id)").gte("spent_on", monthStart),
  ]);
  const today = todayISO();
  const stats: Record<string, { open: number; late: number; minutes: number }> = {};
  const of = (id: string) => (stats[id] ??= { open: 0, late: 0, minutes: 0 });
  for (const t of open ?? []) {
    if (!t.client_id) continue;
    of(t.client_id).open++;
    if (t.deadline && t.deadline < today) of(t.client_id).late++;
  }
  for (const e of (time ?? []) as unknown as { minutes: number; tickets: { client_id: string | null } }[]) {
    if (e.tickets.client_id) of(e.tickets.client_id).minutes += e.minutes;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 font-display text-2xl font-bold tracking-tight">Clienți</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clients.filter((c) => c.active).map((c) => {
          const s = stats[c.id] ?? { open: 0, late: 0, minutes: 0 };
          return (
            <Link key={c.id} href={`/clienti/${c.id}`} className="rounded-2xl border border-line bg-panel p-4 transition hover:border-fg/30">
              <div className="mb-3 flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: tone(c.name) }} />
                <span className="flex-1 truncate font-semibold">{c.name}</span>
                {c.drive_url && <FolderOpen size={15} className="text-muted" />}
              </div>
              <div className="flex gap-5 text-sm">
                <span><b className="font-display text-lg">{s.open}</b> <span className="text-muted">deschise</span></span>
                {s.late > 0 && <span className="text-danger"><b className="font-display text-lg">{s.late}</b> întârziate</span>}
                <span className="ml-auto text-muted">{s.minutes ? `${fmtMinutes(s.minutes)} luna asta` : ""}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
