# Changelog

## 0.5.0 (upcoming)

- added on-demand PDF page rendering with first-page readiness and next-page prefetch
- added bounded per-instance PDF render cache via `pdfRenderCacheSize`
- added React/Vue wrapper, browser E2E, and large-document regression coverage
- added reduced-motion support for JavaScript page turns and CSS transitions
- removed test exception suppression so asynchronous teardown failures surface



## 0.4.0

- externalized PDF.js as an npm dependency with consumer-provided worker configuration
- fixed PDF-only initialization when `pages` is omitted
- isolated engine state and lifecycle cancellation per instance
- aligned framework wrappers, events, options, fullscreen, audio, and download controls
- added progressive image quality loading and bounded PDF rendering with cancellation
- added accessibility semantics, structured PDF progress/error events, and expanded regression tests
- added CI dependency audit, reproducible package verification, and provenance-enabled release workflow

## 0.1.0

- renamed public product identity to FlipbookEngine
- introduced dual-license documentation structure
- prepared package metadata for public distribution
- preserved legacy `BizekaFlipEngine` compatibility alias
- added contribution, security, and trademark policy documents

