import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 100% client-side app (Web Bluetooth + Canvas + IndexedDB) → static SPA.
  // `next build` emits a plain `out/` folder deployable to any static host with HTTPS.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
