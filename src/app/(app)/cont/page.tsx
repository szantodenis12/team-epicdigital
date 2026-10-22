import { getMe } from "@/lib/session";
import { Avatar } from "@/components/Badges";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { DEFAULT_SCHEDULE } from "@/lib/schedule";
import { displayName } from "@/lib/format";
import { NameForm, PasswordForm } from "./AccountForms";
import { ThemeToggle } from "./ThemeToggle";
import { AvatarUpload } from "./AvatarUpload";

/* Fișe, nu un singur șir.

   Pagina era o coloană îngustă cu cinci secțiuni una sub alta: parolă, nume,
   poză, temă, program. Pe un ecran lat asta însemna o treime din lățime
   folosită și un derulat lung până jos, deși lucrurile de aici nu au mare
   legătură între ele - poza și numele sunt identitatea ta, parola e securitate,
   programul e cu totul altceva.

   Grupate pe înțeles și puse pe două coloane de la `lg` în sus, încap aproape
   toate într-un ecran. Programul stă singur în dreapta pentru că e cel mai
   înalt: are șapte rânduri, cât celelalte trei fișe la un loc. */
function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-base font-bold tracking-tight">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ parola?: string }> }) {
  const { profile } = await getMe();
  const { parola } = await searchParams;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Antetul spune cine ești, cu poza pe care tocmai ai pus-o - înainte
          scria „Contul meu", ceea ce știai deja. */}
      <header className="mb-6 flex items-center gap-4">
        <Avatar person={profile} size={48} />
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{displayName(profile)}</h1>
          <p className="text-sm text-muted">
            {profile?.email} · {profile?.role === "admin" ? "Admin" : "Membru"}
          </p>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {profile && (
            <Card title="Profil">
              <div className="space-y-6">
                <NameForm name={profile.full_name ?? ""} />
                <AvatarUpload profile={profile} />
              </div>
            </Card>
          )}

          <Card title="Tema">
            <ThemeToggle theme={profile?.theme} />
          </Card>

          {/* Parola la urmă: e singurul lucru de aici pe care nu-l atinge
              nimeni săptămânal. Excepția e prima logare, când se cere setată -
              atunci `?parola=1` o scoate în evidență acolo unde e. */}
          <Card title="Parolă">
            <PasswordForm highlight={parola === "1"} />
          </Card>
        </div>

        {profile && (
          <Card
            title="Programul meu"
            hint="Apare la „Ore”, ca echipa să știe când ești disponibil. În zilele libere nu primești emailul de dimineață."
          >
            <ScheduleEditor userId={profile.id} schedule={profile.schedule ?? DEFAULT_SCHEDULE} />
          </Card>
        )}
      </div>
    </div>
  );
}
