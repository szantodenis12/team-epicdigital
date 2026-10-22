"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Clock, LogOut, Plus, Ticket, UserRound, Users } from "lucide-react";
import { signOut } from "@/app/actions/account";

export function Nav({ isAdmin, name }: { isAdmin: boolean; name: string }) {
  const path = usePathname();
  const items = [
    { href: "/tichete", label: "Tichete", icon: Ticket, active: path.startsWith("/tichete") && path !== "/tichete/nou" },
    { href: "/clienti", label: "Clienți", icon: Building2, active: path.startsWith("/clienti") },
    { href: "/ore", label: "Ore", icon: Clock, active: path.startsWith("/ore") },
    ...(isAdmin ? [{ href: "/echipa", label: "Echipă", icon: Users, active: path.startsWith("/echipa") }] : []),
    { href: "/cont", label: name || "Cont", icon: UserRound, active: path.startsWith("/cont") },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-4 sm:gap-4">
        <Link href="/tichete" className="mr-2 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/edh-mark-emerald.svg" alt="" className="h-4 w-auto" />
          <span className="hidden font-display text-sm font-bold sm:inline">Epic Team</span>
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {items.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
                active ? "bg-raise text-fg" : "text-muted hover:text-fg"
              }`}
            >
              <Icon size={16} />
              <span className="hidden max-w-32 truncate md:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <Link href="/tichete/nou" className="btn !px-3 !py-1.5">
          <Plus size={16} strokeWidth={2.5} />
          <span className="hidden sm:inline">Tichet nou</span>
        </Link>
        <form action={signOut}>
          <button className="p-2 text-muted hover:text-fg" title="Ieși" aria-label="Ieși">
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
