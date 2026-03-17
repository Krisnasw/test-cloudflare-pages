import { createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router'
import { getRuntimeConfig } from './lib/runtimeConfig'

// Root route component
function RootComponent() {
  const { appTitle } = getRuntimeConfig()
  return (
    <div className="app-container">
      <nav className="navbar">
        <a href="/" className="nav-brand">{appTitle || 'Default Title'}</a>
        <div className="nav-links">
          <a href="/">Home</a>
          <a href="/api-data">API Data</a>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

// Define routes
const rootRoute = createRootRoute({
  component: RootComponent,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    console.log('Loading home route')
  },
  component: function Index() {
    const { appTitle, apiUrl } = getRuntimeConfig()

    return (
      <div className="page">
        <h1 className="page-title">{appTitle || 'Default Title'}</h1>
        <div className="card">
          <h3>Configuration</h3>
          <p className="card-label">API URL:</p>
          <code className="code-block">{apiUrl || 'No API URL'}</code>
        </div>
        <div className="card">
          <h3>Welcome</h3>
          <p>This is a React + Vite application with TanStack Router.</p>
        </div>
      </div>
    )
  },
})

interface PostData {
  userId: number
  id: number
  title: string
  body: string
}

const apiDataRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/api-data',
  beforeLoad: async () => {
    console.log('Loading API data route')
    // Simulate some check before loading
    await new Promise(resolve => setTimeout(resolve, 50))
  },
  loader: async (): Promise<PostData> => {
    const { apiUrl } = getRuntimeConfig()
    const response = await fetch(`${apiUrl || 'https://jsonplaceholder.typicode.com'}/posts/1`)
    if (!response.ok) {
      throw new Error('Failed to fetch data')
    }
    return response.json()
  },
  component: function ApiData() {
    const data = apiDataRoute.useLoaderData() as PostData

    return (
      <div className="page">
        <h1 className="page-title">API Data</h1>
        <article className="card api-card">
          <span className="badge">Post #1</span>
          <h2 className="post-title">{data.title}</h2>
          <p className="post-body">{data.body}</p>
          <div className="card-footer">
            <span className="user-id">User ID: {data.userId}</span>
          </div>
        </article>
      </div>
    )
  },
})

// Create router
const routeTree = rootRoute.addChildren([indexRoute, apiDataRoute])
const router = createRouter({ routeTree })

// Type augmentation for TanStack Router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export { router, rootRoute, indexRoute, apiDataRoute }
