import { redirect } from "next/navigation";
import { getMe } from "@/lib/session";
import { loadLookups } from "@/lib/data";
import type { Recurring, Template } from "@/lib/types";
import { Departments, RecurringList, Templates } from "./Setup";
import { Clients, InviteForm, MemberRow } from "./Team";

export default async function TeamPage() {
  const { supabase, profile } = await getMe();
  if (profile?.role !== "admin") redirect("/tichete");
  const [{ people, clients, departments, memberOf }, { data: templates }, { data: recurring }] = await Promise.all([
    loadLookups(supabase),
    supabase.from("templates").select("*").order("name"),
    supabase.from("recurring").select("*").order("day_of_month"),
  ]);
  const sorted = [...people].sort((a, b) => Number(b.active) - Number(a.active));

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <section>
        <h1 className="mb-2 font-display text-2xl font-bold tracking-tight">Echipă</h1>
        <p className="mb-5 text-sm text-muted">
          Conturile se fac doar de aici. Omul primește un email cu link de activare și își setează singur parola.
          Dacă dezactivezi pe cineva, nu mai poate intra, dar tichetele și comentariile lui rămân.
        </p>
        <InviteForm />
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-raise">
          {sorted.map((p) => <MemberRow key={p.id} p={p} isMe={p.id === profile.id} />)}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Departamente</h2>
        <p className="mb-4 text-sm text-muted">
          Fiecare vede tichetele departamentului lui în tab-ul „Departamentul meu”. Șeful de departament aprobă ce ajunge în Review;
          fără șef, aprobă adminul.
        </p>
        <Departments departments={departments} people={people} memberOf={memberOf} />
      </section>
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Șabloane</h2>
        <p className="mb-4 text-sm text-muted">Apar sus pe pagina „Tichet nou” și completează câmpurile, brief-ul și pașii.</p>
        <Templates templates={(templates ?? []) as Template[]} departments={departments} />
      </section>
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Tichete lunare</h2>
        <p className="mb-4 text-sm text-muted">Se creează singure dimineața, în ziua aleasă.</p>
        <RecurringList items={(recurring ?? []) as Recurring[]} clients={clients} people={people} />
      </section>
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Clienți</h2>
        <p className="mb-4 text-sm text-muted">Lista din care alegeți când deschideți un tichet. Clienții arhivați nu mai apar la tichete noi.</p>
        <Clients clients={clients} />
      </section>
    </div>
  );
}
