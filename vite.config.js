import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      // Giriş dosyası: Kendi yazdığımız modern TS kodu
      entry: resolve(__dirname, 'src/engine.ts'),
      // Küresel değişken adı (Serenity tarafında window.BizekaFlipEngine olarak görünecek)
      name: 'BizekaFlipEngine',
      fileName: () => 'bizeka-flip-engine.js',
      // ES5 Namespace projeleriyle en uyumlu format
      formats: ['iife']
    },
    // Çıktı klasörü: Serenity projesinin wwwroot dizini
    outDir: '../Bizeka.Web/wwwroot/Scripts',
    emptyOutDir: false,
    sourcemap: true // Hata ayıklama için faydalı
  }
});