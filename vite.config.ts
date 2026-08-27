import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const leafletShim = path.resolve(__dirname, 'src', 'leaflet-shim.ts');
const leafletCss = path.resolve(__dirname, 'node_modules', 'leaflet', 'dist', 'leaflet.css');

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: [
      { find: 'leaflet/dist/leaflet.css', replacement: leafletCss },
      { find: /^leaflet$/, replacement: leafletShim },
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: './index.html',
    },
  },
  server: {
    port: 8090,
    open: true,
  },
});
