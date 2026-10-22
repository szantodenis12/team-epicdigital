"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { describeSchedule, type Schedule } from "@/lib/schedule";

// Programul unui om, cu buton de editare pentru el și pentru admin.
export function PersonSchedule({ userId, schedule, canEdit }: { userId: string; schedule: Schedule; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="mt-3 rounded-xl border border-line bg-raise p-4">
        <ScheduleEditor userId={userId} schedule={schedule} onDone={() => setEditing(false)} />
      </div>
    );
  }
  return (
    <p className="flex items-center gap-2 text-xs text-muted">
      {describeSchedule(schedule)}
      {canEdit && (
        <button className="hover:text-fg" onClick={() => setEditing(true)} aria-label="Editează programul" title="Editează programul">
          <Pencil size={12} />
        </button>
      )}
    </p>
  );
}
