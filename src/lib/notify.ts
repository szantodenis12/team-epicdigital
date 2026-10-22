import "server-only";
import { Resend } from "resend";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const FROM = process.env.EMAIL_FROM ?? "Epic Team <team@epicdigitalhub.ro>";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(heading: string, body: string, cta?: { href: string; label: string }) {
  return `<!doctype html><html><body style="margin:0;background:#F2EFE8;font-family:Helvetica,Arial,sans-serif;color:#0B100E">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<div style="font-weight:700;letter-spacing:.08em;font-size:12px;color:#128C5E;margin-bottom:24px">EPIC TEAM</div>
<h1 style="font-size:20px;line-height:1.3;margin:0 0 12px">${heading}</h1>
<div style="font-size:15px;line-height:1.55">${body}</div>
${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:24px;background:#0B100E;color:#F2EFE8;padding:12px 20px;text-decoration:none;font-weight:600;font-size:14px">${cta.label}</a>` : ""}
<p style="margin-top:32px;font-size:12px;color:#6B6F6C">Epic Digital Hub · ${SITE.replace(/^https?:\/\//, "")}</p>
</div></body></html>`;
}

export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY);

async function send(to: string[], subject: string, html: string) {
  const list = [...new Set(to.filter(Boolean))];
  if (!list.length || !emailEnabled()) return false;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: FROM, to: list, subject, html });
  if (error) console.error("[notify]", error);
  return !error;
}

const ticketUrl = (id: number) => `${SITE}/tichete/${id}`;

export function notifyAssigned(to: string, t: { id: number; title: string }, by: string, deadline: string) {
  return send(
    [to],
    `#${t.id} ți-a fost atribuit: ${t.title}`,
    layout(
      `#${t.id} · ${esc(t.title)}`,
      `<p>${esc(by)} ți-a dat tichetul ăsta.${deadline ? ` Termen: <b>${esc(deadline)}</b>.` : ""}</p>`,
      { href: ticketUrl(t.id), label: "Deschide tichetul" },
    ),
  );
}

export function notifyComment(to: string[], t: { id: number; title: string }, by: string, body: string) {
  return send(
    to,
    `Comentariu nou pe #${t.id}: ${t.title}`,
    layout(
      `${esc(by)} a comentat pe #${t.id}`,
      `<p style="white-space:pre-wrap;border-left:3px solid #1FDC93;padding-left:12px">${esc(body.slice(0, 1200))}</p>`,
      { href: ticketUrl(t.id), label: "Răspunde" },
    ),
  );
}

export function notifyStatus(to: string, t: { id: number; title: string }, by: string, status: string) {
  return send(
    [to],
    `#${t.id} e acum ${status}: ${t.title}`,
    layout(`#${t.id} · ${esc(t.title)}`, `<p>${esc(by)} a mutat tichetul în <b>${esc(status)}</b>.</p>`, {
      href: ticketUrl(t.id),
      label: "Vezi tichetul",
    }),
  );
}

export function sendInvite(to: string, name: string, by: string, link: string) {
  return send(
    [to],
    "Ai cont pe Epic Team",
    layout(
      `Salut${name ? `, ${esc(name.split(" ")[0])}` : ""}!`,
      `<p>${esc(by)} ți-a făcut cont pe Epic Team, platforma noastră de tichete. Apasă pe buton și setează-ți parola. Linkul expiră în 24 de ore.</p>`,
      { href: link, label: "Activează contul" },
    ),
  );
}

export function sendReset(to: string, link: string) {
  return send(
    [to],
    "Resetare parolă Epic Team",
    layout(
      "Resetare parolă",
      "<p>Ai cerut o parolă nouă. Apasă pe buton ca s-o setezi. Dacă n-ai cerut tu, ignoră emailul.</p>",
      { href: link, label: "Setează parola" },
    ),
  );
}

export function notifyApproval(to: string[], t: { id: number; title: string }, by: string) {
  return send(
    to,
    `De aprobat: #${t.id} ${t.title}`,
    layout(`#${t.id} așteaptă aprobarea ta`, `<p>${esc(by)} a trimis <b>${esc(t.title)}</b> în Review.</p>`, {
      href: ticketUrl(t.id),
      label: "Verifică și aprobă",
    }),
  );
}

export function notifyMention(to: string[], t: { id: number; title: string }, by: string, body: string) {
  return send(
    to,
    `${by} te-a menționat pe #${t.id}: ${t.title}`,
    layout(
      `${esc(by)} te-a menționat`,
      `<p style="white-space:pre-wrap;border-left:3px solid #1FDC93;padding-left:12px">${esc(body.slice(0, 1200))}</p>`,
      { href: ticketUrl(t.id), label: "Răspunde" },
    ),
  );
}

export type DigestSection = { title: string; tickets: { id: number; title: string; when: string }[] };

// Rezumatul de dimineață: ce e întârziat, ce e azi, ce e mâine, ce e de aprobat.
export function notifyDigest(to: string, name: string, sections: DigestSection[]) {
  const body = sections
    .filter((s) => s.tickets.length)
    .map(
      (s) => `<p style="margin:20px 0 6px;font-weight:700">${esc(s.title)} (${s.tickets.length})</p>
<ul style="margin:0;padding-left:18px">${s.tickets
        .map((t) => `<li style="margin:4px 0"><a href="${ticketUrl(t.id)}" style="color:#0B100E">#${t.id} ${esc(t.title)}</a> <span style="color:#6B6F6C">· ${esc(t.when)}</span></li>`)
        .join("")}</ul>`,
    )
    .join("");
  const total = sections.reduce((n, s) => n + s.tickets.length, 0);
  return send(
    [to],
    `Azi: ${total} tichet${total === 1 ? "" : "e"} pentru tine`,
    layout(`Bună dimineața${name ? `, ${esc(name.split(" ")[0])}` : ""}!`, body, { href: `${SITE}/tichete?tab=mele`, label: "Deschide Epic Team" }),
  );
}
