import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';

import './dom-mock.ts';

const { createRoot } = await import('react-dom/client');

import { Flipbook } from '../src/react/index.tsx';
import { FlipbookEngine } from '../src/engine.ts';
import { PdfRenderer } from '../src/core/PdfRenderer.ts';

const settle = () => new Promise((resolve) => setTimeout(resolve, 100));

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
  await settle();
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
  await settle();
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
  await settle();
  ref.current.goToPage(1);
  assert.equal(ref.current.engine?.getCurrentPage(), 1);
  root.unmount();
  host.remove();
});


