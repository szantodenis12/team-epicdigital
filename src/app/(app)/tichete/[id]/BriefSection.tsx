"use client";

import { useState, useTransition } from "react";
import { Clapperboard, Megaphone, Pencil } from "lucide-react";
import { updateTicket } from "@/app/actions/tickets";
import { BriefEditor, BriefView } from "@/components/Brief";
import { BRIEF_KINDS, emptyBrief, type Brief, type BriefKind } from "@/lib/brief";
import { userMessage } from "@/lib/errors";

const KIND_ICON = { social: Megaphone, productie: Clapperboard };

export function BriefSection({ ticketId, brief }: { ticketId: number; brief: Brief | null }) {
  const [draft, setDraft] = useState<Brief | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const save = (next: Brief | null) =>
    start(async () => {
      try {
        await updateTicket(ticketId, { brief: next });
        setDraft(null);
        setError("");
      } catch (e) {
        setError(userMessage(e, "Eroare."));
      }
    });

  const title = (b: Brief) => `Brief · ${BRIEF_KINDS.find((k) => k.key === b.kind)?.label}`;

  if (draft) {
    return (
      <section className="rounded-2xl border border-emerald/30 p-4 sm:p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-emerald">{title(draft)}</h2>
        <BriefEditor value={draft} onChange={setDraft} />
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn" disabled={pending} onClick={() => save(draft)}>{pending ? "Se salvează…" : "Salvează brief-ul"}</button>
          <button className="btn-ghost" onClick={() => setDraft(null)}>Renunță</button>
          {brief && (
            <button className="ml-auto text-xs text-muted hover:text-danger" onClick={() => confirm("Scoți brief-ul de pe tichet?") && save(null)}>
              Scoate brief-ul
            </button>
          )}
        </div>
      </section>
    );
  }

  if (!brief) {
    return (
      <section className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted">Adaugă brief</span>
        {BRIEF_KINDS.map((k) => {
          const Icon = KIND_ICON[k.key];
          return (
            <button key={k.key} className="btn-ghost !py-1.5 text-sm" onClick={() => setDraft(emptyBrief(k.key as BriefKind))}>
              <Icon size={14} /> {k.label}
            </button>
          );
        })}
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-raise/50 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="flex-1 text-xs font-semibold uppercase tracking-wider text-emerald">{title(brief)}</h2>
        <button className="btn-ghost !px-2 !py-1" onClick={() => setDraft(brief)} aria-label="Editează brief-ul" title="Editează brief-ul">
          <Pencil size={14} />
        </button>
      </div>
      <BriefView b={brief} />
    </section>
  );
}
