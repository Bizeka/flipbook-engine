import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@serenity-is/domwise'
  },
  plugins: [dts({ insertTypesEntry: true, outDir: 'dist' })],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        core: resolve(__dirname, 'src/core-entry.ts'),
        plugins: resolve(__dirname, 'src/plugins/index.ts'),
        'plugins-notes': resolve(__dirname, 'src/plugins/notes.ts'),
        'plugins-bookmarks': resolve(__dirname, 'src/plugins/bookmarks.ts'),
        'plugins-toc': resolve(__dirname, 'src/plugins/toc.ts'),
        'plugins-search': resolve(__dirname, 'src/plugins/search.ts'),
        'plugins-annotations': resolve(__dirname, 'src/plugins/annotations.ts'),
        'plugins-hotspots': resolve(__dirname, 'src/plugins/hotspots.ts'),
        'plugins-share': resolve(__dirname, 'src/plugins/share.ts'),
        'plugins-deep-link': resolve(__dirname, 'src/plugins/deep-link.ts'),
        react: resolve(__dirname, 'src/react/index.tsx'),
        vue: resolve(__dirname, 'src/vue/index.ts')
      },
      name: 'FlipbookEngine',
      fileName: (format, entryName) => {
        return entryName === 'index' ? 'flipbook-engine.js' : `flipbook-engine.${entryName}.js`;
      },
      formats: ['es']
    },
    rollupOptions: {
      external: ['pdfjs-dist', 'react', 'vue', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          vue: 'Vue',
          'react-dom': 'ReactDOM'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'flipbook-engine.css';
          return 'assets/[name][extname]';
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  }
});
