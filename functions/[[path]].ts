export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)
  const pathname = url.pathname

  const APP_TITLE = 'Unicorn Test Deploy'
  const API_URL = 'https://jsonplaceholder.typicode.com'

  // SSR route - return pre-rendered HTML
  if (pathname === '/') {
    const html = `<!doctype html>
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
                <a href="/data" class="text-gray-600 hover:text-blue-600 font-medium transition-colors">Data</a>
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
  </body>
</html>`

    return new Response(html, {
      headers: { 'content-type': 'text/html' }
    })
  }

  // API routes - proxy to external
  if (pathname.startsWith('/api/')) {
    const target = pathname.replace('/api', '')
    const response = await fetch(`${API_URL}${target}`)
    return new Response(response.body, {
      headers: { 'content-type': 'application/json' }
    })
  }

  // Let Cloudflare Pages handle static assets and client-side routing
  return context.next()
}
