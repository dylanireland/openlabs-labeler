/** UI-facing printer abstraction. The app depends only on this interface, so the
 *  alpha `@mmote/niimbluelib` stays behind one adapter and its churn is contained. */

export interface PrinterInfoView {
  deviceName?: string;
  model?: string;
  modelId?: number;
  serial?: string;
  software?: string;
  hardware?: string;
  printhead?: number;
  dpi?: number;
  taskType?: string;
}

export interface PrintProgress {
  page: number;
  pagesTotal: number;
  printPct: number;
  feedPct: number;
}

export interface PrintParams {
  copies: number;
  density: number;
}

export interface PrinterService {
  connect(): Promise<PrinterInfoView>;
  printCanvas(canvas: HTMLCanvasElement, params: PrintParams): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  /** Returns a roll/RFID warning to show before printing, or null if all good. */
  preflightRoll(): Promise<string | null>;
  onProgress(cb: (p: PrintProgress) => void): () => void;
  onDisconnect(cb: () => void): () => void;
}

export function describePrinterError(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "NotFoundError")
      return "No printer selected (the chooser was cancelled).";
    if (e.name === "SecurityError")
      return "Blocked — connecting must be triggered by a click over HTTPS or localhost.";
    if (e.name === "NetworkError")
      return "Lost connection to the printer. Power-cycle it and reconnect.";
    return e.message || e.name;
  }
  return String(e);
}
