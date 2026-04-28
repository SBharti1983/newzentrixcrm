import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:5050',
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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // React core (react + react-dom + scheduler)
            if ((id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) && !id.includes('react-router')) {
              return 'vendor-react';
            }
            // React Router (separate from core to reduce initial load)
            if (id.includes('react-router') || id.includes('@remix-run')) {
              return 'vendor-router';
            }
            // Data Visualization
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts';
            }
            // Mapping & Geolocation (Heavy)
            if (id.includes('google-maps')) {
              return 'vendor-maps';
            }
            // Telephony Hub (SIP logic)
            if (id.includes('jssip')) {
              return 'vendor-telephony';
            }
            // Cloud Infrastructure (Extremely Heavy)
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            // Document Generation
            if (id.includes('jspdf') || id.includes('pdfmake') || id.includes('xlsx')) {
              return 'vendor-pdf';
            }
            // UI Icons & Assets
            if (id.includes('lucide')) {
              return 'vendor-ui';
            }
            // Socket.IO (real-time)
            if (id.includes('socket.io')) {
              return 'vendor-socket';
            }
            // HTTP & networking
            if (id.includes('axios')) {
              return 'vendor-http';
            }
            // Scanning & Date Utilities
            if (id.includes('qr-scanner') || id.includes('date-fns')) {
              return 'vendor-utils';
            }
            // Everything else goes into core
            return 'vendor-core';
          }
        }
      }
    }
  }
})
