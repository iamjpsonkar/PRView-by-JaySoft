import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON_BUILD ? './' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5121,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8121',
        changeOrigin: true,
      },
    },
  },
})
