import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { DEFAULT_NOTE_COLORS } from '../src/model/annotations.ts';

const pages = [
  { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
  { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
];
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const groups = [{ key: 'exam', label: 'Exam', description: 'Likely exam topics', color: '#e5484d' }, { key: 'idea', label: 'Ideas' }];

test('notePinSize sets the pin size variable and defaults stay in CSS', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false, notePinSize: 10 });
  await engine.init('', pages);
  assert.equal((document.querySelector('#app') as HTMLElement).style.getPropertyValue('--flipbook-note-pin-size'), '10px');
  engine.updateOptions({ notePinSize: undefined });
  assert.equal((document.querySelector('#app') as HTMLElement).style.getPropertyValue('--flipbook-note-pin-size'), '');
  engine.destroy();
});

test('search highlights use one clean style that follows searchHighlightStyle', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false });
  await engine.init('', pages);
  assert.match(document.querySelector('.bk-search-highlight-layer')!.className, /is-underline/);
  engine.updateOptions({ searchHighlightStyle: 'bubble' });
  assert.match(document.querySelector('.bk-search-highlight-layer')!.className, /is-bubble/);
  engine.destroy();
});

test('pin hover and focus show the note bubble, Escape closes it', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false, singleMode: true, annotationProvider: async () => {},
    annotations: [{ id: 'a', pageIndex: 0, x: .5, y: .5, text: 'Remember this', color: '#0091ff', groupKey: 'exam' }], noteGroups: groups });
  await engine.init('', pages);
  const marker = document.querySelector('.bk-annotation-marker') as HTMLButtonElement;
  assert.match(marker.getAttribute('style') ?? '', /--bk-pin:#0091ff/);
  assert.equal(document.querySelector('.bk-note-bubble'), null);
  marker.dispatchEvent(new window.FocusEvent('focus'));
  await tick();
  const bubble = document.querySelector('.bk-note-bubble') as HTMLElement;
  assert.equal(bubble.getAttribute('role'), 'tooltip');
  assert.match(bubble.textContent ?? '', /Remember this/);
  assert.match(bubble.textContent ?? '', /Exam/);
  marker.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await tick();
  assert.equal(document.querySelector('.bk-note-bubble'), null);
  engine.destroy();
});

test('colours and groups are off by default and appear in the editor and notes panel when configured', async () => {
  const plain = new FlipbookEngine('#app', { soundEnabled: false, annotationProvider: async () => {} });
  await plain.init('', pages);
  plain.beginAnnotation(); plain.placeAnnotation(0, .3, .3);
  await tick();
  assert.match(document.querySelector('.bk-note-meta')!.getAttribute('style') ?? '', /display:none/);
  plain.destroy();

  const saved: any[] = [];
  const engine = new FlipbookEngine('#app', { soundEnabled: false, noteColors: true, noteGroupProvider: async () => groups,
    annotationProvider: async note => { saved.push(note); },
    annotations: [{ id: 'old', pageIndex: 0, x: .1, y: .1, text: 'Legacy' }, { id: 'g', pageIndex: 0, x: .2, y: .2, text: 'Grouped', groupKey: 'idea' }] });
  await engine.init('', pages);
  await tick();
  engine.beginAnnotation(); engine.placeAnnotation(0, .4, .4);
  await tick();
  const popover = document.querySelector('.bk-note-popover') as HTMLElement;
  assert.equal(popover.querySelectorAll('.bk-note-swatch').length, 5);
  assert.equal(popover.querySelectorAll('.bk-note-group-select option').length, 3);
  (popover.querySelectorAll('.bk-note-swatch')[2] as HTMLButtonElement).click();
  const select = popover.querySelector('.bk-note-group-select') as HTMLSelectElement;
  select.value = 'exam'; select.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(popover.querySelector('.bk-note-group-desc')!.textContent, 'Likely exam topics');
  const area = popover.querySelector('textarea') as HTMLTextAreaElement;
  area.value = 'New coloured note';
  (popover.querySelector('.bk-notes-save') as HTMLButtonElement).click();
  await tick(); await tick();
  assert.equal(saved[0].color, DEFAULT_NOTE_COLORS[2].value);
  assert.equal(saved[0].groupKey, 'exam');
  assert.equal(engine.getAnnotations(0).length, 3);

  (document.querySelector('.bk-btn--notes') as HTMLButtonElement).click();
  await tick();
  const filter = document.querySelector('.bk-note-group-filter') as HTMLSelectElement;
  assert.equal(document.querySelectorAll('.bk-note-list-item').length, 3);
  assert.equal(filter.options.length, 3);
  filter.value = 'idea'; filter.dispatchEvent(new window.Event('change', { bubbles: true }));
  await tick();
  assert.equal(document.querySelectorAll('.bk-note-list-item').length, 1);
  assert.match(document.querySelector('.bk-note-list-item')!.textContent ?? '', /Ideas/);
  engine.destroy();
});
