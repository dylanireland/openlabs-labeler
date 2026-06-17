/**
 * Builds the exact bitmap canvas sent to the printer: render at native dots,
 * apply print rotation, and scale down if the across-head dimension exceeds the
 * M2's usable width. Kept separate from the editor canvas (which is dpr-scaled
 * for display) so the printed bitmap is always at true device resolution.
 */
import {
  deviceSize,
  MAX_PRINT_COLS,
  type LabelDesign,
  type Rotation,
} from "../model/design";
import { paintDesign } from "./paint";

export interface PrintRender {
  canvas: HTMLCanvasElement;
  cols: number;
  rows: number;
  /** true if the design was scaled down to fit the print head */
  scaled: boolean;
}

/** Round up to the next multiple of 8 (the encoder requires cols % 8 === 0). */
export const nextMultipleOf8 = (n: number): number => Math.ceil(n / 8) * 8;

/** Luminance threshold (0–255) below which a pixel becomes black ink. */
export const PRINT_THRESHOLD = 128;

/**
 * Snap a pixel to pure black (0) or white (255). niimbluelib's encoder treats
 * ANY pixel that isn't exactly white as ink, so without this a colored / off-white
 * / JPEG / anti-aliased template prints almost solid black. Composites over white
 * first so transparency reads as blank, then thresholds on luminance.
 */
export function monoValue(
  r: number,
  g: number,
  b: number,
  a: number,
  threshold: number = PRINT_THRESHOLD,
): 0 | 255 {
  const af = a / 255;
  const rr = r * af + 255 * (1 - af);
  const gg = g * af + 255 * (1 - af);
  const bb = b * af + 255 * (1 - af);
  const lum = Math.round(0.299 * rr + 0.587 * gg + 0.114 * bb);
  return lum < threshold ? 0 : 255;
}

/** Convert a canvas in place to a 1-bit black/white bitmap. */
export function applyMonochrome(
  canvas: HTMLCanvasElement,
  threshold: number = PRINT_THRESHOLD,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = monoValue(d[i], d[i + 1], d[i + 2], d[i + 3], threshold);
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function newCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Rotate a canvas clockwise by 0/90/180/270 onto a white background. */
function rotateCanvas(src: HTMLCanvasElement, deg: Rotation): HTMLCanvasElement {
  if (deg === 0) return src;
  const swap = deg === 90 || deg === 270;
  const w = swap ? src.height : src.width;
  const h = swap ? src.width : src.height;
  const c = newCanvas(w, h);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.translate(w / 2, h / 2);
  ctx.rotate((deg * Math.PI) / 180); // canvas: positive = clockwise (y-down)
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}

/** Apply rotation + over-width scaling, then pad cols to a multiple of 8. */
export function finalizeForPrint(
  base: HTMLCanvasElement,
  rotation: Rotation,
): PrintRender {
  const rotated = rotateCanvas(base, rotation);

  // Scale down if wider than the print head.
  let out = rotated;
  let scaled = false;
  if (rotated.width > MAX_PRINT_COLS) {
    const scale = MAX_PRINT_COLS / rotated.width;
    out = newCanvas(MAX_PRINT_COLS, Math.max(1, Math.round(rotated.height * scale)));
    const sctx = out.getContext("2d")!;
    sctx.fillStyle = "#ffffff";
    sctx.fillRect(0, 0, out.width, out.height);
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(rotated, 0, 0, out.width, out.height);
    scaled = true;
  }

  // The encoder (printDirection "top") requires cols = canvas.width to be a
  // multiple of 8, else it throws. Pad on the right with white (blank columns).
  const w8 = nextMultipleOf8(out.width);
  if (w8 !== out.width) {
    const padded = newCanvas(w8, out.height);
    const pctx = padded.getContext("2d")!;
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, w8, out.height);
    pctx.drawImage(out, 0, 0);
    out = padded;
  }

  // Snap to pure 1-bit B/W so the encoder (which treats any non-white pixel as
  // ink) doesn't turn a colored/off-white template into a solid black label.
  applyMonochrome(out, PRINT_THRESHOLD);
  return { canvas: out, cols: out.width, rows: out.height, scaled };
}

export function renderPrintCanvas(
  design: LabelDesign,
  template: HTMLImageElement | null,
): PrintRender {
  const dims = deviceSize(design);
  const base = newCanvas(dims.width, dims.height);
  const ctx = base.getContext("2d")!;
  paintDesign(ctx, design, { dims, template });
  return finalizeForPrint(base, design.printRotation);
}
