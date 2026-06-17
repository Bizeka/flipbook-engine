import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ insertTypesEntry: true, outDir: 'dist' })],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
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
      external: ['react', 'vue', 'react-dom'],
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
