"use client";

import { useState, useTransition } from "react";
import { setTheme } from "@/app/actions/account";
import type { Theme } from "@/lib/types";

const THEMES: { key: Theme; label: string }[] = [
  { key: "dark", label: "Închis" },
  { key: "light", label: "Deschis" },
];

export function ThemeToggle({ theme }: { theme?: Theme }) {
  const [current, setCurrent] = useState<Theme>(theme ?? "dark");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const pick = (next: Theme) => {
    if (next === current) return;
    const prev = current;
    setCurrent(next);
    setError("");
    // Punem atributul pe loc, nu așteptăm serverul: altfel omul apasă „Deschis"
    // și stă încă o secundă în tema veche, de parcă butonul n-ar fi mers.
    document.documentElement.setAttribute("data-theme", next);
    start(async () => {
      try {
        await setTheme(next);
      } catch (e) {
        setCurrent(prev);
        document.documentElement.setAttribute("data-theme", prev);
        setError(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  return (
    <div>
      <span className="label">Tema</span>
      <div className="flex flex-wrap gap-1.5">
        {THEMES.map((t) => (
          <button
            key={t.key}
            type="button"
            disabled={pending}
            onClick={() => pick(t.key)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
              current === t.key ? "border-emerald/60 bg-emerald/10 text-emerald" : "border-line text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
