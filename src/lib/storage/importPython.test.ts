import { describe, it, expect } from "vitest";
import { importPythonConfig } from "./importPython";

describe("importPythonConfig", () => {
  it("imports v3 multi-profile config (Retatrutide-style)", () => {
    const cfg = JSON.stringify({
      version: 3,
      current_profile: "B",
      profiles: {
        A: {
          width_mm: 40,
          height_mm: 20,
          fit: "stretch",
          print_rotation: 0,
          elements: [
            {
              name: "Compound",
              text: "Retatrutide",
              nx: 0.5,
              ny: 0.42,
              size_px: 50,
              bold: true,
              anchor: "center",
            },
            {
              name: "Dosage",
              text: "10mg/ml",
              nx: 0.5,
              ny: 0.72,
              size_px: 30,
              bold: false,
              anchor: "center",
            },
          ],
        },
        B: { width_mm: 30, height_mm: 30, elements: [] },
      },
      density: 4,
      copies: 2,
    });
    const res = importPythonConfig(cfg);
    expect(res.profiles.map((p) => p.name)).toEqual(["A", "B"]);
    expect(res.density).toBe(4);
    expect(res.copies).toBe(2);
    // current_profile B is resolved to B's id
    expect(res.currentProfileId).toBe(
      res.profiles.find((p) => p.name === "B")!.id,
    );
    const a = res.profiles[0].design;
    expect(a.widthMm).toBe(40);
    expect(a.elements[0].text).toBe("Retatrutide");
    expect(a.elements[0].sizePx).toBe(50);
    expect(a.elements[0].bold).toBe(true);
  });

  it("imports v2 single-design config and warns about template + font paths", () => {
    const cfg = JSON.stringify({
      design: {
        width_mm: 50,
        height_mm: 25,
        template_path: "/Users/x/template.png",
        elements: [
          {
            text: "X",
            nx: 0.5,
            ny: 0.5,
            size_px: 40,
            anchor: "center",
            font_path: "/Library/Fonts/Foo.ttf",
          },
        ],
      },
      density: 3,
      copies: 1,
    });
    const res = importPythonConfig(cfg);
    expect(res.profiles.length).toBe(1);
    expect(res.profiles[0].name).toBe("Default");
    expect(res.profiles[0].design.widthMm).toBe(50);
    expect(res.profiles[0].design.templateDataUrl).toBeNull();
    expect(res.warnings.some((w) => /template/i.test(w))).toBe(true);
    expect(res.warnings.some((w) => /font/i.test(w))).toBe(true);
  });

  it("imports v1 legacy form config into one Default profile", () => {
    const cfg = JSON.stringify({
      main_text: "Main",
      sub_text: "Sub",
      width_mm: 40,
      height_mm: 20,
    });
    const res = importPythonConfig(cfg);
    expect(res.profiles.length).toBe(1);
    const texts = res.profiles[0].design.elements.map((e) => e.text);
    expect(texts).toContain("Main");
    expect(texts).toContain("Sub");
    expect(res.warnings.some((w) => /legacy/i.test(w))).toBe(true);
  });

  it("rejects non-JSON with a warning and no profiles", () => {
    const res = importPythonConfig("not json {");
    expect(res.profiles.length).toBe(0);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it("does not fabricate a legacy profile from an unrelated object", () => {
    expect(importPythonConfig("{}").profiles.length).toBe(0);
    expect(importPythonConfig(JSON.stringify({ foo: 1 })).profiles.length).toBe(0);
  });

  it("does not treat an array as a config", () => {
    expect(importPythonConfig("[]").profiles.length).toBe(0);
  });
});
