# Migration Guide for 0.4.0

## Scope

FlipbookEngine 0.4.0 is the stabilization release described by the audit plan. It keeps the core public navigation methods while making lifecycle, state, wrapper, event, and viewer behavior deterministic across multiple instances.

## Required consumer checks

- Keep `pdfjs-dist` installed as the production dependency and provide `pdfWorkerSrc` from the host bundler or CDN. PDF.js is intentionally external to the FlipbookEngine bundle.
- If host CSS or automation selected fixed viewer IDs, migrate to the instance-scoped classes such as `.bk-book-wrapper`, `.bk-book-sizer`, `.bk-book`, and `.bk-single-view` within the engine container.
- Treat `pages` as optional when `pdfUrl` is provided. Framework wrappers may update `pdfUrl` and `pages` independently without triggering duplicate initialization.
- Image-only viewers do not render a download button because no PDF URL is available.

## Runtime behavior changes

- Each `FlipbookEngine` instance owns its reactive state; internal singleton store imports must not be used by integrations.
- A newer `init()` or `destroy()` cancels stale PDF loading, rendering, timers, and listeners.
- `progress` and `error` events are available for PDF loading/rendering telemetry and failure handling.
- High-quality page assets are promoted when pages become visible. PDF rendering uses bounded concurrency controlled by `pdfRenderConcurrency` (default `3`).
- Toolbar and thumbnail controls expose accessible names, state, and keyboard interaction.

## Verification

Before shipping an integration, run `npm run typecheck`, `npm test`, and `npm run build` against the locked 0.4.0 dependency tree.