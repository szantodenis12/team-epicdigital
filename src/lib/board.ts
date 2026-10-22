import "server-only";
import { cookies } from "next/headers";
import { getMe } from "@/lib/session";
import { loadLookups } from "@/lib/data";
import { daysAgoISO } from "@/lib/format";
import { filterTickets, listQuery, parseView, type ListParams } from "@/lib/tickets";
import type { Ticket } from "@/lib/types";

// Datele pentru oricare dintre vederi (listă, bilete, calendar).
export async function loadBoard(p: ListParams) {
  const { supabase, user } = await getMe();
  const [{ people, clients, departments, memberOf, sla }, { data }, jar] = await Promise.all([
    loadLookups(supabase),
    // „Gata" rămâne la vedere 90 de zile.
    supabase.from("tickets").select("*").or(`status.neq.gata,updated_at.gte.${daysAgoISO(90)}`),
    cookies(),
  ]);
  const clientNames = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));
  const myDepts = memberOf[user.id] ?? [];
  const { tab, counts, rows } = filterTickets((data ?? []) as Ticket[], p, user.id, myDepts, clientNames);
  return {
    view: parseView(jar.get("view")?.value),
    tab,
    counts,
    rows,
    people,
    clients,
    clientNames,
    departments,
    deptById: Object.fromEntries(departments.map((d) => [d.id, d])),
    memberOf,
    sla,
    me: user.id,
    peopleById,
    qs: listQuery(p),
  };
}

export type Board = Awaited<ReturnType<typeof loadBoard>>;
