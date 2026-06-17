/** Trigger a client-side file download (no server involved). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so the browser finishes consuming the URL (sync revoke can
  // cancel the download in some browsers).
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadText(
  text: string,
  filename: string,
  type = "application/json",
): void {
  downloadBlob(new Blob([text], { type }), filename);
}
