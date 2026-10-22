import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Unbounded } from "next/font/google";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Theme } from "@/lib/types";
import "./globals.css";

const grotesk = Space_Grotesk({ subsets: ["latin", "latin-ext"], variable: "--font-grotesk" });
const unbounded = Unbounded({ subsets: ["latin", "latin-ext"], weight: ["600", "700"], variable: "--font-unbounded" });

export const metadata: Metadata = {
  title: "Epic Team",
  description: "Tichetele echipei Epic Digital Hub",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Epic Team", statusBarStyle: "black-translucent" },
};

/* Tema vine din profil, dar profilul se citește doar când nu avem cookie-ul:
   altfel ar fi o interogare în plus la fiecare pagină, pentru o valoare pe care
   o știm deja. Cookie-ul lipsește doar la prima vizită dintr-un browser nou -
   exact cazul în care contează să luăm alegerea omului de pe server. */
const initialTheme = cache(async (): Promise<Theme> => {
  const fromCookie = (await cookies()).get("theme")?.value;
  if (fromCookie === "dark" || fromCookie === "light") return fromCookie;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return "dark";
  const { data } = await supabase.from("profiles").select("theme").eq("id", auth.user.id).single<{ theme: Theme }>();
  return data?.theme === "light" ? "light" : "dark";
});

// Bara de sus a browserului pe telefon: fără asta ar rămâne închisă peste tema deschisă.
export async function generateViewport(): Promise<Viewport> {
  return { themeColor: (await initialTheme()) === "light" ? "#F4F1EA" : "#0E1311" };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = await initialTheme();
  return (
    <html lang="ro" data-theme={theme} className={`${grotesk.variable} ${unbounded.variable}`} suppressHydrationWarning>
      <head>
        {/* Scriptul rulează în timpul parsării, înainte de prima pictare, și doar
            corectează ce a trimis serverul: dacă pagina vine din cache-ul
            browserului (înapoi/înainte, sau tema schimbată pe alt dispozitiv),
            altfel am clipi o dată în tema greșită. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(dark|light)/);if(m)document.documentElement.setAttribute("data-theme",m[1])}catch(e){}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
