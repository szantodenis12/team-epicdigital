import type { Brief } from "@/lib/brief";
import type { Schedule } from "@/lib/schedule";

export type Role = "admin" | "member";
export type Status = "nou" | "lucru" | "review" | "gata" | "blocat";
export type Priority = "urgent" | "normal" | "scazut";
export type TicketType = "website" | "seo" | "tracking" | "ads" | "design" | "continut" | "bug" | "altele";

export type Theme = "dark" | "light";
export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  active: boolean;
  schedule?: Schedule;
  theme?: Theme;
  /** Calea în bucket-ul privat `avatars`; gol = fără poză. */
  avatar_path?: string;
  /** Adresă semnată, completată la încărcare - nu e o coloană. */
  avatar_url?: string | null;
};
export type Client = { id: string; name: string; active: boolean; drive_url: string; notes: string };
export type Department = { id: string; name: string; color: string; lead_id: string | null; active: boolean };

export type Ticket = {
  id: number;
  title: string;
  description: string;
  client_id: string | null;
  department_id: string | null;
  type: TicketType;
  priority: Priority;
  status: Status;
  assignee_id: string | null;
  created_by: string;
  deadline: string | null;
  links: string[];
  brief: Brief | null;
  created_at: string;
  updated_at: string;
  /** Primul comentariu al altcuiva decât solicitantul; oprește ceasul de răspuns. */
  first_response_at: string | null;
  /** Intrarea în „gata"; se golește dacă tichetul e redeschis. */
  resolved_at: string | null;
};

/** Cronometru pornit. Cheia primară pe profil garantează unul singur pe om. */
export type Timer = { profile_id: string; ticket_id: number; started_at: string };

export type { Brief };
export type ChecklistItem = { id: string; ticket_id: number; body: string; done: boolean; position: number };
export type TimeEntry = { id: string; ticket_id: number; profile_id: string; minutes: number; note: string; spent_on: string };

// Câmpurile comune pentru șabloane și tichete lunare.
type TicketBlueprint = {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  priority: Priority;
  department_id: string | null;
  checklist: string[];
  brief: Brief | null;
};
export type Template = TicketBlueprint & { name: string; created_by: string };
export type Recurring = TicketBlueprint & {
  client_id: string | null;
  assignee_id: string | null;
  links: string[];
  day_of_month: number;
  due_days: number;
  active: boolean;
  last_run: string | null;
};


export type TicketFile = {
  id: string;
  ticket_id: number;
  path: string;
  name: string;
  size: number;
  mime: string;
  uploaded_by: string;
  created_at: string;
};

export type Comment = { id: string; ticket_id: number; author_id: string; body: string; created_at: string };
export type Activity = {
  id: number;
  ticket_id: number;
  actor_id: string | null;
  action: string;
  meta: Record<string, string | null>;
  created_at: string;
};

export const STATUSES: { key: Status; label: string }[] = [
  { key: "nou", label: "Nou" },
  { key: "lucru", label: "În lucru" },
  { key: "review", label: "Review" },
  { key: "gata", label: "Gata" },
  { key: "blocat", label: "Blocat" },
];

export const PRIORITIES: { key: Priority; label: string }[] = [
  { key: "urgent", label: "Urgent" },
  { key: "normal", label: "Normal" },
  { key: "scazut", label: "Scăzut" },
];

export const TYPES: { key: TicketType; label: string }[] = [
  { key: "website", label: "Website" },
  { key: "seo", label: "SEO / GEO" },
  { key: "tracking", label: "Tracking / GTM" },
  { key: "ads", label: "Ads" },
  { key: "design", label: "Design" },
  { key: "continut", label: "Conținut" },
  { key: "bug", label: "Bug" },
  { key: "altele", label: "Altele" },
];

export const label = <K extends string>(list: { key: K; label: string }[], key: K) =>
  list.find((x) => x.key === key)?.label ?? key;
