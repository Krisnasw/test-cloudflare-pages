import type { SsrAssets } from './viteManifest'

export type SsrRuntimeConfig = {
  appTitle: string
  apiUrl: string
}

export function renderDocumentHtml(opts: {
  pathname: string
  assets: SsrAssets
  config: SsrRuntimeConfig
}): string {
  const { assets, config } = opts

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
    <div id="root"></div>
    <script>window.__APP_CONFIG__=${runtimeConfigJson}</script>
    <script type="module" crossorigin src="${assets.entryJs}"></script>
  </body>
</html>`
}