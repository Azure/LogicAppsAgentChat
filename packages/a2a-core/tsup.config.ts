import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'chat/index': 'src/chat/index.ts',
    'react/index': 'src/react/index.ts',
    'react/styles': 'src/react/styles/index.css',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'es2020',
  platform: 'browser',
  splitting: true,
  treeshake: true,
  external: ['react', 'react-dom'],
  esbuildOptions(options) {
    // Handle CSS modules as simple objects for now
    options.loader = {
      ...options.loader,
      '.css': 'css',
    };
    options.plugins = [
      ...(options.plugins || []),
      {
        name: 'css-module-plugin',
        setup(build) {
          // Create a map to store CSS module class names

          build.onLoad({ filter: /\.module\.css$/ }, async (args) => {
            const css = readFileSync(args.path, 'utf8');

            // Simple CSS module class name extraction
            const classNames: Record<string, string> = {};
            const classRegex = /\.([a-zA-Z][a-zA-Z0-9_-]*)/g;
            let match;

            while ((match = classRegex.exec(css)) !== null) {
              const className = match[1];
              // For now, just use the class name as-is (no hashing)
              classNames[className] = className;
            }

            // Export the class names as a module
            const contents = `export default ${JSON.stringify(classNames)};`;
            return { contents, loader: 'js' };
          });
        },
      },
    ];
  },
  onSuccess: async () => {
    // Copy the main CSS file to dist
    const srcCss = resolve('./src/react/styles/index.css');
    const distCss = resolve('./dist/react/styles.css');
    const distDir = dirname(distCss);

    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    if (existsSync(srcCss)) {
      const cssContent = readFileSync(srcCss, 'utf8');
      writeFileSync(distCss, cssContent);
      console.log('✓ Copied styles.css to dist/react/');
    }
  },
});
