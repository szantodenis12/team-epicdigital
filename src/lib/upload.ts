"use client";

import { createClient } from "@/lib/supabase/client";
import { registerFile } from "@/app/actions/tickets";

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

const safeName = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-120);

// Urcă direct din browser în Supabase Storage (fără limita de request a Vercel), apoi înregistrează.
export async function uploadFiles(ticketId: number, files: File[]) {
  const supabase = createClient();
  const failed: string[] = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      failed.push(`${file.name} (peste 50 MB)`);
      continue;
    }
    const path = `${ticketId}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const { error } = await supabase.storage
      .from("ticket-files")
      .upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (error) {
      failed.push(file.name);
      continue;
    }
    try {
      await registerFile(ticketId, { path, name: file.name, size: file.size, mime: file.type });
    } catch {
      failed.push(file.name);
    }
  }
  return failed;
}

export const MAX_COMMENT_IMAGE_BYTES = 5 * 1024 * 1024;

/* Imaginile din comentarii urca in acelasi bucket, dar sub `<tichet>/comentarii/`
   si FARA sa fie inregistrate in `ticket_files`: asa nu ajung in sectiunea
   Fisiere, care ramane pentru ce chiar trebuie descarcat. Intoarce calea, care
   se scrie in textul comentariului ca `![nume](cale)`. */
export async function uploadCommentImage(ticketId: number, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Doar imagini se pot lipi în comentariu.");
  if (file.size > MAX_COMMENT_IMAGE_BYTES) {
    throw new Error(`Imaginea are ${(file.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB, iar maximul e 5 MB.`);
  }
  const supabase = createClient();
  // O captura lipita din clipboard vine fara nume; ii dam unul dupa tip.
  const ext = (file.type.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "").slice(0, 5);
  const nume = file.name && file.name !== "image.png" ? safeName(file.name) : `captura.${ext}`;
  const path = `${ticketId}/comentarii/${crypto.randomUUID()}-${nume}`;
  const { error } = await supabase.storage
    .from("ticket-files")
    .upload(path, file, { contentType: file.type || "image/png" });
  if (error) throw new Error(error.message);
  return { path, name: nume };
}
