import { hydrateRoot, createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './routes'
import './App.css'

// Check if we're hydrating (server-rendered content exists)
const root = document.getElementById('root')
const hasContent = root?.hasChildNodes()

if (hasContent) {
  // SSR: hydrate the pre-rendered content
  hydrateRoot(root!, <RouterProvider router={router} />)
} else {
  // CSR: mount fresh
  createRoot(root!).render(<RouterProvider router={router} />)
}
