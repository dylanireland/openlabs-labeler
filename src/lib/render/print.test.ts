import { describe, it, expect } from "vitest";
import { nextMultipleOf8, monoValue } from "./print";

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
