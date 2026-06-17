"use client";

import { useStore, selectCurrentDesign } from "@/lib/state/store";
import { btnSecondary, btnGhost, card, sectionTitle } from "./ui";

export default function ElementList() {
  const design = useStore(selectCurrentDesign);
  const selectedId = useStore((s) => s.selectedElementId);
  const selectElement = useStore((s) => s.selectElement);
  const addElement = useStore((s) => s.addElement);
  const duplicateElement = useStore((s) => s.duplicateElement);
  const removeElement = useStore((s) => s.removeElement);

  return (
    <section className={card}>
      <h2 className={sectionTitle}>Text elements</h2>
      <ul className="mt-2 max-h-44 divide-y divide-zinc-100 overflow-auto rounded-md border border-zinc-200">
        {design.elements.length === 0 && (
          <li className="px-2 py-2 text-xs text-zinc-400">No elements yet.</li>
        )}
        {design.elements.map((el) => (
          <li key={el.id}>
            <button
              onClick={() => selectElement(el.id)}
              className={`flex w-full items-baseline gap-2 truncate px-2 py-1.5 text-left text-sm ${
                el.id === selectedId
                  ? "bg-violet-100 text-violet-900"
                  : "hover:bg-zinc-50"
              }`}
            >
              <span className="font-medium">{el.name || "Text"}</span>
              <span className="truncate text-xs text-zinc-400">
                {el.text || "(empty)"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <button className={btnSecondary} onClick={addElement}>
          Add
        </button>
        <button
          className={btnGhost}
          disabled={!selectedId}
          onClick={() => selectedId && duplicateElement(selectedId)}
        >
          Duplicate
        </button>
        <button
          className={btnGhost}
          disabled={!selectedId}
          onClick={() => selectedId && removeElement(selectedId)}
        >
          Remove
        </button>
      </div>
    </section>
  );
}
