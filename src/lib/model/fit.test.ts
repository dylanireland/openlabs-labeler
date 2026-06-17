import { describe, it, expect } from "vitest";
import { computeFit } from "./fit";

describe("computeFit", () => {
  it("stretch fills exactly", () => {
    expect(computeFit(100, 50, 200, 100, "stretch")).toEqual({
      sx: 0,
      sy: 0,
      sw: 100,
      sh: 50,
      dx: 0,
      dy: 0,
      dw: 200,
      dh: 100,
    });
  });

  it("contain letterboxes (centres, no crop)", () => {
    // 100×100 into 200×100 → scale = min(2, 1) = 1 → 100×100 centred at x=50
    const r = computeFit(100, 100, 200, 100, "contain")!;
    expect(r.sw).toBe(100);
    expect(r.sh).toBe(100);
    expect(r.dw).toBe(100);
    expect(r.dh).toBe(100);
    expect(r.dx).toBe(50);
    expect(r.dy).toBe(0);
  });

  it("cover fills and centre-crops the source", () => {
    // 100×100 into 200×100 → scale = max(2, 1) = 2 → src 100×50 centred (sy=25)
    const r = computeFit(100, 100, 200, 100, "cover")!;
    expect(r.sw).toBe(100);
    expect(r.sh).toBe(50);
    expect(r.sx).toBe(0);
    expect(r.sy).toBe(25);
    expect(r.dw).toBe(200);
    expect(r.dh).toBe(100);
  });

  it("returns null for degenerate images (no divide-by-zero)", () => {
    expect(computeFit(0, 10, 100, 100, "cover")).toBeNull();
    expect(computeFit(10, 0, 100, 100, "contain")).toBeNull();
    expect(computeFit(10, 10, 0, 100, "stretch")).toBeNull();
  });
});
