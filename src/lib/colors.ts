import type { Status } from "@/lib/types";

/* Culorile generate se întorc ca VARIABILE CSS, nu ca hex.

   Motivul e tema deschisă. Paleta de mai jos era calibrată pentru fundal
   închis: aceleași pasteluri folosite ca TEXT pe alb ajung la 1.8-3.0:1, adică
   se citesc, dar arată spălat - numele clientului pe cardul de bilete, eticheta
   de departament, pastila de status.

   Un hex nu poate ști pe ce temă stă. O variabilă poate: se redefinește în
   globals.css sub `:root[data-theme="light"]`, iar stilurile inline o preiau
   fără ca vreun component să afle că există două teme. Asta ține și în
   componente de server, unde un hook de temă n-ar avea ce căuta.

   Numărul de tonuri (8) e parte din contract: globals.css definește exact
   --tone-0 … --tone-7. */
const TONE_COUNT = 8;

export function tone(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `var(--tone-${h % TONE_COUNT})`;
}

export const STATUS_TONE: Record<Status, string> = {
  nou: "var(--status-nou)",
  lucru: "var(--status-lucru)",
  review: "var(--status-review)",
  gata: "var(--status-gata)",
  blocat: "var(--status-blocat)",
};
