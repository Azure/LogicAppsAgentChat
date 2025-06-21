import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isLibMode = mode === 'lib';
  const isIframeMode = mode === 'iframe';
  const isDemoMode = mode === 'demo';

  if (isLibMode) {
    return {
      plugins: [react()],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/lib/index.tsx'),
          name: 'ChatWidget',
          formats: ['es', 'cjs'],
          fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              'react/jsx-runtime': 'ReactJSXRuntime'
            }
          }
        },
        outDir: 'dist/lib',
        sourcemap: true,
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        }
      }
    };
  }

  if (isIframeMode) {
    return {
      plugins: [react()],
      build: {
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'iframe.html')
          }
        },
        outDir: 'dist/iframe',
        sourcemap: false,
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        }
      }
    };
  }

  if (isDemoMode) {
    return {
      plugins: [react()],
      build: {
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'demo/index.html'),
            iframe: resolve(__dirname, 'demo/iframe.html'),
            landing: resolve(__dirname, 'demo/index-landing.html')
          }
        },
        outDir: 'dist/demo',
        sourcemap: false,
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        }
      }
    };
  }

  // Development mode
  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: '/demo/'
    }
  };
});