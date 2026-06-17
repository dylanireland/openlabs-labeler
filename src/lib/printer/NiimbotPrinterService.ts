/** Adapter over @mmote/niimbluelib's browser Web Bluetooth client for the M2. */
import {
  NiimbotBluetoothClient,
  ImageEncoder,
  LabelType,
} from "@mmote/niimbluelib";
import type {
  PrinterInfoView,
  PrinterService,
  PrintParams,
  PrintProgress,
} from "./PrinterService";

export class NiimbotPrinterService implements PrinterService {
  private client: NiimbotBluetoothClient | null = null;
  private progressCbs = new Set<(p: PrintProgress) => void>();
  private disconnectCbs = new Set<() => void>();

  isConnected(): boolean {
    return !!this.client && this.client.isConnected();
  }

  onProgress(cb: (p: PrintProgress) => void): () => void {
    this.progressCbs.add(cb);
    return () => this.progressCbs.delete(cb);
  }

  onDisconnect(cb: () => void): () => void {
    this.disconnectCbs.add(cb);
    return () => this.disconnectCbs.delete(cb);
  }

  async connect(): Promise<PrinterInfoView> {
    const client = new NiimbotBluetoothClient();
    client.on("printprogress", (e) =>
      this.progressCbs.forEach((cb) =>
        cb({
          page: e.page,
          pagesTotal: e.pagesTotal,
          printPct: e.pagePrintProgress,
          feedPct: e.pageFeedProgress,
        }),
      ),
    );
    client.on("disconnect", () => {
      this.client = null;
      this.disconnectCbs.forEach((cb) => cb());
    });

    // connect() reaches navigator.bluetooth.requestDevice synchronously, so this
    // must be called from a user gesture (a click handler).
    const conn = await client.connect();
    this.client = client;

    const info = client.getPrinterInfo();
    const meta = client.getModelMetadata();
    return {
      deviceName: conn.deviceName,
      model: meta?.model,
      modelId: info.modelId,
      serial: info.serial,
      software: info.softwareVersion,
      hardware: info.hardwareVersion,
      printhead: meta?.printheadPixels,
      dpi: meta?.dpi,
      taskType: client.getPrintTaskType(),
    };
  }

  async preflightRoll(): Promise<string | null> {
    const client = this.client;
    if (!client) return null;
    try {
      const hb = await client.abstraction.heartbeat();
      if (hb.paperRfidSuccess === false || hb.paperInserted === false) {
        return "No genuine NIIMBOT roll detected — the M2 needs an official RFID label roll to print.";
      }
      return null;
    } catch {
      return null; // heartbeat fields are model-dependent; don't block on it
    }
  }

  async printCanvas(
    canvas: HTMLCanvasElement,
    { copies, density }: PrintParams,
  ): Promise<void> {
    const client = this.client;
    if (!client) throw new Error("Printer is not connected.");

    const encoded = ImageEncoder.encodeCanvas(canvas, "top");
    const taskName = client.getPrintTaskType() ?? "B1";
    const task = client.abstraction.newPrintTask(taskName, {
      totalPages: copies,
      density,
      labelType: LabelType.WithGaps,
      statusPollIntervalMs: 100,
      statusTimeoutMs: 8000,
    });

    try {
      await task.printInit();
      await task.printPage(encoded, copies);
      await task.waitForPageFinished();
      await task.waitForFinished();
    } finally {
      // Best-effort cleanup — must not overwrite the in-flight error (printEnd
      // throws "Channel is closed" if the printer dropped mid-print).
      try {
        await client.abstraction.printEnd();
      } catch {
        /* ignore cleanup failure */
      }
    }
  }

  async disconnect(): Promise<void> {
    const client = this.client;
    this.client = null;
    if (client) {
      try {
        await client.disconnect();
      } catch {
        /* ignore */
      }
    }
  }
}
