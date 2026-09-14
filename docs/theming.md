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

The viewer reserves a bottom attribution area and uses equal responsive page gutters so the watermark does not overlap PDF content. Thumbnail rail scrolling is horizontal-only; thumbnail dimensions are reduced responsively to avoid vertical overflow.
