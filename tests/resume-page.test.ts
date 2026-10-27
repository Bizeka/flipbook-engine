import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = Array.from({ length: 12 }, (_, index) => ({ normal: `resume-${index + 1}.png`, low: `resume-${index + 1}-low.png`, thumb: `resume-${index + 1}-thumb.png` }));
const opened = async (options: Record<string, unknown> = {}) => {
  const engine = new FlipbookEngine('#app', { soundUrl: '', ...options });
  await engine.init('resume.pdf', pages);
  return engine;
};

test('reopens at the last page read for the same document', async () => {
  window.localStorage.clear();
  const first = await opened();
  first.goToPage(7);
  await new Promise((resolve) => setTimeout(resolve, 0));
  first.destroy();

  const second = await opened();
  assert.equal(second.getCurrentPage(), 7);
  second.destroy();

  const other = await opened({ rememberPage: 'another-document' });
  assert.equal(other.getCurrentPage(), 0);
  other.destroy();
});

test('startPage wins over the saved page and rememberPage: false ignores storage', async () => {
  window.localStorage.clear();
  window.localStorage.setItem('flipbook:lastPage:resume.pdf', '5');
  const host = await opened({ startPage: 9 });
  assert.equal(host.getCurrentPage(), 9);
  host.destroy();

  const off = await opened({ rememberPage: false });
  assert.equal(off.getCurrentPage(), 0);
  off.destroy();
});
