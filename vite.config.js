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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // React core (react + react-dom + scheduler, no router to avoid circular deps)
            if ((id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) && !id.includes('react-router')) {
              return 'vendor-react';
            }
            // Data Visualization
            if (id.includes('recharts')) {
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
            if (id.includes('jspdf')) {
              return 'vendor-pdf';
            }
            // UI Icons & Assets
            if (id.includes('lucide')) {
              return 'vendor-ui';
            }
            // Scanning & Date Utilities
            if (id.includes('qr-scanner') || id.includes('date-fns')) {
              return 'vendor-utils';
            }
            // Everything else (axios, socket.io, router, etc.) goes into core
            return 'vendor-core';
          }
        }
      }
    }
  }
})
