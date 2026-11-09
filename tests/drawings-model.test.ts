import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeStroke, resolveDrawingOptions, simplifyPoints, strokeDefaults, MAX_STROKE_POINTS } from '../src/model/drawings.ts';

const base = { id: 's1', page: 2, tool: 'pen', color: '#ff0000', points: [[0.1, 0.2], [0.3, 0.4]] };

test('normalizeStroke keeps a valid stroke and fills defaults', () => {
  const stroke = normalizeStroke(base, { now: () => 42 })!;
  assert.equal(stroke.id, 's1');
  assert.equal(stroke.page, 2);
  assert.equal(stroke.width, 3);
  assert.equal(stroke.opacity, 1);
  assert.equal(stroke.createdAt, 42);
  assert.deepEqual(stroke.points, [[0.1, 0.2], [0.3, 0.4]]);
  assert.equal(normalizeStroke({ ...base, tool: 'highlight' })!.opacity, 0.5);
  assert.equal(normalizeStroke({ ...base, tool: 'highlight' })!.width, 15);
});

test('normalizeStroke clamps coordinates, width and opacity and drops unknown fields', () => {
  const stroke = normalizeStroke({ ...base, points: [[-1, 2], [0.5, 0.5]], width: 9999, opacity: 7, extra: 'x', authorId: 'u1', updatedAt: 5 })!;
  assert.deepEqual(stroke.points[0], [0, 1]);
  assert.equal(stroke.width, 200);
  assert.equal(stroke.opacity, 1);
  assert.equal(stroke.authorId, 'u1');
  assert.equal(stroke.updatedAt, 5);
  assert.equal('extra' in stroke, false);
  assert.equal(normalizeStroke({ ...base, opacity: 0 })!.opacity, 0.01);
});

test('normalizeStroke rejects strokes that cannot be drawn', () => {
  assert.equal(normalizeStroke(null), null);
  assert.equal(normalizeStroke({ ...base, page: -1 }), null);
  assert.equal(normalizeStroke({ ...base, page: 1.5 }), null);
  assert.equal(normalizeStroke({ ...base, tool: 'eraser' }), null);
  assert.equal(normalizeStroke({ ...base, color: '' }), null);
  assert.equal(normalizeStroke({ ...base, color: 'red;}body{' }), null);
  assert.equal(normalizeStroke({ ...base, points: [] }), null);
  assert.equal(normalizeStroke({ ...base, points: [[0, NaN]] }), null);
  assert.equal(normalizeStroke({ ...base, points: [[0]] }), null);
  assert.equal(normalizeStroke({ ...base, id: '' }), null);
  assert.equal(normalizeStroke({ ...base, id: '' }, { id: () => 'gen' })!.id, 'gen');
});

test('normalizeStroke caps very long strokes', () => {
  const points = Array.from({ length: MAX_STROKE_POINTS * 3 }, (_, i) => [i / (MAX_STROKE_POINTS * 3), (i % 2) * 0.5]);
  const stroke = normalizeStroke({ ...base, points })!;
  assert.ok(stroke.points.length <= MAX_STROKE_POINTS);
});

test('simplifyPoints keeps ends and corners and drops collinear points', () => {
  const line: Array<[number, number]> = Array.from({ length: 50 }, (_, i) => [i / 49, i / 49]);
  assert.deepEqual(simplifyPoints(line, 0.001), [[0, 0], [1, 1]]);
  const corner: Array<[number, number]> = [[0, 0], [0.25, 0], [0.5, 0], [0.5, 0.25], [0.5, 0.5]];
  assert.deepEqual(simplifyPoints(corner, 0.001), [[0, 0], [0.5, 0], [0.5, 0.5]]);
});

test('simplifyPoints edge cases', () => {
  assert.deepEqual(simplifyPoints([]), []);
  assert.deepEqual(simplifyPoints([[0.1, 0.1]]), [[0.1, 0.1]]);
  assert.deepEqual(simplifyPoints([[0.1, 0.1], [0.2, 0.2]]), [[0.1, 0.1], [0.2, 0.2]]);
  assert.deepEqual(simplifyPoints([[0.2, 0.2], [0.2, 0.2], [0.2, 0.2]]), [[0.2, 0.2], [0.2, 0.2]]);
  const input: Array<[number, number]> = [[0, 0], [0.5, 0.0004], [1, 0]];
  simplifyPoints(input);
  assert.deepEqual(input, [[0, 0], [0.5, 0.0004], [1, 0]]);
});

test('simplifyPoints survives a very long stroke and honours maxPoints', () => {
  const zigzag: Array<[number, number]> = Array.from({ length: 30000 }, (_, i) => [i / 30000, (i % 2) * 0.01]);
  const result = simplifyPoints(zigzag, 0.001, 100);
  assert.ok(result.length <= 100);
  assert.deepEqual(result[0], zigzag[0]);
  assert.deepEqual(result[result.length - 1], zigzag[zigzag.length - 1]);
});

test('resolveDrawingOptions: off by default, true and objects resolve', () => {
  assert.equal(resolveDrawingOptions(undefined), null);
  assert.equal(resolveDrawingOptions(false), null);
  const on = resolveDrawingOptions(true)!;
  assert.equal(on.colors.length, 6);
  assert.deepEqual(on.tools, ['highlight', 'pen', 'eraser']);
  assert.equal(on.defaultTool, 'highlight');
  const custom = resolveDrawingOptions({ colors: ['#111', 'bad;'], tools: ['pen', 'pen', 'x' as any], defaultTool: 'eraser', defaultWidth: 8, defaultOpacity: 0.3 })!;
  assert.deepEqual(custom.colors, ['#111']);
  assert.deepEqual(custom.tools, ['pen']);
  assert.equal(custom.defaultTool, 'pen');
  assert.deepEqual(strokeDefaults('pen', custom), { width: 8, opacity: 0.3 });
});
