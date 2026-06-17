import { describe, it, expect } from "vitest";
import { coercePersisted, SCHEMA_VERSION } from "./persist";

describe("coercePersisted (tolerant load)", () => {
  it("empty/garbage → one Default profile", () => {
    const s = coercePersisted({});
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.profiles.length).toBe(1);
    expect(s.profiles[0].name).toBe("Default");
    expect(s.currentProfileId).toBe(s.profiles[0].id);
  });

  it("clamps density and copies", () => {
    expect(coercePersisted({ density: 99 }).density).toBe(5);
    expect(coercePersisted({ density: 0 }).density).toBe(1);
    expect(coercePersisted({ copies: 0 }).copies).toBe(1);
    expect(coercePersisted({ copies: 500 }).copies).toBe(99);
  });

  it("keeps valid profiles + current id", () => {
    const s = coercePersisted({
      profiles: [{ id: "p1", name: "X", design: { widthMm: 30 } }],
      currentProfileId: "p1",
      density: 2,
      copies: 3,
    });
    expect(s.profiles[0].name).toBe("X");
    expect(s.profiles[0].design.widthMm).toBe(30);
    expect(s.currentProfileId).toBe("p1");
    expect(s.density).toBe(2);
    expect(s.copies).toBe(3);
  });

  it("falls back currentProfileId to first when it doesn't match", () => {
    const s = coercePersisted({
      profiles: [{ id: "a", name: "A", design: {} }],
      currentProfileId: "missing",
    });
    expect(s.currentProfileId).toBe("a");
  });

  it("filters malformed uploaded fonts", () => {
    const s = coercePersisted({
      uploadedFonts: [
        { family: "F", dataUrl: "data:font" },
        { family: 1 },
        null,
      ],
    });
    expect(s.uploadedFonts.length).toBe(1);
    expect(s.uploadedFonts[0].family).toBe("F");
  });
});
