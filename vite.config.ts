import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            build: {
              rollupOptions: {
                external: ['ws', 'bufferutil', 'utf-8-validate', 'server-destroy', 'better-sqlite3', 'pdf-parse', 'googleapis']
              }
            }
          }
        },
        preload: {
          input: path.join(__dirname, 'electron/preload.ts'),
        },
        renderer: {},
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
