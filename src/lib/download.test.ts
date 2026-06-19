import { describe, it, expect } from "vitest";
import { safeFilenameBase } from "./download";

describe("safeFilenameBase", () => {
  it("replaces path separators so the download isn't truncated", () => {
    // The real bug: "10mg/ml" would download as "ml.png" without sanitizing.
    expect(safeFilenameBase("10mg/ml")).toBe("10mg_ml");
    expect(safeFilenameBase("a\\b")).toBe("a_b");
  });

  it("strips Windows-reserved characters", () => {
    // : * ? " < > |  → underscores; "na" and "me" kept
    expect(safeFilenameBase('na:me*?"<>|')).toBe("na_me______");
  });

  it("keeps letters, digits, spaces, and dashes", () => {
    expect(safeFilenameBase("Reta-1 Batch 3")).toBe("Reta-1 Batch 3");
  });

  it("collapses whitespace and trims", () => {
    expect(safeFilenameBase("  spaced   out  ")).toBe("spaced out");
  });

  it("falls back for empty / whitespace-only / nullish names", () => {
    expect(safeFilenameBase("")).toBe("label");
    expect(safeFilenameBase("   ")).toBe("label");
    expect(safeFilenameBase(null)).toBe("label");
    expect(safeFilenameBase(undefined)).toBe("label");
  });

  it("uses a custom fallback when provided", () => {
    expect(safeFilenameBase("", "design")).toBe("design");
  });
});
