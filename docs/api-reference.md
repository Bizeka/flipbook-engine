# API Reference

This document describes the options, methods, and events exposed by the `FlipbookEngine` class.

## Constructor Options

When instantiating `new FlipbookEngine(selector, options)`, you can configure the following options:

| Property | Type | Default | Description |
|---|---|---|---|
| `allowDownload` | `boolean` | `true` | Exposes a download button in the toolbar. |
| `showThumbs` | `boolean` | `false` | Starts the viewer with the thumbnail navigation rail hidden. |
| `showToc` | `boolean` | `false` | Shows the supplied table of contents panel when it contains entries. |
| `toc` | `FlipbookTocEntry[]` | `[]` | Host-provided chapter/category entries using zero-based page indexes. |
| `showArrows` | `boolean` | `true` | Shows the previous/next navigation arrows. |
| `primaryColor` | `string` | `'#7367f0'` | Sets the primary theme accent color. |
| `theme` | `'auto' \| 'light' \| 'dark'` | `'auto'` | Force light/dark mode or let it respond automatically. |
| `locale` | `'en' \| 'tr' \| string` | `'en'` | Active language interface. |
| `soundEnabled` | `boolean` | `true` | Enables page turning sound effect. |
| `soundUrl` | `string` | `'https://flipbookengine.com/Content/page-flip.mp3'` | URL of the page turning audio file. |
| `autoPlayInterval` | `number` | `3000` | Duration (ms) before automatically turning to the next page in Autoplay mode. |
| `flippingTime` | `number` | `1000` | Duration (ms) of the page turning animation; automatically set to `0` when reduced motion is preferred. |
| `maxShadowOpacity` | `number` | `0.5` | Maximum opacity of the shadow during page turn (0 to 1). |
| `messages` | `Record<string, PartialFlipbookMessages>` | `null` | Custom localization overrides. |
| `cssVariables` | `Record<string, string>` | `null` | Per-instance custom CSS property overrides. |
| `whiteLabel` | `boolean` | `false` | If true, hides the "Powered by FlipbookEngine" watermark. |
| `watermarkUrl` | `string` | `null` | Custom image logo URL for watermark attribution. |
| `pdfRenderConcurrency` | `number` | `3` | Maximum number of PDF pages rendered concurrently when on-demand pages are requested. |
| `pdfRenderCacheSize` | `number` | `32` | Maximum number of rendered PDF page images retained per engine instance (LRU); `0` disables caching. |
| `pdfPageMode` | `'auto' \| 'single' \| 'split'` | `'auto'` | Automatically split A3 landscape pages, split every landscape page, or keep source pages intact. |
| `background` | `FlipbookBackgrounds \| null` | `null` | Optional per-theme viewer background styles. |
| `deepLink` | `boolean` | `false` | Synchronizes the active page with a `?page=` URL parameter and browser history. |

---

## Public Methods

### `init(pdfUrl: string, imageList?: FlipbookPageAsset[])`
Initializes and mounts the viewer into the container element. Returns a `Promise<void>`.

### `goToPage(pageIndex: number)`
Programmatically turns to the specified 0-based page index.

### `getCurrentPage()`
Returns the 0-based index of the currently active page.

### `getTotalPages()`
Returns the total count of normalized pages.

### `getZoom()`
Returns the current zoom scale (usually `1` to `5`).

### `setZoom(zoomLevel: number)`
Sets the zoom scale. Acceptable bounds are `0.5` to `5`.

### `setSingleMode(isSingle: boolean)`
Enforces single page layout (typically for mobile viewports) or spread mode.

### `toggleFullscreen()`
Toggles browser fullscreen.

### `updateOptions(options: Partial<FlipbookEngineOptions>)`
Updates options dynamically at runtime.

### `setLocale(locale: string, messages?: PartialFlipbookMessages | Record<string, PartialFlipbookMessages>)`
Changes the UI language programmatically.

### `getPageUrl(pageIndex = getCurrentPage())`
Returns a shareable URL with a 1-based `?page=` parameter for the requested 0-based page index.

### `sharePage(pageIndex = getCurrentPage())`
Uses the native share dialog when available, otherwise copies the page URL to the clipboard. The toolbar exposes this behavior through a localized Share button. Enable `deepLink: true` in the receiving viewer to resolve the `?page=` parameter.

### `connectEmbed(options?: FlipbookEmbedOptions)`
Connects an origin-validated postMessage bridge for iframe integrations. Call this from the document loaded inside the iframe.

### `destroy(keepContainer = false)`
Tears down the instance, unsubscribes all event handlers, and optionally clears the container element HTML.

---

## Iframe embedding

Embed integrations use a small, origin-validated `postMessage` bridge. The viewer page (inside the iframe) connects the bridge:

```ts
const engine = new FlipbookEngine('#viewer', { showThumbs: false });
const embedBridge = engine.connectEmbed({
  allowedOrigins: ['https://catalog.example.com']
});
await engine.init('/files/catalog.pdf');
```

The parent page can control the iframe with the exported controller:

```ts
import { createFlipbookEmbedController } from 'flipbookengine';

const iframe = document.querySelector('#catalog-frame') as HTMLIFrameElement;
const catalog = createFlipbookEmbedController(iframe, {
  targetOrigin: 'https://viewer.example.com'
});

await catalog.goToPage(3);
await catalog.setZoom(1.5);
catalog.on('pageChange', (state) => console.log(state.pageNumber));
```

Commands are restricted to navigation, zoom, single-mode, option updates, fullscreen, and state queries. Configure an explicit `allowedOrigins` value in the iframe and `targetOrigin` value in the parent for cross-origin deployments. The bridge rejects messages from other windows or origins.

## Event Subscriptions

Use `.on(eventName, handler)` to listen to runtime events:

```javascript
const unsubscribe = engine.on('pageChange', ({ currentPage, pageNumber, totalPages, isSingle }) => {
  console.log(`Now on page ${pageNumber} of ${totalPages}`);
});
```

### Supported Events

- **`pageChange`**: Emitted when page is changed.
  - Payload: `{ currentPage: number; pageNumber: number; totalPages: number; isSingle: boolean }`
- **`zoomChange`**: Emitted when zoom factor changes.
  - Payload: `{ zoom: number; isActive: boolean }`
- **`singlePageModeChange`**: Emitted when switching layout mode.
  - Payload: `{ isSingle: boolean }`
- **`thumbsToggle`**: Emitted when thumbnail rail is toggled.
- **`tocToggle`**: Emitted when the table of contents panel is toggled.
  - Payload: `{ showToc: boolean }`
  - Payload: `{ showThumbs: boolean }`
- **`init`**: Emitted after the viewer is ready. Payload: `{ totalPages: number }`
- **`progress`**: Emitted during PDF loading/rendering. Payload: `{ phase: 'loading' | 'rendering'; completed: number; total: number }`
- **`orientationChange`**: Emitted when layout orientation changes. Payload: `{ orientation: 'landscape' | 'portrait' }`.
- **`deepLinkChange`**: Emitted when the active page updates the shareable URL. Payload: `{ pageIndex: number; pageNumber: number; url: string }`.
- **`error`**: Emitted when PDF loading/rendering fails. Payload: `{ code: 'PDF_LOAD_FAILED' | 'PDF_RENDER_FAILED'; message: string; cause?: unknown }`
- **`destroy`**: Emitted when the engine is destroyed.


## PDF rendering lifecycle

When `pdfUrl` is supplied without a `pages` list, the engine creates lightweight page placeholders immediately after the document metadata loads. The first page is rendered before `init()` resolves, and the next page is prefetched. Remaining pages render on demand as they become visible or are selected. Rendering requests are deduplicated per page and cancelled when initialization is superseded or the engine is destroyed.

Use `pdfRenderConcurrency` to bound concurrent PDF.js work and `pdfRenderCacheSize` to configure the per-instance LRU cache. Set the cache size to `0` when rendered page data should not be retained. `pdfPageMode: 'auto'` detects ISO A3 landscape pages and exposes their left/right halves as two logical pages; `'single'` disables splitting and `'split'` splits every landscape page.

## PDF page formats

The viewer derives its page ratio from PDF.js metadata or the supplied image asset. Portrait A4 and landscape A4 are both supported. For a landscape A3 page that contains two A4 pages, use the default `pdfPageMode: 'auto'` or explicit `'split'`; each half becomes a navigable logical page.

## Table of contents

TOC entries are supplied by the host application so the viewer stays backend-agnostic. `pageIndex` is zero-based and is clamped to the loaded page range. Nested `children` entries are supported.

```ts
const engine = new FlipbookEngine('#viewer', {
  toc: [
    { title: 'Introduction', pageIndex: 0 },
    { title: 'Products', pageIndex: 4, children: [
      { title: 'Category A', pageIndex: 5 }
    ] }
  ],
  showToc: true
});
```