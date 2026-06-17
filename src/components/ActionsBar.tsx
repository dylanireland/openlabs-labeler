"use client";

import {
  useStore,
  selectCurrentDesign,
  selectCurrentProfile,
} from "@/lib/state/store";
import { describePrinterError } from "@/lib/printer/PrinterService";
import { renderPrintCanvas } from "@/lib/render/print";
import { renderCalibrationCanvas } from "@/lib/render/calibration";
import { paintDesign } from "@/lib/render/paint";
import { loadImage } from "@/lib/render/image";
import { deviceSize } from "@/lib/model/design";
import { downloadBlob } from "@/lib/download";
import { btnPrimary, btnSecondary } from "./ui";

export default function ActionsBar() {
  const design = useStore(selectCurrentDesign);
  const profile = useStore(selectCurrentProfile);
  const status = useStore((s) => s.printerStatus);
  const progress = useStore((s) => s.progress);
  const printer = useStore((s) => s.printer);
  const density = useStore((s) => s.density);
  const copies = useStore((s) => s.copies);
  const setPrinterStatus = useStore((s) => s.setPrinterStatus);
  const setPrinterError = useStore((s) => s.setPrinterError);

  const canPrint = status === "connected" && !!printer;
  const printing = status === "printing";

  async function loadTpl(): Promise<HTMLImageElement | null> {
    if (!design.templateDataUrl) return null;
    return loadImage(design.templateDataUrl).catch(() => null);
  }

  async function runPrint(build: () => Promise<HTMLCanvasElement>) {
    if (!printer || status !== "connected") return;
    setPrinterError(null);
    const warn = await printer.preflightRoll();
    if (warn && !window.confirm(`${warn}\n\nTry printing anyway?`)) return;
    setPrinterStatus("printing");
    try {
      const canvas = await build();
      await printer.printCanvas(canvas, { copies, density });
    } catch (e) {
      setPrinterError(describePrinterError(e));
    } finally {
      setPrinterStatus(printer.isConnected() ? "connected" : "idle");
    }
  }

  const onPrint = () =>
    runPrint(async () => renderPrintCanvas(design, await loadTpl()).canvas);

  const onTest = () => runPrint(async () => renderCalibrationCanvas(design).canvas);

  async function onExport() {
    const tpl = await loadTpl();
    const dims = deviceSize(design);
    const c = document.createElement("canvas");
    c.width = dims.width;
    c.height = dims.height;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    paintDesign(ctx, design, { dims, template: tpl });
    c.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${profile?.name || "label"}.png`);
    }, "image/png");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className={btnPrimary} disabled={!canPrint} onClick={onPrint}>
        {printing ? "Printing…" : "Print"}
      </button>
      <button className={btnSecondary} disabled={!canPrint} onClick={onTest}>
        Test print
      </button>
      <button className={btnSecondary} onClick={onExport}>
        Export PNG
      </button>
      {printing && progress && (
        <span className="text-xs text-zinc-500">
          page {Math.min(progress.page, progress.pagesTotal)}/{progress.pagesTotal} ·{" "}
          {progress.printPct}% · feed {progress.feedPct}%
        </span>
      )}
      {!canPrint && !printing && (
        <span className="text-xs text-zinc-400">Connect the printer to print.</span>
      )}
    </div>
  );
}
