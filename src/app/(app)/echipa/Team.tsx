"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Copy, UserPlus } from "lucide-react";
import { addClient, inviteMember, setActive, setClientActive, setRole } from "@/app/actions/team";
import { Avatar } from "@/components/Badges";
import type { Client, Profile, Role } from "@/lib/types";
import { userMessage } from "@/lib/errors";

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteMember, null);
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-line bg-raise p-4 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="inv-name">Nume</label>
        <input id="inv-name" name="full_name" className="field" placeholder="Prenume" />
      </div>
      <div>
        <label className="label" htmlFor="inv-email">Email</label>
        <input id="inv-email" name="email" type="email" required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="inv-role">Rol</label>
        <select id="inv-role" name="role" className="field" defaultValue="member">
          <option value="member">Membru</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button className="btn" disabled={pending}><UserPlus size={15} /> Invită</button>
      {state && !state.ok && <p className="text-sm text-danger sm:col-span-4">{state.error}</p>}
      {state?.ok && state.emailed && <p className="text-sm text-forest sm:col-span-4">Invitația a plecat pe email.</p>}
      {state?.ok && state.link && <CopyLink link={state.link} />}
    </form>
  );
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="sm:col-span-4">
      <p className="mb-1 text-sm">Emailul nu e configurat încă. Trimite-i linkul ăsta pe WhatsApp (expiră în 24 h):</p>
      <div className="flex gap-2">
        <input readOnly value={link} className="field font-mono text-xs" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn-ghost" onClick={() => { navigator.clipboard.writeText(link); setCopied(true); }}>
          <Copy size={14} /> {copied ? "Copiat" : "Copiază"}
        </button>
      </div>
    </div>
  );
}

export function MemberRow({ p, isMe }: { p: Profile; isMe: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (fn: () => Promise<void>) => start(async () => { try { await fn(); setError(""); } catch (e) { setError(userMessage(e, "Eroare.")); } });

  return (
    <li className={`flex flex-wrap items-center gap-3 px-3 py-3 ${pending ? "opacity-60" : ""} ${p.active ? "" : "bg-bg"}`}>
      <Avatar person={p} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{p.full_name || "—"} {isMe && <span className="text-xs text-muted">(tu)</span>}</p>
        <p className="truncate text-xs text-muted">{p.email}</p>
      </div>
      {!p.active && <span className="text-xs font-semibold uppercase text-danger">Dezactivat</span>}
      <select
        className="field !w-auto !py-1 text-sm" value={p.role} disabled={isMe}
        onChange={(e) => run(() => setRole(p.id, e.target.value as Role))}
      >
        <option value="member">Membru</option>
        <option value="admin">Admin</option>
      </select>
      {!isMe && (
        <button
          className="btn-ghost !py-1"
          onClick={() => (p.active ? confirm(`Dezactivezi contul lui ${p.full_name || p.email}? Tichetele rămân.`) : true) && run(() => setActive(p.id, !p.active))}
        >
          {p.active ? "Dezactivează" : "Reactivează"}
        </button>
      )}
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </li>
  );
}

export function Clients({ clients }: { clients: Client[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div>
      <form
        className="mb-3 flex gap-2"
        action={(fd) => start(async () => { try { await addClient(fd); setError(""); } catch (e) { setError(userMessage(e, "Eroare.")); } })}
      >
        <input name="name" required className="field" placeholder="Nume client" />
        <button className="btn" disabled={pending}>Adaugă</button>
      </form>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-raise">
        {clients.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <Link href={`/clienti/${c.id}`} className={`flex-1 hover:underline ${c.active ? "" : "text-muted line-through"}`}>{c.name}</Link>
            <button className="text-xs text-muted hover:text-fg" onClick={() => start(() => setClientActive(c.id, !c.active))}>
              {c.active ? "Arhivează" : "Reactivează"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
