# Getting Started

Welcome to **FlipbookEngine**! This guide will help you set up and embed FlipbookEngine into your web applications.

## Quick Installation

You can install FlipbookEngine via npm:

```bash
npm install flipbookengine
```

Or reference it directly via CDN (such as unpkg) in your HTML:

```html
<link rel="stylesheet" href="https://unpkg.com/flipbookengine/dist/flipbook-engine.css" />
<script src="https://unpkg.com/flipbookengine/dist/flipbook-engine.iife.js"></script>
```

## Setup Container

Create an element in your HTML that will contain the flipbook viewer. Ensure the container has explicit dimensions:

```html
<div id="viewer" style="width: 100%; height: 600px;"></div>
```

## Initialize the Engine

Import `FlipbookEngine` (if using ESM) and instantiate it:

```javascript
import { FlipbookEngine } from 'flipbookengine';
import 'flipbookengine/dist/flipbook-engine.css';

const engine = new FlipbookEngine('#viewer', {
  allowDownload: true,
  showThumbs: true,
  primaryColor: '#7367f0'
});

// Load the PDF catalog file along with its rendered images
await engine.init('/files/catalog.pdf', [
  { kind: 'cover', pageNumber: 1, normal: '/img/1.jpg', low: '/img/1-low.jpg', thumb: '/img/1-thumb.jpg' },
  { kind: 'spread', pageNumbers: [2, 3], normal: '/img/2-3.jpg', low: '/img/2-3-low.jpg', thumb: '/img/2-3-thumb.jpg' }
]);
```

## Mixed Page Spreads

FlipbookEngine supports loading single pages, spreads (double-pages), and covers mixed together. The engine will automatically normalize spreads (cutting them into left and right halves on portrait viewports) for responsive mobile viewing.
