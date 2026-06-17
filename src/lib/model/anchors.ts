/**
 * Anchor → Canvas text alignment mapping. Reproduces the Pillow anchor codes
 * the Python app used (mm / lm / rm / la) with Canvas `textAlign` + `textBaseline`.
 */
import type { Anchor } from "./design";

export type CanvasAlign = "left" | "center" | "right";
export type CanvasBaseline = "top" | "middle" | "alphabetic";

export interface AnchorMapping {
  align: CanvasAlign;
  baseline: CanvasBaseline;
}

export const ANCHOR_MAP: Record<Anchor, AnchorMapping> = {
  center: { align: "center", baseline: "middle" }, // Pillow "mm"
  left: { align: "left", baseline: "middle" }, //   Pillow "lm"
  right: { align: "right", baseline: "middle" }, //  Pillow "rm"
  "top-left": { align: "left", baseline: "top" }, // Pillow "la"
};

export const anchorMapping = (a: Anchor): AnchorMapping => ANCHOR_MAP[a];

export const ANCHOR_LABELS: Record<Anchor, string> = {
  center: "Center",
  left: "Left",
  right: "Right",
  "top-left": "Top-left",
};
