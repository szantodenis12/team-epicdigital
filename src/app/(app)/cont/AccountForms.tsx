"use client";

import { useActionState } from "react";
import { updateName, updatePassword } from "@/app/actions/account";

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateName, null);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="full_name">Numele tău</label>
        <input id="full_name" name="full_name" defaultValue={name} required className="field" />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="text-sm text-forest">{state.ok}</p>}
      <button className="btn" disabled={pending}>Salvează</button>
    </form>
  );
}

export function PasswordForm({ highlight }: { highlight: boolean }) {
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <form action={action} className={`space-y-3 ${highlight ? "border-2 border-emerald p-4" : ""}`}>
      {highlight && <p className="text-sm font-medium">Bun venit! Setează-ți o parolă ca să poți intra data viitoare.</p>}
      <div>
        <label className="label" htmlFor="password">Parolă nouă</label>
        <input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Repetă parola</label>
        <input id="confirm" name="confirm" type="password" minLength={8} autoComplete="new-password" required className="field" />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="text-sm text-forest">{state.ok}</p>}
      <button className="btn" disabled={pending}>Setează parola</button>
    </form>
  );
}
