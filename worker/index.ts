interface Env {
  ASSETS: Fetcher
}

const APP_TITLE = 'Unicorn Test Deploy'
const API_URL = 'https://jsonplaceholder.typicode.com'

// Inline SSR HTML for the home page
const SSR_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${APP_TITLE}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root">
      <div class="min-h-screen bg-gray-50">
        <nav class="bg-white border-b border-gray-200 sticky top-0">
          <div class="max-w-3xl mx-auto px-4">
            <div class="flex justify-between items-center h-16">
              <span class="font-bold text-xl text-gray-900">${APP_TITLE}</span>
              <div class="flex gap-6">
                <a href="/" class="text-gray-600 hover:text-blue-600 font-medium transition-colors">Home</a>
                <a href="/api-data" class="text-gray-600 hover:text-blue-600 font-medium transition-colors">API Data</a>
              </div>
            </div>
          </div>
        </nav>
        <main>
          <div class="max-w-3xl mx-auto px-4 pb-8 pt-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-6">${APP_TITLE}</h1>
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Configuration</h3>
              <p class="text-sm text-gray-600 mb-1">API URL:</p>
              <code class="block bg-gray-50 p-3 rounded-lg text-sm text-blue-600 overflow-x-auto border border-gray-200">${API_URL}</code>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Welcome</h3>
              <p class="text-gray-700">This is a React + Vite application with SSR on Cloudflare Workers.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
    <script type="module" crossorigin src="/assets/index-2MEQplgz.js"></script>
  </body>
</html>`

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname

    // SSR route - return pre-rendered HTML
    if (pathname === '/') {
      return new Response(SSR_HTML, {
        headers: { 'content-type': 'text/html' }
      })
    }

    // CSR routes - serve index.html with Tailwind CDN
    if (
      pathname === '/data' ||
      pathname.startsWith('/data') ||
      pathname === '/api-data' ||
      pathname.startsWith('/api-data')
    ) {
      try {
        const indexResponse = await env.ASSETS.fetch(new URL('https://localhost/index.html'))
        const html = await indexResponse.text()
        // Inject Tailwind CDN for styling
        const enhancedHtml = html.replace(
          '<head>',
          '<head>\n    <script src="https://cdn.tailwindcss.com"></script>'
        )
        return new Response(enhancedHtml, {
          headers: { 'content-type': 'text/html' }
        })
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