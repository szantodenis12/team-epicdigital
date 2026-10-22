"use client";

import { useRef, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { addComment, deleteComment } from "@/app/actions/tickets";
import { Avatar } from "@/components/Badges";
import { displayName, fmtDate, fmtDateTime } from "@/lib/format";
import { PRIORITIES, STATUSES, label, type Activity, type Comment, type Profile, type Priority, type Status } from "@/lib/types";

type Item = ({ kind: "comment" } & Comment) | ({ kind: "activity" } & Activity);

function describe(a: Activity, people: Record<string, Profile>) {
  const m = a.meta ?? {};
  switch (a.action) {
    case "creat": return "a creat tichetul";
    case "status": return `a mutat din ${label(STATUSES, m.din as Status)} în ${label(STATUSES, m.in as Status)}`;
    case "asignat": return m.in ? `l-a dat lui ${displayName(people[m.in])}` : "a scos responsabilul";
    case "deadline": return m.in ? `a pus termen ${fmtDate(m.in)}` : "a scos termenul";
    case "prioritate": return `a schimbat prioritatea în ${label(PRIORITIES, m.in as Priority)}`;
    case "fisier": return `a urcat ${m.nume}`;
    case "departament": return "a schimbat departamentul";
    default: return a.action;
  }
}

export function Timeline({ ticketId, comments, activity, people, meId, isAdmin }: {
  ticketId: number; comments: Comment[]; activity: Activity[]; people: Record<string, Profile>; meId: string; isAdmin: boolean;
}) {
  const [pending, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  const items: Item[] = [
    ...comments.map((c) => ({ kind: "comment" as const, ...c })),
    ...activity.map((a) => ({ kind: "activity" as const, ...a })),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Discuție și istoric</h2>
      <ol className="space-y-3">
        {items.map((it) =>
          it.kind === "comment" ? (
            <li key={`c${it.id}`} className="flex gap-3">
              <Avatar person={people[it.author_id]} size={28} />
              <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm bg-raise px-3.5 py-2.5">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                  <b className="text-fg">{displayName(people[it.author_id])}</b>
                  {fmtDateTime(it.created_at)}
                  {(isAdmin || it.author_id === meId) && (
                    <button
                      className="ml-auto hover:text-danger" aria-label="Șterge comentariul"
                      onClick={() => confirm("Ștergi comentariul?") && start(() => deleteComment(it.id, ticketId))}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-[15px]">
                  {it.body.split(/(@\p{L}+)/u).map((part, i) =>
                    part.startsWith("@") ? <b key={i} className="font-semibold text-emerald">{part}</b> : part,
                  )}
                </p>
              </div>
            </li>
          ) : (
            <li key={`a${it.id}`} className="pl-10 text-xs text-muted">
              <b className="font-medium text-fg/70">{displayName(it.actor_id ? people[it.actor_id] : null)}</b>{" "}
              {describe(it, people)} · {fmtDateTime(it.created_at)}
            </li>
          ),
        )}
      </ol>
      <form
        ref={form}
        className="mt-4 space-y-2"
        action={(fd) =>
          start(async () => {
            await addComment(ticketId, String(fd.get("body") ?? ""));
            form.current?.reset();
          })
        }
      >
        <textarea
          name="body" rows={3} required className="field" placeholder="Scrie un comentariu. @Denis îl anunță pe email. (Ctrl/⌘ + Enter trimite)"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) form.current?.requestSubmit(); }}
        />
        <button className="btn" disabled={pending}>{pending ? "Se trimite…" : "Comentează"}</button>
      </form>
    </section>
  );
}
