/**
 * Font handling for the canvas renderer.
 *
 * Tiered strategy (Web Bluetooth already limits us to Chromium, but we still keep
 * the universal path): built-in CSS families always available, plus user-uploaded
 * font files registered via the FontFace API. `queryLocalFonts()` is an optional
 * Chromium enhancement that can be layered on later.
 *
 * CRITICAL: canvas does not lazily load fonts — an uploaded family must be
 * `await`-ed through `registerUploadedFont` before the first `fillText`, or the
 * first paint silently falls back to a default font.
 */

export const BUILTIN_FONTS = [
  "sans-serif",
  "serif",
  "monospace",
  "Arial",
  "Helvetica",
  "Helvetica Neue",
  "Avenir Next",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Tahoma",
  "Impact",
];

export interface UploadedFont {
  family: string;
  /** font file as a data URL */
  dataUrl: string;
}

const GENERIC = new Set([
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
]);

// family -> dataUrl currently registered (so re-importing the same family with
// different bytes actually swaps the live FontFace instead of being ignored).
const registered = new Map<string, string>();

/** Quote a family name for use in `ctx.font` / CSS, leaving generic keywords bare. */
export function cssFontFamily(family: string): string {
  if (GENERIC.has(family)) return family;
  return `'${family.replace(/'/g, "\\'")}'`;
}

export function cssFont(family: string, sizePx: number, bold: boolean): string {
  return `${bold ? "bold " : ""}${Math.round(sizePx)}px ${cssFontFamily(family)}`;
}

/** Register an uploaded font so the renderer can use its family. Idempotent per
 *  (family, bytes); re-registering a family with new bytes swaps the live face. */
export async function registerUploadedFont(font: UploadedFont): Promise<boolean> {
  if (registered.get(font.family) === font.dataUrl) return true;
  if (typeof document === "undefined" || !("fonts" in document)) return false;
  try {
    // Same family, different bytes → drop the stale face(s) first.
    if (registered.has(font.family)) {
      const stale: FontFace[] = [];
      document.fonts.forEach((face) => {
        if (face.family === font.family) stale.push(face);
      });
      stale.forEach((face) => document.fonts.delete(face));
    }
    const face = new FontFace(font.family, `url(${font.dataUrl})`);
    await face.load();
    document.fonts.add(face);
    registered.set(font.family, font.dataUrl);
    return true;
  } catch {
    return false; // fall back to default family
  }
}

export function isFontRegistered(family: string): boolean {
  return registered.has(family);
}

/** Best-effort: ensure a family is loaded before drawing with it. */
export async function ensureFontReady(
  family: string,
  sizePx: number,
  bold: boolean,
): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await document.fonts.load(cssFont(family, sizePx, bold));
  } catch {
    /* ignore */
  }
}
