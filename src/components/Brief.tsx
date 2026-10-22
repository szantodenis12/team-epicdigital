"use client";

import { ExternalLink, Plus, X } from "lucide-react";
import { fmtDate } from "@/lib/format";
import {
  ASPECTS, LANGUAGES, MEDIA, PLATFORMS, SOCIAL_FORMATS, STYLES,
  type Brief, type ProductionBrief, type Reference, type SocialBrief,
} from "@/lib/brief";

// ───────── Bucăți mici de formular ─────────

function Chips<T extends string>({ options, value, onChange }: {
  options: readonly { key: T; label: string }[] | readonly T[];
  value: T | T[];
  onChange: (v: T) => void;
}) {
  const opts = options.map((o) => (typeof o === "string" ? { key: o, label: o } : o));
  const on = (k: T) => (Array.isArray(value) ? value.includes(k) : value === k);
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-lg border px-3 py-1.5 text-sm transition ${
            on(o.key) ? "border-emerald/60 bg-emerald/10 text-emerald" : "border-line text-muted hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function F({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <span className="label">{label}</span>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function References({ value, onChange }: { value: Reference[]; onChange: (v: Reference[]) => void }) {
  const set = (i: number, patch: Partial<Reference>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {value.map((r, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input className="field font-mono text-sm" placeholder="https://… (reel, postare, Pinterest, Drive)" value={r.url} onChange={(e) => set(i, { url: e.target.value })} />
          <input className="field text-sm" placeholder="Ce ne place la ea" value={r.note} onChange={(e) => set(i, { note: e.target.value })} />
          <button type="button" className="btn-ghost !px-2" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Scoate"><X size={14} /></button>
        </div>
      ))}
      <button type="button" className="btn-ghost !py-1.5 text-sm" onClick={() => onChange([...value, { url: "", note: "" }])}>
        <Plus size={14} /> Referință
      </button>
      <p className="text-xs text-muted">Pozele de referință le urci la Fișiere.</p>
    </div>
  );
}

// ───────── Editor ─────────

export function BriefEditor({ value, onChange }: { value: Brief; onChange: (b: Brief) => void }) {
  return value.kind === "social" ? <SocialEditor b={value} set={(p) => onChange({ ...value, ...p })} /> : <ProductionEditor b={value} set={(p) => onChange({ ...value, ...p })} />;
}

function SocialEditor({ b, set }: { b: SocialBrief; set: (p: Partial<SocialBrief>) => void }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <F label="Format" wide><Chips options={SOCIAL_FORMATS} value={b.format} onChange={(format) => set({ format })} /></F>
      <F label="Platforme"><Chips options={PLATFORMS} value={b.platforms as (typeof PLATFORMS)[number][]} onChange={(p) => set({ platforms: toggle(b.platforms, p) })} /></F>
      <F label="Limbă"><Chips options={LANGUAGES} value={b.language as (typeof LANGUAGES)[number]} onChange={(language) => set({ language })} /></F>
      <F label="Data publicării"><input type="date" className="field" value={b.publish_date} onChange={(e) => set({ publish_date: e.target.value })} /></F>
      <F label="Obiectiv"><input className="field" placeholder="ex. programări, awareness, vânzare ofertă" value={b.objective} onChange={(e) => set({ objective: e.target.value })} /></F>
      <F label="Ideea / textul de pe grafică" wide>
        <textarea className="field" rows={4} value={b.idea} onChange={(e) => set({ idea: e.target.value })} placeholder="Ce spune postarea. Pentru reel: ideea, hook-ul." />
      </F>
      {b.format === "carusel" && (
        <F label={`Slide-uri · ${b.slides.length}`} wide>
          <div className="space-y-2">
            {b.slides.map((s, i) => (
              <div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[auto_1fr_1fr_auto]">
                <span className="pt-2 font-mono text-xs text-muted">{i + 1}</span>
                <textarea className="field text-sm" rows={3} placeholder="Text pe slide" value={s.text} onChange={(e) => set({ slides: b.slides.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                <textarea className="field text-sm" rows={3} placeholder="Vizual (poză, grafică)" value={s.visual} onChange={(e) => set({ slides: b.slides.map((x, j) => (j === i ? { ...x, visual: e.target.value } : x)) })} />
                <button type="button" className="btn-ghost !px-2 self-start" onClick={() => set({ slides: b.slides.filter((_, j) => j !== i) })} aria-label="Scoate slide"><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="btn-ghost !py-1.5 text-sm" onClick={() => set({ slides: [...b.slides, { text: "", visual: "" }] })}><Plus size={14} /> Slide</button>
          </div>
        </F>
      )}
      <F label="Caption" wide><textarea className="field" rows={5} value={b.caption} onChange={(e) => set({ caption: e.target.value })} placeholder="Textul de sub postare, gata de copiat." /></F>
      <F label="Hashtag-uri"><input className="field" value={b.hashtags} onChange={(e) => set({ hashtags: e.target.value })} placeholder="#oradea #…" /></F>
      <F label="CTA"><input className="field" value={b.cta} onChange={(e) => set({ cta: e.target.value })} placeholder="ex. Programează-te: 07xx…" /></F>
      <F label="Referințe" wide><References value={b.references} onChange={(references) => set({ references })} /></F>
    </div>
  );
}

function ProductionEditor({ b, set }: { b: ProductionBrief; set: (p: Partial<ProductionBrief>) => void }) {
  const scene = (i: number, patch: Partial<ProductionBrief["scenes"][number]>) =>
    set({ scenes: b.scenes.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <F label="Ce filmăm / fotografiem"><Chips options={MEDIA} value={b.media} onChange={(media) => set({ media })} /></F>
      <F label="Stil">
        <select className="field" value={b.style} onChange={(e) => set({ style: e.target.value })}>
          {STYLES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </F>
      <F label="Formate"><Chips options={ASPECTS} value={b.aspects as (typeof ASPECTS)[number][]} onChange={(a) => set({ aspects: toggle(b.aspects, a) })} /></F>
      <F label="Durată / număr de poze"><input className="field" value={b.duration} onChange={(e) => set({ duration: e.target.value })} placeholder="ex. 30–45 s, sau 20 poze" /></F>
      <F label="Data filmării"><input type="date" className="field" value={b.shoot_date} onChange={(e) => set({ shoot_date: e.target.value })} /></F>
      <F label="Locație"><input className="field" value={b.location} onChange={(e) => set({ location: e.target.value })} placeholder="Adresă, ce încăperi" /></F>
      <F label="Cine apare" wide><input className="field" value={b.people} onChange={(e) => set({ people: e.target.value })} placeholder="ex. Dr. X, 2 angajați, client (acord semnat?)" /></F>
      <F label="Atmosferă, lumină, muzică" wide><textarea className="field" rows={3} value={b.mood} onChange={(e) => set({ mood: e.target.value })} /></F>
      <F label="Script" hint="Pe scene: ce se spune (voce sau text pe ecran) și ce se vede în cadru." wide>
        <div className="space-y-2">
          {b.scenes.map((s, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[110px_1fr_1fr_auto]">
              <input className="field text-sm font-semibold" value={s.label} onChange={(e) => scene(i, { label: e.target.value })} placeholder={`Scena ${i + 1}`} />
              <textarea className="field text-sm" rows={3} value={s.text} onChange={(e) => scene(i, { text: e.target.value })} placeholder="Ce se spune / text pe ecran" />
              <textarea className="field text-sm" rows={3} value={s.visual} onChange={(e) => scene(i, { visual: e.target.value })} placeholder="Ce se vede (cadru, mișcare)" />
              <button type="button" className="btn-ghost !px-2 self-start" onClick={() => set({ scenes: b.scenes.filter((_, j) => j !== i) })} aria-label="Scoate scena"><X size={14} /></button>
            </div>
          ))}
          <button type="button" className="btn-ghost !py-1.5 text-sm" onClick={() => set({ scenes: [...b.scenes, { label: `Scena ${b.scenes.length + 1}`, text: "", visual: "" }] })}>
            <Plus size={14} /> Scenă
          </button>
        </div>
      </F>
      <F label="Shot list" wide><textarea className="field" rows={4} value={b.shots} onChange={(e) => set({ shots: e.target.value })} placeholder="Câte un cadru pe rând: detaliu produs, plan larg recepție, b-roll mâini…" /></F>
      <F label="Referințe" wide><References value={b.references} onChange={(references) => set({ references })} /></F>
    </div>
  );
}

// ───────── Afișare ─────────

const labelOf = (opts: readonly { key: string; label: string }[], k: string) => opts.find((o) => o.key === k)?.label ?? k;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</p>
      <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{children}</div>
    </div>
  );
}

function Meta({ items }: { items: (string | false | undefined)[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.filter(Boolean).map((x) => <span key={x as string} className="rounded-lg bg-raise px-2.5 py-1 text-sm">{x}</span>)}
    </div>
  );
}

function RefList({ refs }: { refs: Reference[] }) {
  if (!refs.length) return null;
  return (
    <Block title="Referințe">
      <ul className="space-y-1">
        {refs.map((r, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-2">
            {r.url && /^https?:\/\//.test(r.url) ? (
              <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-emerald hover:underline"><ExternalLink size={13} />{r.url}</a>
            ) : r.url}
            {r.note && <span className="text-muted">— {r.note}</span>}
          </li>
        ))}
      </ul>
    </Block>
  );
}

export function BriefView({ b }: { b: Brief }) {
  if (b.kind === "social") {
    return (
      <div className="space-y-5">
        <Meta items={[labelOf(SOCIAL_FORMATS, b.format), b.platforms.join(" · "), b.language, b.publish_date && `Publicare ${fmtDate(b.publish_date)}`, b.objective && `Obiectiv: ${b.objective}`]} />
        {b.idea && <Block title="Ideea">{b.idea}</Block>}
        {b.format === "carusel" && b.slides.length > 0 && (
          <Block title={`Slide-uri · ${b.slides.length}`}>
            <ol className="grid gap-2 sm:grid-cols-2">
              {b.slides.map((s, i) => (
                <li key={i} className="rounded-xl bg-raise p-3 text-sm">
                  <span className="mb-1 block font-mono text-xs text-muted">{i + 1}</span>
                  {s.text}
                  {s.visual && <span className="mt-2 block text-muted">Vizual: {s.visual}</span>}
                </li>
              ))}
            </ol>
          </Block>
        )}
        {b.caption && <Block title="Caption">{b.caption}</Block>}
        {(b.hashtags || b.cta) && (
          <div className="grid gap-5 sm:grid-cols-2">
            {b.cta && <Block title="CTA">{b.cta}</Block>}
            {b.hashtags && <Block title="Hashtag-uri">{b.hashtags}</Block>}
          </div>
        )}
        <RefList refs={b.references} />
      </div>
    );
  }
  const scenes = b.scenes.filter((s) => s.text || s.visual);
  return (
    <div className="space-y-5">
      <Meta items={[labelOf(MEDIA, b.media), labelOf(STYLES, b.style), b.aspects.join(" · "), b.duration, b.shoot_date && `Filmare ${fmtDate(b.shoot_date)}`]} />
      {(b.location || b.people) && (
        <div className="grid gap-5 sm:grid-cols-2">
          {b.location && <Block title="Locație">{b.location}</Block>}
          {b.people && <Block title="Cine apare">{b.people}</Block>}
        </div>
      )}
      {b.mood && <Block title="Atmosferă, lumină, muzică">{b.mood}</Block>}
      {scenes.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Script</p>
          <div className="overflow-hidden rounded-xl border border-line">
            {scenes.map((s, i) => (
              <div key={i} className="grid gap-x-4 gap-y-1 border-line p-3 text-sm sm:grid-cols-[100px_1fr_1fr] [&:not(:first-child)]:border-t">
                <span className="font-semibold text-emerald">{s.label || `Scena ${i + 1}`}</span>
                <span className="whitespace-pre-wrap">{s.text}</span>
                <span className="whitespace-pre-wrap text-muted">{s.visual}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {b.shots && <Block title="Shot list">{b.shots}</Block>}
      <RefList refs={b.references} />
    </div>
  );
}
