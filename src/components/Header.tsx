export default function Header() {
  return (
    <header className="flex items-center gap-3 border-b border-violet-100 pb-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-700 text-sm font-bold text-white">
        OL
      </span>
      <div>
        <h1 className="text-lg font-semibold tracking-tight">OpenLabs Labeler</h1>
        <p className="text-xs text-zinc-500">
          Design &amp; print chemical labels · Niimbot M2 over Web Bluetooth
        </p>
      </div>
    </header>
  );
}
