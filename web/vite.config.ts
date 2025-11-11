import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // FIX: Use path.resolve('src') to avoid type errors with `process.cwd` in some environments.
      '@': path.resolve('src'),
    },
  },
})
