import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

const { createApp, h, nextTick, reactive } = await import('vue');
const { Flipbook } = await import('../src/vue/index.ts');
const { PdfRenderer } = await import('../src/core/PdfRenderer.ts');

const settle = () => new Promise((resolve) => setTimeout(resolve, 40));

function createHost() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host;
}

test('Vue wrapper mounts PDF-only, updates URL, and unmounts cleanly', async (t) => {
  const originalLoad = PdfRenderer.prototype.loadDocument;
  const originalRender = PdfRenderer.prototype.renderPageToDataUrl;
  const originalViewport = PdfRenderer.prototype.calculateViewportDimensions;
  const loadedUrls: string[] = [];
  PdfRenderer.prototype.loadDocument = async (url) => {
    loadedUrls.push(url);
    return 2;
  };
  PdfRenderer.prototype.renderPageToDataUrl = async (page) => 'data:image/mock;base64,page-' + page;
  PdfRenderer.prototype.calculateViewportDimensions = async () => ({ width: 420, height: 594 });

  t.after(() => {
    PdfRenderer.prototype.loadDocument = originalLoad;
    PdfRenderer.prototype.renderPageToDataUrl = originalRender;
    PdfRenderer.prototype.calculateViewportDimensions = originalViewport;
  });

  const state = reactive({ pdfUrl: '/catalog-a.pdf', pages: [] as any[] });
  const host = createHost();
  const app = createApp({ setup: () => () => h(Flipbook, state) });
  app.mount(host);
  await settle();
  assert.equal(host.querySelectorAll('.bz-page').length, 2);

  state.pdfUrl = '/catalog-b.pdf';
  await nextTick();
  await settle();
  assert.deepEqual(loadedUrls, ['/catalog-a.pdf', '/catalog-b.pdf']);

  app.unmount();
  assert.equal(host.innerHTML, '');
  host.remove();
});

test('Vue wrapper supports image-only pages and exposes navigation', async () => {
  const state = reactive({
    pdfUrl: '',
    pages: [
      { normal: 'page-1.png', low: 'page-1-low.png', thumb: 'page-1-thumb.png' },
      { normal: 'page-2.png', low: 'page-2-low.png', thumb: 'page-2-thumb.png' }
    ]
  });
  const host = createHost();
  let exposed: any;
  const app = createApp({
    setup: () => () => h(Flipbook, { ...state, ref: (value: any) => { exposed = value; } })
  });
  app.mount(host);
  await settle();
  assert.equal(host.querySelectorAll('.bz-page').length, 2);
  assert.equal(host.querySelector('.bk-btn--download'), null);
  exposed?.goToPage(1);
  const exposedEngine = exposed?.getEngine?.() ?? exposed?.engine?.();
  assert.equal(exposedEngine?.getCurrentPage?.(), 1);
  app.unmount();
  host.remove();
});
