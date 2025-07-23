import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Plugin } from 'vite';
import mkcert from 'vite-plugin-mkcert';

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
  plugins: [react(), renameIndexHtml(), mkcert()],
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
