/**
 * One-time importer for the Python desktop app's `config.json`.
 *
 * Handles the three Python schemas:
 *   v3: { version:3, current_profile, profiles:{name:design}, density, copies }
 *   v2: { design, density, copies }                       → single "Default" profile
 *   v1: legacy form fields (main_text / sub_text / dims)  → best-effort design
 *
 * The desktop `template_path` and `font_path` are local filesystem paths the
 * browser cannot read, so templates/custom fonts can't be carried over — we
 * import everything else and surface a warning to re-pick them.
 */
import { coerceDesign, newId } from "../model/design";
import type { StoredProfile } from "./persist";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ImportResult {
  profiles: StoredProfile[];
  currentProfileId?: string;
  density?: number;
  copies?: number;
  warnings: string[];
}

function mapPyElement(e: any) {
  return {
    id: newId(),
    name: typeof e?.name === "string" ? e.name : "Text",
    text: typeof e?.text === "string" ? e.text : "",
    nx: Number(e?.nx),
    ny: Number(e?.ny),
    sizePx: Number(e?.size_px),
    fontFamily: "sans-serif",
    bold: !!e?.bold,
    anchor: e?.anchor,
    color: "#000000",
  };
}

function mapPyDesign(d: any) {
  const els = Array.isArray(d?.elements) ? d.elements : [];
  const hadFont = els.some((e: any) => e && e.font_path);
  const hadTemplate = !!(d && d.template_path);
  const design = coerceDesign({
    widthMm: d?.width_mm,
    heightMm: d?.height_mm,
    dpi: d?.dpi,
    templateDataUrl: null,
    fit: d?.fit,
    printRotation: d?.print_rotation,
    elements: els.map(mapPyElement),
  });
  return { design, hadTemplate, hadFont };
}

function legacyToPyDesign(raw: any) {
  return {
    width_mm: raw?.width_mm,
    height_mm: raw?.height_mm,
    dpi: raw?.dpi,
    fit: "stretch",
    print_rotation: raw?.print_rotation,
    elements: [
      {
        name: "Main",
        text: raw?.main_text ?? "",
        nx: 0.5,
        ny: 0.4,
        size_px: 56,
        bold: true,
        anchor: "center",
      },
      {
        name: "Sub",
        text: raw?.sub_text ?? "",
        nx: 0.5,
        ny: 0.72,
        size_px: 32,
        bold: false,
        anchor: "center",
      },
    ],
  };
}

export function importPythonConfig(text: string): ImportResult {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      profiles: [],
      warnings: ["That file isn’t valid JSON — is it the desktop app’s config.json?"],
    };
  }

  const warnings: string[] = [];
  const profiles: StoredProfile[] = [];
  let currentName: string | undefined;

  const add = (name: string, dRaw: any) => {
    const { design, hadTemplate, hadFont } = mapPyDesign(dRaw);
    profiles.push({ id: newId("pf"), name, design });
    if (hadTemplate)
      warnings.push(
        `“${name}”: the template image can’t transfer from a file path — re-pick it with Choose template.`,
      );
    if (hadFont)
      warnings.push(
        `“${name}”: custom font files don’t transfer from the desktop app — using the default font.`,
      );
  };

  if (
    raw &&
    typeof raw === "object" &&
    raw.profiles &&
    typeof raw.profiles === "object" &&
    !Array.isArray(raw.profiles)
  ) {
    for (const [name, d] of Object.entries(raw.profiles)) add(name, d);
    currentName =
      typeof raw.current_profile === "string" ? raw.current_profile : undefined;
  } else if (raw && typeof raw === "object" && raw.design) {
    add("Default", raw.design);
  } else if (
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    (raw.main_text !== undefined ||
      raw.sub_text !== undefined ||
      raw.width_mm !== undefined)
  ) {
    add("Default", legacyToPyDesign(raw));
    warnings.push("Imported a legacy desktop config; double-check the layout.");
  }

  if (!profiles.length) {
    return { profiles: [], warnings: ["No profiles found in this config.json."] };
  }

  const density = typeof raw?.density === "number" ? raw.density : undefined;
  const copies = typeof raw?.copies === "number" ? raw.copies : undefined;
  const currentProfileId =
    profiles.find((p) => p.name === currentName)?.id ?? profiles[0].id;

  return { profiles, currentProfileId, density, copies, warnings };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
