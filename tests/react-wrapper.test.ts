import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';

import './dom-mock.ts';

const { createRoot } = await import('react-dom/client');

import { Flipbook } from '../src/react/index.tsx';
import { FlipbookEngine } from '../src/engine.ts';
import { PdfRenderer } from '../src/core/PdfRenderer.ts';

const settle = () => new Promise((resolve) => setTimeout(resolve, 100));
// Engine init is asynchronous; under a loaded machine 100 ms is not enough, so wait for the pages instead.
const pagesIn = async (host: HTMLElement, count: number) => {
  for (let waited = 0; waited < 5000 && host.querySelectorAll('.bz-page').length < count; waited += 25) await new Promise((resolve) => setTimeout(resolve, 25));
  await settle();
};

function createHost() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host;
}

test('React wrapper mounts PDF-only, updates URL once, and unmounts cleanly', async (t) => {
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

  const host = createHost();
  const root = createRoot(host);
  root.render(React.createElement(Flipbook, { pdfUrl: '/catalog-a.pdf' }));
  await pagesIn(host, 2);
  assert.equal(host.querySelectorAll('.bz-page').length, 2);

  root.render(React.createElement(Flipbook, { pdfUrl: '/catalog-b.pdf' }));
  await settle();
  assert.deepEqual(loadedUrls, ['/catalog-a.pdf', '/catalog-b.pdf']);

  root.unmount();
  await settle();
  assert.equal(host.innerHTML, '');
  host.remove();
});

test('React wrapper supports image-only pages without a PDF URL', async () => {
  const host = createHost();
  const root = createRoot(host);
  root.render(React.createElement(Flipbook, {
    pages: [
      { normal: 'page-1.png', low: 'page-1-low.png', thumb: 'page-1-thumb.png' },
      { normal: 'page-2.png', low: 'page-2-low.png', thumb: 'page-2-thumb.png' }
    ]
  }));
  await pagesIn(host, 2);
  assert.equal(host.querySelectorAll('.bz-page').length, 2);
  assert.equal(host.querySelector('.bk-btn--download'), null);
  root.unmount();
  host.remove();
});

test('React wrapper exposes core navigation methods through its ref', async () => {
  const host = createHost();
  const ref = React.createRef<any>();
  const root = createRoot(host);
  root.render(React.createElement(Flipbook, {
    ref,
    pages: [
      { normal: 'page-1.png', low: 'page-1-low.png', thumb: 'page-1-thumb.png' },
      { normal: 'page-2.png', low: 'page-2-low.png', thumb: 'page-2-thumb.png' }
    ]
  }));
  await pagesIn(host, 2);
  ref.current.goToPage(1);
  assert.equal(ref.current.engine?.getCurrentPage(), 1);
  root.unmount();
  host.remove();
});



test('React wrapper forwards engine events to the latest handlers and keeps them out of the options', async () => {
  const host = createHost();
  const root = createRoot(host);
  const ref = React.createRef<any>();
  const calls: string[] = [];
  const pages = [{ normal: 'a.png', low: 'a.png', thumb: 'a.png' }];
  const render = (tag: string) => root.render(React.createElement(Flipbook, {
    ref,
    pages,
    onError: (e: any) => calls.push(tag + ':error:' + e.code),
    onHotspotOpen: (e: any) => calls.push(tag + ':hotspotOpen:' + e.pageIndex)
  }));
  render('first');
  await pagesIn(host, 1);
  const engine = ref.current.engine;
  const updates: unknown[] = [];
  const originalUpdate = engine.updateOptions.bind(engine);
  engine.updateOptions = (o: unknown) => { updates.push(o); return originalUpdate(o); };

  engine.emit('error', { code: 'PDF_LOAD_FAILED', message: 'x' });
  render('second');
  await settle();
  engine.emit('error', { code: 'PDF_RENDER_FAILED', message: 'y' });
  engine.emit('hotspotOpen', { hotspot: {}, pageIndex: 3 });

  assert.deepEqual(calls, ['first:error:PDF_LOAD_FAILED', 'second:error:PDF_RENDER_FAILED', 'second:hotspotOpen:3']);
  assert.deepEqual(updates.filter((o: any) => 'onError' in o || 'onHotspotOpen' in o), []);

  root.unmount();
  await settle();
  const before = calls.length;
  engine.emit('error', { code: 'PDF_LOAD_FAILED', message: 'z' });
  assert.equal(calls.length, before);
  host.remove();
});
