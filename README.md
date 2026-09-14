# FlipbookEngine

> **Release notice:** `flipbookengine@0.6.5` is the latest published release and includes the localized Table of Contents API.
> **Development notice:** Version 0.6.5 adds automatic PDF A3 splitting, per-theme backgrounds, responsive viewer gutters, enlarged thumbnails, and mobile touch fixes.

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
- **Localized Sharing**: The toolbar includes a Share control that opens the native share sheet or copies the current page URL; enable `deepLink: true` for shareable page navigation.
- **Host-Managed Bookmarks**: The toolbar can toggle the current page bookmark; hosts can initialize and persist zero-based bookmark indexes through the public API and `bookmarkChange` event.
- **Host-Managed Notes**: The localized notes toolbar opens an inline editor; hosts can initialize, update, and persist page notes through the public API and `noteChange` event without coupling the viewer to a storage backend.
- **Client-Side PDF Search**: Extracts and searches PDF text on demand with localized snippets and normalized text-rectangle highlighting.
- **Interactive Hotspots**: Adds normalized page overlays with accessible plain-text popups and optional links.

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
  showThumbs: false,
  primaryColor: '#7367f0',
  theme: 'auto',
  locale: 'en',
  pdfWorkerSrc,
  pdfRenderCacheSize: 32,
  pdfPageMode: 'auto',
  background: {
    light: { color: '#f8fafc', image: '/branding/light.webp', size: 'cover' },
    dark: { color: '#0f172a', image: '/branding/dark.webp', size: 'cover' }
  }
});

await engine.init('/files/catalog.pdf');
```

Passing `pages` remains optional. When omitted, FlipbookEngine creates the page structure from `pdfUrl`, renders the first page before `init` resolves, and prefetches the next page. Additional pages render as they become visible or are selected. In `pdfPageMode: 'auto'` (the default), ISO A3 landscape pages are normalized into two logical pages; use `'single'` to keep every PDF page intact or `'split'` to split every landscape PDF page.

`pdfRenderCacheSize` controls the per-instance LRU cache (default `32`, set to `0` to disable it).

### Browser CDN

Use the ESM build with an import map for PDF.js. The worker must be served from a URL your site permits in its Content Security Policy.

```html
<link rel="stylesheet" href="https://unpkg.com/flipbookengine@0.6.5/dist/flipbook-engine.css" />
<div id="viewer" style="width: 100%; height: 600px;"></div>

<script type="importmap">
{
  "imports": {
    "pdfjs-dist": "https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.min.mjs"
  }
}
</script>
<script type="module">
  import { FlipbookEngine } from 'https://unpkg.com/flipbookengine@0.6.5/dist/flipbook-engine.js';

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



## Iframe embedding

For a viewer hosted in an iframe, connect the bridge from the iframe document and allow only the parent origin:

```javascript
const engine = new FlipbookEngine('#viewer', { showThumbs: false });
engine.connectEmbed({
  allowedOrigins: ['https://catalog.example.com']
});
await engine.init('/files/catalog.pdf');
```

From the parent page, use the controller exported by the package:

```javascript
import { createFlipbookEmbedController } from 'flipbookengine';

const controller = createFlipbookEmbedController(
  document.querySelector('#catalog-frame'),
  { targetOrigin: 'https://viewer.example.com' }
);
await controller.goToPage(2);
```

Always configure explicit origins for cross-origin embeds. The bridge supports page navigation, zoom, single mode, option updates, fullscreen, state queries, and event forwarding.

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
- **`setLocale(locale: string, messages?: PartialFlipbookMessages | Record<string, PartialFlipbookMessages>)`**: Updates the locale programmatically and optionally overrides messages for that locale.
- **`getPageUrl(pageIndex = getCurrentPage())`**: Returns a shareable URL for a 0-based page index.
- **`sharePage(pageIndex = getCurrentPage())`**: Opens the native share dialog or copies the page URL to the clipboard. The toolbar exposes this behavior through a localized Share button.
- **`getBookmarkedPages()`**: Returns the sorted zero-based bookmark indexes.
- **`isBookmarked(pageIndex = getCurrentPage())`**: Checks whether a page is bookmarked.
- **`setBookmark(pageIndex, bookmarked)`** / **`toggleBookmark(pageIndex)`**: Updates bookmark state and emits `bookmarkChange`; hosts can persist the event payload.
- **`getNotes()`** / **`getNote(pageIndex)`**: Reads host-managed page notes.
- **`setNote(pageIndex, note)`** / **`clearNote(pageIndex)`**: Updates notes and emits `noteChange`; empty notes are removed. The toolbar editor is intentionally host-storage agnostic, so a backend can persist each event later.
- **`destroy(keepContainer = false)`**: Tears down the instance and listeners; when `true`, keeps the container markup for an immediate reinitialization.

### Subscribing to Events

You can subscribe to events using `.on()`. PDF-backed initialization reports loading/rendering progress and emits a structured `error` event when loading or rendering fails:

```ts
const unsubscribe = engine.on('pageChange', ({ currentPage, totalPages, isSingle }) => {
  console.log('Page Changed:', currentPage, 'Total:', totalPages);
});

// To unsubscribe:
unsubscribe();
```

Supported events: `init`, `progress`, `pageChange`, `zoomChange`, `singlePageModeChange`, `thumbsToggle`, `tocToggle`, `orientationChange`, `deepLinkChange`, `bookmarkChange`, `noteChange`, `searchChange`, `hotspotActivate`, `annotationActivate`, `error`, `destroy`.

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `showArrows` | `boolean` | `true` | Shows the previous/next navigation arrows. |
| `showToc` | `boolean` | `false` | Shows the table of contents panel when `toc` entries are supplied. |
| `toc` | `FlipbookTocEntry[]` | `[]` | Host-provided chapter/category entries with zero-based page indexes. |
| `soundEnabled` | `boolean` | `true` | Enables page turning sound effect. |
| `soundUrl` | `string` | `'https://.../page-flip.mp3'` | URL of the audio file. |
| `autoPlayInterval`| `number` | `3000` | Autoplay page duration in milliseconds. |
| `flippingTime` | `number` | `1000` | Duration of the page turn animation in milliseconds; automatically disabled when reduced motion is preferred. |
| `maxShadowOpacity` | `number` | `0.5` | Maximum opacity of the shadow during page turn (0 to 1). |
| `whiteLabel` | `boolean` | `false` | Hides the "Powered by FlipbookEngine" watermark. |
| `pdfWorkerSrc` | `string` | - | URL of the PDF.js worker emitted or hosted by the consuming application. |
| `pdfRenderConcurrency` | `number` | `3` | Maximum number of PDF pages rendered concurrently when on-demand pages are requested. |
| `pdfRenderCacheSize` | `number` | `32` | Maximum number of rendered PDF page images retained per engine instance (LRU); `0` disables caching. |
| `pdfPageMode` | `'auto' \| 'single' \| 'split'` | `'auto'` | Controls PDF page splitting: A3 landscape pages are split automatically, all landscape pages can be split explicitly, or splitting can be disabled. |
| `background` | `FlipbookBackgrounds \| null` | `null` | Optional light/dark viewer backgrounds with color, image, size, position, and repeat settings. |
| `deepLink` | `boolean` | `false` | Keeps the active page synchronized with a `?page=` URL parameter. The localized toolbar Share control uses this URL format. |
| `bookmarks` | `number[]` | `[]` | Initial zero-based bookmarked page indexes; the host owns persistence. |
| `notes` | `Record<number, string>` | `{}` | Initial page notes keyed by zero-based page index; the notes toolbar edits them while the host owns persistence. |
| `hotspots` | `FlipbookHotspot[]` | `[]` | Normalized (0..1) page overlays with labels, plain-text popup content, and optional links. |
| `annotations` | `FlipbookAnnotation[]` | `[]` | Host-managed page note markers with normalized coordinates and plain-text popup content. |
| `onShare` | `(url: string) => void` | `null` | Optional callback invoked after the toolbar shares or copies the generated page URL. |


## PDF page formats

PDF.js page dimensions are detected at runtime, so portrait A4, landscape A4, and other page ratios are supported without a fixed size preset. A3 landscape pages are split into left/right logical pages when `pdfPageMode` is `'auto'` or `'split'`; the halves are presented as an A4-like spread in double-page mode.

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





### Client-side PDF search

When initialized with a PDF URL, `search(query)` extracts text through PDF.js without rendering every page. It returns page-level matches and snippets, updates the search toolbar panel, and overlays precise normalized rectangles over matching text when PDF.js exposes text geometry. Search results use a zero-based `pageIndex` for API navigation and a one-based `pageNumber` for display.

```ts
const results = await engine.search('catalog', { caseSensitive: false, maxResults: 50 });
engine.goToPage(results[0]?.pageIndex ?? 0);
engine.clearSearch();
```

Search is unavailable for image-only page lists because those assets do not contain extractable PDF text or text geometry. For image mode, applications that need search/highlights should generate page text and normalized coordinates on the server and pass the resulting page metadata as a host-side feature; the open-source viewer does not OCR raster images. The iframe controller exposes the same operation with `search`, `clearSearch`, and `getSearchResults`.

### Interactive hotspots

Hosts can provide normalized (0..1) page coordinates for lightweight links and pop-ups:

```ts
const engine = new FlipbookEngine('#viewer', {
  hotspots: [{ id: 'product-42', pageIndex: 3, x: 0.60, y: 0.25, width: 0.25, height: 0.18, label: 'Product details', content: 'Open the product details page.', href: '/products/42' }]
});
engine.on('hotspotActivate', ({ hotspot }) => console.log(hotspot.id));
```

Hotspot content is plain text; applications should sanitize server-provided values before passing them to the viewer. Use `activateHotspot(id)` and `closeHotspot()` for programmatic control.


### Page annotations

Host uygulamaları, kullanıcı notunu sayfa üzerindeki normalize koordinata bağlamak için `annotations` seçeneğini kullanabilir. Marker tıklaması popup açar ve `annotationActivate` olayı yayınlanır. Bu sözleşme şimdilik host-managed'dir; annotation kayıtlarının backend koordinatlarına taşınması tüketici uygulamanın sorumluluğundadır.

```ts
const engine = new FlipbookEngine('#viewer', {
  annotations: [{ id: 'note-1', pageIndex: 4, x: .42, y: .36, text: 'Fiyat kontrol edilecek' }]
});
```
