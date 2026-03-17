interface Env {
  ASSETS: Fetcher
}

// Kept minimal: SPA HTML comes from built assets (index.html).

async function serveSpaHtml(env: Env): Promise<Response> {
  const indexResponse = await env.ASSETS.fetch(new URL('https://localhost/index.html'))
  const html = await indexResponse.text()
  return new Response(html, {
    headers: { 'content-type': 'text/html' },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname

    // Home route - serve SPA HTML so built CSS loads
    if (pathname === '/') {
      return serveSpaHtml(env)
    }

    // CSR routes - serve index.html
    if (
      pathname === '/data' ||
      pathname.startsWith('/data') ||
      pathname === '/api-data' ||
      pathname.startsWith('/api-data')
    ) {
      try {
        return serveSpaHtml(env)
      } catch {
        return env.ASSETS.fetch(request)
      }
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