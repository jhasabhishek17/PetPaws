import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite configuration for PetPaws frontend application
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:5001';

  return {
    plugins: [react(), tailwindcss()],
    build: {
      cssMinify: false,
    },
    server: {
      port: 5173,
      proxy: {
        // Proxy API requests to backend Express server running on port 5001
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
