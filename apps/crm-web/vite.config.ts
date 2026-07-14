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
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('[Vite Proxy Error]:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`[Vite Proxy Request]: ${req.method} ${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(`[Vite Proxy Response]: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
          });
        }
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Group heavy libraries into their own chunks to reduce main bundle size
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('google-maps')) return 'vendor-maps';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('jspdf') || id.includes('pdfmake') || id.includes('xlsx')) return 'vendor-pdf';
            if (id.includes('lucide')) return 'vendor-ui';
            // Leave React and other small libs in the main bundle for stability
          }
        }
      }
    }
  }
})
