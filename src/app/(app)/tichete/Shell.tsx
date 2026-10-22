import type { Board } from "@/lib/board";
import type { ListParams } from "@/lib/tickets";
import { Toolbar } from "./Toolbar";

// Bara cu filtre deasupra oricărei vederi (pe telefon, ascunsă cât e deschis un tichet). În vederea listă, totul încape în ecran și fiecare coloană are scroll propriu.
export function Shell({ b, params, detail, children }: { b: Board; params: ListParams; detail?: boolean; children: React.ReactNode }) {
  const fill = b.view === "lista";
  return (
    <div className={`flex flex-col gap-4 ${fill ? "lg:h-[calc(100dvh-6.5rem)]" : ""}`}>
      <div className={detail ? "hidden lg:block" : ""}>
        <Toolbar view={b.view} tab={b.tab} counts={b.counts} clients={b.clients} people={b.people} departments={b.departments} params={params} />
      </div>
      <div className={fill ? "min-h-0 flex-1" : ""}>{children}</div>
    </div>
  );
}
