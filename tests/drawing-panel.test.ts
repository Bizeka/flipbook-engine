import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { initialDrawingTool, mergeDrawingTool, resolveDrawingOptions } from '../src/model/drawings.ts';
import { clampWidth, opacityToPercent, panelChange, panelView, percentToOpacity, WIDTH_LIMITS } from '../src/model/drawing-panel.ts';

const pages = [{ normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' }, { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }];
const options = resolveDrawingOptions(true)!;
const start = initialDrawingTool(options);

test('opacity maps between the 10..100 percent slider and 0.1..1', () => {
  assert.equal(opacityToPercent(0.5), 50);
  assert.equal(opacityToPercent(0.01), 10);
  assert.equal(opacityToPercent(5), 100);
  assert.equal(opacityToPercent(NaN), 100);
  assert.equal(percentToOpacity(50), 0.5);
  assert.equal(percentToOpacity(0), 0.1);
  assert.equal(percentToOpacity(250), 1);
});

test('width is clamped to the range of the mode', () => {
  assert.equal(clampWidth('pen', 100), WIDTH_LIMITS.pen.max);
  assert.equal(clampWidth('pen', 0), WIDTH_LIMITS.pen.min);
  assert.equal(clampWidth('highlight', 15), 15);
  assert.equal(clampWidth('highlight', NaN), WIDTH_LIMITS.highlight.min);
});

test('the panel view of the defaults: highlight, 50 %, 15 px', () => {
  const view = panelView(start);
  assert.equal(view.mode, 'highlight');
  assert.equal(view.eraser, false);
  assert.equal(view.opacityPercent, 50);
  assert.equal(view.width, 15);
  assert.equal(view.color, options.colors[0]);
});

test('switching the mode takes the defaults of that mode (pen: 3 px, opaque)', () => {
  const next = mergeDrawingTool(start, panelChange(start, { type: 'mode', mode: 'pen' }), options);
  const view = panelView(next);
  assert.equal(view.mode, 'pen');
  assert.equal(view.width, 3);
  assert.equal(view.opacityPercent, 100);
  assert.equal(view.widthMax, WIDTH_LIMITS.pen.max);
});

test('colour, opacity and width changes keep the mode', () => {
  let state = mergeDrawingTool(start, panelChange(start, { type: 'color', color: '#e91e63' }), options);
  state = mergeDrawingTool(state, panelChange(state, { type: 'opacity', percent: 30 }), options);
  state = mergeDrawingTool(state, panelChange(state, { type: 'width', value: 22 }), options);
  assert.deepEqual({ tool: state.tool, color: state.color, opacity: state.opacity, width: state.width }, { tool: 'highlight', color: '#e91e63', opacity: 0.3, width: 22 });
});

test('the eraser toggles on and back to the last mode, and a colour pick leaves it', () => {
  const pen = mergeDrawingTool(start, { tool: 'pen' }, options);
  const erasing = mergeDrawingTool(pen, panelChange(pen, { type: 'eraser', on: true }, 'pen'), options);
  assert.equal(erasing.tool, 'eraser');
  assert.equal(panelView(erasing, 'pen').mode, 'pen');
  assert.equal(panelView(erasing, 'pen').eraser, true);
  const back = mergeDrawingTool(erasing, panelChange(erasing, { type: 'eraser', on: false }, 'pen'), options);
  assert.equal(back.tool, 'pen');
  const picked = mergeDrawingTool(erasing, panelChange(erasing, { type: 'color', color: '#4caf50' }, 'pen'), options);
  assert.equal(picked.tool, 'pen');
  assert.equal(picked.color, '#4caf50');
});

test('a tool the config does not allow is ignored', () => {
  const only = resolveDrawingOptions({ tools: ['pen'] })!;
  const state = initialDrawingTool(only);
  assert.equal(mergeDrawingTool(state, panelChange(state, { type: 'mode', mode: 'highlight' }), only).tool, 'pen');
});

test('the Pen button and the panel exist only with the drawing option', async () => {
  const off = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false });
  await off.init('', pages);
  assert.equal(document.querySelector('.bk-btn--pen'), null);
  off.destroy();
  const on = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false, drawing: { colors: ['#112233', '#445566'] } });
  await on.init('', pages);
  const pen = document.querySelector('.bk-btn--pen') as HTMLElement;
  assert.ok(pen);
  assert.equal(pen.getAttribute('aria-pressed'), 'false');
  assert.equal(document.querySelectorAll('.bk-draw-swatch').length, 2);
  on.destroy();
});

test('the Pen button toggles drawing mode and the panel follows the engine tool state', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false, drawing: true });
  await engine.init('', pages);
  const pen = document.querySelector('.bk-btn--pen') as HTMLElement;
  const panel = document.querySelector('.bk-draw-panel') as HTMLElement;
  assert.equal(panel.style.display, 'none');
  pen.click();
  assert.equal(engine.isDrawingMode(), true);
  assert.equal(panel.style.display, 'flex');
  assert.equal(pen.getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelectorAll('.bk-draw-swatch').length, 6);

  (document.querySelectorAll('.bk-draw-mode')[1] as HTMLElement).click();
  assert.equal(engine.getDrawingTool()!.tool, 'pen');
  assert.equal(engine.getDrawingTool()!.width, 3);
  (document.querySelectorAll('.bk-draw-swatch')[3] as HTMLElement).click();
  assert.equal(engine.getDrawingTool()!.color, '#e91e63');
  (document.querySelector('.bk-draw-eraser') as HTMLElement).click();
  assert.equal(engine.getDrawingTool()!.tool, 'eraser');
  (document.querySelector('.bk-draw-eraser') as HTMLElement).click();
  assert.equal(engine.getDrawingTool()!.tool, 'pen');

  const undo = document.querySelector('.bk-draw-undo') as HTMLButtonElement;
  const redo = document.querySelector('.bk-draw-redo') as HTMLButtonElement;
  assert.equal(undo.disabled, true);
  engine.addStroke({ page: 0, tool: 'pen', color: '#f00', points: [[.1, .1], [.9, .9]] });
  assert.equal(undo.disabled, false);
  undo.click();
  assert.equal(engine.getStrokes().length, 0);
  assert.equal(redo.disabled, false);
  redo.click();
  assert.equal(engine.getStrokes().length, 1);

  // Clearing needs a confirm step.
  (document.querySelector('.bk-draw-clear') as HTMLElement).click();
  assert.equal(engine.getStrokes().length, 1);
  (document.querySelector('.bk-draw-confirm-no') as HTMLElement).click();
  assert.equal(engine.getStrokes().length, 1);
  (document.querySelector('.bk-draw-clear') as HTMLElement).click();
  (document.querySelector('.bk-draw-confirm-yes') as HTMLElement).click();
  assert.equal(engine.getStrokes().length, 0);

  (document.querySelector('.bk-draw-close') as HTMLElement).click();
  assert.equal(engine.isDrawingMode(), false);
  assert.equal(panel.style.display, 'none');
  engine.destroy();
});

test('panel texts are translated, and a message override reaches them', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false, drawing: true, locale: 'tr', messages: { tr: { drawingClear: 'Sil' } } });
  await engine.init('', pages);
  assert.equal((document.querySelector('.bk-btn--pen') as HTMLElement).title, 'Kalem');
  assert.equal(document.querySelector('.bk-draw-clear')!.textContent, 'Sil');
  engine.setLocale('en');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal((document.querySelector('.bk-btn--pen') as HTMLElement).title, 'Pen');
  engine.destroy();
});
