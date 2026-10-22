import type { MetadataRoute } from "next";

// Permite „Adaugă pe ecranul principal" pe telefon: se deschide ca o aplicație, fără bara browserului.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Epic Team",
    short_name: "Epic Team",
    description: "Tichetele echipei Epic Digital Hub",
    start_url: "/tichete",
    display: "standalone",
    background_color: "#0E1311",
    theme_color: "#0E1311",
    lang: "ro",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
