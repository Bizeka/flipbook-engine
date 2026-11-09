import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { hitTestStroke, initialDrawingTool, mergeDrawingTool, pointToPage, resolveDrawingOptions, strokeAtPoint, strokePathData, type FlipbookStroke } from '../src/model/drawings.ts';

const stroke = (id: string, points: Array<[number, number]>, width = 4): FlipbookStroke => ({ id, page: 0, tool: 'pen', color: '#f00', opacity: 1, width, points, createdAt: 1 });
const pages = [{ normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' }, { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }];
const options = resolveDrawingOptions(true)!;

test('pointToPage maps client coordinates to 0..1 of the page box and clamps', () => {
  const box = { left: 100, top: 50, width: 400, height: 200 };
  assert.deepEqual(pointToPage(300, 150, box), [0.5, 0.5]);
  assert.deepEqual(pointToPage(100, 50, box), [0, 0]);
  assert.deepEqual(pointToPage(900, -10, box), [1, 0]);
  assert.equal(pointToPage(1, 1, { left: 0, top: 0, width: 0, height: 10 }), null);
});

test('the mapping follows a zoomed (scaled) box, so strokes keep their place on the page', () => {
  const fit = { left: 0, top: 0, width: 300, height: 400 };
  const zoomed = { left: -150, top: -200, width: 900, height: 1200 };
  const onFit = pointToPage(150, 200, fit)!;
  const onZoomed = pointToPage(-150 + 0.5 * 900, -200 + 0.5 * 1200, zoomed)!;
  assert.deepEqual(onFit, onZoomed);
});

test('strokePathData writes M/L commands and keeps a single point drawable', () => {
  assert.equal(strokePathData([[0, 0], [0.5, 0.25], [1, 1]]), 'M0 0L0.5 0.25L1 1');
  assert.equal(strokePathData([[0.2, 0.3]]), 'M0.2 0.3L0.2 0.3');
  assert.equal(strokePathData([]), '');
});

test('hitTestStroke measures in page pixels with a tolerance', () => {
  const line = stroke('a', [[0.1, 0.5], [0.9, 0.5]], 4);
  const box = { width: 400, height: 200 };
  assert.equal(hitTestStroke(line, 0.5, 0.5, box), true, 'on the line');
  assert.equal(hitTestStroke(line, 0.5, 0.5 + 3 / 200, box), false, '3 px away is outside a 2 px half width');
  assert.equal(hitTestStroke(line, 0.5, 0.5 + 3 / 200, box, 2), true, 'inside half width plus tolerance');
  assert.equal(hitTestStroke(line, 0.5, 0.5 + 20 / 200, box, 8), false, 'too far');
  assert.equal(hitTestStroke(line, 0.95, 0.5, box, 8), false, 'beyond the end of the segment');
  assert.equal(hitTestStroke(line, 0.9 + 5 / 400, 0.5, box, 8), true, 'near the end point');
});

test('hitTestStroke keeps the same pixel reach in x and y on a tall page', () => {
  const dot = stroke('dot', [[0.5, 0.5]], 2);
  const box = { width: 100, height: 1000 };
  assert.equal(hitTestStroke(dot, 0.5 + 6 / 100, 0.5, box, 8), true);
  assert.equal(hitTestStroke(dot, 0.5, 0.5 + 6 / 1000, box, 8), true);
  assert.equal(hitTestStroke(dot, 0.5, 0.5 + 12 / 1000, box, 8), false);
  assert.equal(hitTestStroke(stroke('none', []), 0.5, 0.5, box, 8), false);
});

test('strokeAtPoint returns the topmost stroke under the point', () => {
  const below = stroke('below', [[0, 0.5], [1, 0.5]], 10);
  const above = stroke('above', [[0, 0.5], [1, 0.5]], 10);
  const box = { width: 200, height: 200 };
  assert.equal(strokeAtPoint([below, above], 0.5, 0.5, box, 4)?.id, 'above');
  assert.equal(strokeAtPoint([below, above], 0.5, 0.9, box, 4), null);
});

test('mergeDrawingTool applies valid changes and takes tool defaults on a switch', () => {
  const start = initialDrawingTool(options);
  assert.equal(start.tool, 'highlight');
  assert.equal(start.width, 15);
  assert.equal(start.opacity, 0.5);
  const pen = mergeDrawingTool(start, { tool: 'pen' }, options);
  assert.deepEqual([pen.tool, pen.width, pen.opacity], ['pen', 3, 1]);
  const custom = mergeDrawingTool(pen, { color: '#0af', width: 9, opacity: 0.2 }, options);
  assert.deepEqual([custom.color, custom.width, custom.opacity], ['#0af', 9, 0.2]);
  const eraser = mergeDrawingTool(custom, { tool: 'eraser' }, options);
  assert.deepEqual([eraser.tool, eraser.color, eraser.width, eraser.opacity], ['eraser', '#0af', 9, 0.2]);
  assert.equal(mergeDrawingTool(custom, { color: 'red;}', width: -1, opacity: NaN, tool: 'nope' as never }, options).color, '#0af');
  assert.deepEqual(mergeDrawingTool(custom, { tool: 'eraser' }, resolveDrawingOptions({ tools: ['pen'] })), custom);
});

test('the engine exposes the drawing tool and the layer state', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false, drawing: { colors: ['#123456'], defaultTool: 'pen' } });
  assert.equal(engine.getDrawingTool(), null);
  await engine.init('', pages);
  assert.deepEqual(engine.getDrawingTool(), { tool: 'pen', color: '#123456', width: 3, opacity: 1 });
  assert.equal(engine.setDrawingTool({ tool: 'highlight', color: '#ff0' })?.width, 15);
  assert.equal(engine.getDrawingTool()?.color, '#ff0');
  engine.setDrawingMode(true);
  const added = engine.addStroke({ page: 0, tool: 'pen', color: '#f00', points: [[0.1, 0.1], [0.2, 0.2]] });
  assert.ok(added);
  assert.equal(engine.getStrokes(0).length, 1);
  engine.removeStroke(added!.id);
  assert.equal(engine.getStrokes(0).length, 0);
  engine.destroy();
});

test('setDrawingTool is inert without the drawing option', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false });
  await engine.init('', pages);
  assert.equal(engine.setDrawingTool({ tool: 'pen' }), null);
  engine.destroy();
});
