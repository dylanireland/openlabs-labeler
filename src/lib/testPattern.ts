/**
 * Draws a calibration / orientation test pattern, black-on-white, at the label's
 * native dot resolution. Mirrors the Python app's `calibration()` pattern so we can
 * confirm orientation + scale on the M2 before building the real designer.
 *
 * The niimbluelib encoder treats any non-white pixel as a printed dot, so everything
 * drawn here in black will print.
 */
export type TestPatternOpts = {
  /** Canvas width in printer dots (across the print head). */
  widthPx: number;
  /** Canvas height in printer dots (feed direction). */
  heightPx: number;
  /** Physical label width in mm (for the on-label readout). */
  widthMm: number;
  /** Physical label height in mm (for the on-label readout). */
  heightMm: number;
};

export function drawTestPattern(
  canvas: HTMLCanvasElement,
  opts: TestPatternOpts,
): void {
  const { widthPx, heightPx, widthMm, heightMm } = opts;
  canvas.width = widthPx;
  canvas.height = heightPx;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  // White background.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, widthPx, heightPx);

  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#000000";

  // Full border so clipping at any edge is obvious.
  const inset = 5;
  ctx.lineWidth = 4;
  ctx.strokeRect(inset, inset, widthPx - 2 * inset, heightPx - 2 * inset);

  // Top-left corner bracket + "TL" — tells us which corner is really top-left.
  const b = Math.round(Math.min(widthPx, heightPx) * 0.12);
  ctx.fillRect(inset, inset, b, 10); // horizontal arm
  ctx.fillRect(inset, inset, 10, b); // vertical arm
  ctx.font = `bold ${Math.round(heightPx * 0.16)}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("TL", inset + 16, inset + 14);

  // Up-arrow near top-centre — tells us the print direction.
  const cx = Math.round(widthPx / 2);
  const ah = Math.round(heightPx * 0.16);
  const aw = Math.round(ah * 0.7);
  const ayTop = inset + 12;
  ctx.beginPath();
  ctx.moveTo(cx, ayTop);
  ctx.lineTo(cx - aw / 2, ayTop + ah * 0.55);
  ctx.lineTo(cx + aw / 2, ayTop + ah * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = Math.max(3, Math.round(aw * 0.18));
  ctx.beginPath();
  ctx.moveTo(cx, ayTop + ah * 0.45);
  ctx.lineTo(cx, ayTop + ah);
  ctx.stroke();

  // Centre wordmark.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(heightPx * 0.2)}px sans-serif`;
  ctx.fillText("OpenLabs", cx, Math.round(heightPx * 0.52));

  // Size readout so a wrong dimension/scale is obvious.
  ctx.font = `${Math.round(heightPx * 0.12)}px sans-serif`;
  ctx.fillText(
    `M2 TEST · ${widthMm} × ${heightMm} mm`,
    cx,
    Math.round(heightPx * 0.74),
  );

  // Solid square in the bottom-right corner (asymmetry marker).
  const sq = Math.round(Math.min(widthPx, heightPx) * 0.1);
  ctx.fillRect(widthPx - inset - sq, heightPx - inset - sq, sq, sq);
}
