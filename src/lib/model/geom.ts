/**
 * Pure geometry for text-element placement + hit-testing. Text metrics are
 * injected (measured by the browser at runtime), so the geometry is testable
 * with stub metrics — no canvas needed.
 */
import type { DeviceSize, TextElement } from "./design";
import { anchorMapping } from "./anchors";

export interface TextMetrics2 {
  width: number;
  ascent: number;
  descent: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function anchorPoint(
  el: TextElement,
  dims: DeviceSize,
): { x: number; y: number } {
  return { x: el.nx * dims.width, y: el.ny * dims.height };
}

/** Device-pixel bounding box of an element, given its measured metrics. */
export function elementBox(
  el: TextElement,
  dims: DeviceSize,
  m: TextMetrics2,
): Box {
  const { align, baseline } = anchorMapping(el.anchor);
  const ax = el.nx * dims.width;
  const ay = el.ny * dims.height;

  const w = Math.max(1, m.width);
  // Use the measured ascent/descent directly (they were measured under this
  // element's baseline); only substitute when the values aren't finite.
  const ascent = Number.isFinite(m.ascent) ? m.ascent : el.sizePx * 0.8;
  const descent = Number.isFinite(m.descent) ? m.descent : el.sizePx * 0.2;
  const h = Math.max(1, ascent + descent);

  let x: number;
  if (align === "left") x = ax;
  else if (align === "center") x = ax - w / 2;
  else x = ax - w;

  let y: number;
  if (baseline === "top") y = ay;
  else if (baseline === "middle") y = ay - h / 2;
  else y = ay - ascent; // alphabetic

  return { x, y, w, h };
}

export function pointInBox(
  px: number,
  py: number,
  box: Box,
  pad = 0,
): boolean {
  return (
    px >= box.x - pad &&
    px <= box.x + box.w + pad &&
    py >= box.y - pad &&
    py <= box.y + box.h + pad
  );
}
