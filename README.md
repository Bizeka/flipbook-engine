# FlipbookEngine

[![NPM Version](https://img.shields.io/npm/v/flipbookengine?style=flat-square&color=blue)](https://www.npmjs.com/package/flipbookengine)
[![License](https://img.shields.io/npm/l/flipbookengine?style=flat-square)](https://github.com/Bizeka/flipbook-engine/blob/main/LICENSE)
[![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/flipbookengine?style=flat-square)](https://www.npmjs.com/package/flipbookengine)
[![NPM Downloads](https://img.shields.io/npm/dt/flipbookengine?style=flat-square)](https://www.npmjs.com/package/flipbookengine)

**[Live Demo & Playground ↗](https://flipbookengine.com)**

FlipbookEngine is a modern, lightweight, and embeddable HTML flipbook viewer for PDF-backed catalogs, brochures, and digital publications. Written in TypeScript, it features single-page and spread modes, a thumbnail rail, smooth zoom/pan, full internationalization (i18n), and robust theme customization.

## Highlights

- **Dual-Mode Layout**: Seamlessly switches between single-page (mobile-optimized) and spread (book/catalog layout) modes.
- **Rich Interaction**: Built-in thumbnail navigation rail, smooth zoom & pan, and HTML5 fullscreen support.
- **Media & Autoplay**: Configurable page-flip sound effects and automated slideshow presentation with `Autoplay`.
- **Theme Engine**: Styled with compiled CSS and CSS Custom Properties, featuring full support for light/dark modes (auto-responsive to Bootstrap 5 or tailorable per instance).
- **Multi-Language (i18n)**: Out-of-the-box support for English (`en`) and Turkish (`tr`) with customizable overrides.
- **Framework Wrappers**: Direct React and Vue wrapper exports for seamless modern integration.
- **Progressive PDF Rendering**: PDF pages render on demand with bounded concurrency and an instance-local LRU cache, keeping large documents responsive.

## Installation

Install via npm:

```bash
npm install flipbookengine
```

`pdfjs-dist` is a production dependency of FlipbookEngine. It is installed by npm, but is deliberately excluded from the FlipbookEngine bundle so applications can deduplicate, cache, and upgrade PDF.js independently.

## Quick Start

### npm and Bundlers

Configure the PDF.js worker in the consuming application. The `?url` suffix is supported by Vite and other modern bundlers that emit imported assets.

```ts
import { FlipbookEngine } from 'flipbookengine';
import 'flipbookengine/styles.css';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

const engine = new FlipbookEngine('#viewer', {
  allowDownload: true,
  showThumbs: true,
  primaryColor: '#7367f0',
  theme: 'auto',
  locale: 'en',
  pdfWorkerSrc,
  pdfRenderCacheSize: 32
});

await engine.init('/files/catalog.pdf');
```

Passing `pages` remains optional. When omitted, FlipbookEngine creates the page structure from `pdfUrl`, renders the first page before `init` resolves, and prefetches the next page. Additional pages render as they become visible or are selected.

`pdfRenderCacheSize` controls the per-instance LRU cache (default `32`, set to `0` to disable it).

### Browser CDN

Use the ESM build with an import map for PDF.js. The worker must be served from a URL your site permits in its Content Security Policy.

```html
<link rel="stylesheet" href="https://unpkg.com/flipbookengine@0.5.0/dist/flipbook-engine.css" />
<div id="viewer" style="width: 100%; height: 600px;"></div>

<script type="importmap">
{
  "imports": {
    "pdfjs-dist": "https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.min.mjs"
  }
}
</script>
<script type="module">
  import { FlipbookEngine } from 'https://unpkg.com/flipbookengine@0.5.0/dist/flipbook-engine.js';

  const engine = new FlipbookEngine('#viewer', {
    pdfWorkerSrc: 'https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs'
  });

  await engine.init('/files/catalog.pdf');
</script>
```

### React

```tsx
import React, { useRef } from 'react';
import { Flipbook, FlipbookRef } from 'flipbookengine/react';
import 'flipbookengine/styles.css';

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
import 'flipbookengine/styles.css';

const pages = [
  { kind: 'cover', pageNumber: 1, normal: '/img/1.jpg', low: '/img/1-low.jpg', thumb: '/img/1-thumb.jpg' },
  { kind: 'spread', pageNumbers: [2, 3], normal: '/img/2-3.jpg', low: '/img/2-3-low.jpg', thumb: '/img/2-3-thumb.jpg' }
];
</script>
```

## Migration Notes

Upgrading from 0.3.x to 0.4.0 keeps the public engine methods intact. The release isolates state per engine instance, makes wrapper updates lifecycle-safe, and scopes viewer markup to its container. If host CSS or automation selected the former fixed viewer IDs, migrate those selectors to the instance classes documented in the theming guide. PDF-backed consumers should configure `pdfWorkerSrc`; image-only viewers do not expose a download control.

For 0.5.0 behavior, see the [0.5.0 migration guide](./docs/migration-0.5.0.md). PDF-backed viewers now render on demand; callers should use `progress` and `error` events for rendering telemetry.


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

You can subscribe to events using `.on()`. PDF-backed initialization reports loading/rendering progress and emits a structured `error` event when loading or rendering fails:

```ts
const unsubscribe = engine.on('pageChange', ({ currentPage, totalPages, isSingle }) => {
  console.log('Page Changed:', currentPage, 'Total:', totalPages);
});

// To unsubscribe:
unsubscribe();
```

Supported events: `init`, `progress`, `pageChange`, `zoomChange`, `singlePageModeChange`, `thumbsToggle`, `orientationChange`, `error`, `destroy`.

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `showArrows` | `boolean` | `true` | Shows the previous/next navigation arrows. |
| `soundEnabled` | `boolean` | `true` | Enables page turning sound effect. |
| `soundUrl` | `string` | `'https://.../page-flip.mp3'` | URL of the audio file. |
| `autoPlayInterval`| `number` | `3000` | Autoplay page duration in milliseconds. |
| `flippingTime` | `number` | `1000` | Duration of the page turn animation in milliseconds; automatically disabled when reduced motion is preferred. |
| `maxShadowOpacity` | `number` | `0.5` | Maximum opacity of the shadow during page turn (0 to 1). |
| `whiteLabel` | `boolean` | `false` | Hides the "Powered by FlipbookEngine" watermark. |
| `pdfWorkerSrc` | `string` | - | URL of the PDF.js worker emitted or hosted by the consuming application. |
| `pdfRenderConcurrency` | `number` | `3` | Maximum number of PDF pages rendered concurrently when on-demand pages are requested. |
| `pdfRenderCacheSize` | `number` | `32` | Maximum number of rendered PDF page images retained per engine instance (LRU); `0` disables caching. |

## Styling and Theming

FlipbookEngine features fully custom-property-based styling compatible with modern styling systems.

### Global CSS Variables

```css
:root {
  --mainbgcolor: #f3f6fb;
  --panelbgcolor: #172033;
  --flipbook-accent: #7367f0;
  --thumbrailbgcolor: #0f172a;
}
```

## Performance & Bundle Metrics

FlipbookEngine is designed for responsive rendering with hardware-accelerated CSS 3D transforms and a lightweight DOM update path.

### Package Size and PDF.js

FlipbookEngine does not bundle PDF.js or its worker. `pdfjs-dist` remains a normal npm dependency, while the host application supplies `pdfWorkerSrc`. This keeps the FlipbookEngine package smaller and lets the application control PDF.js versioning, caching, CSP, and worker hosting.

*   **Core engine:** excludes PDF.js and the PDF worker.
*   **Styles:** distributed as `flipbookengine/styles.css`.
*   **PDF rendering:** enabled by configuring `pdfWorkerSrc` as shown above.

### Performance Highlights
*   **Hardware Accelerated:** Uses CSS-based 3D transformations (`transform: rotateY`, `translateZ`) without a WebGL runtime.
*   **Progressive Image Quality:** Loads low-quality page assets first and upgrades visible pages to their normal-quality source through `IntersectionObserver`.
*   **On-demand PDF Rendering:** Large PDFs create lightweight placeholders first; the current page and next page render before or during navigation.
*   **Bounded PDF Rendering:** PDF pages are rendered with configurable concurrency (`pdfRenderConcurrency`, default `3`) and can be cancelled when an initialization is superseded or destroyed.
*   **PDF Render Cache:** A bounded per-instance LRU cache (`pdfRenderCacheSize`, default `32`) avoids repeated canvas work while preventing unbounded memory growth.

## FlipbookEngine vs. The Industry

When choosing a flipbook library, here is how we compare to other solutions:

*   **Legacy Libraries (e.g., Turn.js):** Turn.js is over a decade old, relies on jQuery, and lacks native PDF support. **FlipbookEngine** uses a modern framework-agnostic stack (Vanilla/React/Vue), TypeScript, and has built-in PDF.js integration.
*   **Heavy 3D Plugins (e.g., DearFlip, Real3D):** Many 3D plugins use WebGL, which can increase runtime overhead on mobile. **FlipbookEngine** uses StPageFlip with CSS 2D/3D transforms and no WebGL runtime.
*   **Closed SaaS Platforms (e.g., Issuu, Heyzine):** These charge high monthly fees and lock your data on their servers. **FlipbookEngine** gives you 100% control to host and embed directly in your own code (AGPL-3.0).

---

## Acknowledgments

A special thanks to the incredible team behind **[Serenity](https://github.com/serenity-is/serenity)**. FlipbookEngine's reactive UI layer is powered by **[domwise](https://github.com/serenity-is/serenity/tree/master/packages/domwise)**. Coupled with `@preact/signals-core`, this keeps the UI update path small without requiring a traditional Virtual DOM runtime.

---
## Roadmap

FlipbookEngine has two complementary targets: an AGPL open-source viewer package and a separate closed-source commercial backend edition.

### Open-source v1.0.0 (AGPL viewer)

The npm package remains an embeddable, framework-agnostic PDF viewer. The open-source v1.0.0 target focuses on client-side reader capabilities:

- **Table of Contents (Index):** Interactive navigation to chapters or product categories.
- **Page Notes & Annotations:** Reader notes and bookmarks stored by the host application.
- **Full-Text PDF Search:** Client-side text extraction and highlighting without blocking the viewer.
- **Interactive Hotspots & Pop-ups:** Custom overlays for media, galleries, and commerce links.
- **Deep Linking & Social Share:** URLs that address specific pages or spreads.

The open-source viewer continues to use PDF.js as an external npm dependency and does not require a backend renderer.

### Commercial edition (closed-source backend)

The commercial roadmap is separate from the AGPL package and is intended for a separate backend project. It will provide licensed server-side capabilities, including:

- **Backend PDF rendering:** Secure, server-side rendering and caching for protected documents and high-volume workloads.
- **Protected partial downloads:** Server-generated page selections and authorization-aware download policies.
- **AI-assisted document features:** Backend indexing, catalog search, and Chat with Docs integrations.
- **Enterprise identity and provenance:** OIDC, auditability, tenant controls, and deployment integration.

These backend renderer and enterprise features will not be included in the public `flipbookengine` npm package; they will be delivered under the commercial license.

---

## Licensing

FlipbookEngine is distributed under a dual-license model:

- **Open Source**: GNU Affero General Public License v3.0 or later (see [LICENSE](./LICENSE)).
- **Commercial**: For use in closed-source projects, proprietary SaaS platforms, or agency client deliveries (see [COMMERCIAL_LICENSE.md](./COMMERCIAL_LICENSE.md)).

For commercial licenses and inquiries, contact: **murat.dogan@hotmail.com.tr**



