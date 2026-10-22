"use client";

import { useState, useTransition } from "react";
import { FolderOpen, Pencil } from "lucide-react";
import { updateClient } from "@/app/actions/team";
import type { Client } from "@/lib/types";

// Linkul de Drive și notițele despre client. Doar adminul le schimbă.
export function ClientInfo({ client, isAdmin }: { client: Client; isAdmin: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  if (editing) {
    return (
      <form
        className="space-y-3 rounded-2xl border border-line bg-panel p-4"
        action={(fd) =>
          start(async () => {
            try {
              await updateClient(client.id, { drive_url: String(fd.get("drive_url") ?? "").trim(), notes: String(fd.get("notes") ?? "") });
              setEditing(false);
              setError("");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Eroare.");
            }
          })
        }
      >
        <div>
          <label className="label" htmlFor="drive_url">Folder Drive</label>
          <input id="drive_url" name="drive_url" defaultValue={client.drive_url} className="field font-mono text-sm" placeholder="https://drive.google.com/…" />
        </div>
        <div>
          <label className="label" htmlFor="notes">Notițe (contact, acces, ce trebuie știut)</label>
          <textarea id="notes" name="notes" rows={5} defaultValue={client.notes} className="field" />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <button className="btn" disabled={pending}>Salvează</button>
          <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Renunță</button>
        </div>
      </form>
    );
  }

  if (!client.drive_url && !client.notes && !isAdmin) return null;
  return (
    <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-line bg-panel p-4">
      {client.drive_url ? (
        <a href={client.drive_url} target="_blank" rel="noreferrer" className="btn"><FolderOpen size={15} /> Deschide folderul Drive</a>
      ) : (
        <span className="text-sm text-muted">Fără folder Drive încă.</span>
      )}
      {client.notes && <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed">{client.notes}</p>}
      {isAdmin && (
        <button className="btn-ghost ml-auto !px-2" onClick={() => setEditing(true)} aria-label="Editează" title="Editează">
          <Pencil size={14} />
        </button>
      )}
    </div>
  );
}
