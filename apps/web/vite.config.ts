import { defineConfig } from 'vite';

export default defineConfig({
  envDir: '../../',
  server: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        pantalla: 'pantalla.html',
      },
    },
  },
});
