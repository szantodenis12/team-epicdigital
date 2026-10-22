/* Mesajul pe care îl vede omul, nu cel pe care îl aruncă framework-ul.

   Cazul care a pornit fișierul ăsta: Roland a completat un tichet cu fișiere
   atașate și a primit

     Server Action "40cf76da72…" was not found on the server.
     Read more: https://nextjs.org/docs/messages/failed-to-find-server-action

   ID-urile acțiunilor de server se schimbă la fiecare build. Cine are pagina
   deschisă dintr-un build vechi cere, la trimitere, o acțiune care nu mai
   există - deci asta nu e o defecțiune, e un deploy care s-a întâmplat între
   timp. Se repară reîncărcând pagina, iar cât lucrăm la aplicație se va mai
   întâmpla.

   Textul de mai sus însă nu-i spune omului nimic din toate astea. */

const ACTIUNE_VECHE = /server action|failed-to-find-server-action|not found on the server/i;

/** Eroarea e doar un build vechi în browser, nu o problemă reală? */
export function isStaleAction(e: unknown) {
  return e instanceof Error && ACTIUNE_VECHE.test(e.message);
}

export const STALE_ACTION_MESSAGE =
  "Aplicația a fost actualizată cât aveai pagina deschisă. Reîncarcă pagina (Ctrl+Shift+R) și trimite din nou.";

/** Mesajul de arătat pentru orice eroare venită dintr-o acțiune de server. */
export function userMessage(e: unknown, fallback = "Eroare.") {
  if (isStaleAction(e)) return STALE_ACTION_MESSAGE;
  return e instanceof Error && e.message ? e.message : fallback;
}
