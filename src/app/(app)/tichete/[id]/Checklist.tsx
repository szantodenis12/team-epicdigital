"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { Check, X } from "lucide-react";
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "@/app/actions/tickets";
import type { ChecklistItem } from "@/lib/types";

export function Checklist({ ticketId, items }: { ticketId: number; items: ChecklistItem[] }) {
  const [, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const [shown, setShown] = useOptimistic(items, (list, { id, done }: { id: string; done: boolean }) =>
    list.map((i) => (i.id === id ? { ...i, done } : i)),
  );
  const done = shown.filter((i) => i.done).length;

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Pași</h2>
        {shown.length > 0 && (
          <>
            <span className="text-xs text-muted">{done}/{shown.length}</span>
            <span className="h-1.5 max-w-40 flex-1 overflow-hidden rounded-full bg-raise">
              <span className="block h-full rounded-full bg-emerald transition-all" style={{ width: `${(done / shown.length) * 100}%` }} />
            </span>
          </>
        )}
      </div>
      {shown.length > 0 && (
        <ul className="mb-2 space-y-1">
          {shown.map((i) => (
            <li key={i.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-raise">
              <button
                type="button"
                aria-label={i.done ? "Debifează" : "Bifează"}
                onClick={() =>
                  start(async () => {
                    setShown({ id: i.id, done: !i.done });
                    await toggleChecklistItem(i.id, !i.done, ticketId);
                  })
                }
                className={`grid size-5 shrink-0 place-items-center rounded-md border transition ${
                  i.done ? "border-emerald bg-emerald text-bg" : "border-muted/60 hover:border-fg"
                }`}
              >
                {i.done && <Check size={13} strokeWidth={3} />}
              </button>
              <span className={`flex-1 text-[15px] ${i.done ? "text-muted line-through" : ""}`}>{i.body}</span>
              <button
                type="button"
                className="text-muted opacity-0 transition hover:text-danger group-hover:opacity-100"
                aria-label="Șterge pasul"
                onClick={() => start(() => deleteChecklistItem(i.id, ticketId))}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        ref={form}
        action={(fd) =>
          start(async () => {
            await addChecklistItem(ticketId, String(fd.get("body") ?? ""));
            form.current?.reset();
          })
        }
      >
        <input name="body" className="field text-sm" placeholder="+ Adaugă un pas (Enter)" autoComplete="off" />
      </form>
    </section>
  );
}
