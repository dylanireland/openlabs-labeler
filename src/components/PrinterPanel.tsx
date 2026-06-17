"use client";

import { useStore } from "@/lib/state/store";
import { describePrinterError } from "@/lib/printer/PrinterService";
import type { PrinterStatus } from "@/lib/state/store";
import { btnPrimary, btnGhost, card, field, labelText, sectionTitle } from "./ui";

const STATUS_LABEL: Record<PrinterStatus, string> = {
  idle: "Not connected",
  connecting: "Connecting…",
  connected: "Connected",
  printing: "Printing…",
};

export default function PrinterPanel() {
  const status = useStore((s) => s.printerStatus);
  const info = useStore((s) => s.printerInfo);
  const error = useStore((s) => s.printerError);
  const density = useStore((s) => s.density);
  const copies = useStore((s) => s.copies);
  const setDensity = useStore((s) => s.setDensity);
  const setCopies = useStore((s) => s.setCopies);
  const connectPrinter = useStore((s) => s.connectPrinter);
  const disconnectPrinter = useStore((s) => s.disconnectPrinter);
  const setPrinterError = useStore((s) => s.setPrinterError);

  const connected = status === "connected" || status === "printing";

  async function onConnect() {
    try {
      await connectPrinter();
    } catch (e) {
      setPrinterError(describePrinterError(e));
    }
  }

  const rows: Array<[string, string | undefined]> = info
    ? [
        ["Model", info.model ?? (info.modelId != null ? String(info.modelId) : "")],
        ["Task", info.taskType ?? "B1"],
        ["Serial", info.serial],
        ["Firmware", info.software],
      ]
    : [];

  return (
    <section className={card}>
      <h2 className={sectionTitle}>Printer</h2>
      <div className="mt-2 flex items-center gap-3">
        {!connected ? (
          <button
            className={btnPrimary}
            disabled={status === "connecting"}
            onClick={onConnect}
          >
            {status === "connecting" ? "Connecting…" : "Connect"}
          </button>
        ) : (
          <button
            className={btnGhost}
            disabled={status === "printing"}
            onClick={() => void disconnectPrinter()}
          >
            Disconnect
          </button>
        )}
        <span
          className={`text-xs ${connected ? "text-emerald-600" : "text-zinc-400"}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {info && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-zinc-500">{k}</dt>
              <dd className="truncate font-mono text-zinc-700">{v || "—"}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className={labelText}>Density (1–5)</span>
          <input
            type="number"
            min={1}
            max={5}
            className={field}
            value={density}
            onChange={(e) => setDensity(Number(e.target.value) || 3)}
          />
        </label>
        <label className="block">
          <span className={labelText}>Copies (1–99)</span>
          <input
            type="number"
            min={1}
            max={99}
            className={field}
            value={copies}
            onChange={(e) => setCopies(Number(e.target.value) || 1)}
          />
        </label>
      </div>
    </section>
  );
}
