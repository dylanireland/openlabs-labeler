import { describe, it, expect } from "vitest";
import { anchorPoint, elementBox, pointInBox } from "./geom";
import { defaultTextElement, type TextElement } from "./design";

const dims = { width: 200, height: 100 };
const metrics = { width: 40, ascent: 16, descent: 4 }; // h = 20

function el(partial: Partial<TextElement>): TextElement {
  return defaultTextElement({ nx: 0.5, ny: 0.5, ...partial });
}

describe("anchorPoint", () => {
  it("maps normalized → device px", () =>
    expect(anchorPoint(el({ nx: 0.25, ny: 0.5 }), dims)).toEqual({
      x: 50,
      y: 50,
    }));
});

describe("elementBox", () => {
  it("center anchor centres the box on the point", () => {
    const b = elementBox(el({ anchor: "center" }), dims, metrics);
    expect(b).toEqual({ x: 80, y: 40, w: 40, h: 20 }); // ax100,ay50
  });
  it("left anchor starts at the point horizontally", () => {
    const b = elementBox(el({ anchor: "left" }), dims, metrics);
    expect(b.x).toBe(100);
    expect(b.y).toBe(40); // baseline middle
  });
  it("right anchor ends at the point horizontally", () => {
    const b = elementBox(el({ anchor: "right" }), dims, metrics);
    expect(b.x).toBe(60); // ax - w
  });
  it("top-left anchor sits below+right of the point", () => {
    const b = elementBox(el({ anchor: "top-left" }), dims, metrics);
    expect(b.x).toBe(100);
    expect(b.y).toBe(50); // baseline top → y = ay
  });
});

describe("pointInBox", () => {
  const box = { x: 10, y: 10, w: 20, h: 20 };
  it("inside", () => expect(pointInBox(15, 15, box)).toBe(true));
  it("outside", () => expect(pointInBox(40, 40, box)).toBe(false));
  it("pad extends the hit area", () => {
    expect(pointInBox(33, 15, box)).toBe(false);
    expect(pointInBox(33, 15, box, 4)).toBe(true);
  });
});
