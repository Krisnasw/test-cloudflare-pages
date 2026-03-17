/// <reference types="vite/client" />

declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}

declare global {
  interface Window {
    __APP_CONFIG__?: {
      APP_TITLE?: string
      API_URL?: string
    }
  }
}
