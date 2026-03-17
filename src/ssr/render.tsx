import React from 'react'
import { renderToString } from 'react-dom/server'
import type { SsrAssets } from './viteManifest'

export type SsrRuntimeConfig = {
  appTitle: string
  apiUrl: string
}

// Simple component for home page
function HomePage({ appTitle, apiUrl }: SsrRuntimeConfig) {
  return (
    <div className="page max-w-3xl mx-auto px-4 pb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{appTitle}</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Configuration</h3>
        <p className="text-sm text-gray-600 mb-1">API URL:</p>
        <code className="block bg-gray-50 p-3 rounded-lg text-sm text-blue-600 overflow-x-auto border border-gray-200">{apiUrl}</code>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Welcome</h3>
        <p className="text-gray-700">This is a React + Vite application with SSR on Cloudflare Pages.</p>
      </div>
    </div>
  )
}

// Layout component
function Layout({ children, appTitle }: { children: React.ReactNode; appTitle: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="font-bold text-xl text-gray-900">{appTitle}</a>
            <div className="flex gap-6">
              <a href="/" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Home</a>
              <a href="/api-data" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">API Data</a>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}

export function renderDocumentHtml(opts: {
  pathname: string
  assets: SsrAssets
  config: SsrRuntimeConfig
}): string {
  const { pathname, assets, config } = opts

  const shouldSsr = pathname === '/'

  const ssrContent = shouldSsr
    ? renderToString(
        <Layout appTitle={config.appTitle}>
          <HomePage appTitle={config.appTitle} apiUrl={config.apiUrl} />
        </Layout>,
      )
    : ''

  const cssLinks = assets.css
    .map((href) => `<link rel="stylesheet" crossorigin href="${href}">`)
    .join('')

  const runtimeConfigJson = JSON.stringify({
    APP_TITLE: config.appTitle,
    API_URL: config.apiUrl,
  })

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.appTitle}</title>
    ${cssLinks}
  </head>
  <body>
    <div id="root">${ssrContent}</div>
    <script>window.__APP_CONFIG__=${runtimeConfigJson}</script>
    <script type="module" crossorigin src="${assets.entryJs}"></script>
  </body>
</html>`
}