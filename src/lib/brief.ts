// Brief atașat unui tichet: postare social sau producție foto/video.
// Câmpurile pentru postare urmează Post Brief v2 (tools/post-brief din repo-ul principal).

export const SOCIAL_FORMATS = [
  { key: "post", label: "Postare" },
  { key: "carusel", label: "Carusel" },
  { key: "story", label: "Story" },
  { key: "reel", label: "Reel" },
] as const;
export const PLATFORMS = ["Facebook", "Instagram", "TikTok", "LinkedIn", "Google"] as const;
export const LANGUAGES = ["RO", "HU", "EN"] as const;

export const MEDIA = [
  { key: "video", label: "Video" },
  { key: "foto", label: "Foto" },
  { key: "ambele", label: "Foto + video" },
] as const;
export const STYLES = [
  { key: "ugc", label: "UGC / talking head" },
  { key: "cinematic", label: "Cinematic / brand" },
  { key: "produs", label: "Produs" },
  { key: "eveniment", label: "Eveniment / recap" },
  { key: "interviu", label: "Interviu / testimonial" },
  { key: "bts", label: "Behind the scenes" },
  { key: "tutorial", label: "Tutorial / explicativ" },
  { key: "foto-produs", label: "Foto produs" },
  { key: "foto-portret", label: "Foto portret / echipă" },
  { key: "foto-locatie", label: "Foto locație / interior" },
] as const;
export const ASPECTS = ["9:16", "4:5", "1:1", "16:9"] as const;

export type Reference = { url: string; note: string };
export type Slide = { text: string; visual: string };
export type Scene = { label: string; text: string; visual: string };

export type SocialBrief = {
  kind: "social";
  format: (typeof SOCIAL_FORMATS)[number]["key"];
  platforms: string[];
  language: string;
  objective: string;
  idea: string;
  slides: Slide[];
  caption: string;
  hashtags: string;
  cta: string;
  publish_date: string;
  references: Reference[];
};

export type ProductionBrief = {
  kind: "productie";
  media: (typeof MEDIA)[number]["key"];
  style: string;
  aspects: string[];
  duration: string;
  shoot_date: string;
  location: string;
  people: string;
  mood: string;
  scenes: Scene[];
  shots: string;
  references: Reference[];
};

export type Brief = SocialBrief | ProductionBrief;
export type BriefKind = Brief["kind"];

export const BRIEF_KINDS = [
  { key: "social", label: "Postare social" },
  { key: "productie", label: "Foto / video" },
] as const;

export function emptyBrief(kind: BriefKind): Brief {
  if (kind === "social") {
    return {
      kind, format: "post", platforms: ["Facebook", "Instagram"], language: "RO", objective: "", idea: "",
      slides: [], caption: "", hashtags: "", cta: "", publish_date: "", references: [],
    };
  }
  return {
    kind, media: "video", style: "ugc", aspects: ["9:16"], duration: "", shoot_date: "", location: "", people: "", mood: "",
    scenes: [
      { label: "Hook", text: "", visual: "" },
      { label: "Corp", text: "", visual: "" },
      { label: "CTA", text: "", visual: "" },
    ],
    shots: "", references: [],
  };
}

// ───────── Validare pe server: nu păstrăm nimic în afara formei de mai sus ─────────

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const list = <T>(v: unknown, map: (x: Record<string, unknown>) => T, max = 30): T[] =>
  Array.isArray(v) ? v.slice(0, max).map((x) => map((x ?? {}) as Record<string, unknown>)) : [];
const refs = (v: unknown) =>
  list(v, (r) => ({ url: str(r.url, 500).trim(), note: str(r.note, 300) })).filter((r) => r.url || r.note);

export function cleanBrief(raw: unknown): Brief | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (b.kind === "social") {
    return {
      kind: "social",
      format: pick(b.format, SOCIAL_FORMATS.map((f) => f.key), "post"),
      platforms: Array.isArray(b.platforms) ? b.platforms.filter((p) => (PLATFORMS as readonly string[]).includes(p)) : [],
      language: pick(b.language, LANGUAGES, "RO"),
      objective: str(b.objective, 300),
      idea: str(b.idea, 4000),
      slides: list(b.slides, (s) => ({ text: str(s.text, 1000), visual: str(s.visual, 1000) }), 20),
      caption: str(b.caption, 5000),
      hashtags: str(b.hashtags, 1000),
      cta: str(b.cta, 300),
      publish_date: date(b.publish_date),
      references: refs(b.references),
    };
  }
  if (b.kind === "productie") {
    return {
      kind: "productie",
      media: pick(b.media, MEDIA.map((m) => m.key), "video"),
      style: pick(b.style, STYLES.map((s) => s.key), "ugc"),
      aspects: Array.isArray(b.aspects) ? b.aspects.filter((a) => (ASPECTS as readonly string[]).includes(a)) : [],
      duration: str(b.duration, 60),
      shoot_date: date(b.shoot_date),
      location: str(b.location, 300),
      people: str(b.people, 500),
      mood: str(b.mood, 1000),
      scenes: list(b.scenes, (s) => ({ label: str(s.label, 60), text: str(s.text, 3000), visual: str(s.visual, 3000) }), 40),
      shots: str(b.shots, 5000),
      references: refs(b.references),
    };
  }
  return null;
}
