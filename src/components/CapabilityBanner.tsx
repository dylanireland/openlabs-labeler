"use client";

import { useEffect, useState } from "react";

export default function CapabilityBanner() {
  const [state, setState] = useState<"ok" | "no-bt" | "insecure" | null>(null);

  useEffect(() => {
    const hasBT = typeof navigator !== "undefined" && "bluetooth" in navigator;
    const secure = typeof window !== "undefined" && window.isSecureContext;
    setState(!hasBT ? "no-bt" : !secure ? "insecure" : "ok");
  }, []);

  if (state === null || state === "ok") return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      {state === "no-bt" ? (
        <p>
          <strong>This browser can’t print.</strong> Web Bluetooth only works in{" "}
          <strong>Chrome</strong> or <strong>Edge</strong> on desktop — not Safari,
          Firefox, or iOS. You can still design labels here, but connect &amp; print
          from Chrome/Edge.
        </p>
      ) : (
        <p>
          <strong>Not a secure context.</strong> Printing needs HTTPS or{" "}
          <code>http://localhost</code>. A plain LAN IP won’t expose Bluetooth.
        </p>
      )}
    </div>
  );
}
