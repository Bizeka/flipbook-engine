# Changelog

## 1.0.0 - 2026-09-14

- first stable open-source release of the FlipbookEngine viewer
- added framework-agnostic plugin contract with install/uninstall lifecycle, typed events, toolbar buttons, panels, and namespaced APIs
- added independent `flipbookengine/core` and `flipbookengine/plugins/*` entry points for notes, bookmarks, TOC, search, annotations, hotspots, share, and deep links
- added runtime `getToc()/setToc()` APIs and origin-validated iframe TOC read/update commands
- added interactive hotspot overlays with image/video/audio previews, selectable image galleries, and commerce/product links
- added plugin and embed regression coverage; full suite passes 84/84 tests
- documented PDF outline extraction, OCR, analytics, backend rendering, and protected downloads as commercial/backend responsibilities
- breaking change: 0.x releases were alpha/beta and are not compatibility guarantees; applications should validate imports and options against the 1.0 API before upgrading
- 0.8.0 to 1.0.0 migration: documented public entrypoint changes, explicit plugin activation/deactivation, nested TOC/embed APIs, expanded hotspot payloads, and the unchanged image-mode search limitation
- added an origin-validated iframe embed bridge with parent-side command and event helpers
- added opt-in deep links, localized share controls, host-managed bookmarks and notes, and their regression coverage
- added localized notes toolbar/editor; persistence remains with the host application

## 0.8.0 - 2026-09-14

- added precise PDF.js text-match rectangles and logical left/right split-page mapping
- replaced full-page search tint with lightweight text-position highlights
- hardened DOMWise search result rendering so result buttons are not stringified
- unified search and note focus styling with a single thin accent border and glow
- disabled text search in image/WebP page-list mode with localized explanation; download URL handling remains independent
- added localized image-mode messaging and regression coverage

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
