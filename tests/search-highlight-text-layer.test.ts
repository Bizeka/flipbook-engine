import test from 'node:test';
import assert from 'node:assert/strict';
import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { findTextHighlights, type FlipbookTextPage } from '../src/model/text-layer.ts';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const textPage = (index: number): FlipbookTextPage => ({ schemaVersion: 1, pageIndex: index, revision: 'v1',
  text: 'Hello World hello',
  runs: [{ text: 'Hello World', start: 0, x: .1, y: .2, width: .55, height: .03 }, { text: ' hello', start: 11, x: .1, y: .3, width: .3, height: .03 }] });

test('findTextHighlights maps case-insensitive matches to interpolated run rectangles', () => {
  const rectangles = findTextHighlights(textPage(0), 'WORLD');
  assert.equal(rectangles.length, 1);
  assert.ok(Math.abs(rectangles[0].x - (.1 + .55 * 6 / 11)) < 1e-9);
  assert.ok(Math.abs(rectangles[0].width - .55 * 5 / 11) < 1e-9);
  assert.equal(findTextHighlights(textPage(0), 'hello').length, 2);
  assert.deepEqual(findTextHighlights(textPage(0), '  '), []);
  assert.deepEqual(findTextHighlights(textPage(0), 'absent'), []);
  const spanning = findTextHighlights(textPage(0), 'd h');
  assert.equal(spanning.length, 2, 'a match crossing two runs yields one rectangle per run');
});

test('search results without highlights are highlighted from the text layer on both pages of a spread', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false, singleMode: false,
    textLayerProvider: async index => textPage(index),
    searchProvider: async () => [
      { pageIndex: 1, pageNumber: 2, matches: 2, snippet: 'Hello World' },
      { pageIndex: 2, pageNumber: 3, matches: 1, snippet: 'hello', highlights: [{ x: .5, y: .5, width: .1, height: .1 }] }
    ] });
  await engine.init('', Array.from({ length: 6 }, (_, i) => ({ normal: `${i}.png`, low: `${i}-low.png`, thumb: `${i}-thumb.png` })));
  engine.goToPage(1);
  await tick(); await tick();
  await engine.search('hello');
  const layers = (index: number) => document.querySelector(`.bz-page[data-idx="${index}"]`)!.querySelectorAll('.bk-search-text-highlight');
  assert.equal(layers(1).length, 2, 'derived from the loaded text layer');
  assert.equal(layers(2).length, 1, 'provider highlights win and are not duplicated');
  engine.destroy();
});
