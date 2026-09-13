# Migration Guide for 0.5.0

## Scope

FlipbookEngine 0.5.0 makes PDF-backed viewers responsive for large documents. Page markup is created from PDF metadata, while rendered page images are requested only for the current/nearby pages or when a page becomes visible.

## Runtime behavior changes

- `init()` resolves after the first PDF page has rendered. The next page is prefetched in the background.
- PDF render requests are deduplicated and cancelled when a newer initialization starts or the engine is destroyed.
- `pdfRenderConcurrency` continues to bound PDF.js work (default `3`).
- `pdfRenderCacheSize` controls a per-instance least-recently-used cache (default `32`). Set it to `0` to disable retention of rendered page images.
- `progress` reports loading and rendering phases; `error` reports `PDF_LOAD_FAILED` and `PDF_RENDER_FAILED` failures.
- Browser, React, and Vue wrappers share the same lifecycle-safe on-demand behavior.
- Keyboard controls and visible focus states remain available, and `prefers-reduced-motion: reduce` disables page-turn animation and shortens CSS transitions.

## Consumer checks

- Keep `pdfjs-dist` installed as the production dependency and provide `pdfWorkerSrc` from the host bundler or CDN.
- If an application assumed that every PDF page image existed immediately after `init()`, listen for `progress` events or select the page before reading its image element.
- Choose a cache size based on available memory and page dimensions. A value of `0` is appropriate for strictly bounded memory usage.

## Verification

Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` (after installing Playwright browsers) before shipping an integration.