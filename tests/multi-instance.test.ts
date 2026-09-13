import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = (prefix: string) => [
  { normal: `${prefix}-1.png`, low: `${prefix}-1-low.png`, thumb: `${prefix}-1-thumb.png` },
  { normal: `${prefix}-2.png`, low: `${prefix}-2-low.png`, thumb: `${prefix}-2-thumb.png` }
];

test('multiple engines use local DOM roots without duplicate viewer ids', async () => {
  const firstRoot = document.createElement('div');
  const secondRoot = document.createElement('div');
  document.body.append(firstRoot, secondRoot);
  const first = new FlipbookEngine(firstRoot, { soundUrl: '' });
  const second = new FlipbookEngine(secondRoot, { soundUrl: '' });

  await Promise.all([
    first.init('', pages('first')),
    second.init('', pages('second'))
  ]);

  assert.equal(document.querySelectorAll('.bk-book-wrapper').length, 2);
  assert.equal(document.querySelectorAll('[id^="bk-"]').length, 0);
  first.destroy();
  assert.equal(secondRoot.querySelector('.bk-book-wrapper') !== null, true);
  second.destroy();
});
