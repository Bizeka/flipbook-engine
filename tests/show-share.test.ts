import test from 'node:test';
import assert from 'node:assert/strict';
import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = [
  { normal: 'one.png', low: 'one.png', thumb: 'one.png' },
  { normal: 'two.png', low: 'two.png', thumb: 'two.png' }
];
const shareHidden = () => (document.querySelector('.bk-btn--share') as HTMLElement).style.display === 'none';

test('showShare defaults to true and false hides the Share command, also at runtime', async () => {
  const shown = new FlipbookEngine('#app', { soundUrl: '' });
  await shown.init('', pages);
  assert.ok(document.querySelector('.bk-btn--share'));
  assert.equal(shareHidden(), false);
  shown.destroy();

  const hidden = new FlipbookEngine('#app', { soundUrl: '', showShare: false });
  await hidden.init('', pages);
  assert.equal(shareHidden(), true);
  hidden.updateOptions({ showShare: true });
  assert.equal(shareHidden(), false);
  hidden.updateOptions({ showShare: false });
  assert.equal(shareHidden(), true);
  hidden.destroy();
});
