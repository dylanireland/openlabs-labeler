"use client";

import { useRef } from "react";
import { useStore } from "@/lib/state/store";
import { importPythonConfig } from "@/lib/storage/importPython";
import {
  buildProfilesFile,
  parseProfilesFile,
} from "@/lib/storage/exportProfiles";
import { downloadText } from "@/lib/download";
import { btnSecondary, btnGhost, card, field, sectionTitle } from "./ui";

export default function ProfileBar() {
  const profiles = useStore((s) => s.profiles);
  const currentProfileId = useStore((s) => s.currentProfileId);
  const switchProfile = useStore((s) => s.switchProfile);
  const newProfile = useStore((s) => s.newProfile);
  const saveAsProfile = useStore((s) => s.saveAsProfile);
  const renameProfile = useStore((s) => s.renameProfile);
  const deleteProfile = useStore((s) => s.deleteProfile);
  const importProfiles = useStore((s) => s.importProfiles);
  const exportState = useStore((s) => s.exportState);
  const replaceAll = useStore((s) => s.replaceAll);
  const persisted = useStore((s) => s.storagePersisted);
  const status = useStore((s) => s.printerStatus);
  const busy = status === "printing" || status === "connecting";
  const fileRef = useRef<HTMLInputElement | null>(null);

  const current = profiles.find((p) => p.id === currentProfileId);

  function onSaveAs() {
    const name = window.prompt(
      "Save the current design as a new profile named:",
      current ? `${current.name} copy` : "Profile",
    );
    if (name && name.trim()) saveAsProfile(name.trim());
  }

  function onRename() {
    if (!current) return;
    const name = window.prompt("Rename profile to:", current.name);
    if (name && name.trim()) renameProfile(current.id, name.trim());
  }

  function onDelete() {
    if (!current) return;
    if (window.confirm(`Delete profile “${current.name}”? This can’t be undone.`)) {
      deleteProfile(current.id);
    }
  }

  function onExport() {
    const file = buildProfilesFile(exportState(), new Date().toISOString());
    downloadText(JSON.stringify(file, null, 2), "openlabs-profiles.json");
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      window.alert("Could not read that file.");
      return;
    }
    try {
      JSON.parse(text);
    } catch {
      window.alert(
        "That file isn’t valid JSON — pick an exported profiles file or a desktop config.json.",
      );
      return;
    }

    // Prefer our own export format; fall back to the Python desktop config.
    const native = parseProfilesFile(text);
    if (native.ok && native.state) {
      if (
        window.confirm(
          `Import ${native.count} profile(s)? This replaces your current profiles.\n\nTip: Export first if you want to keep them.`,
        )
      ) {
        await replaceAll(native.state);
      }
      return;
    }

    const py = importPythonConfig(text);
    if (!py.profiles.length) {
      window.alert(py.warnings.join("\n") || native.error || "Nothing to import.");
      return;
    }
    const note = py.warnings.length
      ? `\n\nNotes:\n• ${py.warnings.join("\n• ")}`
      : "";
    if (
      window.confirm(
        `Import ${py.profiles.length} profile(s) from a desktop config? This replaces your current profiles.${note}`,
      )
    ) {
      importProfiles(py);
    }
  }

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <h2 className={sectionTitle}>Profile</h2>
        <div className="flex items-center gap-3 text-xs font-medium text-violet-600">
          <button
            className="hover:underline disabled:opacity-40"
            disabled={busy}
            onClick={onExport}
          >
            Export
          </button>
          <button
            className="hover:underline disabled:opacity-40"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            Import…
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={onImportFile}
        />
      </div>
      <select
        className={`${field} mt-2`}
        value={currentProfileId}
        disabled={busy}
        onChange={(e) => switchProfile(e.target.value)}
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button className={btnSecondary} disabled={busy} onClick={newProfile}>
          New
        </button>
        <button className={btnSecondary} disabled={busy} onClick={onSaveAs}>
          Save as…
        </button>
        <button className={btnGhost} disabled={busy} onClick={onRename}>
          Rename
        </button>
        <button className={btnGhost} disabled={busy} onClick={onDelete}>
          Delete
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-zinc-400">
        Saved in this browser{persisted ? " (persistent)" : ""} — profiles survive
        restarts. Use <span className="text-zinc-500">Export</span> to back up or move
        them to another browser/device.
      </p>
    </section>
  );
}
