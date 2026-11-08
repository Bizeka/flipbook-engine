import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'path';
import { cspSafePageFlip } from './scripts/csp-safe-page-flip.js';

const { version } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

export default defineConfig({
  define: { __FLIPBOOK_VERSION__: JSON.stringify(version) },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@serenity-is/domwise'
  },
  plugins: [cspSafePageFlip()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FlipbookEngine',
      fileName: () => 'flipbook-engine.iife.js',
      formats: ['iife']
    },
    rollupOptions: {
      external: ['pdfjs-dist'],
      output: {
        banner: `/*! FlipbookEngine v${version} | AGPL-3.0-or-later | https://flipbookengine.com */`,
        globals: {
          'pdfjs-dist': 'pdfjsLib'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'flipbook-engine.css';
          return 'assets/[name][extname]';
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true
  }
});
