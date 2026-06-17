/**
 * Core label-design data model — the browser/TS port of the Python
 * `template_designer.LabelDesign` / `TextElement` dataclasses.
 *
 * Positions are stored normalized (0..1) so a layout survives dimension changes
 * and maps cleanly onto any canvas zoom. Everything here is pure (no DOM), so it
 * is unit-testable without a real canvas.
 */

export type Anchor = "center" | "left" | "right" | "top-left";
export type FitMode = "stretch" | "contain" | "cover";
export type Rotation = 0 | 90 | 180 | 270;

export const ANCHORS: Anchor[] = ["center", "left", "right", "top-left"];
export const FIT_MODES: FitMode[] = ["stretch", "contain", "cover"];
export const ROTATIONS: Rotation[] = [0, 90, 180, 270];

export interface TextElement {
  id: string;
  name: string;
  text: string;
  /** normalized x of the anchor point, 0..1 */
  nx: number;
  /** normalized y of the anchor point, 0..1 */
  ny: number;
  sizePx: number;
  /** CSS font-family (built-in family name or an uploaded font's family) */
  fontFamily: string;
  bold: boolean;
  anchor: Anchor;
  /** hex colour, e.g. "#000000" */
  color: string;
}

export interface LabelDesign {
  widthMm: number;
  heightMm: number;
  dpi: number;
  /** background template as a data URL, or null for a plain white label */
  templateDataUrl: string | null;
  fit: FitMode;
  printRotation: Rotation;
  elements: TextElement[];
}

export const DPI = 300;
export const MM_PER_IN = 25.4;
/** M2 print head is 567 dots; usable columns must be a multiple of 8. */
export const PRINTHEAD_PX = 567;
export const MAX_PRINT_COLS = Math.floor(PRINTHEAD_PX / 8) * 8; // 560

export const MIN_MM = 5;
export const MAX_MM = 200;
export const MIN_SIZE_PX = 6;
export const MAX_SIZE_PX = 400;

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));
export const clamp01 = (v: number): number => clamp(v, 0, 1);

export const mmToPx = (mm: number, dpi: number = DPI): number =>
  Math.round((mm / MM_PER_IN) * dpi);

export interface DeviceSize {
  width: number;
  height: number;
}
export const deviceSize = (d: LabelDesign): DeviceSize => ({
  width: Math.max(1, mmToPx(d.widthMm, d.dpi)),
  height: Math.max(1, mmToPx(d.heightMm, d.dpi)),
});

let _idCounter = 0;
export function newId(prefix = "el"): string {
  _idCounter += 1;
  const rand = Math.floor(Math.random() * 1e9).toString(36);
  return `${prefix}_${_idCounter.toString(36)}${rand}`;
}

export function defaultTextElement(partial?: Partial<TextElement>): TextElement {
  return {
    id: newId(),
    name: "Text",
    text: "Text",
    nx: 0.5,
    ny: 0.5,
    sizePx: 48,
    fontFamily: "sans-serif",
    bold: false,
    anchor: "center",
    color: "#000000",
    ...partial,
  };
}

export function defaultDesign(): LabelDesign {
  return {
    widthMm: 40,
    heightMm: 20,
    dpi: DPI,
    templateDataUrl: null,
    fit: "stretch",
    printRotation: 0,
    elements: [
      defaultTextElement({
        name: "Compound name",
        text: "Compound",
        nx: 0.5,
        ny: 0.42,
        sizePx: 56,
        bold: true,
      }),
      defaultTextElement({
        name: "Dosage",
        text: "10 mg/mL",
        nx: 0.5,
        ny: 0.72,
        sizePx: 34,
      }),
    ],
  };
}

/* ----------------------------- coercion ----------------------------- */
/* Tolerant deserialization mirroring the Python `from_dict` — never throws,
   fills sane defaults for missing/garbage fields. */

/* eslint-disable @typescript-eslint/no-explicit-any */
function num(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function coerceTextElement(o: any): TextElement {
  const d = defaultTextElement();
  if (!o || typeof o !== "object") return d;
  return {
    id: typeof o.id === "string" && o.id ? o.id : d.id,
    name: typeof o.name === "string" ? o.name : d.name,
    text: typeof o.text === "string" ? o.text : "",
    nx: clamp01(num(o.nx, d.nx)),
    ny: clamp01(num(o.ny, d.ny)),
    sizePx: clamp(Math.round(num(o.sizePx, d.sizePx)), MIN_SIZE_PX, MAX_SIZE_PX),
    fontFamily:
      typeof o.fontFamily === "string" && o.fontFamily
        ? o.fontFamily
        : d.fontFamily,
    bold: !!o.bold,
    anchor: ANCHORS.includes(o.anchor) ? o.anchor : "center",
    color: typeof o.color === "string" && o.color ? o.color : "#000000",
  };
}

export function coerceDesign(o: any): LabelDesign {
  const d = defaultDesign();
  if (!o || typeof o !== "object") return d;
  const els = Array.isArray(o.elements)
    ? o.elements.map(coerceTextElement)
    : null;
  const rot = [0, 90, 180, 270].includes(o.printRotation)
    ? (o.printRotation as Rotation)
    : 0;
  return {
    widthMm: clamp(num(o.widthMm, d.widthMm), MIN_MM, MAX_MM),
    heightMm: clamp(num(o.heightMm, d.heightMm), MIN_MM, MAX_MM),
    dpi: clamp(Math.round(num(o.dpi, DPI)), 72, 1200),
    templateDataUrl:
      typeof o.templateDataUrl === "string" ? o.templateDataUrl : null,
    fit: FIT_MODES.includes(o.fit) ? o.fit : "stretch",
    printRotation: rot,
    elements: els && els.length ? els : d.elements,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Deep clone via structured copy (used for Save-as / duplicate). */
export function cloneDesign(d: LabelDesign): LabelDesign {
  return coerceDesign(JSON.parse(JSON.stringify(d)));
}
