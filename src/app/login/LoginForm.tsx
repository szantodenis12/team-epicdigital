"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/actions/account";

export function LoginForm({ linkError }: { linkError: boolean }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-4">
      {linkError && <p className="text-sm text-danger">Linkul a expirat sau a fost deja folosit. Cere unul nou.</p>}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="password">Parolă</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Se conectează…" : "Intră"}</button>
      <Link href="/resetare" className="block text-center text-sm text-muted underline-offset-4 hover:underline">
        Ai uitat parola?
      </Link>
    </form>
  );
}
