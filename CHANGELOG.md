# Changelog

## Next (unreleased)

- added an origin-validated iframe embed bridge with parent-side command and event helpers
- documented embed navigation, zoom, single-mode, runtime options, fullscreen, state queries, and explicit-origin security configuration
- added regression tests for embed commands, origin/window filtering, and event forwarding
- added opt-in deep links with browser history synchronization, shareable page URLs, and native-share/clipboard fallback
- added regression coverage for initial URL pages, URL updates, and popstate navigation
- added a localized toolbar Share button with native-share/clipboard fallback and an optional `onShare` host callback
- added regression coverage for toolbar share invocation, generated page URLs, callback delivery, and Turkish localization
- added host-managed bookmark state with localized toolbar control, public methods, and `bookmarkChange` events
- added host-managed page notes with initialization options, public methods, `noteChange` events, and iframe event forwarding

## 0.6.5

- added automatic A3 landscape PDF splitting with configurable auto, single, and split modes
- added source-page-aware lazy rendering for split PDF pages
- added optional light/dark viewer backgrounds and responsive presentation gutters
- enlarged the opt-in thumbnail rail and moved page labels into transparent, high-contrast overlays
- kept thumbnail labels black in both themes and preserved a thin neon selected state
- enabled native mobile scrolling to avoid non-cancelable touchstart interventions
- fixed single-view PDF hydration after switching from spread mode
- added regression coverage for PDF splitting, backgrounds, presentation layout, and PDF hydration

## 0.6.0

- added a localized, theme-aware Table of Contents panel with nested host-provided page entries
- added TOC visibility events, page navigation, normalization, accessibility, and regression tests

## 0.5.4

- restored the modular FlipbookEngine source line after an unreleased post-0.5.3 source regression
- hardened engine lifecycle cleanup, locale API compatibility, and PDF render error propagation
- added regression coverage for the fixes above
- The published 0.5.3 package remains valid; upgrade to 0.5.4 or later for the fixes in this release. The post-tag source regression was not published to npm.

## 0.5.3

- pinned the jsdom test dependency to a Node 18-compatible release so the full CI matrix runs consistently



## 0.5.2

- restored the domwise project acknowledgement in the package README
- kept commercial backend roadmap details separate from the open-source viewer documentation



## 0.5.1

- removed maintainer-only npm publishing instructions from the package README
- clarified the open-source viewer and commercial backend roadmap



## 0.5.0

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

