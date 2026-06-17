/** Builds the Test-print calibration bitmap (border + TL marker + arrow + size
 *  readout) at the current label dimensions, rotated for print like a real label. */
import { deviceSize, type LabelDesign } from "../model/design";
import { drawTestPattern } from "../testPattern";
import { finalizeForPrint, type PrintRender } from "./print";

export function renderCalibrationCanvas(design: LabelDesign): PrintRender {
  const dims = deviceSize(design);
  const base = document.createElement("canvas");
  drawTestPattern(base, {
    widthPx: dims.width,
    heightPx: dims.height,
    widthMm: design.widthMm,
    heightMm: design.heightMm,
  });
  return finalizeForPrint(base, design.printRotation);
}
