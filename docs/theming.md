# Theming & Customization

FlipbookEngine provides deep customization support through compiled CSS custom properties (variables) and dark-mode compatibility.

## CSS Custom Properties

The styling system is driven by standard CSS variables. You can override these variables globally in your stylesheet or per-instance:

```css
:root {
  --mainbgcolor: #f3f6fb;          /* Main canvas background */
  --surfacebgcolor: #ffffff;       /* Overlay elements background */
  --panelbgcolor: #172033;         /* Settings panel background */
  --accentcolor: #7367f0;          /* Buttons and accent color */
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
    accentcolor: '#10b981'
  }
});
```
