# Backend text layers

## Ownership and compatibility

The viewer consumes host-generated text; it never uploads a PDF, runs OCR, writes a database or supplies authoritative extraction results. Existing image books and Direct PDF books work without a text provider. The API is available from 1.0.2.

## Schema v1

`textLayerProvider(pageIndex, signal): Promise<FlipbookTextPage | null>` returns a logical-page payload. Indexes are zero-based. Return null for unavailable/OCR-pending text. Provider errors do not break image navigation. Providers must honor AbortSignal for network cancellation. Reinitialize to change document identity/provider or retry failed pages.

`FlipbookTextPage`: schemaVersion:1, pageIndex, revision:string, text:string, runs:FlipbookTextRun[]. Revision identifies an immutable source/extraction generation. Hosts must reject a text/image source mismatch before returning data.

`FlipbookTextRun`: text, start (UTF-16 code units into page text), x, y, width, height (finite 0..1 values), optional direction:ltr|rtl. Runs are ordered, nonoverlapping in text offsets and must match their source substring. Max 100,000 page characters and 20,000 runs; invalid pages are rejected. Do not pass user HTML.

Coordinates use top-left origin in the **displayed logical page**, after PDF CropBox and rotation. All image variants must depict precisely that same viewport. Spread/cropped assets require the host to remap each logical half; full-source coordinates must never be applied unchanged to a half-page. Provider geometry precision is explicit: PDF text-run boxes highlight runs, not exact glyphs or words. Rotated/vertical text needs a provider-specific oriented layer for exact selection; schema v1 provides enclosing rectangles.

## Selection and loading

`textSelection?: boolean` defaults false. `engine.setTextSelection(enabled)` changes the mode. More actions provides the same control only when a provider exists. Escape exits. Selection uses native browser text selection over transparent runs; page flipping/long-press note placement are suppressed in selection mode. Toolbar and keyboard pagination remain available. Use a page's text payload directly for a separate accessible reading view when necessary; transparent fixed-layout spans are not a reflowable document.

At most three pages are retained: current and immediate neighbors. Navigating away aborts pending calls. Destroy and reinitialization abort the session and reject stale completions. null/error pages are retried after leaving their visible range or reinitializing. This API is independent of image resolution and optional backend search.

## Search highlights from the text layer

A search result may carry normalized `highlights`; those always win. When a result has none and the page's text layer is loaded, the viewer highlights every case-insensitive occurrence of the query in the page text, one rectangle per overlapped run (offsets inside a run are interpolated, so rectangles are run-accurate rather than glyph-exact). This works in single-page and double-page views; both pages of a spread are inside the three-page text window.

## Example

```ts
const engine = new FlipbookEngine(container, {
  textLayerProvider: async (pageIndex, signal) => {
    const response = await fetch('/books/42/versions/3/pages/' + pageIndex + '/text', { signal });
    if (!response.ok) throw new Error('Text unavailable');
    return response.json();
  },
  searchProvider: async (query, options, signal) => {
    // Host endpoint returns pageIndex, pageNumber, matches, snippet and normalized highlights.
    return searchBook(query, { ...options, signal });
  }
});
await engine.init('', [{ id:'page-0', pageNumber:1, normal:'/normal/1.webp', low:'/small/1.webp', thumb:'/thumb/1.webp' }]);
```

Hosts must authorize every manifest/text/search request, protect against stale source generations and keep extraction bounded. OCR-produced runs can use the same contract once normalized to the displayed page geometry.
