import test from 'node:test';
import assert from 'node:assert/strict';
import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = Array.from({ length: 6 }, (_, index) => ({ normal: `iso-${index}.png`, low: `iso-${index}.png`, thumb: `iso-${index}.png` }));

test('single-page mode hides the book by class and keeps the inline sizing page-flip wrote', async () => {
  const engine = new FlipbookEngine('#app', { soundUrl: '' });
  await engine.init('', pages);
  const book = document.querySelector('.bk-book') as HTMLElement;
  book.style.width = '100%';
  engine.setSingleMode(true);
  assert.ok(book.classList.contains('is-hidden'));
  assert.equal(book.style.width, '100%');
  engine.setSingleMode(false);
  assert.ok(!book.classList.contains('is-hidden'));
  assert.equal(book.style.width, '100%');
  engine.destroy();
});
