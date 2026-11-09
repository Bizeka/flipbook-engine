# API Reference

This document describes the options, methods, and events exposed by the `FlipbookEngine` class.

## Constructor Options

When instantiating `new FlipbookEngine(selector, options)`, you can configure the following options:

| Property | Type | Default | Description |
|---|---|---|---|
| `allowDownload` | `boolean` | `true` | Exposes a download button in the toolbar. |
| `showShare` | `boolean` | `true` | Shows the Share command (toolbar or overflow menu). `false` hides it, for example for readers who may not share; `sharePage()` still works for the host. Can be changed with `updateOptions`. |
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
| `background` | `FlipbookBackgrounds \| null` | `null` | Optional per-theme viewer background: `{ light?, dark? }`, each `{ color?, image?, size?, position?, repeat? }`. `image` is a URL (PNG, JPG, SVG, data URL), a CSS gradient or inline `<svg>` markup. |
| `startPage` | `number` | — | Zero-based page to open at, e.g. a last page the host saved from `pageChange`. Wins over `rememberPage`; a deep-linked `?page=` wins over both. |
| `rememberPage` | `boolean \| string` | `true` | Reopens at the last page read on this device (localStorage). A string is the document key; otherwise the source URL is used. |
| `deepLink` | `boolean` | `false` | Synchronizes the active page with a `?page=` URL parameter and browser history. |
| `onShare` | `(url: string) => void` | `null` | Optional callback invoked after the localized toolbar Share control shares or copies the generated page URL. |
| `bookmarks` | `number[]` | `[]` | Initial zero-based page indexes marked as bookmarks; persistence remains with the host application. |
| `notes` | `Record<number, string>` | `{}` | Initial page notes keyed by zero-based page index; the localized toolbar editor is host-storage agnostic. |
| `hotspots` | `FlipbookHotspot[]` | `[]` | Normalized page overlays with accessible labels, media (image, video, audio, YouTube/Vimeo `embed`), galleries, plain-text content, and optional commerce links. |
| `annotations` | `FlipbookAnnotation[]` | `[]` | Host-managed page note markers with normalized coordinates and plain-text popup content. |
| `className` | `string` | `null` | Extra class names added to the viewer container. |
| `singleMode` | `boolean` | auto | Starts in single-page layout (`true`) or two-page spreads (`false`). Left unset, the layout follows the viewport. Changeable with `updateOptions`; `isSingleMode` is an alias. |
| `autoPlay` | `boolean` | `false` | Starts automatic page turning (see `autoPlayInterval`). |
| `pdfRenderScale` | `number` | `1.5` | PDF.js render scale for page images. |
| `pdfRenderQuality` | `number` | `0.85` | Image quality (0 to 1) for lossy page formats. |
| `pdfRenderFormat` | `string` | `'image/webp'` | Image format of rendered PDF pages. |
| `imageTiers` | `boolean \| { zoomThresholds?, narrowMaxWidth?, select? }` | off | Chooses between a page's `low`, `normal` and optional `large` image by screen width and zoom. Off by default: without it the viewer behaves exactly as before. `true` uses the defaults: screens up to `narrowMaxWidth` (1024 px) show `low` while unzoomed; the zoomed page shows `normal` above the first `zoomThresholds` value (1.05) and `large` above the second (1.75); `large` falls back to `normal` when a page has none. Only the zoomed page loads `large`, and it returns to a smaller image when zoom ends. The choice is re-applied after a width change or rotation (debounced; height-only changes are ignored) and, during a pinch, only once the gesture has ended. `select(context)` receives `{ zoom, viewportWidth, narrow, pageZoomed }` and may return `'low'`, `'normal'` or `'large'` (anything else keeps the built-in choice). Functions cannot cross the iframe bridge, so over `postMessage` only the data fields (`true` or the object without `select`) can be sent; set `select` in the page that creates the engine. Best set at construction. Has no effect on PDF-rendered pages. |
| `pdfWorkerSrc` | `string` | `null` | URL of the PDF.js worker, which the host serves (see the README). |
| `pageSource` | `PageSource` | PDF.js | Custom source of pages for a document URL passed to `init`, used instead of PDF.js. See [Page source](#page-source). Not available through the iframe bridge. |
| `backgroundColor`, `backgroundImage` | `string` | `null` | Legacy shorthand for the light-theme `background`; prefer `background`. |
| `onDownload` | `(url: string) => void` | `null` | Called with the PDF URL when the toolbar Download control is used; it replaces the default, which opens the PDF in a new tab. |
| `plugins` | `FlipbookPlugin[]` | `[]` | Plugins installed before the first render; see [Plugin architecture](./plugin-architecture.md). |

The host providers and note options (`searchProvider`, `noteProvider`, `annotationProvider`, `noteEditor`, `optimisticNotes`, `noteColors`, `noteGroups`, `noteGroupProvider`, `noteDocuments`, `notePinSize`, `searchHighlightStyle`, `textLayerProvider`, `textSelection`) are described under [Host backend providers](#host-backend-providers), [Personal coordinate notes](#personal-coordinate-notes) and [Note pins, search highlights, colours and groups](#note-pins-search-highlights-colours-and-groups).

---

## Page source

`init(url)` opens the document through a `PageSource`. Without the `pageSource` option the engine uses PDF.js, which it loads with a dynamic `import()` only at that moment; image-only viewers never load it. Provide your own to serve pages from a backend:

```ts
import type { PageSource } from 'flipbookengine';

const pageSource: PageSource = {
  loadDocument: async (url, signal) => pageCount,          // 1-based pages from here on
  getPageLayouts: async (mode) => [{ width, height, split: false }],
  calculateViewportDimensions: async (baseShortSide, firstPageLayout) => ({ width, height }),
  renderPageToDataUrl: async (pageNumber, signal, request) => imageUrl, // request.tier / request.scale are hints
  extractPageText: async (pageNumber) => text,
  searchText: async (query, options) => [{ sourcePageNumber, matches, snippet, highlights }],
  destroy() {}
};
new FlipbookEngine('#book', { pageSource }).init('/documents/42');
```

The URL given to `init` is passed to `loadDocument`. The engine calls `destroy()` when it is destroyed or re-initialised and calls `loadDocument` again for the next document, so keep per-document state inside `loadDocument`. `pdfRender*` options and `pdfWorkerSrc` apply to the PDF.js source only. The iframe bridge (`embed`) can only carry serializable data, so it cannot pass a `pageSource`; set it in the page that hosts the engine instead.

---

## Public Methods

### `init(pdfUrl: string, imageList?: FlipbookPageAsset[])`
Initializes and mounts the viewer into the container element. Returns a `Promise<void>`.

### `goToPage(pageIndex: number)`
Programmatically turns to the specified 0-based page index.

### `nextPage()` / `prevPage()`
Turns to the next or previous page (or spread).

### `getCurrentPage()`
Returns the 0-based index of the currently active page.

### `getTotalPages()`
Returns the total count of normalized pages.

### `version`
The package version this build was made from, as a string (`engine.version`, `FlipbookEngine.version`, or the `VERSION` export). It reads `development` when the reader runs from source.

### `getZoom()`
Returns the current zoom scale (usually `1` to `5`).

### `setZoom(zoomLevel: number)`
Sets the zoom scale. Acceptable bounds are `0.5` to `5`.

### `setSingleMode(isSingle: boolean)`
Enforces single page layout (typically for mobile viewports) or spread mode.

### `toggleFullscreen()`
Toggles browser fullscreen.

### `setPages(pages?: FlipbookPageAsset[], pdfUrl?: string)`
Replaces the source after initialization. With `pages` it rebuilds the book from them; with only `pdfUrl` it loads that PDF. With neither it does nothing, so the current book stays. The React and Vue wrappers call it when their source changes.

### `updateOptions(options: Partial<FlipbookEngineOptions>)`
Updates options dynamically at runtime.

### `setLocale(locale: string, messages?: PartialFlipbookMessages | Record<string, PartialFlipbookMessages>)`
Changes the UI language programmatically.

### `getPageUrl(pageIndex = getCurrentPage())`
Returns a shareable URL with a 1-based `?page=` parameter for the requested 0-based page index.

### `sharePage(pageIndex = getCurrentPage())`
Uses the native share dialog when available, otherwise copies the page URL to the clipboard. The toolbar exposes this behavior through a localized Share button. Enable `deepLink: true` in the receiving viewer to resolve the `?page=` parameter.

### Bookmark methods

`getBookmarkedPages()`, `isBookmarked()`, `setBookmark(pageIndex, bookmarked)`, and `toggleBookmark(pageIndex)` manage zero-based bookmark state. The `bookmarkChange` event payload is `{ pageIndex, pageNumber, bookmarked }`; hosts should persist this payload in their own storage.

`getNotes()`, `getNote(pageIndex)`, `setNote(pageIndex, note)`, and `clearNote(pageIndex)` manage host-owned notes. The toolbar's localized **Page note** button opens an inline editor; empty notes are removed; `noteChange` emits `{ pageIndex, pageNumber, note }` with `null` when a note is cleared. Hosts can persist that payload in a database or other storage.

### `pointToPage(clientX: number, clientY: number)`
Maps a viewport point, such as a pointer event's `clientX`/`clientY`, to the visible page under it. Returns `{ pageIndex, x, y }` with `x` and `y` from 0 to 1 (left and top edge of that page), or `null` when the point is not on a visible page. It works in single and double layout and while zoomed, so a host can place its own markers without reading the engine's DOM.

```ts
book.addEventListener('dblclick', (event) => {
  const point = engine.pointToPage(event.clientX, event.clientY);
  if (point) addHotspotAt(point.pageIndex, point.x, point.y);
});
```

### `getAnnotations(pageIndex = getCurrentPage())` / `activateAnnotation(id)` / `closeAnnotation()`
Reads the host-managed coordinate notes of a page, opens one note's popup (emitting `annotationActivate`), or closes the open popup.

### `installPlugin(plugin)` / `uninstallPlugin(name)` / `getPluginNames()` / `callPluginApi(plugin, api, ...args)`
Install or remove a plugin at runtime, list installed plugins, and call a plugin's namespaced API. See [Plugin architecture](./plugin-architecture.md).

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

Commands are restricted to navigation, zoom, single-mode, option updates, fullscreen, TOC read/update, search, and state queries. Configure an explicit `allowedOrigins` value in the iframe and `targetOrigin` value in the parent for cross-origin deployments. The bridge rejects messages from other windows or origins.

## Event Subscriptions

Use `.on(eventName, handler)` to listen to runtime events:

```javascript
const unsubscribe = engine.on('pageChange', ({ currentPage, pageNumber, totalPages, isSingle }) => {
  console.log(`Now on page ${pageNumber} of ${totalPages}`);
});
```

### Supported Events

The React and Vue wrappers forward all of these except `destroy` (React: `onPageChange`, `onError`, `onHotspotOpen`, ...; Vue: `@page-change`, `@error`, `@hotspot-open`, ...). See [Frameworks](frameworks.md).

- **`pageChange`**: Emitted when page is changed.
  - Payload: `{ currentPage: number; pageNumber: number; totalPages: number; isSingle: boolean }`
- **`zoomChange`**: Emitted when zoom factor changes.
  - Payload: `{ zoom: number; isActive: boolean }`
- **`singlePageModeChange`**: Emitted when switching layout mode.
  - Payload: `{ isSingle: boolean }`
- **`thumbsToggle`**: Emitted when thumbnail rail is toggled.
  - Payload: `{ showThumbs: boolean }`
- **`tocToggle`**: Emitted when the table of contents panel is toggled.
  - Payload: `{ showToc: boolean }`
- **`init`**: Emitted after the viewer is ready. Payload: `{ totalPages: number }`
- **`progress`**: Emitted during PDF loading/rendering. Payload: `{ phase: 'loading' | 'rendering'; completed: number; total: number }`
- **`orientationChange`**: Emitted when layout orientation changes. Payload: `{ orientation: 'landscape' | 'portrait' }`.
- **`deepLinkChange`**: Emitted when the active page updates the shareable URL. Payload: `{ pageIndex: number; pageNumber: number; url: string }`.
- **`bookmarkChange`**: Emitted when a page bookmark is added or removed. Payload: `{ pageIndex: number; pageNumber: number; bookmarked: boolean }`.
- **`noteChange`**: Emitted when a page note is added, updated, or cleared. Payload: `{ pageIndex: number; pageNumber: number; note: string | null }`.
- **`error`**: Emitted when PDF loading/rendering fails. Payload: `{ code: 'PDF_LOAD_FAILED' | 'PDF_RENDER_FAILED'; message: string; cause?: unknown }`
- **`hotspotOpen`**: A hotspot popup opened (same moment as `hotspotActivate`). Payload: `{ hotspot: FlipbookHotspot; pageIndex: number }`.
- **`hotspotClose`**: A hotspot popup closed: by the reader, by `closeHotspot()`, by opening another hotspot, or because the hotspot was removed. Payload: `{ hotspot: FlipbookHotspot; pageIndex: number }`.
- **`hotspotActivate`**: A hotspot was activated. Payload: `{ hotspot: FlipbookHotspot; pageIndex: number }`.
- **`annotationActivate`**: A coordinate-note marker was opened. Payload: `{ annotation: FlipbookAnnotation; pageIndex: number }`.
- **`annotationChange`**: A coordinate note was saved or deleted. Payload: `{ annotation: FlipbookAnnotation; action: 'save' | 'delete' }`.
- **`searchChange`**: The search results changed. Payload: `{ query: string; results: FlipbookSearchResult[] }`.
- **`searchProgress`**: A search provider reported progress. Payload: `{ query: string; completed: number; total: number }`.
- **`drawingChange`**: Strokes changed. Payload: `{ action: 'add' | 'remove' | 'clear' | 'undo' | 'redo' | 'load' | 'rollback'; pageIndex: number | null; pageNumber: number | null; strokes: FlipbookStroke[] }` (the affected strokes). See [Drawing](#drawing).
- **`drawingError`**: A load, save, clear or storage request failed. Payload: `{ code: 'load' | 'save' | 'clear' | 'storage'; message: string; pageIndex?: number; cause?: unknown }`.
- **`drawingModeChange`**: Drawing mode was switched. Payload: `{ active: boolean }`.
- **`destroy`**: Emitted when the engine is destroyed.


## PDF rendering lifecycle

When `pdfUrl` is supplied without a `pages` list, the engine creates lightweight page placeholders immediately after the document metadata loads. The first page is rendered before `init()` resolves, and the next page is prefetched. Remaining pages render on demand as they become visible or are selected. Rendering requests are deduplicated per page and cancelled when initialization is superseded or the engine is destroyed.

Use `pdfRenderConcurrency` to bound concurrent PDF.js work and `pdfRenderCacheSize` to configure the per-instance LRU cache. Set the cache size to `0` when rendered page data should not be retained. `pdfPageMode: 'auto'` detects ISO A3 landscape pages and exposes their left/right halves as two logical pages; `'single'` disables splitting and `'split'` splits every landscape page.

## PDF page formats

The viewer derives its page ratio from PDF.js metadata or the supplied image asset. Portrait A4 and landscape A4 are both supported. For a landscape A3 page that contains two A4 pages, use the default `pdfPageMode: 'auto'` or explicit `'split'`; each half becomes a navigable logical page.

## Table of contents

TOC entries are supplied by the host application so the viewer stays backend-agnostic. `pageIndex` is zero-based and is clamped to the loaded page range. Nested `children` entries are supported.

Use `engine.getToc()` to read the normalized tree or `engine.setToc(entries, show?)` to replace it at runtime. The open-source viewer consumes this manifest; it does not extract PDF outline destinations or generate OCR metadata.

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

### Search

- **`search(query, options?)`**: Extracts and searches PDF text client-side. Returns `{ pageIndex, pageNumber, matches, snippet, sourcePageNumber, highlights? }[]`, stores results for the built-in search panel, and overlays matching text rectangles. `pageIndex` is zero-based; `pageNumber` is one-based. `highlights` coordinates are normalized to the logical page (0..1), including left/right mapping for split PDF pages.
- **`clearSearch()`** / **`getSearchResults()`**: Clears or reads the current search state.

### Hotspots

- **`getHotspots(pageIndex = getCurrentPage())`**: Returns host-provided overlays for a logical page.
- **`setHotspots(hotspots)`**: Replaces all hotspots and redraws them on every page, in single and double layout (same as `updateOptions({ hotspots })`). If the open hotspot is no longer in the list, its popup closes and `hotspotClose` is emitted.
- **`activateHotspot(id)`** / **`closeHotspot()`**: Opens or closes a hotspot popup. Opening emits `hotspotActivate` and `hotspotOpen`; closing emits `hotspotClose`. Hotspots may include `kind`, `media` (`image`, `video`, `audio`, `embed`), `gallery` image items, and an optional `href` for commerce/product links; popup text is always rendered as plain text.
- **`className`** (string) adds classes to the hotspot button next to `bk-hotspot`; tokens that are not valid class names are dropped. **`data`** (`Record<string, string | number | boolean>`) is written as `data-*` attributes on the same button; keys must be lowercase words joined by hyphens (`{ kind: 'video', 'item-id': 42 }` gives `data-kind="video" data-item-id="42"`), other keys and values are ignored.


### Page annotations

Hosts can attach a note to a normalized page coordinate with the `annotations` option. Clicking a marker opens a popup and emits `annotationActivate`. The contract is host-managed: moving annotation records to and from backend coordinates is the consuming application's responsibility.

```ts
const engine = new FlipbookEngine('#viewer', {
  annotations: [{ id: 'note-1', pageIndex: 4, x: .42, y: .36, text: 'Review pricing' }]
});
```

## Plugins

See [Plugin architecture](./plugin-architecture.md) for the v1 plugin contract and lifecycle.


## Host backend providers

The native search panel also works with pre-rendered page images. Supply `searchProvider(query, options, signal)` returning logical page results (`pageIndex` is zero-based, `pageNumber` is one-based, plus `matches`, `snippet` and optional normalized `highlights`). The host owns authentication, document identity and authorization. A provider that builds or scans an index can call the optional fourth argument `reportProgress({ completed, total })` (use `total: 0` when unknown); the engine bounds the values, emits `searchProgress` `{ query, completed, total }` and shows a progress bar in the search panel until the search ends. Stale responses and progress from a superseded query are ignored; destroy aborts the session signal. Without a provider, Direct PDF search retains its existing behavior.

Supply initial `notes` and `noteProvider(pageIndex, note, signal)` to persist the native note editor. A cleared note is `null`. The editor awaits the provider before changing the saved note or emitting `noteChange`. On failure it retains the draft and offers another save. `saveNote(pageIndex, note)` exposes the same asynchronous workflow; `setNote` remains a synchronous programmatic update for compatibility.

`optimisticNotes: true` (default `false`) makes `saveNote` and `saveAnnotation` apply the edit and resolve `true` at once, then persist in the background in order. If the provider rejects, the newest edit of that note rolls back to the last persisted state, `noteChange`/`annotationChange` fire again for the rollback, and the panel shows the save-failed message; an editor that already closed does not keep its draft, so use the default mode when drafts must survive failures.

Contents, search and notes are mutually exclusive panels. Canvas arrows hide while a panel is open; the pager remains available. Contents has a close control. Secondary toolbar commands are in the accessible More actions menu; mobile navigation and primary controls occupy two rows.

## Drawing

Free drawing and highlighting. The engine ships the stroke model, the provider interface, storage, events and methods, and a drawing layer on every page. The tool panel is not part of the engine yet, so a host switches the mode and the tool through the methods below. Off by default: without `drawing` nothing changes.

Options:

- `drawing`: `true` or `{ colors?: string[]; defaultTool?: 'highlight' | 'pen' | 'eraser'; defaultWidth?: number; defaultOpacity?: number; tools?: Array<'highlight' | 'pen' | 'eraser'> }`. The config sets the initial tool (`defaultTool`, the first of `colors`) and the allowed tools; defaults when a stroke omits them are width 15 and opacity 0.5 for `highlight`, width 3 and opacity 1 for `pen`.
- `drawingProvider`: host storage, see below.
- `drawingStorage`: `'memory'` (default) or `'local'`. Used only when there is no `drawingProvider`; `'local'` keeps strokes in `localStorage` (key `flipbook:drawings:<documentId>`), meant for demos. Storage errors are reported as `drawingError` with code `storage`.
- `documentId`: identifies the document for drawings. When absent the engine uses a string `rememberPage`, then the PDF url, then the first page image.

A stroke (`FlipbookStroke`): `{ id, page, tool: 'highlight' | 'pen', color, opacity (0..1), width (px at fit zoom), points: [x, y][] (0..1 of the page box), createdAt, updatedAt?, authorId? }`. `page` is a zero-based logical page index. Points are normalised so strokes survive zoom, layout and image tiers. Input is validated: coordinates are clamped to 0..1, an invalid stroke is rejected, and `simplifyPoints` (Ramer-Douglas-Peucker, tolerance 0.001) is exported for the UI to call on pointer-up.

```ts
interface FlipbookDrawingProvider {
  load(ctx: { documentId: string; pages: number[] }, signal: AbortSignal): Promise<FlipbookStroke[]>;
  save(ctx: { documentId: string }, changes: { added: FlipbookStroke[]; removed: string[] }, signal: AbortSignal): Promise<{ ids?: Record<string, string> }>;
  clearPage?(ctx: { documentId: string; page: number }, signal: AbortSignal): Promise<void>;
}
```

Behaviour:

- Strokes load lazily for the visible spread (the current page and, in two-page view, the next); a page is requested once. The `signal` of `load` aborts on destroy.
- Changes apply at once (optimistic), then one batched `save` is sent about 800 ms after the last change, on page change, and on destroy. Saves are not cancelled by destroy, so the last stroke is not lost; if the host page is unloading, the provider should send with `fetch(..., { keepalive: true })`. Batches are sent in order.
- If `save` rejects, the strokes of that batch roll back, `drawingChange` fires with `action: 'rollback'`, `drawingError` fires with code `save`, and the undo history is cleared. `ids` in the result renames client ids to backend ids.
- `clearStrokes(page)` calls `clearPage` when the provider has it, otherwise the stroke ids go through `save` as removals. A rejected `clearPage` restores the strokes (code `clear`).
- Without a provider strokes live in memory (or in `localStorage`) and are lost when the page closes, unless the host stores them.

Methods:

- `setDrawingMode(on: boolean)` / `isDrawingMode()`: switches the mode and emits `drawingModeChange`. Does nothing without `drawing`. See [Drawing mode](#drawing-mode).
- `setDrawingTool({ tool?, color?, width?, opacity? })` / `getDrawingTool()`: the tool new strokes are drawn with (`tool` is `'highlight'`, `'pen'` or `'eraser'`). Every field is optional and invalid values are ignored. Switching to another drawing tool without a width or opacity takes that tool's defaults (highlight 15 px at 0.5, pen 3 px at 1); the eraser keeps the last colour, width and opacity. A tool outside `drawing.tools` is ignored. `setDrawingTool` returns the resulting tool, or `null` without `drawing`.
- `getStrokes(pageIndex?)`: copies of the loaded strokes of a page, or of all loaded pages.
- `addStroke(stroke)`: validates and adds a stroke (`id`, `createdAt`, `width`, `opacity` are filled when missing); returns it, or `null` when drawing is off, the stroke is invalid or the page is outside the book.
- `removeStroke(id)`, `clearStrokes(pageIndex?)` (returns how many were removed), `undoStroke()`, `redoStroke()` (return whether something changed). A new stroke clears the redo stack.

### Drawing mode

Each page has an SVG layer above the page image and below hotspots and note pins. Strokes are drawn in 0..1 page space, so they stay on the page through zoom, single and two-page view, image tiers and PDF pages. A stroke's `width` is in CSS px at fit zoom and grows with the zoomed page. Highlights are drawn with `mix-blend-mode: multiply` and the stroke opacity; pens are opaque. Only the visible spread and one spread on each side keep their strokes in the DOM.

While drawing mode is on:

- One pointer draws (mouse, touch or pen), with pointer capture and coalesced events where the browser has them. A live preview follows the pointer; on release the points are simplified (tolerance 0.001) and the stroke is added with `addStroke`, so `drawingChange` and the provider see it like any other stroke. The mouse draws with the primary button.
- The `eraser` tool removes the topmost stroke under the pointer on tap or drag (hit test on the stroke's polyline with a tolerance of half the stroke width plus 8 px).
- Page turns by drag, swipe, corner fold and click, keyboard page keys, double-tap zoom, text selection, note placement and auto play are off. Turning on the mode closes an open note popover and ends text selection and note placement. The page arrows and toolbar buttons are ordinary controls and still work.
- Two fingers never draw: a second finger drops the stroke in progress and the gesture is the usual pinch zoom and pan. One finger drag while zoomed draws instead of panning; pan with two fingers (or the wheel and arrow keys with a mouse or keyboard).
- When a pen is in use, touch does not draw (palm rejection) for 0.8 s after the last pen event.
- `Escape` leaves drawing mode.

Drawing input uses Pointer Events. Pen pressure is not used.

The same methods are available through the `drawings` plugin API when it is installed (`callPluginApi('drawings', 'getStrokes')`, plus `setMode`, `getTool` and `setTool`). The iframe bridge forwards the three events; the provider cannot cross the iframe.

## Personal coordinate notes

`annotationProvider(annotation, action, signal)` persists native coordinate notes (`action` is `save` or `delete`). Initial `annotations` load existing notes. `beginAnnotation()` enters a dedicated placement mode; `placeAnnotation(pageIndex,x,y)` uses normalized logical-page coordinates in [0,1]. `saveAnnotation()` commits only after the host succeeds. Multiple note IDs may share a page. The host remains responsible for authentication, ownership and document identity. Right click and a stationary touch/pen hold open an editor at the selected point; movement beyond 10px or another pointer cancels long press. A placement overlay consumes page-flip gestures. Escape cancels placement. Markers are available in both single-page and spread views.

The My notes panel includes existing page notes and coordinate notes, navigation, an empty state and a total count. The toolbar shows the count and highlights pages containing notes. Selecting a marker opens a readable popover outside the scaled paper; editing and deletion remain in that popover. Delete requires a second explicit action.

`noteEditor(container,value,signal)` is an optional host editor factory returning `getValue`, `setReadOnly` and `destroy`. `value` contains plain `text` and an optional structured `document`; the base engine retains a textarea fallback and has no Tiptap dependency. Legacy page notes can supply `noteDocuments`; noteProvider receives the document as an optional fourth argument. The built-in viewer renders only doc/paragraph/text/hardBreak nodes with bold, italic, font-size and hex foreground/background marks. It never renders raw note HTML.

When the viewer owns keyboard focus: arrows/PageUp/PageDown navigate, Home/End jump, +/- zoom, 0 resets, N places a note, Shift+N opens My notes, / searches, I opens contents, T toggles thumbnails, F toggles fullscreen, and ? shows help. Text inputs and rich editors keep their own shortcuts. Toolbar arrows move focus among visible commands; Tab/Shift+Tab preserve native focus order. Closing panels returns focus. Pinch zoom and one-finger pan suppress page turning; only predominantly horizontal unzoomed single-page swipes turn pages. Ctrl/wheel zoom is scoped to the paper. Native touch behavior still requires real-device acceptance.

## Backend text layer API

Optional `textLayerProvider`, `textSelection` and `setTextSelection(enabled)` add fixed-layout selectable text to image books. Public `FlipbookTextPage`, `FlipbookTextRun` and `FlipbookTextLayerProvider` types are exported from root and core entrypoints. See [schema, lifecycle, geometry and backend responsibilities](backend-text-layers.md). Existing search highlights remain independent. No backend, OCR engine or database is bundled.

## Note pins, search highlights, colours and groups

- `notePinSize` (px, default 10) or the CSS variable `--flipbook-note-pin-size` sizes coordinate-note pins.
- `searchHighlightStyle`: `'highlight'` (default, semi-transparent marker fill over the word), `'underline'` (3px line below the word) or `'bubble'` (soft transparent bubble around the word); all use `--flipbook-search-highlight`. A custom `searchProvider` must return normalized `highlights` rectangles for marks to appear.
- Pins show the note in a speech-bubble on hover and keyboard focus; on touch the first tap previews, the second opens the note. Escape closes the bubble.
- `noteColors`: on by default with the five `DEFAULT_NOTE_COLORS`; `false` hides the palette, or `{ value, label? }[]` / CSS colour strings. A `label` shows in a bubble on hover and focus; without one the `noteColorLabel` message is used ("Group {n}"). `noteGroups`: `{ key, label, description?, color? }[]`. `noteGroupProvider(signal)` returns groups from the host and replaces `noteGroups`. Annotations gain optional `color` and `groupKey`; the host persists them through `annotationProvider`. The editor shows a palette and group picker (with the group description); the notes panel shows the group label and a group filter. Without these options nothing changes.
