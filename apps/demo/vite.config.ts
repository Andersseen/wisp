import path from 'node:path'
import { fileURLToPath } from 'node:url'
import analog from '@analogjs/platform'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const uiAlias = path.resolve(__dirname, '../../packages/ui/dist/fesm2022/wisp-ui.mjs')

export default defineConfig({
  resolve: {
    alias: {
      '@wisp/ui': uiAlias,
    },
  },
  plugins: [
    analog({
      ssr: false,
    }),
  ],
})
