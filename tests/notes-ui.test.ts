import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = [
  { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
  { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
];

test('notes toolbar opens an editor, saves a note, and clears it for host persistence', async () => {
  const engine = new FlipbookEngine('#app', { locale: 'tr', showThumbs: false });
  const changes: Array<{ pageIndex: number; pageNumber: number; note: string | null }> = [];
  engine.on('noteChange', (payload) => changes.push(payload));
  await engine.init('', pages);

  const notesButton = document.querySelector('.bk-btn--notes') as HTMLButtonElement;
  assert.ok(notesButton);
  assert.equal(notesButton.getAttribute('aria-pressed'), 'false');
  notesButton.click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const panel = document.querySelector('.bk-notes-panel') as HTMLElement;
  const input = document.querySelector('.bk-notes-input') as HTMLTextAreaElement;
  assert.ok(panel);
  assert.equal(panel.style.display, 'flex');
  assert.equal(input.getAttribute('placeholder'), 'Sayfa notu');
  assert.equal(notesButton.getAttribute('aria-pressed'), 'true');

  input.value = '  Görüşme sonrası takip edilecek  ';
  // Save reads the live DOM value, so it remains reliable even if an input event is lost.
  (document.querySelector('.bk-notes-save') as HTMLButtonElement).click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(engine.getNote(0), 'Görüşme sonrası takip edilecek');
  assert.deepEqual(changes[0], { pageIndex: 0, pageNumber: 1, note: 'Görüşme sonrası takip edilecek' });
  assert.equal((document.querySelector('.bk-note-content') as HTMLElement).textContent, 'Görüşme sonrası takip edilecek');
  assert.ok(document.querySelector('.bk-note-badge--edit'));
  assert.ok(document.querySelector('.bk-note-badge--delete'));

  (document.querySelector('.bk-note-tabs button:nth-child(2)') as HTMLButtonElement).click();
  (document.querySelector('.bk-note-badge--edit') as HTMLButtonElement).click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(document.querySelector('.bk-notes-input'));
  (document.querySelector('.bk-notes-clear') as HTMLButtonElement).click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(engine.getNote(0), undefined);
  assert.deepEqual(changes[1], { pageIndex: 0, pageNumber: 1, note: null });
  assert.equal((document.querySelector('.bk-notes-input') as HTMLTextAreaElement).value, '');

  notesButton.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(panel.style.display, 'none');

  engine.destroy();
});

test('image catalogs use host search and retain existing note drafts when persistence fails', async () => {
  let rejectSave = true;
  const engine = new FlipbookEngine('#app', {
    soundEnabled: false, notes: { 0: 'Existing saved note' },
    searchProvider: async (query, _options, signal) => {
      assert.equal(signal.aborted, false);
      return [{ pageIndex: 1, pageNumber: 2, matches: 1, snippet: query }];
    },
    noteProvider: async () => { if (rejectSave) throw new Error('Unavailable'); }
  });
  await engine.init('', pages);
  const results = await engine.search('Notebook');
  assert.equal(results[0].pageIndex, 1);
  assert.equal(document.querySelector('.bk-toolbar button[title="Search"]')?.hasAttribute('disabled'), false);
  (document.querySelector('.bk-btn--notes') as HTMLButtonElement).click();
  (document.querySelector('.bk-note-tabs button:nth-child(2)') as HTMLButtonElement).click();
  (document.querySelector('.bk-note-badge--edit') as HTMLButtonElement).click();
  await new Promise(resolve => setTimeout(resolve, 0));
  const input = document.querySelector('.bk-notes-input') as HTMLTextAreaElement;
  assert.ok(input);
  assert.equal(input.value, 'Existing saved note');
  input.value = 'Revised note';
  (document.querySelector('.bk-notes-save') as HTMLButtonElement).click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(engine.getNote(0), 'Existing saved note');
  assert.equal((document.querySelector('.bk-notes-input') as HTMLTextAreaElement).value, 'Revised note');
  assert.match(document.querySelector('.bk-notes-panel [role="status"]')?.textContent ?? '', /Could not save/);
  rejectSave = false;
  (document.querySelector('.bk-notes-save') as HTMLButtonElement).click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(engine.getNote(0), 'Revised note');
  engine.destroy();
});

test('coordinate notes coexist, preserve drafts on failure, and placement cancels without turning pages', async () => {
  let rejectSave = false;
  const changes: string[] = [];
  const engine = new FlipbookEngine('#app', { soundEnabled: false, singleMode: false, notes: { 0: 'Legacy note' },
    annotationProvider: async (note, action, signal) => { assert.equal(signal.aborted, false); if (rejectSave) throw new Error('Offline'); changes.push(`${action}:${note.id}`); } });
  engine.setSingleMode(true);
  await engine.init('', pages);
  assert.equal((document.querySelector('.bk-single-view') as HTMLElement).style.display, 'flex');
  engine.beginAnnotation();
  const wrapper = document.querySelector('.bk-wrapper')!;
  wrapper.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  engine.placeAnnotation(0, .2, .3);
  assert.equal(document.querySelector('.bk-note-popover')?.getAttribute('style'), 'display:none;');
  engine.beginAnnotation(); engine.placeAnnotation(0, .2, .3);
  assert.equal(engine.getCurrentPage(), 0);
  const first = { id: 'first', pageIndex: 0, x: .2, y: .3, text: 'First' };
  const second = { id: 'second', pageIndex: 0, x: .7, y: .8, text: 'Second', document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second', marks: [{ type: 'bold' }] }] }] } };
  assert.equal(await engine.saveAnnotation(first), true);
  assert.equal(await engine.saveAnnotation(second), true);
  assert.equal(engine.getAnnotations(0).length, 2);
  assert.equal(document.querySelectorAll('.bk-single-page .bk-annotation-marker').length, 2);
  rejectSave = true;
  assert.equal(await engine.saveAnnotation({ ...first, text: 'Uncommitted' }), false);
  assert.equal(engine.getAnnotations(0).find(note => note.id === first.id)?.text, 'First');
  assert.equal(await engine.saveAnnotation(first, 'delete'), false);
  assert.equal(engine.getAnnotations(0).length, 2);
  rejectSave = false;
  assert.equal(await engine.saveAnnotation(first, 'delete'), true);
  assert.equal(engine.getAnnotations(0).length, 1);
  assert.equal(engine.getNote(0), 'Legacy note');
  assert.deepEqual(changes, ['save:first', 'save:second', 'delete:first']);
  engine.destroy();
});

test('pinch, vertical scroll and annotation placement never trigger a page turn', async () => {
  const { InteractionManager } = await import('../src/core/InteractionManager.ts');
  const { createFlipbookStore } = await import('../src/state/store.ts');
  const container = document.createElement('div'); document.querySelector('#app')!.append(container);
  const store = createFlipbookStore(); store.isSingleMode.value = true; store.totalPages.value = 3;
  let turns = 0;
  const adapter = { turnToNextPage: () => turns++, turnToPrevPage: () => turns++ };
  const manager = new InteractionManager(container, adapter as never, store); manager.init();
  const touch = (x: number, y: number) => ({ clientX: x, clientY: y }) as Touch;
  const send = (type: string, touches: Touch[], changed = touches) => container.dispatchEvent(new window.TouchEvent(type, { touches, changedTouches: changed, bubbles: true, cancelable: true }));
  send('touchstart', [touch(100, 100)]); send('touchmove', [touch(120, 240)]); send('touchend', [], [touch(120, 240)]);
  assert.equal(turns, 0);
  send('touchstart', [touch(100, 100), touch(200, 100)]); send('touchmove', [touch(50, 100), touch(250, 100)]); send('touchend', [], [touch(50, 100), touch(250, 100)]);
  assert.equal(store.zoomState.value.scale, 2); assert.equal(turns, 0);
  send('touchstart', [touch(100, 100)]); send('touchmove', [touch(180, 140)]); send('touchend', [], [touch(180, 140)]);
  assert.equal(turns, 0);
  store.zoomState.value = { ...store.zoomState.value, scale: 1, isActive: false };
  store.placingNote.value = true;
  send('touchstart', [touch(100, 100)]); send('touchend', [], [touch(200, 100)]);
  assert.equal(turns, 0);
  store.placingNote.value = false;
  send('touchstart', [touch(100, 100)]); send('touchend', [], [touch(200, 105)]);
  assert.equal(turns, 1);
  manager.destroy(); container.remove();
});
