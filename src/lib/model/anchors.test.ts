import { describe, it, expect } from "vitest";
import { anchorMapping } from "./anchors";

describe("anchorMapping (Pillow → Canvas)", () => {
  it("center → middle/middle", () =>
    expect(anchorMapping("center")).toEqual({
      align: "center",
      baseline: "middle",
    }));
  it("left → left/middle", () =>
    expect(anchorMapping("left")).toEqual({ align: "left", baseline: "middle" }));
  it("right → right/middle", () =>
    expect(anchorMapping("right")).toEqual({
      align: "right",
      baseline: "middle",
    }));
  it("top-left → left/top", () =>
    expect(anchorMapping("top-left")).toEqual({
      align: "left",
      baseline: "top",
    }));
});
