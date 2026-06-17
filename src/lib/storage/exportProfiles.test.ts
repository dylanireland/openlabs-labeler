import { describe, it, expect } from "vitest";
import { buildProfilesFile, parseProfilesFile } from "./exportProfiles";
import { freshState, type PersistedState } from "./persist";
import { defaultDesign } from "../model/design";

function sampleState(): PersistedState {
  const s = freshState();
  return {
    ...s,
    profiles: [
      { id: "p1", name: "Reta", design: defaultDesign() },
      { id: "p2", name: "Sema", design: defaultDesign() },
    ],
    currentProfileId: "p2",
    density: 4,
    copies: 2,
    uploadedFonts: [{ family: "MyFont", dataUrl: "data:font;base64,AAA" }],
  };
}

describe("buildProfilesFile + parseProfilesFile round-trip", () => {
  it("survives a JSON round-trip with all fields intact", () => {
    const state = sampleState();
    const file = buildProfilesFile(state, "2026-06-16T00:00:00.000Z");
    const text = JSON.stringify(file);
    const parsed = parseProfilesFile(text);

    expect(parsed.ok).toBe(true);
    expect(parsed.count).toBe(2);
    expect(parsed.state!.profiles.map((p) => p.name)).toEqual(["Reta", "Sema"]);
    expect(parsed.state!.currentProfileId).toBe("p2");
    expect(parsed.state!.density).toBe(4);
    expect(parsed.state!.copies).toBe(2);
    expect(parsed.state!.uploadedFonts).toEqual([
      { family: "MyFont", dataUrl: "data:font;base64,AAA" },
    ]);
  });

  it("includes the app/kind markers", () => {
    const file = buildProfilesFile(sampleState());
    expect(file.app).toBe("openlabs-labeler");
    expect(file.kind).toBe("profiles-export");
  });
});

describe("parseProfilesFile rejections (so callers can fall back)", () => {
  it("rejects invalid JSON", () =>
    expect(parseProfilesFile("nope {").ok).toBe(false));

  it("rejects a foreign app marker", () =>
    expect(
      parseProfilesFile(JSON.stringify({ app: "something-else", profiles: [] })).ok,
    ).toBe(false));

  it("rejects the Python v3 shape (profiles is an object, not an array)", () => {
    // Python v3 should fall through to the Python importer, not parse here.
    const pyV3 = JSON.stringify({
      version: 3,
      profiles: { A: { width_mm: 40 } },
    });
    expect(parseProfilesFile(pyV3).ok).toBe(false);
  });

  it("rejects arrays and unrelated objects", () => {
    expect(parseProfilesFile("[]").ok).toBe(false);
    expect(parseProfilesFile("{}").ok).toBe(false);
  });

  it("rejects an empty profiles array (so it can't overwrite real data with a blank Default)", () => {
    const res = parseProfilesFile(
      JSON.stringify({ app: "openlabs-labeler", kind: "profiles-export", profiles: [] }),
    );
    expect(res.ok).toBe(false);
  });
});
