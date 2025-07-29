import { defineConfig } from 'vite';

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.ts'
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      },
      external: ['leaflet']
    }
  },
  server: {
    port: 8000
  },
  optimizeDeps: {
    exclude: ['leaflet']
  }
}); 