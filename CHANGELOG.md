# Changelog

## Unreleased

- Search providers can report indexing progress through an optional fourth `reportProgress({ completed, total })` argument; the engine emits a `searchProgress` event and the search panel shows a progress bar while the search runs.
- Optional `optimisticNotes` mode: page notes and coordinate notes appear immediately, are persisted in order in the background and roll back to the last saved state when the host rejects the save.
- Coordinate-note pins are smaller (14px by default) and sized with the `notePinSize` option or the `--flipbook-note-pin-size` CSS variable.
- Search hits draw one clean mark instead of a strike plus a bubble; `searchHighlightStyle: 'underline' | 'bubble'` (default `underline`).
- Hovering, focusing (or tapping, on touch) a note pin shows the note in a speech-bubble popover; Escape closes it.
- Note colours and groups: `noteColors` (`true` for five defaults), `noteGroups`, `noteGroupProvider`; annotations carry `color` and `groupKey`; palette and group picker in the note editor, group label and filter in the notes panel. Everything stays off when the options are absent.
- Touch and keyboard polish: double-tap zoom, Safari pinch gestures, pan limited to the zoomed page, stale pan offset cleared when pinching back to 1x, arrow keys pan a zoomed page, PageUp/PageDown in the shortcut help, tab roles with arrow keys in the notes panel, Escape closes one layer at a time, pin bubble closes on an outside tap and stays open while the pointer moves into it, haptic tick on long-press note placement, safe-area insets for notched devices, note editor kept above the on-screen keyboard.

## 1.0.3 - 2026-10-24

- Fixed placing coordinate notes on Node 18 and on pages served over plain HTTP, where the browser or runtime has no `crypto.randomUUID`; the viewer now falls back to a generated note id.

## 1.0.2 - 2026-10-24

- Native backend search, page-note and coordinate-annotation providers, including multiple note markers per page and host-owned persistence.
- Optional restricted rich-note editor factory and validated structured-note rendering; native note list, marker popups, edit/delete and failed-save draft retention.
- Responsive native panels and More actions menu, localized keyboard help, focus restoration and gesture isolation for notes, zoom and page navigation.
- Optional backend text-layer provider for image/WebP books, with schema v1 normalized logical-page runs and UTF-16 offsets.
- Bounded current/adjacent-page loading, abort/stale-response isolation, defensive geometry validation and opt-in native text selection.
- Isolated page images from host padding/margins so normalized overlays align with the complete page viewport.
- Select-text command in the native More actions menu; Escape exits selection without hijacking page flipping or note gestures.
- Backend search highlights continue to work independently of a text layer. OCR, persistence and search indexing remain host responsibilities.
- Muted toolbar and More-menu items no longer show a diagonal strike line; they are only dimmed.
- Toolbar play/pause and sound icons now switch by rendering a single icon instead of toggling two hidden ones.
- The bottom toolbar adapts its buttons to the available width.
- PDF mode renders the previous, current and next pages ahead of time (and the facing page in two-page view), so flipping shows pages without a blank flash; zoom reuses the rendered page image.
- Page overlays (text layer, search highlights, hotspots, note placement) are drawn only in single-page view where they belong; page images no longer use native lazy loading.
- The note popover is more compact, with smaller action buttons on mouse devices and touch-sized buttons on touch devices.
- Removed a duplicate region landmark around the viewer for cleaner screen-reader navigation.
- Fixed a type error in PDF page rendering when a rendered page has no image data.

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
