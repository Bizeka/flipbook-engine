import test from 'node:test';
import assert from 'node:assert/strict';
import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { validateTextPage, type FlipbookTextPage } from '../src/model/text-layer.ts';
import { loadTextLayers } from '../src/core/TextLayerLoader.ts';
import { createFlipbookStore } from '../src/state/store.ts';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const page = (index: number): FlipbookTextPage => ({ schemaVersion: 1, pageIndex: index, revision: 'source-v1',
    text: '<script>safe</script>', runs: [{ text: '<script>safe</script>', start: 0, x: .1, y: .2, width: .5, height: .03 }] });

test('image-only reader renders optional host text safely and validates geometry/offsets', async () => {
    assert.throws(() => validateTextPage({ ...page(0), runs: [{ ...page(0).runs[0], x: NaN }] }, 0));
    assert.throws(() => validateTextPage({ ...page(0), runs: [{ ...page(0).runs[0], start: 1 }] }, 0));
    assert.throws(() => validateTextPage(page(1), 0));
    const engine = new FlipbookEngine('#app', { textLayerProvider: async index => page(index) });
    await engine.init('', [{ normal: 'normal.webp', low: 'small.webp', thumb: 'thumb.webp' }]);
    await tick(); await tick();
    assert.equal(document.querySelector('.bk-text-layer script'), null);
    assert.equal(document.querySelector('.bk-text-layer span')?.textContent, '<script>safe</script>');
    engine.setTextSelection(true);
    assert.ok(document.querySelector('.bk-text-layer.is-selectable'));
    engine.destroy();
});

test('visible-page loader bounds memory and rejects stale responses after navigation/destroy', async () => {
    const store = createFlipbookStore(); store.totalPages.value = 10;
    const lifetime = new AbortController();
    const pending = new Map<number, { signal: AbortSignal; resolve: (value: FlipbookTextPage) => void }>();
    const stop = loadTextLayers(store, (index, signal) => new Promise(resolve => pending.set(index, { signal, resolve })), lifetime.signal);
    await tick(); assert.equal(pending.size, 2);
    store.currentPage.value = 7; await tick();
    assert.equal(pending.get(0)?.signal.aborted, true);
    pending.get(0)!.resolve(page(0));
    for (const index of [6,7,8]) pending.get(index)!.resolve(page(index));
    await tick(); assert.deepEqual([...store.textPages.value.keys()].sort(), [6,7,8]);
    store.currentPage.value = 4; await tick();
    assert.equal(store.textPages.value.size, 0);
    lifetime.abort(); pending.get(4)!.resolve(page(4)); await tick();
    assert.equal(store.textPages.value.size, 0); stop();
});
