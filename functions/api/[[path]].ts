export interface Env {
  API_URL?: string
}

export async function onRequest(context: {
  request: Request
  params: { path?: string[] }
  env: Env
}): Promise<Response> {
  const apiBase = context.env.API_URL || 'https://jsonplaceholder.typicode.com'
  const pathParts = context.params.path ?? []

  const targetUrl = new URL(apiBase)
  targetUrl.pathname = `/${pathParts.join('/')}`

  const incomingUrl = new URL(context.request.url)
  targetUrl.search = incomingUrl.search

  const upstream = await fetch(targetUrl.toString(), {
    method: context.request.method,
    headers: context.request.headers,
    body: ['GET', 'HEAD'].includes(context.request.method) ? undefined : await context.request.arrayBuffer(),
  })

  const headers = new Headers(upstream.headers)
  headers.set('content-type', headers.get('content-type') || 'application/json')

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}

