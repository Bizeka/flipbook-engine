import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';
import type { FlipbookPlugin } from '../src/plugins/index.ts';
import { createNotesPlugin } from '../src/plugins/notes.ts';
import { createBookmarksPlugin } from '../src/plugins/bookmarks.ts';
import { createTocPlugin } from '../src/plugins/toc.ts';

const pages = [
  { normal: 'plugin-1.png', low: 'plugin-1-low.png', thumb: 'plugin-1-thumb.png' },
  { normal: 'plugin-2.png', low: 'plugin-2-low.png', thumb: 'plugin-2-thumb.png' }
];

test('TOC can be read and replaced at runtime through the public API', async () => {
  const engine = new FlipbookEngine('#app', { soundUrl: '' });
  await engine.init('', pages);
  engine.setToc([{ title: 'Products', pageIndex: 1, children: [{ title: 'Category A', pageIndex: 0 }] }], false);
  assert.deepEqual(engine.getToc(), [{
    id: 'toc-0',
    title: 'Products',
    pageIndex: 1,
    children: [{ id: 'toc-0-0', title: 'Category A', pageIndex: 0 }]
  }]);
  engine.destroy();
});

test('plugins register toolbar buttons, panels, APIs, and event handlers', async () => {
  let buttonClicks = 0;
  let pageChanges = 0;
  let openPanel: (() => void) | undefined;
  let disposed = false;

  const plugin: FlipbookPlugin = {
    name: 'test-plugin',
    install: (engine, context) => {
      context.registerToolbarButton({
        id: 'hello',
        label: 'Hello',
        placement: 'start',
        onClick: () => buttonClicks++
      });
      context.registerPanel({
        id: 'panel',
        title: 'Test panel',
        render: (container) => {
          container.textContent = 'Plugin panel';
        }
      });
      context.registerApi('answer', () => 42);
      context.on('pageChange', () => pageChanges++);
      context.addCleanup(() => { disposed = true; });
      openPanel = () => context.openPanel('panel');
    }
  };

  const engine = new FlipbookEngine('#app', { soundUrl: '', plugins: [plugin] });
  await engine.init('', pages);

  assert.deepEqual(engine.getPluginNames(), ['test-plugin']);
  const button = document.querySelector('.bk-btn--plugin') as HTMLButtonElement;
  assert.ok(button);
  button.click();
  assert.equal(buttonClicks, 1);

  await engine.callPluginApi<number>('test-plugin', 'answer').then((value) => assert.equal(value, 42));
  engine.goToPage(1);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(pageChanges >= 1);

  // The panel can be opened through the plugin context and is rendered by the core shell.
  openPanel?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(document.querySelector('.bk-plugin-panel.is-open')?.textContent, 'Plugin panel');

  assert.equal(engine.uninstallPlugin('test-plugin'), true);
  assert.equal(disposed, true);
  assert.deepEqual(engine.getPluginNames(), []);
  engine.destroy();
});



test('official feature adapters expose tree-shakeable APIs', async () => {
  const engine = new FlipbookEngine('#app', {
    soundUrl: '',
    plugins: [createNotesPlugin(), createBookmarksPlugin(), createTocPlugin()]
  });
  await engine.init(undefined, [
    { kind: 'single', pageNumber: 1, normal: 'one', low: 'one', thumb: 'one' },
    { kind: 'single', pageNumber: 2, normal: 'two', low: 'two', thumb: 'two' }
  ]);

  await engine.callPluginApi<void>('notes', 'set', 0, 'Review');
  assert.equal(await engine.callPluginApi<string | undefined>('notes', 'get', 0), 'Review');
  await engine.callPluginApi<void>('bookmarks', 'set', 1, true);
  assert.deepEqual(await engine.callPluginApi<number[]>('bookmarks', 'getAll'), [1]);
  await engine.callPluginApi<void>('toc', 'set', [{ title: 'Chapter', pageIndex: 1 }], false);
  assert.deepEqual(await engine.callPluginApi<any[]>('toc', 'get'), [{ id: 'toc-0', title: 'Chapter', pageIndex: 1 }]);
  engine.destroy();
});
