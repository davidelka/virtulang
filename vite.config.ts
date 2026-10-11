import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // The AI tutor server (ai-server/, npm run dev there). Same origin for the app, so no CORS.
    proxy: { '/api': 'http://localhost:8787' },
  },
});
