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
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  (document.querySelector('.bk-notes-save') as HTMLButtonElement).click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(engine.getNote(0), 'Görüşme sonrası takip edilecek');
  assert.deepEqual(changes[0], { pageIndex: 0, pageNumber: 1, note: 'Görüşme sonrası takip edilecek' });

  (document.querySelector('.bk-notes-clear') as HTMLButtonElement).click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(engine.getNote(0), undefined);
  assert.deepEqual(changes[1], { pageIndex: 0, pageNumber: 1, note: null });

  engine.destroy();
});
