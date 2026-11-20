import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/.chrome-terrain/**'],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        'lxp-preview': 'lxp-preview.html',
      },
    },
  },
});
