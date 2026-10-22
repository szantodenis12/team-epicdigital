import { loadBoard } from "@/lib/board";
import type { ListParams } from "@/lib/tickets";
import { Shell } from "./Shell";
import { CalendarView, ListView, Split, StubsView } from "./Views";

export default async function TicketsPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const b = await loadBoard(params);
  return (
    <Shell b={b} params={params}>
      {b.view === "lista" && <Split list={<ListView b={b} />} />}
      {b.view === "bilete" && <StubsView b={b} />}
      {b.view === "calendar" && <CalendarView b={b} params={params} />}
    </Shell>
  );
}
