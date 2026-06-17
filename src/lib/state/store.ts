/** Global app state (Zustand). Mirrors the Python app's model: named profiles,
 *  each a full LabelDesign; edits auto-save (debounced) into the active profile. */
import { create } from "zustand";
import {
  cloneDesign,
  defaultDesign,
  defaultTextElement,
  newId,
  clamp,
  clamp01,
  type FitMode,
  type LabelDesign,
  type Rotation,
  type TextElement,
} from "../model/design";
import {
  registerUploadedFont,
  type UploadedFont,
} from "../render/fonts";
import {
  freshState,
  loadState,
  saveState,
  SCHEMA_VERSION,
  type PersistedState,
  type StoredProfile,
} from "../storage/persist";
import type { ImportResult } from "../storage/importPython";
import {
  NiimbotPrinterService,
} from "../printer/NiimbotPrinterService";
import type {
  PrinterInfoView,
  PrinterService,
  PrintProgress,
} from "../printer/PrinterService";

export type PrinterStatus = "idle" | "connecting" | "connected" | "printing";

export interface AppState {
  loaded: boolean;
  profiles: StoredProfile[];
  currentProfileId: string;
  selectedElementId: string | null;
  density: number;
  copies: number;
  uploadedFonts: UploadedFont[];

  printer: PrinterService | null;
  printerStatus: PrinterStatus;
  printerInfo: PrinterInfoView | null;
  progress: PrintProgress | null;
  printerError: string | null;

  /** null = unknown/not requested, true/false = browser's persisted() result */
  storagePersisted: boolean | null;

  // lifecycle
  init: () => Promise<void>;

  // design mutations
  updateDesign: (patch: Partial<LabelDesign>) => void;
  setDims: (widthMm: number, heightMm: number) => void;
  setTemplate: (dataUrl: string | null) => void;
  setFit: (fit: FitMode) => void;
  setRotation: (rot: Rotation) => void;

  // element mutations
  selectElement: (id: string | null) => void;
  updateElement: (id: string, patch: Partial<TextElement>) => void;
  moveElement: (id: string, nx: number, ny: number) => void;
  addElement: () => void;
  duplicateElement: (id: string) => void;
  removeElement: (id: string) => void;

  // profiles
  switchProfile: (id: string) => void;
  newProfile: () => void;
  saveAsProfile: (name: string) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;

  // settings
  setDensity: (d: number) => void;
  setCopies: (c: number) => void;

  // fonts + import/export
  addUploadedFont: (font: UploadedFont) => Promise<void>;
  importProfiles: (result: ImportResult) => void;
  exportState: () => PersistedState;
  replaceAll: (state: PersistedState) => Promise<void>;

  // printer
  connectPrinter: () => Promise<void>;
  disconnectPrinter: () => Promise<void>;
  setPrinterStatus: (s: PrinterStatus) => void;
  setPrinterError: (msg: string | null) => void;
}

/* ----------------------------- helpers ----------------------------- */

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let teardownRegistered = false;

function buildPersist(s: AppState): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    profiles: s.profiles,
    currentProfileId: s.currentProfileId,
    density: s.density,
    copies: s.copies,
    uploadedFonts: s.uploadedFonts,
  };
}

function schedulePersist(get: () => AppState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void saveState(buildPersist(get()));
  }, 400);
}

/** Write pending changes immediately (e.g. before the tab is hidden/closed). */
function flushPersist(get: () => AppState): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  void saveState(buildPersist(get()));
}

/** Flush on tab-hide / page-hide so the last edit isn't dropped by the debounce. */
function registerTeardown(get: () => AppState): void {
  if (teardownRegistered || typeof window === "undefined") return;
  teardownRegistered = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPersist(get);
  });
  window.addEventListener("pagehide", () => flushPersist(get));
}

function withDesign(
  profiles: StoredProfile[],
  id: string,
  fn: (d: LabelDesign) => LabelDesign,
): StoredProfile[] {
  return profiles.map((p) => (p.id === id ? { ...p, design: fn(p.design) } : p));
}

function uniqueName(base: string, names: string[]): string {
  const b = base.trim() || "Profile";
  if (!names.includes(b)) return b;
  let i = 2;
  while (names.includes(`${b} ${i}`)) i += 1;
  return `${b} ${i}`;
}

/* ----------------------------- selectors ----------------------------- */

export const selectCurrentProfile = (s: AppState): StoredProfile | undefined =>
  s.profiles.find((p) => p.id === s.currentProfileId);

export const selectCurrentDesign = (s: AppState): LabelDesign =>
  selectCurrentProfile(s)?.design ?? defaultDesign();

export const selectSelectedElement = (s: AppState): TextElement | null => {
  if (!s.selectedElementId) return null;
  const d = selectCurrentProfile(s)?.design;
  return d?.elements.find((e) => e.id === s.selectedElementId) ?? null;
};

/* ----------------------------- store ----------------------------- */

export const useStore = create<AppState>((set, get) => ({
  loaded: false,
  profiles: [],
  currentProfileId: "",
  selectedElementId: null,
  density: 3,
  copies: 1,
  uploadedFonts: [],

  printer: null,
  printerStatus: "idle",
  printerInfo: null,
  progress: null,
  printerError: null,
  storagePersisted: null,

  init: async () => {
    registerTeardown(get);
    // Ask the browser not to evict our IndexedDB data (best-effort, may no-op).
    void (async () => {
      try {
        if (typeof navigator !== "undefined" && navigator.storage?.persist) {
          const already = navigator.storage.persisted
            ? await navigator.storage.persisted()
            : false;
          const ok = already || (await navigator.storage.persist());
          set({ storagePersisted: ok });
        }
      } catch {
        /* ignore */
      }
    })();
    if (get().loaded) return;
    const persisted = (await loadState()) ?? freshState();
    // Register any uploaded fonts before first paint.
    await Promise.all(
      persisted.uploadedFonts.map((f) => registerUploadedFont(f)),
    );
    set({
      loaded: true,
      profiles: persisted.profiles,
      currentProfileId: persisted.currentProfileId,
      density: persisted.density,
      copies: persisted.copies,
      uploadedFonts: persisted.uploadedFonts,
      selectedElementId: persisted.profiles
        .find((p) => p.id === persisted.currentProfileId)
        ?.design.elements[0]?.id ?? null,
    });
  },

  updateDesign: (patch) => {
    set((s) => ({
      profiles: withDesign(s.profiles, s.currentProfileId, (d) => ({
        ...d,
        ...patch,
      })),
    }));
    schedulePersist(get);
  },

  setDims: (widthMm, heightMm) => {
    set((s) => ({
      profiles: withDesign(s.profiles, s.currentProfileId, (d) => ({
        ...d,
        widthMm: clamp(widthMm, 5, 200),
        heightMm: clamp(heightMm, 5, 200),
      })),
    }));
    schedulePersist(get);
  },

  setTemplate: (dataUrl) => {
    set((s) => ({
      profiles: withDesign(s.profiles, s.currentProfileId, (d) => ({
        ...d,
        templateDataUrl: dataUrl,
      })),
    }));
    schedulePersist(get);
  },

  setFit: (fit) => get().updateDesign({ fit }),
  setRotation: (rot) => get().updateDesign({ printRotation: rot }),

  selectElement: (id) => set({ selectedElementId: id }),

  updateElement: (id, patch) => {
    set((s) => ({
      profiles: withDesign(s.profiles, s.currentProfileId, (d) => ({
        ...d,
        elements: d.elements.map((e) =>
          e.id === id ? { ...e, ...patch } : e,
        ),
      })),
    }));
    schedulePersist(get);
  },

  moveElement: (id, nx, ny) => {
    set((s) => ({
      profiles: withDesign(s.profiles, s.currentProfileId, (d) => ({
        ...d,
        elements: d.elements.map((e) =>
          e.id === id ? { ...e, nx: clamp01(nx), ny: clamp01(ny) } : e,
        ),
      })),
    }));
    schedulePersist(get);
  },

  addElement: () => {
    const el = defaultTextElement({ name: "New text", text: "Text" });
    set((s) => ({
      profiles: withDesign(s.profiles, s.currentProfileId, (d) => ({
        ...d,
        elements: [...d.elements, el],
      })),
      selectedElementId: el.id,
    }));
    schedulePersist(get);
  },

  duplicateElement: (id) => {
    const s0 = get();
    const d = selectCurrentDesign(s0);
    const src = d.elements.find((e) => e.id === id);
    if (!src) return;
    const copy: TextElement = {
      ...src,
      id: newId(),
      name: `${src.name} copy`,
      ny: clamp01(src.ny + 0.06),
    };
    set((s) => ({
      profiles: withDesign(s.profiles, s.currentProfileId, (dd) => ({
        ...dd,
        elements: [...dd.elements, copy],
      })),
      selectedElementId: copy.id,
    }));
    schedulePersist(get);
  },

  removeElement: (id) => {
    set((s) => {
      const profiles = withDesign(s.profiles, s.currentProfileId, (d) => ({
        ...d,
        elements: d.elements.filter((e) => e.id !== id),
      }));
      return {
        profiles,
        selectedElementId:
          s.selectedElementId === id ? null : s.selectedElementId,
      };
    });
    schedulePersist(get);
  },

  switchProfile: (id) => {
    set((s) => {
      const p = s.profiles.find((x) => x.id === id);
      return {
        currentProfileId: p ? id : s.currentProfileId,
        selectedElementId: p?.design.elements[0]?.id ?? null,
      };
    });
    schedulePersist(get);
  },

  newProfile: () => {
    const s0 = get();
    const name = uniqueName("Profile", s0.profiles.map((p) => p.name));
    const profile: StoredProfile = {
      id: newId("pf"),
      name,
      design: defaultDesign(),
    };
    set((s) => ({
      profiles: [...s.profiles, profile],
      currentProfileId: profile.id,
      selectedElementId: profile.design.elements[0]?.id ?? null,
    }));
    schedulePersist(get);
  },

  saveAsProfile: (rawName) => {
    const s0 = get();
    const name = uniqueName(rawName, s0.profiles.map((p) => p.name));
    const profile: StoredProfile = {
      id: newId("pf"),
      name,
      design: cloneDesign(selectCurrentDesign(s0)),
    };
    set((s) => ({
      profiles: [...s.profiles, profile],
      currentProfileId: profile.id,
      selectedElementId: profile.design.elements[0]?.id ?? null,
    }));
    schedulePersist(get);
  },

  renameProfile: (id, rawName) => {
    set((s) => {
      const others = s.profiles.filter((p) => p.id !== id).map((p) => p.name);
      const name = uniqueName(rawName, others);
      return {
        profiles: s.profiles.map((p) => (p.id === id ? { ...p, name } : p)),
      };
    });
    schedulePersist(get);
  },

  deleteProfile: (id) => {
    set((s) => {
      const remaining = s.profiles.filter((p) => p.id !== id);
      if (remaining.length === 0) {
        const fresh: StoredProfile = {
          id: newId("pf"),
          name: "Default",
          design: defaultDesign(),
        };
        return {
          profiles: [fresh],
          currentProfileId: fresh.id,
          selectedElementId: fresh.design.elements[0]?.id ?? null,
        };
      }
      const currentId =
        s.currentProfileId === id ? remaining[0].id : s.currentProfileId;
      return {
        profiles: remaining,
        currentProfileId: currentId,
        selectedElementId:
          s.currentProfileId === id
            ? remaining[0].design.elements[0]?.id ?? null
            : s.selectedElementId,
      };
    });
    schedulePersist(get);
  },

  setDensity: (d) => {
    set({ density: clamp(Math.round(d), 1, 5) });
    schedulePersist(get);
  },
  setCopies: (c) => {
    set({ copies: clamp(Math.round(c), 1, 99) });
    schedulePersist(get);
  },

  addUploadedFont: async (font) => {
    await registerUploadedFont(font);
    set((s) =>
      s.uploadedFonts.some((f) => f.family === font.family)
        ? {}
        : { uploadedFonts: [...s.uploadedFonts, font] },
    );
    schedulePersist(get);
  },

  importProfiles: (result) => {
    if (!result.profiles.length) return;
    set((s) => ({
      profiles: result.profiles,
      currentProfileId: result.currentProfileId ?? result.profiles[0].id,
      selectedElementId: result.profiles[0].design.elements[0]?.id ?? null,
      density:
        result.density != null ? clamp(Math.round(result.density), 1, 5) : s.density,
      copies:
        result.copies != null ? clamp(Math.round(result.copies), 1, 99) : s.copies,
    }));
    schedulePersist(get);
  },

  exportState: () => buildPersist(get()),

  replaceAll: async (state) => {
    await Promise.all(state.uploadedFonts.map((f) => registerUploadedFont(f)));
    const cur =
      state.profiles.find((p) => p.id === state.currentProfileId) ??
      state.profiles[0];
    set({
      profiles: state.profiles,
      currentProfileId: cur.id,
      selectedElementId: cur.design.elements[0]?.id ?? null,
      density: state.density,
      copies: state.copies,
      uploadedFonts: state.uploadedFonts,
    });
    schedulePersist(get);
  },

  connectPrinter: async () => {
    if (get().printerStatus === "connecting") return;
    let svc = get().printer;
    if (!svc) {
      svc = new NiimbotPrinterService();
      svc.onProgress((p) => set({ progress: p }));
      svc.onDisconnect(() =>
        set({
          printerStatus: "idle",
          printerInfo: null,
          progress: null,
        }),
      );
      set({ printer: svc });
    }
    set({ printerStatus: "connecting", printerError: null, progress: null });
    try {
      const info = await svc.connect();
      set({ printerStatus: "connected", printerInfo: info });
    } catch (e) {
      set({ printerStatus: "idle" });
      throw e;
    }
  },

  disconnectPrinter: async () => {
    const svc = get().printer;
    if (svc) await svc.disconnect();
    set({ printerStatus: "idle", printerInfo: null, progress: null });
  },

  setPrinterStatus: (s) =>
    // Clear any prior job's progress when a new print starts.
    set(s === "printing" ? { printerStatus: s, progress: null } : { printerStatus: s }),
  setPrinterError: (msg) => set({ printerError: msg }),
}));
