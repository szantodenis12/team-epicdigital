import { getMe } from "@/lib/session";
import { Nav } from "@/components/Nav";
import { AuthCard } from "@/components/AuthCard";
import { signOut } from "@/app/actions/account";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getMe();

  if (!profile?.active) {
    return (
      <AuthCard title="Cont inactiv">
        <p className="mb-6 text-sm">Contul tău nu e activ încă sau a fost dezactivat. Scrie-i lui Roland.</p>
        <form action={signOut}>
          <button className="btn-ghost w-full">Ieși</button>
        </form>
      </AuthCard>
    );
  }

  return (
    <>
      <Nav isAdmin={profile.role === "admin"} name={profile.full_name.split(" ")[0]} />
      <main className="mx-auto max-w-[1600px] px-4 py-6">{children}</main>
    </>
  );
}
