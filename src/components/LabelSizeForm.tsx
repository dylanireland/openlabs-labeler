"use client";

import { useEffect, useState } from "react";
import { useStore, selectCurrentDesign } from "@/lib/state/store";
import { card, field, labelText, sectionTitle } from "./ui";

export default function LabelSizeForm() {
  const design = useStore(selectCurrentDesign);
  const setDims = useStore((s) => s.setDims);

  // Local strings so typing isn't clamped on every keystroke; commit on blur/Enter.
  const [w, setW] = useState(String(design.widthMm));
  const [h, setH] = useState(String(design.heightMm));
  useEffect(() => {
    setW(String(design.widthMm));
    setH(String(design.heightMm));
  }, [design.widthMm, design.heightMm]);

  const commit = () => {
    const nw = Number(w);
    const nh = Number(h);
    setDims(
      Number.isFinite(nw) && nw > 0 ? nw : design.widthMm,
      Number.isFinite(nh) && nh > 0 ? nh : design.heightMm,
    );
  };

  return (
    <section className={card}>
      <h2 className={sectionTitle}>Label size (mm)</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label>
          <span className={labelText}>Width</span>
          <input
            type="number"
            min={5}
            max={200}
            className={field}
            value={w}
            onChange={(e) => setW(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
          />
        </label>
        <label>
          <span className={labelText}>Height</span>
          <input
            type="number"
            min={5}
            max={200}
            className={field}
            value={h}
            onChange={(e) => setH(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
          />
        </label>
      </div>
    </section>
  );
}
