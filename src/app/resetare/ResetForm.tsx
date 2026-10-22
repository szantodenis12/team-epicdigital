"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestReset } from "@/app/actions/account";

export function ResetForm() {
  const [state, action, pending] = useActionState(requestReset, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="field" />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="text-sm text-forest">{state.ok}</p>}
      <button className="btn w-full" disabled={pending}>Trimite link</button>
      <Link href="/login" className="block text-center text-sm text-muted hover:underline">Înapoi la login</Link>
    </form>
  );
}
