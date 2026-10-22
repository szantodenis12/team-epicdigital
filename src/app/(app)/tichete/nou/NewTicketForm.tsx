"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, LayoutTemplate, Megaphone } from "lucide-react";
import { createTicket } from "@/app/actions/tickets";
import { BriefEditor } from "@/components/Brief";
import { FilePicker } from "@/components/FilePicker";
import { uploadFiles } from "@/lib/upload";
import { displayName } from "@/lib/format";
import { BRIEF_KINDS, emptyBrief, type Brief, type BriefKind } from "@/lib/brief";
import { PRIORITIES, TYPES, type Client, type Department, type Profile, type Template } from "@/lib/types";

const KIND_ICON = { social: Megaphone, productie: Clapperboard };

export function NewTicketForm({ clients, people, departments, templates, meId, myDept }: {
  clients: Client[];
  people: Profile[];
  departments: Department[];
  templates: Template[];
  meId: string;
  myDept: string;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [tpl, setTpl] = useState<Template | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);

  async function submit(formData: FormData) {
    setError("");
    setBusy("Se salvează…");
    try {
      if (brief) formData.set("brief", JSON.stringify(brief));
      const id = await createTicket(formData);
      if (files.length) {
        setBusy(`Se urcă ${files.length} fișier(e)…`);
        const failed = await uploadFiles(id, files);
        // Tichetul există deja; spunem pe pagina lui ce fișiere n-au mers.
        if (failed.length) sessionStorage.setItem("upload-failed", failed.join(", "));
      }
      router.push(`/tichete/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la salvare.");
      setBusy("");
    }
  }

  const pickTemplate = (t: Template | null) => {
    setTpl(t);
    setBrief(t?.brief ?? null);
  };

  const chip = (on: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
      on ? "border-emerald/60 bg-emerald/10 text-emerald" : "border-line text-muted hover:text-fg"
    }`;

  return (
    <div className="space-y-6">
      {templates.length > 0 && (
        <div>
          <span className="label">Pornește de la un șablon</span>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((t) => (
              <button key={t.id} type="button" onClick={() => pickTemplate(tpl?.id === t.id ? null : t)} className={chip(tpl?.id === t.id)}>
                <LayoutTemplate size={14} /> {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* key: la schimbarea șablonului, câmpurile pornesc de la valorile lui */}
      <form key={tpl?.id ?? "gol"} action={submit} className="grid gap-5">
        <div>
          <label className="label" htmlFor="title">Ce trebuie făcut</label>
          <input id="title" name="title" required maxLength={200} defaultValue={tpl?.title} className="field text-lg" placeholder="ex. Reel ofertă iarnă, formular nu trimite, carusel 5 slide-uri" />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="client_id">Client</label>
            <select id="client_id" name="client_id" className="field" defaultValue="">
              <option value="">Intern (Epic)</option>
              {clients.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="department_id">Departament</label>
            <select id="department_id" name="department_id" className="field" defaultValue={tpl ? tpl.department_id ?? "" : myDept}>
              <option value="">Fără</option>
              {departments.filter((d) => d.active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="assignee_id">Cine se ocupă</label>
            <select id="assignee_id" name="assignee_id" className="field" defaultValue="">
              <option value="">Oricine din departament</option>
              {people.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.id}>{displayName(p)}{p.id === meId ? " (eu)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="deadline">Termen</label>
            <input id="deadline" name="deadline" type="date" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="priority">Prioritate</label>
            <select id="priority" name="priority" className="field" defaultValue={tpl?.priority ?? "normal"}>
              {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="type">Tip</label>
            <select id="type" name="type" className="field" defaultValue={tpl?.type ?? "website"}>
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="description">Detalii</label>
          <textarea id="description" name="description" rows={5} defaultValue={tpl?.description} className="field" placeholder="Context, ce înseamnă „gata”." />
        </div>

        <div>
          <span className="label">Brief</span>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setBrief(null)} className={chip(!brief)}>Fără</button>
            {BRIEF_KINDS.map((k) => {
              const Icon = KIND_ICON[k.key];
              return (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => setBrief(brief?.kind === k.key ? brief : emptyBrief(k.key as BriefKind))}
                  className={chip(brief?.kind === k.key)}
                >
                  <Icon size={14} /> {k.label}
                </button>
              );
            })}
          </div>
          {brief && (
            <div className="rounded-2xl border border-line p-4 sm:p-5">
              <BriefEditor value={brief} onChange={setBrief} />
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="checklist">Pași (câte unul pe rând)</label>
            <textarea id="checklist" name="checklist" rows={4} defaultValue={tpl?.checklist.join("\n")} className="field text-sm" placeholder={"Texte\nPoze\nUrcare și programare"} />
          </div>
          <div>
            <label className="label" htmlFor="links">Linkuri (staging, Figma, Drive…)</label>
            <textarea id="links" name="links" rows={4} className="field font-mono text-sm" placeholder="Câte unul pe rând" />
          </div>
        </div>

        <div>
          <span className="label">Fișiere</span>
          <FilePicker files={files} onChange={setFiles} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-3">
          <button className="btn" disabled={!!busy}>{busy || "Creează tichetul"}</button>
          <button type="button" className="btn-ghost" onClick={() => router.back()}>Renunță</button>
        </div>
      </form>
    </div>
  );
}
