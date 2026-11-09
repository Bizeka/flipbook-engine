import test from 'node:test';
import assert from 'node:assert/strict';
import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { OPTION_KEY_SET } from '../src/core/wrapperOptions.ts';
import type { PageSource } from '../src/core/PageSource.ts';

test('pageSource is a wrapper option', () => {
  assert.ok(OPTION_KEY_SET.has('pageSource'));
});

test('a custom pageSource replaces PDF.js and is destroyed with the engine', async () => {
  const calls: string[] = [];
  const source: PageSource = {
    async loadDocument(url) { calls.push('load:' + url); return 3; },
    async getPageLayouts() { return [1, 2, 3].map(() => ({ width: 400, height: 600, split: false })); },
    async calculateViewportDimensions() { return { width: 420, height: 630 }; },
    async renderPageToDataUrl(page) { calls.push('render:' + page); return 'data:image/mock;base64,p' + page; },
    async extractPageText() { return ''; },
    async searchText() { return []; },
    destroy() { calls.push('destroy'); }
  };
  const engine = new FlipbookEngine('#app', { pageSource: source });
  await engine.init('/server/doc-1');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(engine.getTotalPages(), 3);
  assert.ok(calls.includes('load:/server/doc-1'));
  assert.ok(calls.includes('render:1'));
  engine.destroy();
  assert.ok(calls.includes('destroy'));
});
