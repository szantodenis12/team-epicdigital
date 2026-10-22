import { getMe } from "@/lib/session";
import { loadLookups } from "@/lib/data";
import type { Template } from "@/lib/types";
import { NewTicketForm } from "./NewTicketForm";

export default async function NewTicketPage() {
  const { supabase, user } = await getMe();
  const [{ people, clients, departments, memberOf }, { data: templates }] = await Promise.all([
    loadLookups(supabase),
    supabase.from("templates").select("*").order("name"),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-2xl font-bold tracking-tight">Tichet nou</h1>
      <NewTicketForm
        clients={clients}
        people={people}
        departments={departments}
        templates={(templates ?? []) as Template[]}
        meId={user.id}
        myDept={memberOf[user.id]?.[0] ?? ""}
      />
    </div>
  );
}
