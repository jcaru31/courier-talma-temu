import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      // Fotos y PDF de actas de mal estado (carpeta backend/data/actas).
      '/actas': 'http://localhost:4000',
    },
  },
});
