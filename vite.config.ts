import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5051',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:5051',
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 800,
    // Enable source map for production debugging (optional)
    sourcemap: false,
    // Minification optimization
    minify: 'esbuild',
    target: 'es2020',
    // CSS optimization
    cssMinify: true,
    // rollupOptions: {
    //   output: { ... }
    // }
  }
})
