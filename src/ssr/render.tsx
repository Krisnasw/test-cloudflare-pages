import { renderToString } from 'react-dom/server'

// Get env variables - replaced at build time by Vite
// Using type assertion since import.meta.env types aren't available in SSR context
const getEnv = (key: string, fallback: string): string => {
  // @ts-ignore
  return (import.meta.env?.[key] as string) || fallback
}

const APP_TITLE = getEnv('VITE_APP_TITLE', 'My App')
const API_URL = getEnv('VITE_API_URL', 'https://jsonplaceholder.typicode.com')

// Simple component for home page
function HomePage() {
  return (
    <div className="page max-w-3xl mx-auto px-4 pb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{APP_TITLE}</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Configuration</h3>
        <p className="text-sm text-gray-600 mb-1">API URL:</p>
        <code className="block bg-gray-50 p-3 rounded-lg text-sm text-blue-600 overflow-x-auto border border-gray-200">{API_URL}</code>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Welcome</h3>
        <p className="text-gray-700">This is a React + Vite application with SSR on Cloudflare Workers.</p>
      </div>
    </div>
  )
}

// Simple component for data page (CSR)
function DataPage() {
  return (
    <div className="page max-w-3xl mx-auto px-4 pb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Data (CSR)</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">Loading data from API...</p>
      </div>
    </div>
  )
}

// Layout component
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="font-bold text-xl text-gray-900">{APP_TITLE}</a>
            <div className="flex gap-6">
              <a href="/" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Home</a>
              <a href="/data" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Data</a>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}

/**
 * Render the React app to HTML string for SSR
 * @param pathname - The URL pathname to render
 * @returns Complete HTML string with hydration data
 */
export function renderApp(pathname: string): string {
  // Determine which page to render based on pathname
  let pageContent: React.ReactNode

  if (pathname === '/') {
    pageContent = <HomePage />
  } else if (pathname === '/data') {
    pageContent = <DataPage />
  } else {
    // Default to home for unknown routes
    pageContent = <HomePage />
  }

  // Render the full layout with page content
  const content = renderToString(
    <Layout>{pageContent}</Layout>
  )

  // Get the CSS file from manifest
  const cssFile = 'assets/index-DdbgDYW5.css'
  const jsFile = 'assets/index-hxN1Vin8.js'

  // Wrap in complete HTML document with Tailwind CDN + built CSS
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${APP_TITLE}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" crossorigin href="/${cssFile}" />
  </head>
  <body>
    <div id="root">${content}</div>
    <script type="module" crossorigin src="/${jsFile}"></script>
  </body>
</html>`

  return html
}