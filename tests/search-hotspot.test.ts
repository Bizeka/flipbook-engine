import test from 'node:test';
import assert from 'node:assert/strict';
import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { PdfRenderer } from '../src/core/PdfRenderer.ts';

const pages = [
  { normal: 'one.png', low: 'one.png', thumb: 'one.png' },
  { normal: 'two.png', low: 'two.png', thumb: 'two.png' }
];

test('engine search maps PDF source matches to logical pages and emits searchChange', async (t) => {
  const originalLoad = PdfRenderer.prototype.loadDocument;
  const originalRender = PdfRenderer.prototype.renderPageToDataUrl;
  const originalLayouts = PdfRenderer.prototype.getPageLayouts;
  const originalViewport = PdfRenderer.prototype.calculateViewportDimensions;
  const originalSearch = PdfRenderer.prototype.searchText;
  PdfRenderer.prototype.loadDocument = async () => 2;
  PdfRenderer.prototype.renderPageToDataUrl = async (page) => 'data:image/mock,' + page;
  PdfRenderer.prototype.getPageLayouts = async () => [{ width: 595, height: 842, split: false }, { width: 595, height: 842, split: false }];
  PdfRenderer.prototype.calculateViewportDimensions = async () => ({ width: 420, height: 594 });
  PdfRenderer.prototype.searchText = async () => [{ sourcePageNumber: 2, matches: 2, snippet: 'catalog result' }];
  t.after(() => {
    PdfRenderer.prototype.loadDocument = originalLoad;
    PdfRenderer.prototype.renderPageToDataUrl = originalRender;
    PdfRenderer.prototype.getPageLayouts = originalLayouts;
    PdfRenderer.prototype.calculateViewportDimensions = originalViewport;
    PdfRenderer.prototype.searchText = originalSearch;
  });
  const engine = new FlipbookEngine('#app', { soundUrl: '' });
  await engine.init('/search.pdf');
  const events: any[] = [];
  engine.on('searchChange', (event) => events.push(event));
  const results = await engine.search('catalog');
  assert.deepEqual(results, [{ pageIndex: 1, pageNumber: 2, sourcePageNumber: 2, matches: 2, snippet: 'catalog result' }]);
  assert.equal(engine.getSearchResults().length, 1);
  assert.deepEqual(events[0], { query: 'catalog', results });
  engine.clearSearch();
  assert.deepEqual(engine.getSearchResults(), []);
  engine.destroy();
});

test('hotspots render and activate through the public API', async () => {
  const engine = new FlipbookEngine('#app', {
    soundUrl: '',
    hotspots: [{ id: 'product', pageIndex: 0, x: .1, y: .2, width: .3, height: .2, label: 'Product', content: 'Details' }]
  });
  await engine.init('', pages);
  const hotspot = document.querySelector('.bk-hotspot') as HTMLButtonElement;
  assert.ok(hotspot);
  let activated = '';
  engine.on('hotspotActivate', (event) => activated = event.hotspot.id);
  hotspot.click();
  assert.equal(activated, 'product');
  assert.equal(document.querySelector('.bk-hotspot-popup strong')?.textContent, 'Product');
  engine.closeHotspot();
  engine.destroy();
});

test('page annotations render as coordinate markers and emit activation', async () => {
  const engine = new FlipbookEngine('#app', {
    soundUrl: '',
    annotations: [{ id: 'note-1', pageIndex: 0, x: .4, y: .3, text: 'Review this area' }]
  });
  await engine.init('', pages);
  const marker = document.querySelector('.bk-annotation-marker') as HTMLButtonElement;
  assert.ok(marker);
  let activated = '';
  engine.on('annotationActivate', (event) => activated = event.annotation.id);
  marker.click();
  assert.equal(activated, 'note-1');
  assert.equal(document.querySelector('.bk-annotation-popup p')?.textContent, 'Review this area');
  engine.closeAnnotation();
  engine.destroy();
});

test('search results render as buttons rather than stringified DOM objects', async (t) => {
  const originalLoad = PdfRenderer.prototype.loadDocument;
  const originalRender = PdfRenderer.prototype.renderPageToDataUrl;
  const originalLayouts = PdfRenderer.prototype.getPageLayouts;
  const originalViewport = PdfRenderer.prototype.calculateViewportDimensions;
  const originalSearch = PdfRenderer.prototype.searchText;
  PdfRenderer.prototype.loadDocument = async () => 1;
  PdfRenderer.prototype.renderPageToDataUrl = async () => 'data:image/mock,page';
  PdfRenderer.prototype.getPageLayouts = async () => [{ width: 595, height: 842, split: false }];
  PdfRenderer.prototype.calculateViewportDimensions = async () => ({ width: 420, height: 594 });
  PdfRenderer.prototype.searchText = async () => [{ sourcePageNumber: 1, matches: 1, snippet: 'Product catalog', highlights: [{ x: .2, y: .3, width: .15, height: .04 }] }];
  t.after(() => {
    PdfRenderer.prototype.loadDocument = originalLoad;
    PdfRenderer.prototype.renderPageToDataUrl = originalRender;
    PdfRenderer.prototype.getPageLayouts = originalLayouts;
    PdfRenderer.prototype.calculateViewportDimensions = originalViewport;
    PdfRenderer.prototype.searchText = originalSearch;
  });
  const engine = new FlipbookEngine('#app', { soundUrl: '' });
  await engine.init('/search-ui.pdf');
  (document.querySelector('button[title="Search"]') as HTMLButtonElement).click();
  const input = document.querySelector('.bk-search-input') as HTMLInputElement;
  input.value = 'product';
  (document.querySelector('.bk-search-submit') as HTMLButtonElement).click();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(document.querySelectorAll('.bk-search-result').length, 1);
  assert.equal(document.querySelector('.bk-search-results')?.textContent?.includes('[object HTMLButtonElement]'), false);
  assert.ok(document.querySelectorAll('.bk-search-text-highlight').length >= 1);
  engine.destroy();
});
