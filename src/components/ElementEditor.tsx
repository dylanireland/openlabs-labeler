"use client";

import { useRef } from "react";
import {
  useStore,
  selectCurrentDesign,
  selectSelectedElement,
} from "@/lib/state/store";
import { ANCHORS, deviceSize, clamp, type Anchor } from "@/lib/model/design";
import { ANCHOR_LABELS } from "@/lib/model/anchors";
import { BUILTIN_FONTS } from "@/lib/render/fonts";
import { card, field, labelText, sectionTitle, btnSecondary } from "./ui";

export default function ElementEditor() {
  const design = useStore(selectCurrentDesign);
  const el = useStore(selectSelectedElement);
  const updateElement = useStore((s) => s.updateElement);
  const moveElement = useStore((s) => s.moveElement);
  const uploadedFonts = useStore((s) => s.uploadedFonts);
  const addUploadedFont = useStore((s) => s.addUploadedFont);
  const fontFileRef = useRef<HTMLInputElement | null>(null);

  function onFontFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !el) return;
    const id = el.id;
    const family =
      file.name.replace(/\.(ttf|otf|woff2?)$/i, "").trim() || "Custom font";
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== "string") return;
      await addUploadedFont({ family, dataUrl: reader.result });
      updateElement(id, { fontFamily: family });
    };
    reader.readAsDataURL(file);
  }

  if (!el) {
    return (
      <section className={card}>
        <h2 className={sectionTitle}>Selected element</h2>
        <p className="mt-2 text-sm text-zinc-400">Select an element to edit it.</p>
      </section>
    );
  }

  const dims = deviceSize(design);
  const xPx = Math.round(el.nx * dims.width);
  const yPx = Math.round(el.ny * dims.height);
  const fonts = [
    ...BUILTIN_FONTS,
    ...uploadedFonts.map((f) => f.family).filter((f) => !BUILTIN_FONTS.includes(f)),
  ];

  return (
    <section className={card}>
      <h2 className={sectionTitle}>Selected element</h2>
      <div className="mt-2 space-y-2">
        <label className="block">
          <span className={labelText}>Name</span>
          <input
            className={field}
            value={el.name}
            onChange={(e) => updateElement(el.id, { name: e.target.value })}
          />
        </label>
        <label className="block">
          <span className={labelText}>Text</span>
          <input
            className={field}
            value={el.text}
            onChange={(e) => updateElement(el.id, { text: e.target.value })}
          />
        </label>

        <div>
          <span className={labelText}>Font</span>
          <div className="flex gap-2">
            <select
              className={field}
              value={el.fontFamily}
              onChange={(e) => updateElement(el.id, { fontFamily: e.target.value })}
            >
              {fonts.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </option>
              ))}
            </select>
            <button
              className={`${btnSecondary} whitespace-nowrap`}
              onClick={() => fontFileRef.current?.click()}
            >
              Upload
            </button>
            <input
              ref={fontFileRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              hidden
              onChange={onFontFile}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={labelText}>Size px</span>
            <input
              type="number"
              min={6}
              max={400}
              className={field}
              value={el.sizePx}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n > 0)
                  updateElement(el.id, { sizePx: clamp(Math.round(n), 6, 400) });
              }}
            />
          </label>
          <label className="block">
            <span className={labelText}>Anchor</span>
            <select
              className={field}
              value={el.anchor}
              onChange={(e) =>
                updateElement(el.id, { anchor: e.target.value as Anchor })
              }
            >
              {ANCHORS.map((a) => (
                <option key={a} value={a}>
                  {ANCHOR_LABELS[a]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 items-end gap-2">
          <label className="block">
            <span className={labelText}>X px</span>
            <input
              type="number"
              className={field}
              value={xPx}
              onChange={(e) => {
                const v = e.target.value;
                const n = Number(v);
                if (v !== "" && Number.isFinite(n))
                  moveElement(el.id, n / dims.width, el.ny);
              }}
            />
          </label>
          <label className="block">
            <span className={labelText}>Y px</span>
            <input
              type="number"
              className={field}
              value={yPx}
              onChange={(e) => {
                const v = e.target.value;
                const n = Number(v);
                if (v !== "" && Number.isFinite(n))
                  moveElement(el.id, el.nx, n / dims.height);
              }}
            />
          </label>
          <label className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              checked={el.bold}
              onChange={(e) => updateElement(el.id, { bold: e.target.checked })}
              className="h-4 w-4 accent-violet-700"
            />
            <span className="text-sm">Bold</span>
          </label>
        </div>

        <label className="flex items-center gap-3">
          <span className={`${labelText} mb-0`}>Colour</span>
          <input
            type="color"
            value={el.color}
            onChange={(e) => updateElement(el.id, { color: e.target.value })}
            className="h-8 w-12 rounded border border-zinc-300"
          />
        </label>
      </div>
    </section>
  );
}
