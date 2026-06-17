/**
 * Background-template fit math (stretch / contain / cover) → drawImage rects.
 * Pure and divide-by-zero safe (returns null for degenerate images).
 */
import type { FitMode } from "./design";

export interface DrawRects {
  /** source rectangle in the image */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** destination rectangle on the label canvas */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export function computeFit(
  imgW: number,
  imgH: number,
  dstW: number,
  dstH: number,
  mode: FitMode,
): DrawRects | null {
  if (imgW <= 0 || imgH <= 0 || dstW <= 0 || dstH <= 0) return null;

  if (mode === "stretch") {
    return { sx: 0, sy: 0, sw: imgW, sh: imgH, dx: 0, dy: 0, dw: dstW, dh: dstH };
  }

  if (mode === "contain") {
    const scale = Math.min(dstW / imgW, dstH / imgH);
    const dw = imgW * scale;
    const dh = imgH * scale;
    return {
      sx: 0,
      sy: 0,
      sw: imgW,
      sh: imgH,
      dx: (dstW - dw) / 2,
      dy: (dstH - dh) / 2,
      dw,
      dh,
    };
  }

  // cover: scale up to fill, then centre-crop the source.
  const scale = Math.max(dstW / imgW, dstH / imgH);
  const sw = dstW / scale;
  const sh = dstH / scale;
  return {
    sx: (imgW - sw) / 2,
    sy: (imgH - sh) / 2,
    sw,
    sh,
    dx: 0,
    dy: 0,
    dw: dstW,
    dh: dstH,
  };
}
