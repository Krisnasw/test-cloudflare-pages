import { renderApp } from '../src/ssr/render'

interface Env {
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname

    // SSR route - render on server
    if (pathname === '/') {
      try {
        console.log('Rendering SSR for:', pathname)
        const html = renderApp(pathname)
        console.log('SSR rendered, length:', html.length)
        return new Response(html, {
          headers: { 'content-type': 'text/html' }
        })
      } catch (e) {
        console.error('SSR error:', e)
        return env.ASSETS.fetch(request)
      }
    }

    // CSR routes - serve index.html, client handles routing
    if (pathname === '/data' || pathname.startsWith('/data')) {
      const shellHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Unicorn Test Deploy</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" crossorigin src="/assets/index-2MEQplgz.js"></script>
  </body>
</html>`
      return new Response(shellHtml, {
        headers: { 'content-type': 'text/html' }
      })
    }

    // API routes - proxy to external
    if (pathname.startsWith('/api/')) {
      const target = pathname.replace('/api', '')
      const response = await fetch(`https://jsonplaceholder.typicode.com${target}`)
      return new Response(response.body, {
        headers: { 'content-type': 'application/json' }
      })
    }

    // Static assets
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>