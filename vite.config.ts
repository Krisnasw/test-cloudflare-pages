import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
