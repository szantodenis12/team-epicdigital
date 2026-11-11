"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { addComment, deleteComment } from "@/app/actions/tickets";
import { Avatar } from "@/components/Badges";
import { markdownImage, splitComment } from "@/lib/comment-images";
import { uploadCommentImage } from "@/lib/upload";
import { userMessage } from "@/lib/errors";
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

/* Textul unui comentariu, cu imaginile la locul lor si cu @mentiunile scoase
   in evidenta. Adresele sunt semnate pe server si tin o ora; daca una lipseste
   (comentariu vechi deschis mult timp, sau fisier sters) se scrie asta, in loc
   sa ramana o imagine rupta. */
function CommentBody({ body, urls }: { body: string; urls: Record<string, string> }) {
  return (
    <div className="space-y-2 text-[15px]">
      {splitComment(body).map((part, i) =>
        part.kind === "image" ? (
          urls[part.path] ? (
            <a key={i} href={urls[part.path]} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urls[part.path]}
                alt={part.alt}
                className="max-h-96 w-auto max-w-full rounded-lg border border-line transition hover:border-fg/30"
              />
            </a>
          ) : (
            <span key={i} className="block text-sm text-muted">[imagine indisponibilă — reîncarcă pagina]</span>
          )
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {part.text.split(/(@\p{L}+)/u).map((bit, j) =>
              bit.startsWith("@") ? <b key={j} className="font-semibold text-emerald">{bit}</b> : bit,
            )}
          </p>
        ),
      )}
    </div>
  );
}

export function Timeline({ ticketId, comments, activity, people, meId, isAdmin, imageUrls = {} }: {
  ticketId: number; comments: Comment[]; activity: Activity[]; people: Record<string, Profile>; meId: string; isAdmin: boolean;
  /** cale din bucket → adresă semnată, pregătite la randarea paginii */
  imageUrls?: Record<string, string>;
}) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const poza = useRef<HTMLInputElement>(null);

  /* Imaginea urca pe loc, iar in text se lasa marcajul. Asa comentariul ramane
     un singur camp de text, iar ce se vede in caseta e exact ce se salveaza. */
  async function adaugaImagine(file: File) {
    setError("");
    setBusy("Se urcă imaginea…");
    try {
      const { path, name } = await uploadCommentImage(ticketId, file);
      const el = box.current;
      const marcaj = markdownImage(name, path);
      if (el) {
        const at = el.selectionStart ?? el.value.length;
        const inainte = el.value.slice(0, at);
        const dupa = el.value.slice(at);
        // randuri goale in jur, ca imaginea sa nu se lipeasca de text
        const sep = inainte && !inainte.endsWith("\n") ? "\n" : "";
        el.value = `${inainte}${sep}${marcaj}\n${dupa}`;
        el.focus();
        el.selectionStart = el.selectionEnd = inainte.length + sep.length + marcaj.length + 1;
      }
    } catch (e) {
      setError(userMessage(e, "Imaginea nu a putut fi urcată."));
    } finally {
      setBusy("");
    }
  }

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
                <CommentBody body={it.body} urls={imageUrls} />
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
          ref={box}
          name="body" rows={3} required className="field"
          placeholder="Scrie un comentariu. Poți lipi o captură direct (Ctrl+V). @Denis îl anunță pe email. (Ctrl/⌘ + Enter trimite)"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) form.current?.requestSubmit(); }}
          onPaste={(e) => {
            const img = [...e.clipboardData.items].find((it) => it.type.startsWith("image/"));
            if (!img) return;
            const file = img.getAsFile();
            if (!file) return;
            // altfel browserul lipeste si numele fisierului ca text
            e.preventDefault();
            void adaugaImagine(file);
          }}
          onDrop={(e) => {
            const file = [...e.dataTransfer.files].find((f) => f.type.startsWith("image/"));
            if (!file) return;
            e.preventDefault();
            void adaugaImagine(file);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" disabled={pending || !!busy}>{pending ? "Se trimite…" : "Comentează"}</button>
          <button
            type="button" className="btn-ghost !py-1.5 text-sm" disabled={!!busy}
            onClick={() => poza.current?.click()}
          >
            <ImagePlus size={15} /> Adaugă o imagine
          </button>
          <input
            ref={poza} type="file" accept="image/*" hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void adaugaImagine(f);
            }}
          />
          {busy && <span className="text-sm text-muted">{busy}</span>}
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      </form>
    </section>
  );
}
