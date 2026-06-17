"use client";

import { useRef } from "react";
import { useStore, selectCurrentDesign } from "@/lib/state/store";
import { FIT_MODES, type FitMode } from "@/lib/model/design";
import { btnSecondary, btnGhost, card, field, labelText, sectionTitle } from "./ui";

export default function TemplatePicker() {
  const design = useStore(selectCurrentDesign);
  const setTemplate = useStore((s) => s.setTemplate);
  const setFit = useStore((s) => s.setFit);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setTemplate(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return (
    <section className={card}>
      <h2 className={sectionTitle}>Template</h2>
      <div className="mt-2 flex gap-2">
        <button className={btnSecondary} onClick={() => fileRef.current?.click()}>
          Choose…
        </button>
        <button
          className={btnGhost}
          disabled={!design.templateDataUrl}
          onClick={() => setTemplate(null)}
        >
          Clear
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {design.templateDataUrl
          ? "Background image set."
          : "No template — plain white label."}
      </p>
      <label className="mt-2 block">
        <span className={labelText}>Fit</span>
        <select
          className={field}
          value={design.fit}
          onChange={(e) => setFit(e.target.value as FitMode)}
        >
          {FIT_MODES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
