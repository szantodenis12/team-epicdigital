"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileArchive, FileText, Trash2 } from "lucide-react";
import { deleteFile, fileDownloadUrl } from "@/app/actions/tickets";
import { FilePicker } from "@/components/FilePicker";
import { uploadFiles } from "@/lib/upload";
import { displayName, fmtDateTime, fmtSize } from "@/lib/format";
import type { Profile, TicketFile } from "@/lib/types";
import { userMessage } from "@/lib/errors";

export function Files({ ticketId, files, people, meId, isAdmin }: {
  ticketId: number; files: TicketFile[]; people: Record<string, Profile>; meId: string; isAdmin: boolean;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();

  useEffect(() => {
    const failed = sessionStorage.getItem("upload-failed");
    if (failed) {
      sessionStorage.removeItem("upload-failed");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMsg(`Nu s-au urcat: ${failed}`);
    }
  }, []);

  async function upload() {
    setBusy(true);
    const failed = await uploadFiles(ticketId, picked);
    setMsg(failed.length ? `Nu s-au urcat: ${failed.join(", ")}` : "");
    setPicked([]);
    setBusy(false);
    router.refresh();
  }

  async function download(id: string) {
    try {
      window.location.assign(await fileDownloadUrl(id));
    } catch (e) {
      setMsg(userMessage(e, "Eroare la descărcare."));
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Fișiere <span className="text-muted">{files.length}</span></h2>
      {files.length > 0 && (
        <ul className="mb-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-raise">
          {files.map((f) => {
            const Icon = /zip|rar|7z|tar|gz/i.test(f.name) ? FileArchive : FileText;
            return (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2">
                <Icon size={18} className="shrink-0 text-forest" />
                <div className="min-w-0 flex-1">
                  <button onClick={() => download(f.id)} className="block max-w-full truncate text-left text-sm font-medium hover:underline">{f.name}</button>
                  <p className="text-xs text-muted">{fmtSize(f.size)} · {displayName(people[f.uploaded_by])} · {fmtDateTime(f.created_at)}</p>
                </div>
                <button onClick={() => download(f.id)} className="p-1 text-muted hover:text-fg" aria-label="Descarcă" title="Descarcă"><Download size={16} /></button>
                {(isAdmin || f.uploaded_by === meId) && (
                  <button
                    onClick={() => confirm(`Ștergi ${f.name}?`) && start(async () => { await deleteFile(f.id); router.refresh(); })}
                    className="p-1 text-muted hover:text-danger" aria-label="Șterge" title="Șterge"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <FilePicker files={picked} onChange={setPicked} />
      {picked.length > 0 && (
        <button className="btn mt-2" onClick={upload} disabled={busy}>{busy ? "Se urcă…" : `Urcă ${picked.length} fișier(e)`}</button>
      )}
      {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}
    </section>
  );
}
