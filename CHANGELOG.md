# Changelog

## 1.2.1 - unreleased

- Fixed returning from single-page to two-page mode inside hosts whose own stylesheet has a `.bk-book` rule (SmartLearn shelf cards): switching hid the book by rewriting its style attribute, which dropped the inline width page-flip had set, so the host rule shrank the book and page-flip fell back to one small portrait page. The book is now hidden by a class, and its sizing rule is scoped under the sizer.

## 1.2.0 - 2026-10-27

1.1.2 was never published; its changes ship in 1.2.0.

- Hotspots can embed YouTube and Vimeo videos: `media: { type: 'embed', src }` takes a watch, share, shorts or embed link, and a YouTube or Vimeo link given as `type: 'video'` is embedded too. Players load lazily from youtube-nocookie.com or Vimeo with do-not-track, in a sandboxed iframe that allows fullscreen but no popups or navigation, so readers stay in the viewer; a `t=` / `start=` time is kept. Other hosts are never framed and show as a link. The popup widens to 420px for a 16:9 player. `resolveEmbedUrl` is exported.
- Fixed returning from single-page mode to the two-page spread: the hidden book measured zero width, the page-flip library fell back to portrait and the viewer stayed at single width on the wrong page. Orientation is reset when leaving single mode, relayout is skipped while the book is hidden and the reader page is re-applied after every relayout.
- Fixed the reader jumping back to an earlier page when entering or leaving fullscreen (or resizing) in single-page mode, caused by the hidden library overwriting the current page.
- The single-page toggle stays in the toolbar instead of the overflow menu.
- Fixed a blank spread after switching from single-page to two-page mode or jumping to a page that was not on screen yet: the lazy loader replaced the rendered PDF page with its empty placeholder. Leaving single-page mode also no longer turns an extra page.
- The notes and search panels are more compact: 300px wide, smaller tabs, add button, note field and list items (touch screens keep 40px targets).
- The note colour palette is on by default (five `DEFAULT_NOTE_COLORS`); pass `noteColors: false` to hide it. Swatches are smaller (20px, 32px on touch).
- Coordinate-note pins default to 10px with a thin 1px accent ring when hovered or active.
- Reopening a document returns to the last page read on this device (`rememberPage`, on by default, keyed by the source URL or a given document key); `startPage` opens at a host-saved page, for example one stored from `pageChange`. Double-page layout shows the spread that contains it. The thumbnail rail now scrolls to the active page.
- Leaf edges beside the open spread: their total thickness follows the page count and each side shows its share of read and unread pages. They scale with resizing and zoom; hide them with `.bk-page-stack { display: none; }`.
- Search highlights sit on the word: boxes cover the ascent and descent from the baseline and use proportional glyph widths. New default style `highlight` paints a semi-transparent marker over the word; `underline` (3px, below the word) and a larger, softer `bubble` remain; all follow `--flipbook-search-highlight`.
- Note colour swatches show their name in a small bubble on hover or focus; without a host label they read "Group 1", "Group 2" (Turkish "1. Grup").
- Security: hotspot and gallery links and the default PDF download only accept relative, http(s), mailto and tel URLs; `javascript:`, `data:` and other schemes are dropped. The download opens with `noopener`. `safeLinkUrl` is exported.
- Fixed a hotspot click also turning the page when the hotspot sits on the right-hand page; the press no longer reaches page-flip.
- Thumbnails are 10% smaller.
- `background.light/dark.image` also accepts CSS gradients and inline SVG markup.
- Form fields (search, note editor, note group selects and rich note editors) show focus with a flat 1px accent border instead of a glow and an outer outline ring.
- The viewer no longer collapses when its host element has no definite height: it has a 390px minimum (`--flipbook-min-height`) and falls back to 80dvh, so it follows the viewport at any browser or OS zoom level.

## 1.1.1 - 2026-10-26

- The 1.1.0 npm tarball was published with a stale `dist` that lacked the 1.1.0 code and types. 1.1.1 ships the same features rebuilt: `prepublishOnly` now cleans and rebuilds `dist` and runs `check:dist`, which fails the publish when the build is missing, older than the sources or lacks the new public names. Screenshots under `docs/screenshots` are no longer packed.

## 1.1.0 - 2026-10-26 (use 1.1.1; its npm package had a stale build)

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
