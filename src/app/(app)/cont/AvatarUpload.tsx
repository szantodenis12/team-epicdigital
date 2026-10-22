"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Trash2 } from "lucide-react";
import { removeAvatar, setAvatar } from "@/app/actions/account";
import { Avatar } from "@/components/Badges";
import { createClient } from "@/lib/supabase/client";
import { fmtSize } from "@/lib/format";
import type { Profile } from "@/lib/types";

/* Aceleași limite ca pe bucket-ul `avatars` din 0005, repetate aici doar ca omul
   să vadă un mesaj în română în loc de eroarea brută de la Storage. */
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function AvatarUpload({ profile }: { profile: Profile }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});

  // Urcă direct din browser în Storage, ca la fișierele de pe tichet, apoi înregistrează calea.
  async function upload(file: File) {
    const ext = EXT[file.type];
    if (!ext) return setMsg({ error: "Poza trebuie să fie JPG, PNG sau WebP." });
    if (file.size > MAX_AVATAR_BYTES) return setMsg({ error: `Poza are ${fmtSize(file.size)}, iar maximul e 2 MB.` });
    setBusy(true);
    setMsg({});
    const supabase = createClient();
    const old = profile.avatar_path;
    // Primul segment e uid-ul: politicile bucket-ului refuză orice altă cale.
    const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (error) {
      setBusy(false);
      return setMsg({ error: "Poza nu s-a putut urca. Încearcă din nou." });
    }
    const state = await setAvatar(path);
    setBusy(false);
    if (state?.error) {
      // Calea nu a ajuns pe profil, deci fișierul urcat nu mai e al nimănui.
      await supabase.storage.from("avatars").remove([path]);
      return setMsg({ error: state.error });
    }
    // Poza veche nu se mai vede nicăieri; fără ștergere, bucket-ul adună orfani.
    if (old) await supabase.storage.from("avatars").remove([old]);
    setMsg({ ok: state?.ok });
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    setMsg({});
    const state = await removeAvatar();
    setBusy(false);
    setMsg(state ?? {});
    router.refresh();
  }

  /* Fără titlu propriu: componenta stă într-o fișă din pagina Cont, care își
     pune singură antetul. Altfel „Poza mea" s-ar repeta sub „Profil". */
  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar person={profile} size={64} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => input.current?.click()}>
            <ImageUp size={16} />
            {profile.avatar_path ? "Schimbă poza" : "Alege o poză"}
          </button>
          {profile.avatar_path && (
            <button type="button" className="btn-ghost text-muted hover:text-danger" disabled={busy} onClick={remove}>
              <Trash2 size={15} />
              Șterge
            </button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Golim inputul ca să pornească onChange și dacă se alege iar același fișier.
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <p className="mt-2 text-xs text-muted">JPG, PNG sau WebP, maximum 2 MB. Apare lângă numele tău pe tichete.</p>
      {busy && <p className="mt-2 text-sm text-muted">Se lucrează…</p>}
      {!busy && msg.error && <p className="mt-2 text-sm text-danger">{msg.error}</p>}
      {!busy && msg.ok && <p className="mt-2 text-sm text-forest">{msg.ok}</p>}
    </div>
  );
}
