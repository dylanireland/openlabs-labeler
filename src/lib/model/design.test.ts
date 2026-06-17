import { describe, it, expect } from "vitest";
import {
  mmToPx,
  deviceSize,
  defaultDesign,
  clamp,
  clamp01,
  coerceDesign,
  coerceTextElement,
  cloneDesign,
  MAX_PRINT_COLS,
} from "./design";

describe("mmToPx", () => {
  it("40mm @300dpi = 472", () => expect(mmToPx(40, 300)).toBe(472));
  it("20mm @300dpi = 236", () => expect(mmToPx(20, 300)).toBe(236));
  it("rounds", () => expect(mmToPx(10, 300)).toBe(Math.round((10 / 25.4) * 300)));
});

describe("constants", () => {
  it("MAX_PRINT_COLS is 560 (multiple of 8 ≤ 567)", () =>
    expect(MAX_PRINT_COLS).toBe(560));
});

describe("deviceSize", () => {
  it("default 40×20mm design is 472×236 dots", () =>
    expect(deviceSize(defaultDesign())).toEqual({ width: 472, height: 236 }));
});

describe("clamp", () => {
  it("clamps high", () => expect(clamp(5, 1, 3)).toBe(3));
  it("clamps low", () => expect(clamp(-1, 0, 10)).toBe(0));
  it("passes through", () => expect(clamp(2, 0, 10)).toBe(2));
  it("clamp01", () => {
    expect(clamp01(2)).toBe(1);
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
  });
});

describe("defaultDesign", () => {
  it("has compound + dosage elements with unique ids", () => {
    const d = defaultDesign();
    expect(d.elements.length).toBe(2);
    expect(d.elements[0].text).toBe("Compound");
    expect(d.elements[1].text).toBe("10 mg/mL");
    expect(d.elements[0].id).not.toBe(d.elements[1].id);
  });
});

describe("coerceDesign (tolerant deserialization)", () => {
  it("garbage → defaults", () => {
    const d = coerceDesign(null);
    expect(d.widthMm).toBe(40);
    expect(d.elements.length).toBeGreaterThan(0);
  });
  it("clamps oversize dims", () => {
    expect(coerceDesign({ widthMm: 99999 }).widthMm).toBe(200);
    expect(coerceDesign({ heightMm: 1 }).heightMm).toBe(5);
  });
  it("invalid fit → stretch", () =>
    expect(coerceDesign({ fit: "weird" }).fit).toBe("stretch"));
  it("invalid rotation → 0", () =>
    expect(coerceDesign({ printRotation: 45 }).printRotation).toBe(0));
  it("keeps valid values", () => {
    const d = coerceDesign({
      widthMm: 30,
      heightMm: 15,
      fit: "cover",
      printRotation: 90,
      elements: [{ text: "X", nx: 0.5, ny: 0.5, sizePx: 20, anchor: "left" }],
    });
    expect(d.widthMm).toBe(30);
    expect(d.fit).toBe("cover");
    expect(d.printRotation).toBe(90);
    expect(d.elements[0].text).toBe("X");
    expect(d.elements[0].anchor).toBe("left");
  });
  it("empty elements array → falls back to defaults", () =>
    expect(coerceDesign({ elements: [] }).elements.length).toBeGreaterThan(0));
});

describe("coerceTextElement", () => {
  it("clamps nx/ny to 0..1", () => {
    const e = coerceTextElement({ nx: 5, ny: -3, text: "a" });
    expect(e.nx).toBe(1);
    expect(e.ny).toBe(0);
  });
  it("clamps size 6..400", () => {
    expect(coerceTextElement({ sizePx: 1000 }).sizePx).toBe(400);
    expect(coerceTextElement({ sizePx: 1 }).sizePx).toBe(6);
  });
  it("invalid anchor → center", () =>
    expect(coerceTextElement({ anchor: "zzz" }).anchor).toBe("center"));
  it("coerces bold to boolean", () =>
    expect(coerceTextElement({ bold: 1 }).bold).toBe(true));
  it("missing text → empty string", () =>
    expect(coerceTextElement({}).text).toBe(""));
});

describe("cloneDesign", () => {
  it("produces an independent deep copy", () => {
    const d = defaultDesign();
    const c = cloneDesign(d);
    expect(c).not.toBe(d);
    expect(c.elements).not.toBe(d.elements);
    expect(c.elements[0]).not.toBe(d.elements[0]);
    expect(c.elements[0].text).toBe(d.elements[0].text);
  });
});
