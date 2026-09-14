import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { normalizeFlipbookToc } from '../src/model/toc.ts';

const pages = [
  { normal: 'toc-1.png', low: 'toc-1-low.png', thumb: 'toc-1-thumb.png' },
  { normal: 'toc-2.png', low: 'toc-2-low.png', thumb: 'toc-2-thumb.png' },
  { normal: 'toc-3.png', low: 'toc-3-low.png', thumb: 'toc-3-thumb.png' }
];

test('normalizes TOC entries, nested children, and page bounds', () => {
  const toc = normalizeFlipbookToc([
    { title: '  Intro  ', pageIndex: -4 },
    { title: '', pageIndex: 1 },
    { title: 'Chapter', pageIndex: 99, children: [{ title: 'Section', pageIndex: 1.8 }] }
  ], 3);

  assert.deepEqual(toc, [
    { id: 'toc-0', title: 'Intro', pageIndex: 0 },
    { id: 'toc-2', title: 'Chapter', pageIndex: 2, children: [{ id: 'toc-2-0', title: 'Section', pageIndex: 1 }] }
  ]);
});

test('TOC toggle and entry navigation are localized and accessible', async () => {
  const engine = new FlipbookEngine('#app', {
    soundUrl: '',
    locale: 'tr',
    toc: [
      { title: 'Giriş', pageIndex: 0 },
      { title: 'Bölüm 1', pageIndex: 1, children: [{ title: 'Detay', pageIndex: 2 }] }
    ],
    showToc: false
  });
  await engine.init('toc.pdf', pages);

  const toggle = document.querySelector('button[title="İçindekiler"]') as HTMLButtonElement;
  assert.ok(toggle);
  assert.equal(toggle.getAttribute('aria-pressed'), 'false');
  toggle.click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const nav = document.querySelector('.bk-toc') as HTMLElement;
  assert.equal(nav.style.display, 'flex');
  assert.equal(nav.getAttribute('aria-label'), 'İçindekiler');
  const entries = nav.querySelectorAll('button');
  assert.equal(entries.length, 3);

  (entries[2] as HTMLButtonElement).click();
  assert.equal(engine.getCurrentPage(), 2);
  assert.equal(nav.style.display, 'none');
  engine.destroy();
});

test('TOC visibility changes emit one documented event', async () => {
  const engine = new FlipbookEngine('#app', {
    soundUrl: '',
    toc: [{ title: 'Intro', pageIndex: 0 }]
  });
  await engine.init('toc-events.pdf', pages);
  const changes: Array<{ showToc: boolean }> = [];
  engine.on('tocToggle', (event) => changes.push(event));
  const toggle = document.querySelector('button[title="Table of Contents"]') as HTMLButtonElement;
  toggle.click();
  toggle.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(changes, [{ showToc: true }, { showToc: false }]);
  engine.destroy();
});