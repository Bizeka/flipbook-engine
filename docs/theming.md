# Theming & Customization

FlipbookEngine provides deep customization support through compiled CSS custom properties (variables) and dark-mode compatibility.

## CSS Custom Properties

The styling system is driven by standard CSS variables. You can override these variables globally in your stylesheet or per-instance:

```css
:root {
  --mainbgcolor: #f3f6fb;          /* Main canvas background */
  --surfacebgcolor: #ffffff;       /* Overlay elements background */
  --panelbgcolor: #172033;         /* Settings panel background */
  --flipbook-accent: #7367f0;          /* Buttons and accent color */
  --thumbrailbgcolor: #0f172a;     /* Thumbnails container background */
  --bordercolor: #e2e8f0;          /* Border and separations color */
  --textcolor: #1e293b;            /* General text color */
}
```

## Dark Mode

FlipbookEngine is compatible with Bootstrap 5 setups and automatically responds to light/dark themes in the hosting environment.

- It queries `data-bs-theme="dark"` on the body/parent element to toggle styling.
- You can force dark theme on initialization:
  ```javascript
  const engine = new FlipbookEngine('#viewer', {
    theme: 'dark'
  });
  ```

## Instance Overrides

To style a single instance differently from the rest of your app, pass the `cssVariables` object to options:

```javascript
const engine = new FlipbookEngine('#viewer', {
  cssVariables: {
    mainbgcolor: '#0f172a',
    flipbook-accent: '#10b981'
  }
});
```


## Stable Class Names

Hosts may style or query these classes; they keep their names and meaning within a major version. Anything else in the viewer markup is internal and can change in a patch release.

| Class | Element |
|---|---|
| `.bk-wrapper` | Viewer root inside the host element |
| `.bk-toolbar`, `.bk-btn` | Toolbar and its buttons |
| `.bk-btn--single`, `--fullscreen`, `--notes`, `--share`, `--bookmark`, `--download`, `--autoplay`, `--sound`, `--text-selection`, `--plugin` | Specific toolbar commands |
| `.bk-more`, `.bk-more-menu` | Overflow menu (…) and its panel |
| `.bk-book-wrapper` (+ `single-mode`, `double-mode`, `bk-is-cover`, `bk-is-back-cover`, `zoomed`) | Stage that holds the book; the modifiers describe the layout |
| `.bk-book-sizer` | Box sized to the visible spread or page |
| `.bk-book` (+ `is-hidden`, `is-flipping`) | The page-flip book (double layout) |
| `.bz-page` with `data-idx`, `.bz-page-content` | One page of the book and its content box; `data-idx` is the zero-based page index |
| `.bk-single-view`, `.bk-single-page` with `data-idx` | Single-page view and its page |
| `.bk-page-stack` (+ `--left`, `--right`) | Leaf edges beside the spread |
| `.bk-thumbs`, `.thumb-item` (+ `active`) | Thumbnail rail and items |
| `.bk-hotspot`, `.bk-hotspot-popup` | Hotspot button (plus the host's `className` and `data-*`) and its popup |
| `.bk-annotation-marker` (+ `active`), `.bk-note-bubble` | Coordinate-note pin and its hover bubble |
| `.bk-notes-panel`, `.bk-search-panel`, `.bk-toc` | Side panels |
| `.bk-search-highlight-layer` (+ `is-highlight`, `is-underline`, `is-bubble`), `.bk-search-text-highlight` | Search marks |

Do not reuse these names for the host's own elements. A host rule such as `.bk-book { width: 128px }` also hits the viewer; prefix host classes instead (for example `.sl-shelf-book`). To map a pointer position to a page, use `engine.pointToPage(clientX, clientY)` rather than measuring `.bz-page-content` yourself.

## Viewer Size

The viewer fills its host element. When the host has no definite height it keeps a minimum of `--flipbook-min-height` (default `390px`) and falls back to `80dvh`, so it follows the viewport at any browser or operating-system zoom level.

## Search Highlights, Leaf Edges and Pins

| Variable | Default | Purpose |
|---|---|---|
| `--flipbook-search-highlight` | `#e5484d` | Colour of search marks in every `searchHighlightStyle`. |
| `--flipbook-page-edge-max` | `18px` (`12px` below 768px) | Largest thickness of the leaf edges beside the spread. |
| `--flipbook-page-edge-color` | `#faf8f2` | Paper colour of the leaf edges. |
| `--flipbook-page-edge-line` | `#c3bdb0` | Line colour between leaves. |
| `--flipbook-note-pin-size` | `10px` | Diameter of coordinate-note pins (same as the `notePinSize` option). |

Hide the leaf edges with `.bk-page-stack { display: none; }`. Thumbnails are 51x73px (43x61px on small screens). Form fields show focus with a flat 1px `--flipbook-accent` border, without a glow or an outer ring.

## Optional Light/Dark Viewer Backgrounds

A host can provide separate, optional backgrounds for the viewer surface. The default is null, so the built-in theme surfaces remain unchanged. Backgrounds are applied outside the PDF pages and automatically follow the selected light, dark, or auto theme.

```ts
const engine = new FlipbookEngine('#viewer', {
  theme: 'auto',
  background: {
    light: { color: '#f8fafc', image: '/branding/catalog-light.webp', size: 'cover', position: 'center', repeat: 'no-repeat' },
    dark: { color: '#0f172a', image: '/branding/catalog-dark.webp', size: 'cover' }
  }
});
```

`image` accepts a URL (PNG, JPG, WebP, SVG or a data URL), a CSS gradient, or inline SVG markup:

```ts
background: {
  light: { image: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)' },
  dark: { image: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="1.5" fill="#334155"/></svg>', repeat: 'repeat' }
}
```

The viewer reserves a bottom attribution area and uses equal responsive page gutters so the watermark does not overlap PDF content. Thumbnail rail scrolling is horizontal-only; thumbnail dimensions are reduced responsively to avoid vertical overflow.
