# API Reference

This document describes the options, methods, and events exposed by the `FlipbookEngine` class.

## Constructor Options

When instantiating `new FlipbookEngine(selector, options)`, you can configure the following options:

| Property | Type | Default | Description |
|---|---|---|---|
| `allowDownload` | `boolean` | `true` | Exposes a download button in the toolbar. |
| `showThumbs` | `boolean` | `true` | Starts the viewer with the thumbnail navigation rail open. |
| `primaryColor` | `string` | `'#7367f0'` | Sets the primary theme accent color. |
| `theme` | `'auto' \| 'light' \| 'dark'` | `'auto'` | Force light/dark mode or let it respond automatically. |
| `locale` | `'en' \| 'tr' \| string` | `'en'` | Active language interface. |
| `soundEnabled` | `boolean` | `true` | Enables page turning sound effect. |
| `soundUrl` | `string` | `'https://flipbookengine.com/Content/page-flip.mp3'` | URL of the page turning audio file. |
| `autoPlayInterval` | `number` | `3000` | Duration (ms) before automatically turning to the next page in Autoplay mode. |
| `flippingTime` | `number` | `1000` | Duration (ms) of the page turning animation. |
| `maxShadowOpacity` | `number` | `0.5` | Maximum opacity of the shadow during page turn (0 to 1). |
| `messages` | `Record<string, PartialFlipbookMessages>` | `null` | Custom localization overrides. |
| `cssVariables` | `Record<string, string>` | `null` | Per-instance custom CSS property overrides. |
| `whiteLabel` | `boolean` | `false` | If true, hides the "Powered by FlipbookEngine" watermark. |
| `watermarkUrl` | `string` | `null` | Custom image logo URL for watermark attribution. |

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

### `setLocale(locale: string, messages?: PartialFlipbookMessages)`
Changes the UI language programmatically.

### `destroy(clearMarkup = true)`
Tears down the instance, unsubscribes all event handlers, and optionally clears the container element HTML.

---

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
  - Payload: `{ showThumbs: boolean }`
- **`destroy`**: Emitted when the engine is destroyed.
