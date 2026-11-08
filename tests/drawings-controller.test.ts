import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { FlipbookDrawingController, type FlipbookDrawingChange, type FlipbookDrawingError } from '../src/plugins/drawings.ts';
import type { FlipbookDrawingProvider, FlipbookStroke } from '../src/model/drawings.ts';

const raw = (id: string, page = 0) => ({ id, page, tool: 'pen' as const, color: '#f00', points: [[0.1, 0.1], [0.5, 0.5]] as Array<[number, number]> });

function setup(provider?: Partial<FlipbookDrawingProvider>, storage: 'memory' | 'local' = 'memory') {
  const changes: FlipbookDrawingChange[] = [];
  const errors: FlipbookDrawingError[] = [];
  const state = { provider: provider as FlipbookDrawingProvider | undefined };
  const controller = new FlipbookDrawingController({
    documentId: 'doc-1',
    getProvider: () => state.provider,
    getStorage: () => storage,
    getOptions: () => null,
    onChange: (change) => changes.push(change),
    onError: (error) => errors.push(error),
    createId: (() => { let n = 0; return () => `gen-${++n}`; })(),
    now: () => 1
  });
  return { controller, changes, errors, state };
}

const tick = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

test('without a provider strokes live in memory and undo/redo works', () => {
  const { controller, changes } = setup();
  const stroke = controller.add(raw('a'))!;
  assert.equal(stroke.id, 'a');
  assert.equal(controller.add(raw('a')), null, 'duplicate id is rejected');
  assert.equal(controller.add({ nope: true }), null);
  controller.add(raw('b', 1));
  assert.equal(controller.getStrokes().length, 2);
  assert.equal(controller.getStrokes(1).length, 1);
  assert.equal(controller.undo(), true);
  assert.equal(controller.getStrokes().length, 1);
  assert.equal(controller.canRedo(), true);
  assert.equal(controller.redo(), true);
  assert.equal(controller.getStrokes().length, 2);
  controller.undo();
  controller.add(raw('c'));
  assert.equal(controller.canRedo(), false, 'a new stroke clears redo');
  assert.equal(controller.remove('a'), true);
  assert.equal(controller.remove('missing'), false);
  assert.equal(controller.undo(), true, 'undo of a removal brings the stroke back');
  assert.ok(controller.getStrokes().some((s) => s.id === 'a'));
  assert.deepEqual(changes.map((c) => c.action).slice(0, 4), ['add', 'add', 'undo', 'redo']);
});

test('getStrokes returns copies', () => {
  const { controller } = setup();
  controller.add(raw('a'));
  controller.getStrokes()[0].points.push([0.9, 0.9]);
  assert.equal(controller.getStrokes()[0].points.length, 2);
});

test('clear removes a page and undo restores it as one step', () => {
  const { controller } = setup();
  controller.add(raw('a', 0));
  controller.add(raw('b', 0));
  controller.add(raw('c', 1));
  assert.equal(controller.clear(0), 2);
  assert.equal(controller.getStrokes().length, 1);
  assert.equal(controller.clear(5), 0);
  controller.undo();
  assert.equal(controller.getStrokes(0).length, 2);
  assert.equal(controller.clear(), 3);
});

test('saves are debounced and batched', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const saves: Array<{ added: string[]; removed: string[] }> = [];
    const { controller } = setup({ save: async (_ctx, changes) => { saves.push({ added: changes.added.map((s) => s.id), removed: changes.removed }); return {}; } });
    controller.add(raw('a'));
    mock.timers.tick(500);
    controller.add(raw('b'));
    mock.timers.tick(799);
    await tick();
    assert.equal(saves.length, 0, 'the timer restarts on every change');
    mock.timers.tick(1);
    await tick();
    assert.deepEqual(saves, [{ added: ['a', 'b'], removed: [] }]);
    controller.remove('a');
    mock.timers.tick(800);
    await tick();
    assert.deepEqual(saves[1], { added: [], removed: ['a'] });
  } finally { mock.timers.reset(); }
});

test('adding then removing before the save sends nothing', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    let calls = 0;
    const { controller } = setup({ save: async () => { calls++; return {}; } });
    controller.add(raw('a'));
    controller.remove('a');
    mock.timers.tick(800);
    await tick();
    assert.equal(calls, 0);
  } finally { mock.timers.reset(); }
});

test('flush sends pending changes at once and destroy flushes', async () => {
  const saves: string[][] = [];
  const { controller } = setup({ save: async (_ctx, changes) => { saves.push(changes.added.map((s) => s.id)); return {}; } });
  controller.add(raw('a'));
  await controller.flush();
  assert.deepEqual(saves, [['a']]);
  controller.add(raw('b'));
  await controller.destroy();
  assert.deepEqual(saves, [['a'], ['b']]);
  assert.equal(controller.add(raw('c')), null, 'a destroyed controller accepts nothing');
});

test('a failed save rolls back added strokes and reports drawingError', async () => {
  const { controller, errors, changes } = setup({ save: async () => { throw new Error('offline'); } });
  controller.add(raw('a'));
  controller.add(raw('b'));
  await controller.flush();
  assert.equal(controller.getStrokes().length, 0);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, 'save');
  assert.equal(errors[0].message, 'offline');
  assert.equal(changes.at(-1)!.action, 'rollback');
  assert.equal(controller.canUndo(), false);
});

test('a failed save brings removed strokes back; a later successful batch is unaffected', async () => {
  let fail = false;
  const saved: string[][] = [];
  const { controller, errors } = setup({ save: async (_ctx, changes) => { if (fail) throw new Error('x'); saved.push(changes.added.map((s) => s.id)); return {}; } });
  controller.add(raw('a'));
  await controller.flush();
  fail = true;
  controller.remove('a');
  await controller.flush();
  assert.equal(controller.getStrokes().length, 1, 'removal rolled back');
  assert.equal(errors.length, 1);
  fail = false;
  controller.add(raw('b'));
  await controller.flush();
  assert.deepEqual(saved, [['a'], ['b']]);
  assert.equal(controller.getStrokes().length, 2);
});

test('provider ids replace client ids', async () => {
  const { controller } = setup({ save: async () => ({ ids: { a: 'server-1' } }) });
  controller.add(raw('a'));
  await controller.flush();
  assert.equal(controller.getStrokes()[0].id, 'server-1');
  assert.equal(controller.remove('server-1'), true);
});

test('pages load lazily, once, and keep strokes drawn while loading', async () => {
  const loads: number[][] = [];
  const releases: Array<(strokes: unknown[]) => void> = [];
  const { controller } = setup({ load: (ctx) => { loads.push(ctx.pages); return new Promise((resolve) => { releases.push(resolve as any); }); } });
  const first = controller.loadPages([0, 1]);
  controller.loadPages([1, 2]);
  assert.deepEqual(loads, [[0, 1], [2]]);
  controller.add(raw('mine', 0));
  releases[1]([]);
  releases[0]([raw('stored', 0), { bad: true }, raw('other', 7)]);
  await first;
  assert.deepEqual(controller.getStrokes(0).map((s) => s.id).sort(), ['mine', 'stored']);
  assert.equal(controller.getStrokes(7).length, 0, 'strokes of pages that were not asked for are ignored');
  await controller.loadPages([0, 1]);
  assert.equal(loads.length, 2, 'loaded pages are not requested again');
});

test('a failed load reports drawingError and can be retried', async () => {
  let fail = true;
  const { controller, errors } = setup({ load: async () => { if (fail) throw new Error('nope'); return [raw('a', 0)]; } });
  await controller.loadPages([0]);
  assert.equal(errors[0].code, 'load');
  assert.equal(errors[0].pageIndex, 0);
  fail = false;
  await controller.loadPages([0]);
  assert.equal(controller.getStrokes(0).length, 1);
});

test('destroy aborts a pending load', async () => {
  let signal!: AbortSignal;
  const { controller, errors } = setup({ load: (_ctx, s) => { signal = s; return new Promise(() => {}); } });
  void controller.loadPages([0]);
  void controller.destroy();
  assert.equal(signal.aborted, true);
  assert.equal(errors.length, 0);
});

test('clearPage on the provider is used and a failure restores the strokes', async () => {
  const cleared: number[] = [];
  let fail = false;
  const { controller, errors } = setup({
    save: async () => ({}),
    clearPage: async (ctx) => { if (fail) throw new Error('denied'); cleared.push(ctx.page); }
  });
  controller.add(raw('a', 3));
  assert.equal(controller.clear(3), 1);
  await controller.flush();
  assert.deepEqual(cleared, [3]);
  fail = true;
  controller.add(raw('b', 3));
  controller.clear(3);
  await controller.flush();
  assert.equal(controller.getStrokes(3).length, 1);
  assert.equal(errors[0].code, 'clear');
});

test('without clearPage the provider receives the removed ids', async () => {
  const removed: string[][] = [];
  const { controller } = setup({ save: async (_ctx, c) => { removed.push(c.removed); return {}; } });
  controller.add(raw('a'));
  await controller.flush();
  controller.clear(0);
  await controller.flush();
  assert.deepEqual(removed.at(-1), ['a']);
});

test("drawingStorage 'local' persists to localStorage and reloads", () => {
  window.localStorage.clear();
  const first = setup(undefined, 'local');
  first.controller.add(raw('a', 0));
  first.controller.add(raw('b', 1));
  first.controller.remove('b');
  const stored = JSON.parse(window.localStorage.getItem('flipbook:drawings:doc-1')!);
  assert.deepEqual(stored.map((s: FlipbookStroke) => s.id), ['a']);
  const second = setup(undefined, 'local');
  void second.controller.loadPages([0]);
  assert.deepEqual(second.controller.getStrokes().map((s) => s.id), ['a']);
});

test('local storage failures are reported, not thrown', () => {
  const original = window.localStorage.setItem.bind(window.localStorage);
  Object.defineProperty(window.Storage.prototype, 'setItem', { value: () => { throw new Error('quota'); }, configurable: true });
  try {
    const { controller, errors } = setup(undefined, 'local');
    assert.ok(controller.add(raw('a')));
    assert.equal(errors[0].code, 'storage');
    assert.equal(controller.getStrokes().length, 1);
  } finally {
    Object.defineProperty(window.Storage.prototype, 'setItem', { value: original, configurable: true });
  }
});

const pages = [{ normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' }, { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }];

test('the engine is unchanged when drawing is unset', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false });
  await engine.init('', pages);
  assert.equal(engine.addStroke(raw('a')), null);
  assert.deepEqual(engine.getStrokes(), []);
  assert.equal(engine.clearStrokes(), 0);
  assert.equal(engine.undoStroke(), false);
  engine.setDrawingMode(true);
  assert.equal(engine.isDrawingMode(), false);
  engine.destroy();
});

test('the engine stores strokes, emits events and loads the visible pages', async () => {
  const loads: number[][] = [];
  const engine = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false, drawing: true, documentId: 'book-9',
    drawingProvider: { load: async (ctx) => { loads.push(ctx.pages); return []; }, save: async () => ({}) } });
  const events: string[] = [];
  engine.on('drawingChange', (e) => events.push('change:' + e.action));
  engine.on('drawingModeChange', (e) => events.push('mode:' + e.active));
  await engine.init('', pages);
  await tick();
  assert.ok(loads.length >= 1 && loads[0].includes(0));
  assert.ok(engine.addStroke(raw('a', 0)));
  assert.equal(engine.addStroke(raw('far', 99)), null, 'a page outside the book is rejected');
  engine.setDrawingMode(true);
  engine.setDrawingMode(true);
  assert.equal(engine.isDrawingMode(), true);
  assert.equal(engine.undoStroke(), true);
  assert.equal(engine.redoStroke(), true);
  assert.equal(engine.getStrokes(0).length, 1);
  engine.destroy();
  assert.equal(engine.isDrawingMode(), false);
  assert.deepEqual(events.filter((e) => e.startsWith('mode')), ['mode:true', 'mode:false']);
  assert.ok(events.includes('change:add') && events.includes('change:undo'));
});
