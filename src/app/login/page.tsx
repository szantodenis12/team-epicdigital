import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ eroare?: string }> }) {
  const { eroare } = await searchParams;
  return (
    <AuthCard title="Epic Team">
      <LoginForm linkError={eroare === "link"} />
      <p className="mt-8 text-xs text-muted">Conturile se fac doar prin invitație. Nu ai cont? Scrie-i lui Roland.</p>
    </AuthCard>
  );
}
