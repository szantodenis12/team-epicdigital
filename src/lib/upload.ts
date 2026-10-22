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
