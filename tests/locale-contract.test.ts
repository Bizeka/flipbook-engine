import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

test('locale and message overrides reach toolbar labels', async () => {
  const engine = new FlipbookEngine('#app', {
    soundUrl: '',
    locale: 'en',
    messages: { en: { next: 'Forward' } }
  });
  await engine.init('locale.pdf', [
    { normal: 'locale-1.png', low: 'locale-1-low.png', thumb: 'locale-1-thumb.png' },
    { normal: 'locale-2.png', low: 'locale-2-low.png', thumb: 'locale-2-thumb.png' }
  ]);

  const nextButton = document.querySelector('.bk-btn-group--center .bk-btn:last-child') as HTMLElement;
  assert.equal(nextButton.title, 'Forward');
  engine.setLocale('tr');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(nextButton.title, 'Sonraki');
  engine.destroy();
});
