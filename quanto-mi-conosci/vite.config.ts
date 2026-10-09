import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In sviluppo Vite serve il client sulla 5173 e inoltra il traffico realtime
// al server Node sulla 3000. In produzione il server Node serve anche il client.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // espone il dev server in rete locale (per provare dal telefono)
    port: 5173,
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
  build: { outDir: 'dist' },
});
