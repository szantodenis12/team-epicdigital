/* Imaginile lipite în comentarii.

   O imagine dintr-un comentariu se scrie în textul comentariului ca
   `![nume](cale)`, unde `cale` e calea din bucket-ul `ticket-files`. Nu e un
   câmp separat și nici un tabel nou, din două motive:

   - un comentariu poate avea oricâte imagini, oriunde în text, iar „a treia
     poză merge după al doilea paragraf" e o informație care trăiește firesc în
     text, nu lângă el;
   - comentariile vechi rămân neatinse: fără marcaj, nimic nu se schimbă.

   Fișierele stau sub `<tichet>/comentarii/` și NU se înregistrează în
   `ticket_files`, tocmai ca să nu umple secțiunea Fișiere - care rămâne pentru
   ce chiar trebuie descărcat. Bucket-ul e privat, deci afișarea cere adrese
   semnate, generate pe server la randarea paginii, ca la poza de profil. */

/** `![nume](cale)` — doar căi din bucket-ul nostru, nu orice adresă. */
const MARCAJ = /!\[([^\]]*)\]\((\d+\/comentarii\/[^)\s]+)\)/g;

export const commentImagePrefix = (ticketId: number) => `${ticketId}/comentarii/`;

export function markdownImage(name: string, path: string) {
  // Parantezele din nume ar rupe marcajul, iar numele e doar pentru alt.
  return `![${name.replace(/[[\]()]/g, " ").trim() || "imagine"}](${path})`;
}

/** Toate căile de imagini dintr-un text. */
export function imagePathsIn(body: string) {
  return [...body.matchAll(MARCAJ)].map((m) => m[2]);
}

/** Aceleași căi, din mai multe comentarii, fără dubluri. */
export function allImagePaths(bodies: string[]) {
  return [...new Set(bodies.flatMap(imagePathsIn))];
}

export type CommentPart =
  | { kind: "text"; text: string }
  | { kind: "image"; alt: string; path: string };

/** Taie textul în bucăți, ca să poată fi randat cu imaginile la locul lor. */
export function splitComment(body: string): CommentPart[] {
  const parts: CommentPart[] = [];
  let last = 0;
  for (const m of body.matchAll(MARCAJ)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ kind: "text", text: body.slice(last, i) });
    parts.push({ kind: "image", alt: m[1] || "imagine", path: m[2] });
    last = i + m[0].length;
  }
  if (last < body.length) parts.push({ kind: "text", text: body.slice(last) });
  return parts;
}
