"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Pencil } from "lucide-react";
import { updateTicket } from "@/app/actions/tickets";
import type { Ticket } from "@/lib/types";
import { userMessage } from "@/lib/errors";

const linkify = (text: string) =>
  text.split(/(https?:\/\/[^\s)]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all text-forest underline underline-offset-2">{part}</a>
    ) : (
      part
    ),
  );

export function Body({ t, fields }: { t: Ticket; fields: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  if (editing) {
    return (
      <form
        className="space-y-3"
        action={(fd) =>
          start(async () => {
            try {
              await updateTicket(t.id, {
                title: String(fd.get("title")).trim(),
                description: String(fd.get("description")),
                links: String(fd.get("links")).split(/\s+/).filter((l) => /^https?:\/\//i.test(l)),
              });
              setEditing(false);
              setError("");
            } catch (e) {
              setError(userMessage(e, "Eroare."));
            }
          })
        }
      >
        <input name="title" defaultValue={t.title} required maxLength={200} className="field font-display text-xl font-bold" />
        <textarea name="description" defaultValue={t.description} rows={10} className="field" />
        <div>
          <span className="label">Linkuri</span>
          <textarea name="links" defaultValue={t.links.join("\n")} rows={3} className="field font-mono text-sm" />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <button className="btn" disabled={pending}>Salvează</button>
          <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Renunță</button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start gap-3">
        <h1 className="flex-1 font-display text-2xl font-bold leading-tight tracking-tight">{t.title}</h1>
        <button className="btn-ghost !px-2" onClick={() => setEditing(true)} aria-label="Editează" title="Editează">
          <Pencil size={15} />
        </button>
      </div>
      <div className="mb-8">{fields}</div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Descriere</h2>
      {t.description ? (
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{linkify(t.description)}</div>
      ) : (
        <p className="text-sm text-muted">Fără detalii.</p>
      )}
      {t.links.length > 0 && (
        <ul className="mt-5 space-y-1">
          {t.links.map((l) => (
            <li key={l}>
              <a href={l} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 break-all text-sm text-forest hover:underline">
                <ExternalLink size={13} className="shrink-0" /> {l}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
