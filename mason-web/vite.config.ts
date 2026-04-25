import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
// Electron loads `dist/index.html` via `file://`; absolute `/assets/...` URLs break there.
// Web builds keep `base: '/'` so deep links and static hosting behave normally.
const electronBuild = process.env.ELECTRON === '1'

export default defineConfig({
  base: electronBuild ? './' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
  build: {
    sourcemap: false,
    target: 'es2020',
    cssMinify: true,
  },
})
