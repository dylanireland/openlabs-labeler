/**
 * Canvas renderer — the browser port of Python `render_design`. Composites the
 * template (fit modes) then draws each text element with its anchor, weight, and
 * colour. Also measures elements for hit-testing the interactive editor.
 */
import type { DeviceSize, LabelDesign, TextElement } from "../model/design";
import { anchorMapping } from "../model/anchors";
import { computeFit } from "../model/fit";
import {
  elementBox,
  pointInBox,
  type Box,
  type TextMetrics2,
} from "../model/geom";
import { cssFont } from "./fonts";

export function measureElement(
  ctx: CanvasRenderingContext2D,
  el: TextElement,
): TextMetrics2 {
  // Measure under the element's actual baseline/align so the metrics share the
  // coordinate frame elementBox assumes (else the selection box is offset).
  const { align, baseline } = anchorMapping(el.anchor);
  ctx.font = cssFont(el.fontFamily, el.sizePx, el.bold);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const m = ctx.measureText(el.text || " ");
  const ascent = Number.isFinite(m.actualBoundingBoxAscent)
    ? m.actualBoundingBoxAscent
    : el.sizePx * 0.8;
  const descent = Number.isFinite(m.actualBoundingBoxDescent)
    ? m.actualBoundingBoxDescent
    : el.sizePx * 0.2;
  return { width: m.width, ascent, descent };
}

export interface PaintOpts {
  /** label native dot size to render at */
  dims: DeviceSize;
  template?: HTMLImageElement | null;
}

export function paintDesign(
  ctx: CanvasRenderingContext2D,
  design: LabelDesign,
  opts: PaintOpts,
): void {
  const { dims } = opts;
  const template = opts.template ?? null;

  ctx.save();
  // White background.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, dims.width, dims.height);

  // Template (fit modes).
  if (template && template.naturalWidth > 0 && template.naturalHeight > 0) {
    const r = computeFit(
      template.naturalWidth,
      template.naturalHeight,
      dims.width,
      dims.height,
      design.fit,
    );
    if (r) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(template, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
    }
  }

  // Text elements.
  for (const el of design.elements) {
    if (!el.text) continue;
    const { align, baseline } = anchorMapping(el.anchor);
    ctx.font = cssFont(el.fontFamily, el.sizePx, el.bold);
    ctx.fillStyle = el.color || "#000000";
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(el.text, el.nx * dims.width, el.ny * dims.height);
  }

  ctx.restore();
}

/** Device-pixel bounding box of an element (uses a measuring ctx). */
export function elementBoxFor(
  ctx: CanvasRenderingContext2D,
  el: TextElement,
  dims: DeviceSize,
): Box {
  return elementBox(el, dims, measureElement(ctx, el));
}

/** Topmost element under a device-pixel point, or null. */
export function elementAt(
  ctx: CanvasRenderingContext2D,
  design: LabelDesign,
  px: number,
  py: number,
  dims: DeviceSize,
  pad = 4,
): TextElement | null {
  for (let i = design.elements.length - 1; i >= 0; i--) {
    const el = design.elements[i];
    if (!el.text) continue;
    const box = elementBoxFor(ctx, el, dims);
    if (pointInBox(px, py, box, pad)) return el;
  }
  return null;
}
