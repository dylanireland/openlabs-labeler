/** Persisted app state (profiles + settings) with tolerant load + schema version. */
import {
  coerceDesign,
  defaultDesign,
  newId,
  type LabelDesign,
} from "../model/design";
import type { UploadedFont } from "../render/fonts";
import { idbGet, idbSet } from "./idb";

export const SCHEMA_VERSION = 1;
const STATE_KEY = "state";

export interface StoredProfile {
  id: string;
  name: string;
  design: LabelDesign;
}

export interface PersistedState {
  schemaVersion: number;
  profiles: StoredProfile[];
  currentProfileId: string;
  density: number;
  copies: number;
  uploadedFonts: UploadedFont[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function clampInt(v: any, lo: number, hi: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

export function coercePersisted(raw: any): PersistedState {
  const profilesRaw = Array.isArray(raw?.profiles) ? raw.profiles : [];
  const profiles: StoredProfile[] = profilesRaw.map((p: any) => ({
    id: typeof p?.id === "string" && p.id ? p.id : newId("pf"),
    name: typeof p?.name === "string" && p.name ? p.name : "Profile",
    design: coerceDesign(p?.design),
  }));
  const finalProfiles = profiles.length
    ? profiles
    : [{ id: newId("pf"), name: "Default", design: defaultDesign() }];

  const currentProfileId =
    finalProfiles.find((p) => p.id === raw?.currentProfileId)?.id ??
    finalProfiles[0].id;

  const uploadedFonts: UploadedFont[] = Array.isArray(raw?.uploadedFonts)
    ? raw.uploadedFonts.filter(
        (f: any) =>
          f && typeof f.family === "string" && typeof f.dataUrl === "string",
      )
    : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    profiles: finalProfiles,
    currentProfileId,
    density: clampInt(raw?.density, 1, 5, 3),
    copies: clampInt(raw?.copies, 1, 99, 1),
    uploadedFonts,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function loadState(): Promise<PersistedState | null> {
  try {
    const raw = await idbGet<unknown>(STATE_KEY);
    if (!raw || typeof raw !== "object") return null;
    return coercePersisted(raw);
  } catch {
    return null;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  try {
    await idbSet(STATE_KEY, state);
  } catch {
    /* best-effort; ignore quota/availability errors */
  }
}

export function freshState(): PersistedState {
  const id = newId("pf");
  return {
    schemaVersion: SCHEMA_VERSION,
    profiles: [{ id, name: "Default", design: defaultDesign() }],
    currentProfileId: id,
    density: 3,
    copies: 1,
    uploadedFonts: [],
  };
}
