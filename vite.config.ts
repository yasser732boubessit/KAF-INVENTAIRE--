
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // ضروري لتعمل ملفات CSS وJS عند فتح التطبيق عبر file://
  base: './',

  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },

  server: {
    port: 3000,
    strictPort: true,

    hmr: process.env.DISABLE_HMR !== 'true',
    watch:
      process.env.DISABLE_HMR === 'true'
        ? null
        : undefined,

    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,

        rewrite: (urlPath) => {
          if (urlPath.startsWith('/api/v1/')) {
            return urlPath;
          }

          return urlPath.replace(/^\/api/, '/api/v1');
        },
      },
    },
  },
}));
