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
