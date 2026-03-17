# react-vite-cf

A production-ready template for building React apps on **Cloudflare Pages** with Vite, TanStack Router, Tailwind CSS, and a hybrid SSR/CSR rendering pattern.

---

## Table of Contents

- [Stack](#stack)
- [How It All Works](#how-it-all-works)
  - [1. Vite builds the client bundle](#1-vite-builds-the-client-bundle)
  - [2. The Vite manifest gets copied for the Worker](#2-the-vite-manifest-gets-copied-for-the-worker)
  - [3. Pages Functions handle every request](#3-pages-functions-handle-every-request)
  - [4. SSR renders the HTML shell](#4-ssr-renders-the-html-shell)
  - [5. Runtime config flows from Cloudflare to the browser](#5-runtime-config-flows-from-cloudflare-to-the-browser)
  - [6. React hydrates on the client](#6-react-hydrates-on-the-client)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Build & Deploy](#build--deploy)
- [Routing — How It Works Without a Config File](#routing--how-it-works-without-a-config-file)
- [Wrangler Config — Why There Isn't One](#wrangler-config--why-there-isnt-one)
- [Environment Variables](#environment-variables)
- [Why Hybrid SSR/CSR?](#why-hybrid-ssrcsr)
- [Key Cloudflare Pages Concepts](#key-cloudflare-pages-concepts)
- [Gotchas](#gotchas)

---

## Stack

| Layer | Technology |
|---|---|
| UI framework | React 18 |
| Build tool | Vite 6 |
| Client routing | TanStack Router |
| Styling | Tailwind CSS 4 |
| Edge runtime | Cloudflare Pages + Pages Functions |
| Package manager | Bun |
| Deploy CLI | Wrangler |

---

## How It All Works

The app uses a **hybrid SSR/CSR** pattern. The server (a Cloudflare Pages Function running on the edge) renders a complete HTML document shell on every page request. React then hydrates on the client and takes over all subsequent navigation. No full-page reloads after the first load.

Here's the full data flow:

```
Browser request
      ↓
Cloudflare edge (Pages Function)
      ↓
  Is it a static asset? → YES → serve from CDN (Worker never runs)
      ↓ NO
  Is it /api/*? → YES → functions/api/[[path]].ts (proxy to upstream API)
      ↓ NO
  functions/[[path]].ts
      ↓
  Read Vite manifest → resolve hashed asset URLs
      ↓
  renderDocumentHtml() → full HTML string with <script>, <link>, config
      ↓
  Response({ content-type: text/html })
      ↓
Browser receives full HTML → React hydrates → TanStack Router takes over
```

### 1. Vite builds the client bundle

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/client',
    manifest: true, // <-- this is the key flag
  },
})
```

`manifest: true` tells Vite to emit a `.vite/manifest.json` alongside the bundle. This file maps every source entry point to its hashed output filename, for example:

```json
{
  "index.html": {
    "file": "assets/index-BxK2a9Lp.js",
    "css": ["assets/index-Dj3kP2mQ.css"],
    "isEntry": true
  }
}
```

Without this, the SSR layer would have no way to know what the hashed filenames are at runtime.

### 2. The Vite manifest gets copied for the Worker

Cloudflare Pages Functions are bundled separately by Wrangler — they don't go through Vite. So the manifest needs to be available as a static JSON import inside the `functions/` directory.

`scripts/generate-pages-vite-manifest.ts` handles this:

```ts
// Reads:  dist/client/.vite/manifest.json
// Writes: functions/_generated/vite-manifest.json
const raw = await readFile(srcPath, 'utf8')
const manifest = JSON.parse(raw)
await writeFile(outPath, JSON.stringify(manifest), 'utf8')
```

This runs as the last step of `bun run build`, so the manifest is always in sync with the latest build.

### 3. Pages Functions handle every request

`functions/[[path]].ts` is the catch-all function. The `[[path]]` filename syntax is Cloudflare's convention for a wildcard route — it matches any URL path.

```ts
export async function onRequest(context) {
  const { pathname } = new URL(context.request.url)

  // Static assets are already handled by the CDN before reaching here,
  // but this is a defensive fallback.
  if (isAssetPath(pathname)) return context.next()

  // /api/* is handled by functions/api/[[path]].ts — this is also
  // redundant due to specificity routing, but good defensive practice.
  if (pathname.startsWith('/api/')) {
    return new Response('Not found', { status: 404 })
  }

  const assets = getSsrAssetsFromManifest(manifest, 'index.html')
  const html = renderDocumentHtml({ pathname, assets, config })

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  })
}
```

### 4. SSR renders the HTML shell

`src/ssr/render.tsx` builds the full HTML string. It's not React `renderToString` — it's a plain template function that produces a complete document with the correct asset URLs injected:

```ts
export function renderDocumentHtml({ assets, config }) {
  const cssLinks = assets.css
    .map((href) => `<link rel="stylesheet" crossorigin href="${href}">`)
    .join('')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${config.appTitle}</title>
    ${cssLinks}
  </head>
  <body>
    <div id="root"></div>
    <script>window.__APP_CONFIG__=${JSON.stringify(config)}</script>
    <script type="module" crossorigin src="${assets.entryJs}"></script>
  </body>
</html>`
}
```

`getSsrAssetsFromManifest()` walks the manifest graph (including transitive imports) to collect all CSS files and the entry JS path:

```ts
export function getSsrAssetsFromManifest(manifest, entry) {
  const entryItem = manifest[entry]
  const css = new Set()

  const visit = (key) => {
    const item = manifest[key]
    for (const c of item.css ?? []) css.add(`/${c}`)
    for (const imp of item.imports ?? []) visit(imp) // recurse into chunks
  }

  visit(entry)
  return { entryJs: `/${entryItem.file}`, css: [...css] }
}
```

### 5. Runtime config flows from Cloudflare to the browser

Environment variables set in the Cloudflare dashboard are available in the Worker via `context.env`. They get serialized into the HTML as `window.__APP_CONFIG__`:

```html
<script>window.__APP_CONFIG__={"APP_TITLE":"My App","API_URL":"https://api.example.com"}</script>
```

On the client, `src/lib/runtimeConfig.ts` reads from this object first, falling back to `import.meta.env` for local Vite dev:

```ts
export function getRuntimeConfig(): RuntimeConfig {
  const injected = window.__APP_CONFIG__

  if (injected) {
    return { appTitle: injected.APP_TITLE, apiUrl: injected.API_URL }
  }

  // Fallback for `vite dev` (no Worker involved)
  return {
    appTitle: import.meta.env.VITE_APP_TITLE,
    apiUrl: import.meta.env.VITE_API_URL,
  }
}
```

This means the same build artifact can be deployed to staging and production with different configs — no rebuild needed.

### 6. React hydrates on the client

`src/main.tsx` is the client entry point. It calls `ReactDOM.createRoot(...).render(...)` on the `#root` div that the SSR shell already created. TanStack Router reads the current URL and renders the matching route component. From this point on, all navigation is client-side.

---

## Project Structure

```
├── functions/                    # Cloudflare Pages Functions (edge runtime)
│   ├── [[path]].ts               # Catch-all: renders HTML shell for all page routes
│   ├── api/
│   │   └── [[path]].ts           # Catch-all: proxies /api/* to upstream API
│   └── _generated/
│       └── vite-manifest.json    # Copied from dist/client at build time
│
├── scripts/
│   └── generate-pages-vite-manifest.ts  # Copies Vite manifest into functions/_generated
│
├── src/
│   ├── ssr/
│   │   ├── render.tsx            # Builds the HTML document string
│   │   └── viteManifest.ts       # Reads manifest, resolves hashed asset URLs
│   ├── lib/
│   │   └── runtimeConfig.ts      # Reads window.__APP_CONFIG__ or import.meta.env
│   ├── routes/                   # TanStack Router route components
│   ├── routes.tsx                # Route tree definition
│   ├── App.tsx                   # Root app component
│   └── main.tsx                  # Client entry point (React hydration)
│
├── dist/
│   └── client/                   # Vite output — deployed as static assets to Pages CDN
│
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Getting Started

```bash
# Install dependencies
bun install

# Start Vite dev server (pure CSR, no Worker involved)
bun run dev

# Build + start local Cloudflare Pages environment (with Worker)
bun run pages:dev
```

`bun run dev` uses Vite's dev server directly — fast HMR, no Worker. Use this for most development.

`bun run pages:dev` builds the project and runs it through Wrangler's local Pages emulator. Use this when you need to test Worker behavior, env vars, or the SSR shell specifically.

---

## Build & Deploy

```bash
# Full build: tsc + vite build + copy manifest
bun run build

# Deploy to Cloudflare Pages
bun run pages:deploy
# Runs: wrangler pages deploy dist/client --project-name react-vite-cf
```

The build sequence matters:

1. `tsc -b` — type-checks everything including the Worker code
2. `vite build` — outputs `dist/client/` with hashed assets and `.vite/manifest.json`
3. `bun scripts/generate-pages-vite-manifest.ts` — copies the manifest to `functions/_generated/vite-manifest.json`

Step 3 must happen after step 2. The Worker imports the manifest as a static JSON file, so it needs to exist before Wrangler bundles the functions.

---

## Routing — How It Works Without a Config File

There is no `routes.json`, no path mapping, no explicit route registration for the edge layer. Cloudflare Pages derives routing entirely from the `functions/` directory structure.

### File-system routing rules

| File | Matches |
|---|---|
| `functions/[[path]].ts` | Everything — `/*` |
| `functions/api/[[path]].ts` | Everything under `/api/*` |
| `functions/about.ts` | Exactly `/about` |
| `functions/blog/[slug].ts` | `/blog/:slug` (single segment) |
| `functions/blog/[[path]].ts` | `/blog/*` (zero or more segments) |

`[param]` matches exactly one path segment. `[[param]]` matches zero or more.

### Specificity wins

When multiple functions could match a URL, the most specific one wins. So a request to `/api/users/123` matches `functions/api/[[path]].ts` before `functions/[[path]].ts`, even though both technically match.

### Static assets are checked first

Before any function runs, Cloudflare checks whether the request path matches a file in `dist/client/`. If it does, the file is served directly from the CDN — the Worker never executes. This is why `/assets/index-BxK2a9Lp.js` works without any special handling in the function.

Full priority order for any incoming request:

```
1. Static file match in dist/client/   →  CDN response (no Worker)
2. Exact function file match           →  runs that function
3. Dynamic segment match [param]       →  runs that function
4. Catch-all match [[path]]            →  runs that function
5. No match                            →  404
```

The `isAssetPath()` check inside `functions/[[path]].ts` and the `/api/` guard are both defensive — by the time a request reaches those checks, Cloudflare's routing has already handled the cases they guard against. They exist as safety nets.

---

## Wrangler Config — Why There Isn't One

You might look for a `wrangler.toml` and not find one. That's intentional.

### `wrangler.toml` is for standalone Workers

`wrangler.toml` is the config file for **Cloudflare Workers** — scripts you deploy with `wrangler deploy`. It tells Wrangler where your entry point is, what the Worker is named, and what bindings it needs:

```toml
name = "my-worker"
main = "src/worker.ts"
compatibility_date = "2024-01-01"

[vars]
MY_VAR = "hello"

[[kv_namespaces]]
binding = "MY_KV"
id = "abc123"
```

### Cloudflare Pages is a different product

Pages has its own deployment model. Instead of a single Worker entry point, you deploy a **directory of static assets** and an optional `functions/` directory. Wrangler auto-discovers everything from the folder structure — there's no `main` to declare, no `name` to set in a file.

The project name lives in the deploy command (or the Cloudflare dashboard), not in a config file:

```bash
wrangler pages deploy dist/client --project-name react-vite-cf
```

### When you would add a `wrangler.toml`

The only reason to add one to a Pages project is to declare **bindings for local development** — KV namespaces, D1 databases, R2 buckets, Durable Objects. Without a config file, `wrangler pages dev` can't simulate those bindings locally.

```toml
# wrangler.toml — only needed if you use KV/D1/R2/etc. locally
[[kv_namespaces]]
binding = "MY_KV"
id = "abc123"
preview_id = "abc123-preview"
```

In production, all bindings are configured in the Cloudflare dashboard under Pages → Settings → Functions. Simple string env vars like `APP_TITLE` and `API_URL` don't need a config file at all — set them in the dashboard and they show up in `context.env`.

---

## Environment Variables

| Variable | Where it's set | How it's used |
|---|---|---|
| `APP_TITLE` | Cloudflare dashboard / `.env.local` | Sets `<title>` and `window.__APP_CONFIG__.APP_TITLE` |
| `API_URL` | Cloudflare dashboard / `.env.local` | Base URL for the `/api/*` proxy and client config |

For local `vite dev`, set them in `.env.local`:

```bash
VITE_APP_TITLE=My App
VITE_API_URL=https://jsonplaceholder.typicode.com
```

For `wrangler pages dev` (local Pages emulation), set them in `.env.local` as plain vars (no `VITE_` prefix) — Wrangler picks them up automatically:

```bash
APP_TITLE=My App
API_URL=https://jsonplaceholder.typicode.com
```

For production/staging, set them in the Cloudflare dashboard. They're injected into `context.env` at runtime — the build artifact doesn't need to change between environments.

---

## Why Hybrid SSR/CSR?

| | Pure CSR (default Vite) | This hybrid approach |
|---|---|---|
| First paint | Blank page until JS loads | Full HTML from the edge |
| SEO | Poor — `<title>` is always empty | Good — server sets correct metadata |
| Config injection | Baked into bundle at build time | Runtime via `window.__APP_CONFIG__` |
| Same build for staging + prod | No — needs rebuild per env | Yes — config injected at request time |
| Complexity | Simple | Slightly more setup |
| Full React SSR (renderToString) | N/A | Not used — shell-only approach |

This project uses a **shell rendering** approach, not full `renderToString`. The server produces a valid HTML document with the right assets and config, but the `<div id="root">` is empty. React fills it in on the client. This avoids the complexity of full SSR (no hydration mismatches, no server-side data fetching coordination) while still getting the benefits of a real first HTML response.

---

## Key Cloudflare Pages Concepts

`context.next()` — passes the request down to the next handler, which for Pages means the static asset server. Call this for asset paths or you'll accidentally serve HTML for `.js` files.

`context.env` — your environment variables and service bindings (KV, D1, R2, etc.). This is the Pages equivalent of `process.env` — except it's not global, it's passed per-request.

`context.params` — the matched URL segments from dynamic routes. In `functions/api/[[path]].ts`, `context.params.path` is an array of path segments after `/api/`.

`functions/_middleware.ts` — a special file that runs before any function in the same directory (and subdirectories). Use it for auth checks, logging, CORS headers, or anything that should apply across multiple routes.

`wrangler pages dev` — local Pages emulator. Runs your functions through the same V8 isolate runtime as production. Much closer to prod than `vite dev`, but slower to start.

---

## Gotchas

**No Node.js APIs in functions.** Workers run in the V8 isolate runtime — no `fs`, no `path`, no `Buffer`, no `process.env`. Use `context.env` for env vars and the Web APIs (`fetch`, `Request`, `Response`, `URL`, `crypto`) for everything else.

**`functions/` is not bundled by Vite.** Wrangler bundles it separately. Don't import packages that depend on Node.js built-ins — they'll fail at runtime even if they work fine in Vite.

**The manifest must exist before Wrangler bundles functions.** The Worker imports `functions/_generated/vite-manifest.json` as a static JSON import. If you run `wrangler pages dev` without building first, it'll fail. Always run `bun run build` before `wrangler pages dev` (or use `bun run pages:dev` which does both).

**`dist/client/` is the deploy target, not the repo root.** `wrangler pages deploy dist/client` — not `.` or `dist`. The `functions/` directory is picked up automatically from the repo root alongside the deploy target.

**Hashed filenames change on every build.** The Vite manifest is what keeps the Worker in sync with the actual filenames. If you deploy the Worker and the static assets from different builds, you'll get 404s on assets. The build script ensures they're always built together.
