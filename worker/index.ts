import { renderApp } from '../src/ssr/render'

interface Env {
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname
    console.log('Worker handling:', pathname)

    // SSR route - render on server
    if (pathname === '/') {
      console.log('SSR route matched')
      try {
        const html = await renderApp(pathname)
        console.log('SSR rendered successfully')
        return new Response(html, {
          headers: { 'content-type': 'text/html' }
        })
      } catch (e) {
        // Fallback to static if SSR fails
        console.error('SSR error:', e)
        return env.ASSETS.fetch(request)
      }
    }

    // CSR routes - serve index.html, client handles routing
    if (pathname === '/data' || pathname.startsWith('/data')) {
      console.log('CSR route matched')
      // Serve a shell HTML that will be hydrated by the client
      const shellHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CSR Shell</title>
    <script type="module" crossorigin src="/assets/index-c53Rt0Y_.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
      return new Response(shellHtml, {
        headers: { 'content-type': 'text/html' }
      })
    }

    // API routes - proxy to external
    if (pathname.startsWith('/api/')) {
      console.log('API route matched')
      const target = pathname.replace('/api', '')
      const response = await fetch(`https://jsonplaceholder.typicode.com${target}`)
      return new Response(response.body, {
        headers: { 'content-type': 'application/json' }
      })
    }

    // Static assets
    console.log('Falling back to static assets')
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>