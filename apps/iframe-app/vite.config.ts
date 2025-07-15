import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Plugin } from 'vite';
import { analyzer } from 'vite-bundle-analyzer';

// Custom plugin to rename index.html to iframe.html
function renameIndexHtml(): Plugin {
  return {
    name: 'rename-index-html',
    generateBundle(options, bundle) {
      // Rename index.html to iframe.html in the bundle
      const indexHtml = bundle['index.html'];
      if (indexHtml && indexHtml.type === 'asset') {
        bundle['iframe.html'] = indexHtml;
        delete bundle['index.html'];
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), renameIndexHtml(), analyzer()],
  base: './', // Use relative paths instead of absolute
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        assetFileNames: '[name]-[hash].[ext]',
        chunkFileNames: '[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
      },
    },
  },
  server: {
    port: 3001,
    host: true,
  },
});
