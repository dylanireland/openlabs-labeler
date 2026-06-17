# OpenLabs Labeler (web)

A static, client-side **Next.js + TypeScript** web app to design and print chemical
labels to a **Niimbot M2** over **Web Bluetooth**. Rebuild of the Python/Tkinter
desktop app — deployable to **labelmaker.openlabsus.com** (see `DEPLOY.md`).

Everything runs in the browser: Web Bluetooth talks to the printer, Canvas renders the
label, IndexedDB stores your profiles. **No server.**

## Features

- **Profiles** — save a whole label setup (template + text blocks + sizes + rotation) as a
  named profile; switch from a dropdown. New / Save as… / Rename / Delete. Auto-saved.
- **Template background** — pick any PNG/JPG as the label background, with `stretch` /
  `contain` / `cover` fit.
- **Freely-placed text** — add as many text elements as you want; each has its own text,
  **font** (built-ins or **upload** a `.ttf/.otf/.woff`), **size**, **bold**, **anchor**,
  **colour**, and position.
- **Position any way** — drag on the live canvas, **arrow-key** nudge (Shift = 10px), or
  type exact **X/Y px**.
- Adjustable label size (mm), density, copies, and print rotation (0/90/180/270).
- **Direct printing** to the M2 over Web Bluetooth, **Test print** (calibration pattern),
  and **Export PNG**.
- **Import** your old desktop `config.json` (Profile → Import…).

## Requirements

- **Google Chrome or Microsoft Edge** on desktop. Web Bluetooth is **not** in Safari,
  Firefox, or any iOS browser — no workaround for a pure web app. (You can still design in
  those browsers; you just can't print.)
- A **Niimbot M2** with a **genuine NIIMBOT RFID label roll** (the M2 refuses to print
  without one), powered on and not connected to the phone app.

## Run it (local dev)

```bash
npm install        # once
npm run dev        # http://localhost:3456
```

Open **http://localhost:3456 in Chrome** (`localhost` is a secure context, so Web
Bluetooth works without HTTPS). Then:

1. Pick/make a **Profile**, optionally **Choose** a template, set the **Label size**.
2. Build **text elements** (Add / Duplicate / Remove); edit the selected one; drag it on the
   canvas or type X/Y.
3. **Connect** the printer (Printer panel) and pick your M2 in the chooser.
4. **Print**, or **Test print** first to check orientation/scale. **Export PNG** saves a copy.

> If port 3456 is busy: `npm run dev -- -p <port>`.

## Scripts

```bash
npm run dev         # dev server on :3456
npm run build       # static export → ./out
npm test            # vitest unit tests
npm run typecheck   # tsc --noEmit
```

## Stack

- Next.js 16 (App Router, `output: 'export'` — static SPA, no server).
- [`@mmote/niimbluelib`](https://github.com/MultiMote/niimbluelib) (pinned) behind a thin
  `PrinterService` adapter — the M2 protocol over Web Bluetooth, same lib as niim.blue.
- Zustand (state) · IndexedDB (profiles/fonts) · Canvas 2D (render) · Tailwind v4.

## Deploying

See **`DEPLOY.md`** — static host with auto-HTTPS (Vercel recommended).
