import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';

import './dom-mock.ts';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const { createApp, h, nextTick, reactive } = await import('vue');

import { Flipbook as ReactFlipbook } from '../src/react/index.tsx';
import { Flipbook as VueFlipbook } from '../src/vue/index.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { changedOptions, sameValue, OPTION_KEY_SET } from '../src/core/wrapperOptions.ts';

const settle = () => new Promise((resolve) => setTimeout(resolve, 100));
const pagesIn = async (host: HTMLElement, count: number) => {
  for (let waited = 0; waited < 5000 && host.querySelectorAll('.bz-page').length < count; waited += 25) await new Promise((resolve) => setTimeout(resolve, 25));
  await settle();
};
const pages = () => [
  { normal: 'page-1.png', low: 'page-1-low.png', thumb: 'page-1-thumb.png' },
  { normal: 'page-2.png', low: 'page-2-low.png', thumb: 'page-2-thumb.png' }
];
function createHost() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host;
}

/** Counts engine calls made while a test runs. */
function spyOnEngine(t: { after: (fn: () => void) => void }) {
  const proto = FlipbookEngine.prototype as any;
  const calls = { updateOptions: [] as any[], setPages: 0 };
  const update = proto.updateOptions, setPages = proto.setPages;
  proto.updateOptions = function (options: any) { calls.updateOptions.push(options); return update.call(this, options); };
  proto.setPages = function (...args: any[]) { calls.setPages++; return setPages.apply(this, args); };
  t.after(() => { proto.updateOptions = update; proto.setPages = setPages; });
  return calls;
}

test('option helpers compare plain data and report only what changed', () => {
  assert.equal(sameValue(pages(), pages()), true);
  assert.equal(sameValue(pages(), [{ ...pages()[0], low: 'other.png' }, pages()[1]]), false);
  assert.equal(sameValue([1, 2], [1, 2, 3]), false);
  assert.deepEqual(changedOptions({ showThumbs: false, theme: 'dark' }, { showThumbs: true, theme: 'dark' }), { showThumbs: true });
  assert.deepEqual(changedOptions(null, { showThumbs: true }), { showThumbs: true });
  assert.equal(OPTION_KEY_SET.has('allowDownload'), true);
  assert.equal(OPTION_KEY_SET.has('id'), false);
});

test('React: a parent re-render does not re-send options, new equal pages, or reload the book', async (t) => {
  const calls = spyOnEngine(t);
  const host = createHost();
  const root = createRoot(host);
  const render = (props: Record<string, unknown> = {}) => act(async () => { root.render(React.createElement(ReactFlipbook, { pages: pages(), showThumbs: false, ...props })); });
  await render();
  await pagesIn(host, 2);
  const loaded = calls.setPages;
  calls.updateOptions.length = 0;

  // Same props, new array of equal pages: nothing reaches the engine.
  await render();
  await render();
  await settle();
  assert.equal(calls.setPages, loaded);
  assert.deepEqual(calls.updateOptions, []);

  // One changed option: only that option is sent.
  await render({ showThumbs: true });
  assert.deepEqual(calls.updateOptions, [{ showThumbs: true }]);

  // A page that really changed reloads the book.
  await render({ pages: [pages()[0], { ...pages()[1], normal: 'page-2b.png' }] });
  await settle();
  assert.equal(calls.setPages, loaded + 1);

  root.unmount();
  host.remove();
});

test('React: onPageChange is always the latest callback and the ref reads the current page', async () => {
  const host = createHost();
  const root = createRoot(host);
  const ref = React.createRef<any>();
  const seen: string[] = [];
  const render = (label: string) => act(async () => { root.render(React.createElement(ReactFlipbook, { ref, pages: pages(), onPageChange: () => { seen.push(label); } })); });
  await render('first');
  await pagesIn(host, 2);
  await render('second');
  ref.current.goToPage(1);
  assert.equal(ref.current.getCurrentPage(), 1);
  assert.equal(ref.current.getTotalPages(), 2);
  assert.ok(seen.length > 0);
  assert.ok(seen.every((label) => label === 'second'), `a stale callback ran: ${seen.join(',')}`);
  root.unmount();
  host.remove();
});

test('Vue: options given as plain props reach the engine, kebab-case included, and other attributes stay on the element', async () => {
  const state = reactive({ pages: pages() });
  const host = createHost();
  let exposed: any;
  const app = createApp({
    setup: () => () => h(VueFlipbook, { pages: state.pages, allowDownload: false, 'show-thumbs': true, class: 'catalog', id: 'catalog-1', ref: (value: any) => { exposed = value; } })
  });
  app.mount(host);
  await pagesIn(host, 2);
  const engine = exposed.getEngine() as any;
  assert.equal(engine.options.allowDownload, false);
  assert.equal(engine.options.showThumbs, true);
  const root = host.firstElementChild as HTMLElement;
  assert.equal(root.id, 'catalog-1');
  assert.ok(root.classList.contains('catalog'));
  assert.equal(root.hasAttribute('allowdownload'), false);
  assert.equal(root.hasAttribute('show-thumbs'), false);
  assert.ok(Number.isInteger(exposed.getCurrentPage()));
  app.unmount();
  host.remove();
});

test('Vue: a changed plain prop sends only itself; equal pages do not reload, a real change does', async (t) => {
  const calls = spyOnEngine(t);
  const state = reactive({ showThumbs: false, pages: pages() });
  const host = createHost();
  const app = createApp({ setup: () => () => h(VueFlipbook, { pages: state.pages, showThumbs: state.showThumbs, theme: 'light' }) });
  app.mount(host);
  await pagesIn(host, 2);
  const loaded = calls.setPages;
  calls.updateOptions.length = 0;

  state.pages = pages();
  await nextTick();
  await settle();
  assert.equal(calls.setPages, loaded);
  assert.deepEqual(calls.updateOptions, []);

  state.showThumbs = true;
  await nextTick();
  await settle();
  assert.deepEqual(calls.updateOptions, [{ showThumbs: true }]);

  state.pages.push({ normal: 'page-3.png', low: 'page-3-low.png', thumb: 'page-3-thumb.png' });
  await nextTick();
  await settle();
  assert.equal(calls.setPages, loaded + 1);

  app.unmount();
  host.remove();
});

test('Vue: the options object still works and wins over a plain prop', async () => {
  const host = createHost();
  let exposed: any;
  const app = createApp({
    setup: () => () => h(VueFlipbook, { pages: pages(), allowDownload: true, options: { allowDownload: false }, ref: (value: any) => { exposed = value; } })
  });
  app.mount(host);
  await pagesIn(host, 2);
  assert.equal((exposed.getEngine() as any).options.allowDownload, false);
  app.unmount();
  host.remove();
});
