# Framework Integrations

FlipbookEngine ships with built-in, type-safe wrappers for React (16.14 or newer) and Vue (3.2 or newer). Both create one engine for the mounted component, destroy it on unmount, and give you the engine itself for anything the wrapper does not cover.

Import the stylesheet once, from the package's `styles.css` export:

```ts
import 'flipbookengine/styles.css';
```

## React Wrapper

```tsx
import React, { useRef } from 'react';
import { Flipbook, FlipbookRef } from 'flipbookengine/react';
import 'flipbookengine/styles.css';

function App() {
  const flipbookRef = useRef<FlipbookRef>(null);

  const handleNextPage = () => {
    flipbookRef.current?.goToPage(flipbookRef.current.getCurrentPage() + 1);
  };

  return (
    <div style={{ height: '80vh' }}>
      <button onClick={handleNextPage}>Next Page</button>

      <Flipbook
        ref={flipbookRef}
        pdfUrl="/catalog.pdf"
        pages={[
          { normal: '/1.png', low: '/1-low.png', thumb: '/1-thumb.png' },
          { normal: '/2.png', low: '/2-low.png', thumb: '/2-thumb.png' }
        ]}
        showThumbs={false}
        onPageChange={({ currentPage }) => console.log('page index', currentPage)}
      />
    </div>
  );
}
```

### Props

- Every [engine option](api-reference.md#constructor-options) is a prop (`allowDownload`, `showThumbs`, `theme`, `hotspots`, and so on).
- `pdfUrl` and `pages` are the source, as for `engine.init(pdfUrl, pages)`.
- `className` and `style` apply to the host `div`, which fills its parent (`minHeight` 400px). Give the parent a height.
- Engine events are props named `on` plus the event name: `onPageChange`, `onError`, `onHotspotOpen`, `onHotspotClose`, `onAnnotationActivate`, `onNoteChange`, `onSearchChange`, and so on for every [supported event](api-reference.md#supported-events) except `destroy`. The latest function is always the one called, and changing it does not re-subscribe. They are not engine options.

### What a re-render does

A re-render sends the engine only the options that changed (compared by identity), so the book keeps what the reader changed in the viewer: bookmarks, notes, the thumbnail rail and the single-page layout. A new `pages` array with equal contents does not reload the book; a change in any page, or in `pdfUrl`, does. Pass stable references for object options such as `hotspots`, `messages` and `toc` (`useMemo`), or they are re-sent on every render.

### Ref

`FlipbookRef` has `getCurrentPage()`, `getTotalPages()`, `goToPage(index)`, `nextPage()`, `prevPage()` (plus the aliases `flipNext`, `flipPrev`, `turnToPage`) and `engine`, the `FlipbookEngine` instance (`null` before mount) for everything else, including events:

```tsx
useEffect(() => flipbookRef.current?.engine?.on('error', ({ code, message }) => report(code, message)), []);
```

React Strict Mode mounts, unmounts and mounts again in development; the wrapper handles that by creating a new engine each time.

### Server rendering

The viewer is browser-only. Importing the package on a server fails, because PDF.js reads browser globals such as `DOMMatrix` while it loads. In Next.js, Remix, Nuxt and similar frameworks, load the component on the client only:

```tsx
// Next.js
import dynamic from 'next/dynamic';
const Flipbook = dynamic(() => import('flipbookengine/react').then((m) => m.Flipbook), { ssr: false });
```

```vue
<!-- Nuxt -->
<ClientOnly><Flipbook pdfUrl="/catalog.pdf" /></ClientOnly>
```

(In Nuxt, import the component inside the client-only part, for example with `defineAsyncComponent`, so the server never evaluates the package.)

---

## Vue 3 Wrapper

```vue
<template>
  <div style="height: 80vh">
    <Flipbook
      ref="book"
      pdfUrl="/catalog.pdf"
      :pages="pages"
      :allowDownload="true"
      :showThumbs="false"
      @page-change="onPageChange"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Flipbook } from 'flipbookengine/vue';
import 'flipbookengine/styles.css';

const book = ref(null);
const pages = [
  { normal: '/1.png', low: '/1-low.png', thumb: '/1-thumb.png' },
  { normal: '/2.png', low: '/2-low.png', thumb: '/2-thumb.png' }
];

function onPageChange(event) {
  console.log('Page index changed to:', event.currentPage, 'of', book.value.getTotalPages());
}
</script>
```

### Props and attributes

- Engine options can be passed one by one (`:allowDownload="false"`, `:showThumbs="true"`, kebab-case such as `show-thumbs` works too) or together as `:options="{ ... }"`. When both give the same option, `options` wins. Pass booleans and numbers with `:`; a bare `allow-download` is the empty string.
- `pdfUrl` and `pages` are the source.
- `class`, `style`, `id` and other HTML attributes go to the host `div`, which fills its parent (`minHeight` 400px).
- Every [supported event](api-reference.md#supported-events) except `destroy` is a Vue event, in kebab-case or camelCase: `@page-change`, `@error`, `@hotspot-open`, `@hotspot-close`, `@annotation-activate`, `@note-change`, `@search-change`, and so on. The wrapper subscribes once per engine and unsubscribes on unmount.

As in React, an update sends only the options that changed, and a new `pages` array with equal contents does not reload the book. An edit inside the `options` object (for example pushing a hotspot) is re-sent whole.

### Exposed methods

`getCurrentPage()`, `getTotalPages()`, `goToPage(index)`, `nextPage()`, `prevPage()` (plus `flipNext`, `flipPrev`, `turnToPage`), and `getEngine()` (also `engine()`), which returns the `FlipbookEngine` instance (`null` before mount). `getEngine().on(...)` remains available for anything else.

---

## Other events

The wrappers forward every [event](api-reference.md#supported-events) except `destroy`: React as `onError`, `onHotspotOpen`, ... props, Vue as `@error`, `@hotspot-open`, ... listeners. `destroy` happens when the component unmounts. You can still subscribe through the engine (`engine.on(...)`), as shown above.
