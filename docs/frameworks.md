# Framework Integrations

FlipbookEngine ships with built-in, type-safe wrappers for both React and Vue 3.

## React Wrapper

### Usage

```tsx
import React, { useRef } from 'react';
import { Flipbook, FlipbookRef } from 'flipbookengine/react';
import 'flipbookengine/dist/flipbook-engine.css';

function App() {
  const flipbookRef = useRef<FlipbookRef>(null);

  const handleNextPage = () => {
    if (flipbookRef.current) {
      const current = flipbookRef.current.getCurrentPage();
      flipbookRef.current.goToPage(current + 1);
    }
  };

  return (
    <div>
      <button onClick={handleNextPage}>Next Page</button>
      
      <Flipbook
        ref={flipbookRef}
        pdfUrl="/catalog.pdf"
        pages={[
          { normal: '/1.png', low: '/1-low.png', thumb: '/1-thumb.png' },
          { normal: '/2.png', low: '/2-low.png', thumb: '/2-thumb.png' }
        ]}
        showThumbs={false}
      />
    </div>
  );
}
```

---

## Vue 3 Wrapper

### Usage

```vue
<template>
  <div>
    <Flipbook
      pdfUrl="/catalog.pdf"
      :pages="pages"
      :allowDownload="true"
      @page-change="onPageChange"
    />
  </div>
</template>

<script setup>
import { Flipbook } from 'flipbookengine/vue';
import 'flipbookengine/dist/flipbook-engine.css';

const pages = [
  { normal: '/1.png', low: '/1-low.png', thumb: '/1-thumb.png' },
  { normal: '/2.png', low: '/2-low.png', thumb: '/2-thumb.png' }
];

function onPageChange(event) {
  console.log('Page index changed to:', event.currentPage);
}
</script>
```
