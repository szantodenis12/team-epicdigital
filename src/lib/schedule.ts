// Programul de lucru: 7 zile (luni → duminică), fiecare ["09:00","17:00"] sau null = liber.
export type DaySlot = [string, string] | null;
export type Schedule = DaySlot[];

export const DAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
export const DAYS_SHORT = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];

export const DEFAULT_SCHEDULE: Schedule = [
  ["09:00", "17:00"], ["09:00", "17:00"], ["09:00", "17:00"], ["09:00", "17:00"], ["09:00", "17:00"], null, null,
];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

// Validare pe server: orice altceva decât 7 zile corecte devine programul implicit.
export function cleanSchedule(raw: unknown): Schedule {
  if (!Array.isArray(raw) || raw.length !== 7) return DEFAULT_SCHEDULE;
  return raw.map((d) =>
    Array.isArray(d) && HHMM.test(String(d[0])) && HHMM.test(String(d[1])) && toMin(String(d[1])) > toMin(String(d[0]))
      ? [String(d[0]), String(d[1])]
      : null,
  );
}

export function slotMinutes(s: DaySlot) {
  return s ? toMin(s[1]) - toMin(s[0]) : 0;
}

export function weekMinutes(s: Schedule) {
  return s.reduce((a, d) => a + slotMinutes(d), 0);
}

// ISO date → 0 (luni) … 6 (duminică)
export function weekdayOf(iso: string) {
  return (new Date(iso + "T12:00:00Z").getUTCDay() + 6) % 7;
}

export function addDaysISO(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function mondayOf(iso: string) {
  return addDaysISO(iso, -weekdayOf(iso));
}

// Ore programate între două date (inclusiv).
export function scheduledBetween(s: Schedule, from: string, to: string) {
  let total = 0;
  for (let d = from; d <= to; d = addDaysISO(d, 1)) total += slotMinutes(s[weekdayOf(d)]);
  return total;
}

// "Luni–Vineri 09:00–17:00" sau zilele pe rând, dacă diferă.
export function describeSchedule(s: Schedule) {
  const groups: { from: number; to: number; slot: [string, string] }[] = [];
  s.forEach((slot, i) => {
    if (!slot) return;
    const last = groups[groups.length - 1];
    if (last && last.to === i - 1 && last.slot[0] === slot[0] && last.slot[1] === slot[1]) last.to = i;
    else groups.push({ from: i, to: i, slot });
  });
  if (!groups.length) return "Fără program";
  return groups
    .map((g) => `${DAYS_SHORT[g.from]}${g.to > g.from ? `–${DAYS_SHORT[g.to]}` : ""} ${g.slot[0]}–${g.slot[1]}`)
    .join(" · ");
}

// Ora curentă în București → e în program acum?
export function nowStatus(s: Schedule, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday);
  const min = Number(parts.hour) * 60 + Number(parts.minute);
  const slot = s[day];
  if (slot && min >= toMin(slot[0]) && min < toMin(slot[1])) return { on: true, label: `În program până la ${slot[1]}` };
  if (slot && min < toMin(slot[0])) return { on: false, label: `Începe azi la ${slot[0]}` };
  for (let i = 1; i <= 7; i++) {
    const next = s[(day + i) % 7];
    if (next) return { on: false, label: `Liber · revine ${i === 1 ? "mâine" : DAYS[(day + i) % 7].toLowerCase()} la ${next[0]}` };
  }
  return { on: false, label: "Fără program" };
}
