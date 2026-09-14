# Getting Started

Welcome to **FlipbookEngine**! This guide will help you set up and embed FlipbookEngine into your web applications.

## Quick Installation

You can install FlipbookEngine via npm:

```bash
npm install flipbookengine
```

Or reference it directly via CDN (such as unpkg) in your HTML:

```html
<link rel="stylesheet" href="https://unpkg.com/flipbookengine/dist/flipbook-engine.css" />
<script src="https://unpkg.com/flipbookengine/dist/flipbook-engine.iife.js"></script>
```

## Setup Container

Create an element in your HTML that will contain the flipbook viewer. Ensure the container has explicit dimensions:

```html
<div id="viewer" style="width: 100%; height: 600px;"></div>
```

## Initialize the Engine

Import `FlipbookEngine` (if using ESM) and instantiate it:

```javascript
import { FlipbookEngine } from 'flipbookengine';
import 'flipbookengine/dist/flipbook-engine.css';

const engine = new FlipbookEngine('#viewer', {
  allowDownload: true,
  showThumbs: false,
  primaryColor: '#7367f0'
});

// Load the PDF catalog file along with its rendered images
await engine.init('/files/catalog.pdf', [
  { kind: 'cover', pageNumber: 1, normal: '/img/1.jpg', low: '/img/1-low.jpg', thumb: '/img/1-thumb.jpg' },
  { kind: 'spread', pageNumbers: [2, 3], normal: '/img/2-3.jpg', low: '/img/2-3-low.jpg', thumb: '/img/2-3-thumb.jpg' }
]);
```

## Mixed Page Spreads

FlipbookEngine supports loading single pages, spreads (double-pages), and covers mixed together. The engine will automatically normalize spreads (cutting them into left and right halves on portrait viewports) for responsive mobile viewing.


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


## Deep links and sharing

Enable opt-in URL synchronization with the `deepLink` option. The viewer reads an initial `?page=` value, updates it when the page changes, and responds to browser back/forward navigation. Page numbers in URLs are 1-based; engine API indexes remain 0-based.

```ts
const engine = new FlipbookEngine('#viewer', { deepLink: true });
await engine.init('/files/catalog.pdf');

const pageUrl = engine.getPageUrl(4);
await engine.sharePage(4);
// The viewer toolbar also exposes a localized Share button.
// Bookmark state is host-managed and can be persisted from bookmarkChange.
engine.on('bookmarkChange', ({ pageNumber, bookmarked }) => {
  console.log(`Page ${pageNumber} bookmarked: ${bookmarked}`);
});
engine.on('noteChange', ({ pageNumber, note }) => {
  console.log(`Page ${pageNumber} note changed`, note);
});
engine.on('deepLinkChange', ({ pageNumber, url }) => {
  console.log(`Sharing page ${pageNumber}: ${url}`);
});
```


## Client-side PDF search

When initialized with a PDF URL, `search(query)` extracts text through PDF.js without rendering every page. It returns page-level matches and snippets, updates the search toolbar panel, and overlays precise normalized rectangles over matching text when PDF.js exposes text geometry. Search results use a zero-based `pageIndex` for API navigation and a one-based `pageNumber` for display.

```ts
const results = await engine.search('catalog', { caseSensitive: false, maxResults: 50 });
engine.goToPage(results[0]?.pageIndex ?? 0);
engine.clearSearch();
```

Search is unavailable for image-only page lists because those assets do not contain extractable PDF text or text geometry. For image mode, applications that need search/highlights should generate page text and normalized coordinates on the server and pass the resulting page metadata as a host-side feature; the open-source viewer does not OCR raster images. The iframe controller exposes the same operation with `search`, `clearSearch`, and `getSearchResults`.

## Interactive hotspots

Hosts can provide normalized (0..1) page coordinates for lightweight links and pop-ups:

```ts
const engine = new FlipbookEngine('#viewer', {
  hotspots: [{ id: 'product-42', pageIndex: 3, x: 0.60, y: 0.25, width: 0.25, height: 0.18, label: 'Product details', content: 'Open the product details page.', href: '/products/42' }]
});
engine.on('hotspotActivate', ({ hotspot }) => console.log(hotspot.id));
```

Hotspot content is plain text; applications should sanitize server-provided values before passing them to the viewer. Use `activateHotspot(id)` and `closeHotspot()` for programmatic control.
