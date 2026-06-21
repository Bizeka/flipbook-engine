# FlipbookEngine

[![NPM Version](https://img.shields.io/npm/v/flipbookengine?style=flat-square&color=blue)](https://www.npmjs.com/package/flipbookengine)
[![License](https://img.shields.io/npm/l/flipbookengine?style=flat-square)](https://github.com/Bizeka/flipbook-engine/blob/main/LICENSE)
[![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/flipbookengine?style=flat-square)](https://www.npmjs.com/package/flipbookengine)
[![NPM Downloads](https://img.shields.io/npm/dt/flipbookengine?style=flat-square)](https://www.npmjs.com/package/flipbookengine)

**[🔥 Live Demo & Playground](https://flipbookengine.com)**

FlipbookEngine is a modern, lightweight, and embeddable HTML flipbook viewer for PDF-backed catalogs, brochures, and digital publications. Written in TypeScript, it features single-page and spread modes, a thumbnail rail, smooth zoom/pan, full internationalization (i18n), and robust theme customization.

## Highlights

- **Dual-Mode Layout**: Seamlessly switches between single-page (mobile-optimized) and spread (book/catalog layout) modes.
- **Rich Interaction**: Built-in thumbnail navigation rail, smooth zoom & pan, and HTML5 fullscreen support.
- **Media & Autoplay**: Configurable page-flip sound effects and automated slideshow presentation with `Autoplay`.
- **Theme Engine**: Styled with compiled CSS and CSS Custom Properties, featuring full support for light/dark modes (auto-responsive to Bootstrap 5 or tailorable per instance).
- **Multi-Language (i18n)**: Out-of-the-box support for English (`en`) and Turkish (`tr`) with customizable overrides.
- **Framework Wrappers**: Direct React and Vue wrapper exports for seamless modern integration.

## Installation

Install via npm:

```bash
npm install flipbookengine
```

For direct CDN usage in the browser (Vanilla HTML/JS):

```html
<link rel="stylesheet" href="https://unpkg.com/flipbookengine/dist/flipbook-engine.css" />
<script src="https://unpkg.com/flipbookengine/dist/flipbook-engine.iife.js"></script>
```

## Quick Start

### Vanilla HTML / JS

Include the styles and script, then initialize the engine:

```html
<div id="viewer" style="width: 100%; height: 600px;"></div>

<script>
  const engine = new FlipbookEngine('#viewer', {
    allowDownload: true,
    showThumbs: true,
    primaryColor: '#7367f0',
    theme: 'auto',
    locale: 'en'
  });

  engine.init('/files/catalog.pdf', [
    { kind: 'cover', pageNumber: 1, normal: '/img/1.jpg', low: '/img/1-low.jpg', thumb: '/img/1-thumb.jpg' },
    { kind: 'spread', pageNumbers: [2, 3], normal: '/img/2-3.jpg', low: '/img/2-3-low.jpg', thumb: '/img/2-3-thumb.jpg' }
  ]);
</script>
```

### React

```tsx
import React, { useRef } from 'react';
import { Flipbook, FlipbookRef } from 'flipbookengine/react';
import 'flipbookengine/dist/flipbook-engine.css';

function CatalogViewer() {
  const flipbookRef = useRef<FlipbookRef>(null);

  const handleNextPage = () => {
    flipbookRef.current?.goToPage(flipbookRef.current.getCurrentPage() + 1);
  };

  return (
    <Flipbook
      ref={flipbookRef}
      pdfUrl="/files/catalog.pdf"
      pages={[
        { kind: 'cover', pageNumber: 1, normal: '/img/1.jpg', low: '/img/1-low.jpg', thumb: '/img/1-thumb.jpg' },
        { kind: 'spread', pageNumbers: [2, 3], normal: '/img/2-3.jpg', low: '/img/2-3-low.jpg', thumb: '/img/2-3-thumb.jpg' }
      ]}
      allowDownload={true}
      showThumbs={true}
      primaryColor="#7367f0"
    />
  );
}
```

### Vue 3

```vue
<template>
  <Flipbook
    pdfUrl="/files/catalog.pdf"
    :pages="pages"
    :allowDownload="true"
    :showThumbs="true"
    primaryColor="#7367f0"
  />
</template>

<script setup>
import { Flipbook } from 'flipbookengine/vue';
import 'flipbookengine/dist/flipbook-engine.css';

const pages = [
  { kind: 'cover', pageNumber: 1, normal: '/img/1.jpg', low: '/img/1-low.jpg', thumb: '/img/1-thumb.jpg' },
  { kind: 'spread', pageNumbers: [2, 3], normal: '/img/2-3.jpg', low: '/img/2-3-low.jpg', thumb: '/img/2-3-thumb.jpg' }
];
</script>
```

## Public API Reference

The `FlipbookEngine` class exposes the following public methods:

- **`init(pdfUrl: string, imageList?: FlipbookPageAsset[])`**: Initializes the viewer and loads the flipbook with pages.
- **`goToPage(pageIndex: number)`**: Navigates programmatically to a 0-based page index.
- **`getCurrentPage()`**: Returns the 0-based index of the currently active page.
- **`getTotalPages()`**: Returns the total number of pages.
- **`getZoom()`**: Returns the current zoom level (default is `1`).
- **`setZoom(zoomLevel: number)`**: Programmatically sets the zoom level (accepts values between `0.5` and `5`).
- **`setSingleMode(isSingle: boolean)`**: Programmatically toggles between single-page mode (`true`) and double-page spread mode (`false`).
- **`toggleFullscreen()`**: Programmatically toggles fullscreen mode.
- **`updateOptions(options: Partial<FlipbookEngineOptions>)`**: Updates instance options at runtime.
- **`setLocale(locale: string, messages?: PartialFlipbookMessages)`**: Updates the locale programmatically.
- **`destroy(clearMarkup = true)`**: Tears down the instance and clean up DOM listeners.

### Subscribing to Events

You can subscribe to events using `.on()`:

```ts
const unsubscribe = engine.on('pageChange', ({ currentPage, totalPages, isSingle }) => {
  console.log('Page Changed:', currentPage, 'Total:', totalPages);
});

// To unsubscribe:
unsubscribe();
```

Supported events: `pageChange`, `zoomChange`, `singlePageModeChange`, `thumbsToggle`, `destroy`.

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `soundEnabled` | `boolean` | `true` | Enables page turning sound effect. |
| `soundUrl` | `string` | `'https://.../page-flip.mp3'` | URL of the audio file. |
| `autoPlayInterval`| `number` | `3000` | Autoplay page duration in milliseconds. |
| `flippingTime` | `number` | `1000` | Duration of the page turn animation in milliseconds. |
| `maxShadowOpacity` | `number` | `0.5` | Maximum opacity of the shadow during page turn (0 to 1). |
| `whiteLabel` | `boolean` | `false` | Hides the "Powered by FlipbookEngine" watermark. |

## Styling and Theming

FlipbookEngine features fully custom-property-based styling compatible with modern styling systems.

### Global CSS Variables

```css
:root {
  --mainbgcolor: #f3f6fb;
  --panelbgcolor: #172033;
  --accentcolor: #7367f0;
  --thumbrailbgcolor: #0f172a;
}
```

## 🚀 Performance & Bundle Metrics

FlipbookEngine is engineered for high performance, utilizing hardware-accelerated CSS 3D transforms instead of heavy WebGL, ensuring a smooth **60 FPS** experience even on low-end mobile devices.

### 📦 Bundle Size (Zero-Config PDF Engine)
Unlike other libraries that require complex external PDF.js worker configurations, FlipbookEngine ships as an **"All-in-One"** package. It includes the Core Engine, UI layout, StPageFlip, and the full PDF.js rendering engine out of the box.

*   **Core + PDF Engine (Gzipped):** `~788 KB` *(A single drop-in script, no external workers needed)*
*   **Styles (CSS Gzipped):** `~2.9 KB`
*   **React / Vue Wrappers (Gzipped):** `< 1 KB`

### ⚡ Performance Highlights
*   **Hardware Accelerated:** Uses purely CSS-based 3D transformations (`transform: rotateY`, `translateZ`) which offloads rendering to the GPU. No heavy WebGL overhead.
*   **Smart Memory Management (Lazy Loading):** Automatically unloads hidden pages from the DOM and destroys unused PDF blobs to prevent memory leaks on large catalogs.
*   **Zero-CLS Layouts:** Prevents Cumulative Layout Shift (CLS) by utilizing highly optimized `AbortController` bound resize event listeners and native CSS `aspect-ratio` calculations.
*   **Eco-Friendly Standby:** Stops running layout calculations when the catalog is not actively being dragged or flipped.

## 🥊 FlipbookEngine vs. The Industry

When choosing a flipbook library, here is how we compare to other solutions:

*   **Legacy Libraries (e.g., Turn.js):** Turn.js is over a decade old, relies on jQuery, and lacks native PDF support. **FlipbookEngine** uses a modern framework-agnostic stack (Vanilla/React/Vue), TypeScript, and has built-in PDF.js integration.
*   **Heavy 3D Plugins (e.g., DearFlip, Real3D):** Many 3D plugins use WebGL, which drains CPU/RAM and can be sluggish on mobile. **FlipbookEngine** is powered by StPageFlip, delivering buttery-smooth 60FPS CSS 2D/3D performance while remaining lightweight.
*   **Closed SaaS Platforms (e.g., Issuu, Heyzine):** These charge high monthly fees and lock your data on their servers. **FlipbookEngine** gives you 100% control to host and embed directly in your own code (AGPL-3.0).

---

## 🙏 Acknowledgments

A special thanks to the incredible team behind **[Serenity](https://github.com/serenity-is/serenity)**. FlipbookEngine's reactive UI layer is proudly powered by **[domwise](https://github.com/serenity-is/serenity/tree/master/packages/domwise)** (a brilliant DOM manipulation library developed by the Serenity team). Coupled with `@preact/signals-core`, `domwise` allows us to completely bypass the heavy overhead of traditional Virtual DOM diffing. This architectural choice is a massive contributor to FlipbookEngine's lightning-fast UI updates, ensuring buttery-smooth 60 FPS performance even on low-end mobile devices.

---

## 🗺️ Roadmap (Upcoming in v1.0.0)

We are constantly working to make FlipbookEngine the definitive choice for enterprise digital catalogs. The upcoming **v1.0.0 Major Release** will introduce several advanced features designed for commercial scale:

- 📑 **Table of Contents (Index):** A dedicated, interactive side-menu allowing readers to instantly jump to specific chapters or product categories.
- 📝 **Page Notes & Annotations:** Allow readers to drop personal notes or bookmarks directly onto pages.
- 🔍 **Full-Text PDF Search:** Client-side search capabilities via extracted JSON indices, enabling instant text highlighting across hundreds of pages without locking the UI.
- 🎯 **Interactive Hotspots & Pop-ups:** Draw custom coordinates over the canvas to embed YouTube videos, image galleries, or direct "Buy Now" e-commerce links right on top of the catalog pages.

---

## 📄 Licensing

FlipbookEngine is distributed under a dual-license model:

- **Open Source**: GNU Affero General Public License v3.0 or later (see [LICENSE](./LICENSE)).
- **Commercial**: For use in closed-source projects, proprietary SaaS platforms, or agency client deliveries (see [COMMERCIAL_LICENSE.md](./COMMERCIAL_LICENSE.md)).

For commercial licenses and inquiries, contact: **murat.dogan@hotmail.com.tr**
