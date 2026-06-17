# Deploying — Cloudflare Pages + Access (free, gated)

This app is a **static site** (`next build` → `out/`). It needs only **HTTPS** (Web
Bluetooth won't run on plain HTTP), which every option below provides free.

**Chosen setup:** Cloudflare Pages (free hosting) + Cloudflare Access (free login
gate, ≤ 50 users) on the free `*.pages.dev` URL. No backend, no cost.

> Repo visibility is independent of site access: a **public** GitHub repo is fine —
> the login gate lives at Cloudflare, not in the repo.

---

## 1. Host on Cloudflare Pages

1. Log in at **dash.cloudflare.com** (free account).
2. **Workers & Pages → Create → Pages → Connect to Git** → authorize GitHub → pick
   the **openlabs-labeler** repo.
3. Build settings:
   - **Framework preset:** *Next.js (Static HTML Export)* — **not** plain "Next.js"
     (that one uses an SSR adapter we don't want).
   - **Build command:** `npm run build`
   - **Build output directory:** `out`
   - Node version is pinned by `.nvmrc` (22). If a build ever fails on Node, add an
     env var `NODE_VERSION = 22`.
4. **Save and Deploy.** You get `https://<project>.pages.dev` with automatic HTTPS.

That URL already works for printing (HTTPS = secure context). The next step locks it down.

## 2. Gate it with Cloudflare Access (login once)

Protecting *preview* deployments is a one-click toggle; protecting the **production
`*.pages.dev`** URL needs one extra step (per Cloudflare's docs):

1. In your Pages project → **Settings → Enable access policy** (this protects preview
   deployments and creates an Access policy).
2. Click **Manage** on that policy → **Zero Trust → Access → Applications** → open the
   project's application → **Configure**.
3. Under **Public hostname**, **remove the `*` (asterisk)** from the **Subdomain**
   field and **Save**. (You may have to tweak the application name to avoid an error.)
   This extends protection to the production `<project>.pages.dev`.
4. Back in the Pages project → **Settings → General → Enable access policy** again →
   confirm you now have **two** policies (one for `*.pages.dev`, one for previews).

### Who can log in (the policy)
In the Access application's policy, add an **Allow** rule:
- **Selector: Emails** → list your address(es) (e.g. `dylan.ireland777@gmail.com`,
  plus any colleagues). Or **Emails ending in** → `@openlabsus.com`.
- **Login method:** Cloudflare's built-in **One-time PIN** (emails a code) works with
  zero setup. For one-click sign-in, add **Google** or **GitHub** as a login method in
  **Zero Trust → Settings → Authentication** (free).
- **Session duration:** set it long (e.g. **1 week** or **1 month**) so it's truly
  "log in once."

Now visiting the URL shows a login screen; after you authenticate once, the app loads
normally and stays logged in for the session length you chose.

## 3. (Optional, later) Pretty custom domain

To use `labelmaker.openlabsus.com` instead of `*.pages.dev`, add `openlabsus.com` as a
Cloudflare zone (move its nameservers to Cloudflare — free; Cloudflare auto-imports
your existing Shopify records, and the storefront keeps working). Then add the custom
domain in the Pages project and create a **second** Access application for it
(Zero Trust → Access → Applications → Self-hosted → your custom hostname) — without its
own policy, the login renders but won't actually gate the custom domain.

---

## Reminders

- **Printing is Chrome/Edge desktop only.** You can open + design on iPhone (Access
  login works in iOS Safari), but Web Bluetooth — and therefore printing — doesn't exist
  on iOS. Print from a laptop.
- **Genuine NIIMBOT RFID roll** required or the M2 won't print.
- Profiles persist per-browser via IndexedDB (free, no backend). Use **Export** to move
  them between devices/browsers.

## Other hosts (not chosen)

- **GitHub Pages:** free + simple, but **no access control** (public to anyone with the URL).
- **Vercel/Netlify:** free to host, but a real login gate is a **paid** plan (~$20/mo) —
  Cloudflare Access does the same for free.
