# Drawing and highlighting

Readers can highlight and draw on any page: image pages, PDF pages and page-source pages. Strokes are kept per document and per page, in normalised page coordinates, so they stay in place through zoom, single and two-page view and image tiers. The feature is off by default; without the `drawing` option nothing changes.

The engine ships the user interface, the stroke model and a provider interface. It never talks HTTP itself: the host stores the strokes by implementing `FlipbookDrawingProvider` (see below), the same way notes and annotations work.

## Turn it on

```js
const engine = new FlipbookEngine('#viewer', {
  drawing: true,
  documentId: 'catalog-2026'
});
await engine.init('/catalog.pdf');
```

The toolbar now has a Pen button. It turns drawing mode on and opens the drawing panel; the close button, `Escape` or the Pen button again leaves the mode.

`drawing` may also be an object:

```js
drawing: {
  colors: ['#ffeb3b', '#4caf50', '#e91e63', '#212121'], // swatches in the panel, first one is the initial colour
  defaultTool: 'highlight',                              // 'highlight' | 'pen' | 'eraser'
  defaultWidth: 15,                                      // px at fit zoom; omitted: 15 for highlight, 3 for pen
  defaultOpacity: 0.5,                                   // omitted: 0.5 for highlight, 1 for pen
  tools: ['highlight', 'pen', 'eraser']                  // tools the panel offers
}
```

The default colours are yellow `#ffeb3b`, green `#4caf50`, cyan `#00bcd4`, pink `#e91e63`, red `#f44336` and black `#212121`. Colours must be plain CSS colour values; values with quotes, braces or semicolons are dropped.

`documentId` identifies the document for the provider. When it is missing the engine falls back to a string `rememberPage`, then the PDF url, then the first page image. Set it yourself when those can change.

## The panel

| Control | What it does |
| --- | --- |
| Highlight / Board pen | The mode. Highlight is translucent and multiplies with the page (default 50 % opacity, 15 px). Board pen is opaque (3 px). |
| Colour swatches | The stroke colour. Picking one while the eraser is on goes back to the last mode. |
| Opacity | 10 to 100 %. |
| Width | Highlight 4 to 48 px, pen 1 to 16 px, in CSS px at fit zoom (the stroke grows with a zoomed page). |
| Preview | A sample stroke with the current colour, opacity and width (not shown on phone width). |
| Eraser | Removes the stroke under the pointer on tap or drag. |
| Undo, Redo | Step through your own changes. A new stroke clears the redo stack. |
| Clear page | Asks for confirmation in the panel, then removes every stroke of the visible page (both pages of a spread). It is one undo step. |
| Close | Leaves drawing mode. |

Every control calls `setDrawingTool`, so `engine.getDrawingTool()` is always what the panel shows, and code that calls `setDrawingTool` moves the panel too.

Keyboard and screen readers: all controls are buttons, sliders or a radio group with labels, in tab order. Focus moves into the panel when it opens and back to the Pen button when it closes. `Escape` cancels a pending clear confirmation first and closes the panel on the next press. Drawing itself needs a pointer (mouse, touch or pen).

On widths up to 767 px the panel is a compact bottom sheet (at most 42 % of the reader), so the page stays visible. The panel uses the `--flipbook-*` theme variables and follows light and dark themes.

Texts live in the locale messages (`drawingPen`, `drawingPanel`, `drawingHighlight`, `drawingBoardPen`, ...). English and Turkish are built in, other locales fall back to English; override any of them with the `messages` option.

## Drawing mode and page changes

While drawing mode is on, one pointer draws. Page turning by drag, swipe, corner fold, click and keyboard keys, double-tap zoom, text selection, note placement and auto play are off; pinch zoom works, and two fingers never draw.

The page arrows and the page buttons in the toolbar stay usable, because they are explicit controls. Changing the page this way (or with the thumbnails or `goToPage`) keeps drawing mode on, and it flushes pending saves: strokes drawn on the page you leave are sent to the provider at once instead of waiting for the 800 ms debounce.

## Storage: the provider

```ts
interface FlipbookDrawingProvider {
  load(ctx: { documentId: string; pages: number[] }, signal: AbortSignal): Promise<FlipbookStroke[]>;
  save(ctx: { documentId: string }, changes: { added: FlipbookStroke[]; removed: string[] }, signal: AbortSignal): Promise<{ ids?: Record<string, string> }>;
  clearPage?(ctx: { documentId: string; page: number }, signal: AbortSignal): Promise<void>;
}
```

- `load` is called lazily for the visible pages (zero-based indexes), once per page.
- Changes show at once. About 800 ms after the last change, on page change and on destroy, one batch is sent to `save`. If `save` rejects, the batch rolls back, `drawingError` fires with code `save` and the undo history is cleared.
- `save` may return `ids` to rename client stroke ids to backend ids.
- `clearPage` is optional; without it, Clear page sends the stroke ids as `removed`.
- Without a provider, strokes live in memory and are lost when the page closes. `drawingStorage: 'local'` keeps them in `localStorage`, which is meant for demos only.

### Example against a REST backend

The shape below matches the planned backend: list by pages, save a batch, clear a page. Tenant and user come from the session on the server, never from the request.

```ts
import type { FlipbookDrawingProvider } from 'flipbookengine';

export function createRestDrawingProvider(base: string, csrf: string): FlipbookDrawingProvider {
  const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf };
  const check = async (response: Response) => {
    if (!response.ok) throw new Error(`Drawing request failed: ${response.status}`);
    return response;
  };
  return {
    async load({ documentId, pages }, signal) {
      const query = pages.map((page) => `pages=${page}`).join('&');
      const response = await check(await fetch(`${base}/documents/${encodeURIComponent(documentId)}/drawings?${query}`, { headers, signal }));
      return response.json(); // FlipbookStroke[]
    },
    async save({ documentId }, changes, signal) {
      // keepalive lets the last batch survive a closing tab (the body must stay under 64 KB).
      const response = await check(await fetch(`${base}/documents/${encodeURIComponent(documentId)}/drawings/batch`, {
        method: 'POST', headers, signal, keepalive: true, body: JSON.stringify(changes)
      }));
      return response.json(); // { ids?: { [clientId]: backendId } }
    },
    async clearPage({ documentId, page }, signal) {
      await check(await fetch(`${base}/documents/${encodeURIComponent(documentId)}/drawings/pages/${page}`, { method: 'DELETE', headers, signal }));
    }
  };
}
```

On the server, validate the same limits the engine applies: points per stroke (5000), strokes per page, payload size, colour format and opacity range 0 to 1.

## Events and methods

Events: `drawingChange` (strokes added, removed, cleared, undone, redone, loaded or rolled back), `drawingError` (`load`, `save`, `clear` or `storage`) and `drawingModeChange` (`{ active }`).

Methods: `setDrawingMode`, `isDrawingMode`, `setDrawingTool`, `getDrawingTool`, `getStrokes`, `addStroke`, `removeStroke`, `clearStrokes`, `undoStroke`, `redoStroke`. Details and payloads are in [api-reference.md](api-reference.md#drawing). React and Vue usage is in [frameworks.md](frameworks.md#drawing).

## Limits

- The iframe bridge forwards the `drawing` option and the three events, but a provider function cannot cross the iframe.
- Pen pressure is not used. When a pen is in use, touch does not draw for 0.8 s after the last pen event (palm rejection).
- A real iPad, Android tablet and touch board check is still to do.
