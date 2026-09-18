import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for PetPaws frontend application
export default defineConfig({
  plugins: [react()],
  build: {
    cssMinify: false,
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to backend Express server running on port 5001
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
