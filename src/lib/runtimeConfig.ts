export type RuntimeConfig = {
  appTitle?: string
  apiUrl?: string
}

export function getRuntimeConfig(): RuntimeConfig {
  // SSR injects this to keep server+client aligned in Pages.
  const injected = typeof window !== 'undefined'
    ? (window as Window & { __APP_CONFIG__?: { APP_TITLE?: string; API_URL?: string } }).__APP_CONFIG__
    : undefined

  if (injected) {
    return {
      appTitle: injected.APP_TITLE,
      apiUrl: injected.API_URL,
    }
  }

  return {
    appTitle: import.meta.env.VITE_APP_TITLE,
    apiUrl: import.meta.env.VITE_API_URL,
  }
}

