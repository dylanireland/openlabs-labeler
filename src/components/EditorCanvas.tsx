"use client";

import { useEffect, useRef, useState } from "react";
import {
  useStore,
  selectCurrentDesign,
  selectSelectedElement,
} from "@/lib/state/store";
import { deviceSize, MAX_PRINT_COLS } from "@/lib/model/design";
import { paintDesign, elementAt, elementBoxFor } from "@/lib/render/paint";
import { applyMonochrome } from "@/lib/render/print";
import { loadImage } from "@/lib/render/image";

export default function EditorCanvas() {
  const design = useStore(selectCurrentDesign);
  const selected = useStore(selectSelectedElement);
  const selectElement = useStore((s) => s.selectElement);
  const moveElement = useStore((s) => s.moveElement);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const measureRef = useRef<CanvasRenderingContext2D | null>(null);
  const dragRef = useRef<{ id: string; offX: number; offY: number } | null>(null);

  const [cw, setCw] = useState(0);
  const [tpl, setTpl] = useState<HTMLImageElement | null>(null);
  const [preview, setPreview] = useState(false);

  function measureCtx(): CanvasRenderingContext2D | null {
    if (!measureRef.current && typeof document !== "undefined") {
      measureRef.current = document.createElement("canvas").getContext("2d");
    }
    return measureRef.current;
  }

  // Track container width for fit-to-width display.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setCw(e.contentRect.width);
    });
    ro.observe(el);
    setCw(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Load template image when it changes.
  useEffect(() => {
    let alive = true;
    if (!design.templateDataUrl) {
      setTpl(null);
      return;
    }
    loadImage(design.templateDataUrl)
      .then((img) => alive && setTpl(img))
      .catch(() => alive && setTpl(null));
    return () => {
      alive = false;
    };
  }, [design.templateDataUrl]);

  // Paint.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cw <= 0) return;
    const dims = deviceSize(design);
    const dpr = window.devicePixelRatio || 1;
    const displayScale = cw / dims.width;
    const k = displayScale * dpr;

    canvas.width = Math.max(1, Math.round(dims.width * k));
    canvas.height = Math.max(1, Math.round(dims.height * k));
    canvas.style.width = `${dims.width * displayScale}px`;
    canvas.style.height = `${dims.height * displayScale}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    paintDesign(ctx, design, { dims, template: tpl });
    // Show exactly what the 1-bit thermal printer will produce.
    if (preview) applyMonochrome(canvas);

    // Selection outline (drawn in backing pixels).
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const mctx = measureCtx();
    if (selected && mctx) {
      const box = elementBoxFor(mctx, selected, dims);
      ctx.strokeStyle = "#6D28D9";
      ctx.lineWidth = Math.max(1, dpr);
      ctx.setLineDash([4 * dpr, 3 * dpr]);
      ctx.strokeRect(box.x * k, box.y * k, box.w * k, box.h * k);
      ctx.setLineDash([]);
    }
  }, [design, selected, tpl, cw, preview]);

  function toDevice(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const dims = deviceSize(design);
    const displayScale = rect.width / dims.width || 1;
    return {
      x: (e.clientX - rect.left) / displayScale,
      y: (e.clientY - rect.top) / displayScale,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.focus();
    const dims = deviceSize(design);
    const { x, y } = toDevice(e);
    const mctx = measureCtx();
    const hit = mctx ? elementAt(mctx, design, x, y, dims) : null;
    if (hit) {
      selectElement(hit.id);
      dragRef.current = {
        id: hit.id,
        offX: x - hit.nx * dims.width,
        offY: y - hit.ny * dims.height,
      };
      canvas.setPointerCapture(e.pointerId);
    } else {
      selectElement(null);
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dims = deviceSize(design);
    const { x, y } = toDevice(e);
    moveElement(drag.id, (x - drag.offX) / dims.width, (y - drag.offY) / dims.height);
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current) {
      canvasRef.current?.releasePointerCapture?.(e.pointerId);
      dragRef.current = null;
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
    if (!selected) return;
    const dims = deviceSize(design);
    const step = e.shiftKey ? 10 : 1;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else return;
    e.preventDefault();
    moveElement(
      selected.id,
      selected.nx + dx / dims.width,
      selected.ny + dy / dims.height,
    );
  }

  const dims = deviceSize(design);
  const acrossHead =
    design.printRotation === 90 || design.printRotation === 270
      ? dims.height
      : dims.width;
  const overWidth = acrossHead > MAX_PRINT_COLS;

  return (
    <div className="flex flex-col gap-2">
      <div ref={wrapRef} className="flex justify-center rounded-lg bg-[#F4F1FB] p-4">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
          className="touch-none rounded border border-[#C9C2DE] bg-white outline-none focus:ring-2 focus:ring-violet-300"
          style={{ cursor: "move" }}
        />
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 text-xs text-zinc-500">
        <span>
          {design.widthMm} × {design.heightMm} mm · {dims.width} × {dims.height} dots ·{" "}
          {design.dpi} dpi
        </span>
        {overWidth && (
          <span className="text-amber-600">
            across head {acrossHead} &gt; {MAX_PRINT_COLS} dots — scaled to fit on print
          </span>
        )}
      </div>
      <label className="flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={preview}
          onChange={(e) => setPreview(e.target.checked)}
          className="h-3.5 w-3.5 accent-violet-700"
        />
        Print preview (1-bit black/white — what the M2 actually prints)
      </label>
      <p className="text-xs text-zinc-400">
        Drag to move · arrow keys nudge (Shift = 10px) · click empty space to deselect
      </p>
    </div>
  );
}
