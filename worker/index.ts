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
        const html = renderApp(pathname)
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
      return env.ASSETS.fetch(new Request('https://localhost/index.html'))
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