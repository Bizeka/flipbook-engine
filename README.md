# FlipbookEngine

FlipbookEngine is a modern, lightweight, and embeddable HTML flipbook viewer for PDF-backed catalogs, brochures, and digital publications. Written in TypeScript, it features single-page and spread modes, a thumbnail rail, smooth zoom/pan, full internationalization (i18n), and robust theme customization.

## Highlights

- **Dual-Mode Layout**: Seamlessly switches between single-page (mobile-optimized) and spread (book/catalog layout) modes.
- **Rich Interaction**: Built-in thumbnail navigation rail, smooth zoom & pan, and HTML5 fullscreen support.
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
| `soundEnabled` | `boolean` | `false` | Enables page turning sound effect. |
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

## 🆚 FlipbookEngine vs. The Industry

When choosing a flipbook library, here is how we compare to other solutions:

*   **Legacy Libraries (e.g., Turn.js):** Turn.js is over a decade old, relies on jQuery, and lacks native PDF support. **FlipbookEngine** uses a modern framework-agnostic stack (Vanilla/React/Vue), TypeScript, and has built-in PDF.js integration.
*   **Heavy 3D Plugins (e.g., DearFlip, Real3D):** Many 3D plugins use WebGL, which drains CPU/RAM and can be sluggish on mobile. **FlipbookEngine** is powered by StPageFlip, delivering buttery-smooth 60FPS CSS 2D/3D performance while remaining lightweight.
*   **Closed SaaS Platforms (e.g., Issuu, Heyzine):** These charge high monthly fees and lock your data on their servers. **FlipbookEngine** gives you 100% control to host and embed directly in your own code (AGPL-3.0).

---

## 📄 Licensing

FlipbookEngine is distributed under a dual-license model:

- **Open Source**: GNU Affero General Public License v3.0 or later (see [LICENSE](./LICENSE)).
- **Commercial**: For use in closed-source projects, proprietary SaaS platforms, or agency client deliveries (see [COMMERCIAL_LICENSE.md](./COMMERCIAL_LICENSE.md)).

For commercial licenses and inquiries, contact: **murat.dogan@hotmail.com.tr**
