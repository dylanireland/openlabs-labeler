import { describe, it, expect } from "vitest";
import { nextMultipleOf8, monoValue, exportScale } from "./print";

describe("nextMultipleOf8 (encoder requires cols % 8 === 0)", () => {
  it("rounds up to the next multiple of 8", () => {
    expect(nextMultipleOf8(236)).toBe(240); // 20mm @300dpi
    expect(nextMultipleOf8(354)).toBe(360); // 30mm
    expect(nextMultipleOf8(472)).toBe(472); // 40mm — already ×8
    expect(nextMultipleOf8(560)).toBe(560); // print-head max
    expect(nextMultipleOf8(1)).toBe(8);
  });
  it("output is always a multiple of 8", () => {
    for (const n of [100, 236, 237, 354, 471, 472, 473, 560, 561]) {
      expect(nextMultipleOf8(n) % 8).toBe(0);
    }
  });
  it("never shrinks the value", () => {
    for (const n of [1, 7, 8, 9, 235, 560]) {
      expect(nextMultipleOf8(n)).toBeGreaterThanOrEqual(n);
    }
  });
});

describe("monoValue (1-bit threshold — fixes the solid-black print)", () => {
  it("pure white → white (blank)", () => expect(monoValue(255, 255, 255, 255)).toBe(255));
  it("pure black → black (ink)", () => expect(monoValue(0, 0, 0, 255)).toBe(0));
  it("off-white 250 → white — the real bug: would otherwise print as ink", () =>
    expect(monoValue(250, 250, 250, 255)).toBe(255));
  it("light gray 200 → white", () => expect(monoValue(200, 200, 200, 255)).toBe(255));
  it("dark gray 100 → black", () => expect(monoValue(100, 100, 100, 255)).toBe(0));
  it("transparent → white (composited over white background)", () =>
    expect(monoValue(0, 0, 0, 0)).toBe(255));
  it("threshold boundary at 128", () => {
    expect(monoValue(127, 127, 127, 255)).toBe(0);
    expect(monoValue(128, 128, 128, 255)).toBe(255);
  });
});

describe("exportScale (full-size PNG export)", () => {
  const devW = 472;
  const devH = 236; // 40×20mm @300dpi

  it("no template → device size (scale 1)", () =>
    expect(exportScale(0, 0, devW, devH)).toBe(1));

  it("template matching the label aspect → export ≈ template size", () => {
    // 1654×827 is the 2:1 label scaled ~3.5×
    expect(exportScale(1654, 827, devW, devH)).toBeCloseTo(3.5, 1);
  });

  it("never downscales below device size for a small template", () =>
    expect(exportScale(100, 50, devW, devH)).toBe(1));

  it("mismatched aspect → scales by the larger ratio (preserves template detail)", () => {
    // square 1000×1000 into a 2:1 label: max(1000/472, 1000/236) = ~4.24
    expect(exportScale(1000, 1000, devW, devH)).toBeCloseTo(1000 / 236, 5);
  });

  it("caps so neither side exceeds MAX_EXPORT_PX", () => {
    const s = exportScale(40000, 20000, devW, devH, 8000);
    expect(devW * s).toBeLessThanOrEqual(8000 + 0.001);
    expect(devH * s).toBeLessThanOrEqual(8000 + 0.001);
  });

  it("degenerate device size → scale 1 (no divide-by-zero)", () =>
    expect(exportScale(1000, 1000, 0, 0)).toBe(1));
});
