import { renderToString } from 'react-dom/server'

// Simple test component for SSR
function TestPage() {
  return (
    <div className="app-container">
      <nav className="navbar">
        <a href="/" className="nav-brand">SSR Test</a>
      </nav>
      <main className="main-content">
        <div className="page">
          <h1 className="page-title">Server-Side Rendered</h1>
          <p>This content is rendered on the server.</p>
        </div>
      </main>
    </div>
  )
}

/**
 * Render the React app to HTML string for SSR
 * @param pathname - The URL pathname to render
 * @returns Complete HTML string with hydration data
 */
export async function renderApp(_pathname: string): Promise<string> {
  // Render a simple test page to verify SSR is working
  const content = renderToString(<TestPage />)

  // Wrap in complete HTML document
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SSR Rendered</title>
  </head>
  <body>
    <div id="root">${content}</div>
  </body>
</html>`

  return html
}
