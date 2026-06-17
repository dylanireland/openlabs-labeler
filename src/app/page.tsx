"use client";

import dynamic from "next/dynamic";

// The app touches Web Bluetooth / Canvas / IndexedDB (browser-only). Load it
// client-side only so it is never evaluated during the static prerender, and so
// niimbluelib is in memory before the user clicks "Connect" (preserving the gesture).
const LabelerApp = dynamic(() => import("@/components/LabelerApp"), {
  ssr: false,
  loading: () => (
    <p className="p-8 text-sm text-zinc-500">Loading OpenLabs Labeler…</p>
  ),
});

export default function Home() {
  return <LabelerApp />;
}
