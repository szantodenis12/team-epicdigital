"use client";

import { useState, useTransition } from "react";
import { CalendarSync, LayoutTemplate } from "lucide-react";
import { makeRecurring, saveTemplate } from "@/app/actions/tickets";
import { userMessage } from "@/lib/errors";

// Unelte rare, la finalul tichetului: șablon din tichet și repetare lunară.
export function Tools({ ticketId, title, isAdmin }: { ticketId: number; title: string; isAdmin: boolean }) {
  const [open, setOpen] = useState<"" | "sablon" | "lunar">("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  const run = (fn: () => Promise<void>, ok: string) =>
    start(async () => {
      try {
        await fn();
        setMsg(ok);
        setOpen("");
      } catch (e) {
        setMsg(userMessage(e, "Eroare."));
      }
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost !py-1.5 text-sm" onClick={() => setOpen(open === "sablon" ? "" : "sablon")}>
          <LayoutTemplate size={14} /> Salvează ca șablon
        </button>
        {isAdmin && (
          <button className="btn-ghost !py-1.5 text-sm" onClick={() => setOpen(open === "lunar" ? "" : "lunar")}>
            <CalendarSync size={14} /> Repetă lunar
          </button>
        )}
      </div>

      {open === "sablon" && (
        <form
          className="flex flex-wrap gap-2"
          action={(fd) => run(() => saveTemplate(ticketId, String(fd.get("name") ?? "")), "Șablon salvat. Îl găsești la Tichet nou.")}
        >
          <input name="name" required defaultValue={title} className="field !w-auto flex-1 text-sm" placeholder="Numele șablonului" />
          <button className="btn !py-1.5" disabled={pending}>Salvează</button>
        </form>
      )}

      {open === "lunar" && (
        <form
          className="flex flex-wrap items-center gap-2 text-sm"
          action={(fd) =>
            run(
              () => makeRecurring(ticketId, Number(fd.get("day")), Number(fd.get("due"))),
              "Gata. Tichetul se creează singur în fiecare lună (vezi Echipă → Tichete lunare).",
            )
          }
        >
          <span>Creează-l în fiecare lună pe</span>
          <select name="day" className="field !w-auto !py-1.5" defaultValue="1">
            {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
          <span>, cu termen în</span>
          <input name="due" type="number" min={0} max={60} defaultValue={5} className="field !w-20 !py-1.5" />
          <span>zile.</span>
          <button className="btn !py-1.5" disabled={pending}>Salvează</button>
        </form>
      )}
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
