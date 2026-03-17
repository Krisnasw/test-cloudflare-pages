import type { ViteManifest } from '../src/ssr/viteManifest'
import { getSsrAssetsFromManifest } from '../src/ssr/viteManifest'
import { renderDocumentHtml } from '../src/ssr/render'
import manifestJson from './_generated/vite-manifest.json'

export interface Env {
  APP_TITLE?: string
  API_URL?: string
}

const manifest = manifestJson as unknown as ViteManifest

function isAssetPath(pathname: string): boolean {
  if (pathname.startsWith('/assets/')) return true
  return pathname.includes('.') // crude but effective for typical static files
}

export async function onRequest(context: {
  request: Request
  env: Env
  next: () => Promise<Response>
}): Promise<Response> {
  const url = new URL(context.request.url)
  const pathname = url.pathname

  if (isAssetPath(pathname)) {
    return context.next()
  }

  // API requests are handled by `functions/api/*` and should never reach here,
  // but keep a safe fallback to avoid HTML responses for API paths.
  if (pathname.startsWith('/api/')) {
    return new Response('Not found', { status: 404 })
  }

  const assets = getSsrAssetsFromManifest(manifest, 'index.html')
  const html = renderDocumentHtml({
    pathname,
    assets,
    config: {
      appTitle: context.env.APP_TITLE || 'React Vite CF',
      apiUrl: context.env.API_URL || 'https://jsonplaceholder.typicode.com',
    },
  })

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
    },
  })
}
