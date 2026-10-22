"use client";

import { useState, useTransition } from "react";
import { CheckCheck, CornerUpLeft, Hand, Pause, Play, RotateCcw, Send } from "lucide-react";
import { updateTicket } from "@/app/actions/tickets";
import { STATUS_TONE } from "@/lib/colors";
import type { Status, Ticket } from "@/lib/types";

/* Pașii, ca butoane.

   Statusul se putea schimba și înainte, dar numai dintr-un meniu derulant
   „Status" printre celelalte câmpuri - iar un meniu nu arată ca o acțiune, așa
   că nimeni nu-l citea ca pe „aici muți tichetul mai departe". Un admin a
   raportat că nu poate trece un tichet în Gata, deși baza de date îl lăsa: nu
   era o permisiune lipsă, era un buton lipsă.

   Fiecare status își propune pașii lui firești, nu toate cele cinci. Meniul
   rămâne pentru sărituri neobișnuite (din Gata direct în Blocat, de exemplu);
   astea sunt căile pe care le umblă toată lumea, zi de zi. */

type Step = {
  to: Status;
  label: string;
  Icon: typeof Play;
  /** Pasul principal al acestui status - singurul desenat plin. */
  primary?: boolean;
  /** Doar adminul sau șeful de departament îl poate face. */
  gated?: boolean;
};

const STEPS: Record<Status, Step[]> = {
  nou: [
    { to: "lucru", label: "Mă apuc", Icon: Play, primary: true },
    { to: "blocat", label: "Blochează", Icon: Pause },
  ],
  lucru: [
    { to: "review", label: "Trimite la review", Icon: Send, primary: true },
    { to: "gata", label: "Gata, fără review", Icon: CheckCheck, gated: true },
    { to: "blocat", label: "Blochează", Icon: Pause },
  ],
  review: [
    { to: "gata", label: "Aprobă, e gata", Icon: CheckCheck, primary: true, gated: true },
    { to: "lucru", label: "Mai e de lucru", Icon: CornerUpLeft },
  ],
  gata: [{ to: "lucru", label: "Redeschide", Icon: RotateCcw }],
  blocat: [
    { to: "lucru", label: "Reia lucrul", Icon: Play, primary: true },
    { to: "nou", label: "Înapoi în Nou", Icon: CornerUpLeft },
  ],
};

export function Transitions({ t, meId, canApprove, approverName }: {
  t: Ticket;
  meId: string;
  canApprove: boolean;
  approverName: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const go = (patch: Parameters<typeof updateTicket>[1]) =>
    start(async () => {
      try {
        await updateTicket(t.id, patch);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Eroare.");
      }
    });

  const steps = STEPS[t.status] ?? [];

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Acum: <span style={{ color: STATUS_TONE[t.status] }}>{t.status === "lucru" ? "În lucru" : t.status[0].toUpperCase() + t.status.slice(1)}</span>
        </span>

        {/* „Preiau eu" stă înaintea pașilor: cât nu are responsabil, asta e
            prima mișcare care are sens, indiferent de status. */}
        {!t.assignee_id && t.status !== "gata" && (
          <button
            className="btn !py-1.5 text-sm"
            disabled={pending}
            onClick={() => go({ assignee_id: meId, ...(t.status === "nou" && { status: "lucru" }) })}
          >
            <Hand size={14} /> Preiau eu
          </button>
        )}

        {steps.map(({ to, label, Icon, primary, gated }) => {
          const blocked = gated && !canApprove;
          return (
            <button
              key={to + label}
              className={`${primary && !blocked ? "btn" : "btn-ghost"} !py-1.5 text-sm`}
              disabled={pending || blocked}
              title={blocked ? `Doar ${approverName} poate aproba` : undefined}
              onClick={() => go({ status: to })}
            >
              <Icon size={14} /> {label}
              {blocked && <span className="ml-1 text-xs text-muted">· aprobă {approverName}</span>}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
