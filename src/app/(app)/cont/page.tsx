import { getMe } from "@/lib/session";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { DEFAULT_SCHEDULE } from "@/lib/schedule";
import { NameForm, PasswordForm } from "./AccountForms";
import { ThemeToggle } from "./ThemeToggle";
import { AvatarUpload } from "./AvatarUpload";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ parola?: string }> }) {
  const { profile } = await getMe();
  const { parola } = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Contul meu</h1>
        <p className="text-sm text-muted">{profile?.email} · {profile?.role === "admin" ? "Admin" : "Membru"}</p>
      </div>
      <PasswordForm highlight={parola === "1"} />
      <NameForm name={profile?.full_name ?? ""} />
      {profile && <AvatarUpload profile={profile} />}
      <ThemeToggle theme={profile?.theme} />
      {profile && (
        <section>
          <h2 className="mb-1 font-semibold">Programul meu</h2>
          <p className="mb-3 text-sm text-muted">Apare la „Ore”, ca echipa să știe când ești disponibil. În zilele libere nu primești emailul de dimineață.</p>
          <ScheduleEditor userId={profile.id} schedule={profile.schedule ?? DEFAULT_SCHEDULE} />
        </section>
      )}
    </div>
  );
}
