import { renderToString } from 'react-dom/server'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { rootRoute, indexRoute, apiDataRoute } from '../routes'

// Create the route tree for SSR
const routeTree = rootRoute.addChildren([indexRoute, apiDataRoute])

/**
 * Render the React app to HTML string for SSR
 * @param pathname - The URL pathname to render
 * @returns Complete HTML string with hydration data
 */
export function renderApp(pathname: string): string {
  // Create a router for SSR - navigate to the pathname to build route state
  const router = createRouter({ routeTree })

  // Navigate to the pathname to build the route state
  // This triggers loaders and builds the matches
  router.navigate({ to: pathname })

  // Render to string
  const html = renderToString(<RouterProvider router={router} />)

  return html
}
