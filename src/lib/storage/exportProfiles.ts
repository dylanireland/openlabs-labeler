/** Native profiles export/import — the app's own backup + cross-device transfer
 *  format (distinct from the Python desktop `config.json` importer). */
import { coercePersisted, type PersistedState } from "./persist";

export const EXPORT_APP = "openlabs-labeler";
export const EXPORT_KIND = "profiles-export";

export interface ProfilesFile {
  app: string;
  kind: string;
  schemaVersion: number;
  exportedAt?: string;
  profiles: PersistedState["profiles"];
  currentProfileId: string;
  density: number;
  copies: number;
  uploadedFonts: PersistedState["uploadedFonts"];
}

export function buildProfilesFile(
  state: PersistedState,
  exportedAt?: string,
): ProfilesFile {
  return {
    app: EXPORT_APP,
    kind: EXPORT_KIND,
    schemaVersion: state.schemaVersion,
    exportedAt,
    profiles: state.profiles,
    currentProfileId: state.currentProfileId,
    density: state.density,
    copies: state.copies,
    uploadedFonts: state.uploadedFonts,
  };
}

export interface ParsedProfilesImport {
  ok: boolean;
  error?: string;
  state?: PersistedState;
  count?: number;
}

/**
 * Parse a native profiles export. Returns ok:false (so callers can fall back to
 * the Python importer) for anything that isn't our array-of-profiles shape —
 * notably the Python v3 config, whose `profiles` is an object map, not an array.
 */
export function parseProfilesFile(text: string): ParsedProfilesImport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn’t valid JSON." };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Unrecognized file." };
  }
  const r = raw as Record<string, unknown>;
  // If it claims to be an app file, the marker must match ours.
  if (r.app !== undefined && r.app !== EXPORT_APP) {
    return { ok: false, error: "This isn’t an OpenLabs Labeler profiles file." };
  }
  if (!Array.isArray(r.profiles) || r.profiles.length === 0) {
    // Empty would let coercePersisted fabricate a blank Default and overwrite
    // the user's real profiles — reject so the caller surfaces "nothing to import".
    return { ok: false, error: "No profiles found in this file." };
  }
  const state = coercePersisted(r);
  return { ok: true, state, count: state.profiles.length };
}
