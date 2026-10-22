"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { fmtSize } from "@/lib/format";
import { MAX_FILE_BYTES } from "@/lib/upload";

export function FilePicker({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const add = (list: FileList | null) => list && onChange([...files, ...Array.from(list)]);

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(e.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-6 text-sm transition ${
          drag ? "border-forest bg-emerald/10" : "border-line hover:border-fg"
        }`}
      >
        <Upload size={18} />
        <span>Trage fișierele aici sau apasă să alegi</span>
        <span className="text-xs text-muted">zip, pdf, imagini, orice · max 50 MB / fișier</span>
      </button>
      <input ref={input} type="file" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="truncate">{f.name}</span>
              <span className={`shrink-0 text-xs ${f.size > MAX_FILE_BYTES ? "text-danger" : "text-muted"}`}>
                {fmtSize(f.size)}
              </span>
              <button type="button" className="ml-auto text-muted hover:text-danger" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label="Scoate">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
