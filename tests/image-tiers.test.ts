import test from 'node:test';
import assert from 'node:assert/strict';

import { chooseImageTier, pickTierSrc, resolveImageTiers } from '../src/core/imageTiers.ts';
import { normalizeFlipbookPages } from '../src/model/pages.ts';

const cfg = resolveImageTiers(true)!;

test('tiers are off unless requested', () => {
  assert.equal(resolveImageTiers(undefined), null);
  assert.equal(resolveImageTiers(false), null);
  assert.deepEqual(cfg.zoomThresholds, [1.05, 1.75]);
  assert.equal(cfg.narrowMaxWidth, 1024);
});

test('wide screens use normal and large only on the zoomed page', () => {
  assert.equal(chooseImageTier(cfg, { zoom: 1, viewportWidth: 1600, pageZoomed: false }), 'normal');
  assert.equal(chooseImageTier(cfg, { zoom: 1.5, viewportWidth: 1600, pageZoomed: true }), 'normal');
  assert.equal(chooseImageTier(cfg, { zoom: 2, viewportWidth: 1600, pageZoomed: true }), 'large');
  assert.equal(chooseImageTier(cfg, { zoom: 2, viewportWidth: 1600, pageZoomed: false }), 'normal');
});

test('narrow screens use low unzoomed and large only when zoomed past the upper threshold', () => {
  assert.equal(chooseImageTier(cfg, { zoom: 1, viewportWidth: 390, pageZoomed: false }), 'low');
  assert.equal(chooseImageTier(cfg, { zoom: 2, viewportWidth: 390, pageZoomed: false }), 'low');
  assert.equal(chooseImageTier(cfg, { zoom: 1.5, viewportWidth: 390, pageZoomed: true }), 'normal');
  assert.equal(chooseImageTier(cfg, { zoom: 2, viewportWidth: 390, pageZoomed: true }), 'large');
});

test('select overrides; invalid answers and throws fall back', () => {
  const pick = resolveImageTiers({ select: () => 'large' })!;
  assert.equal(chooseImageTier(pick, { zoom: 1, viewportWidth: 1600, pageZoomed: false }), 'large');
  const bad = resolveImageTiers({ select: () => 'huge' as never })!;
  assert.equal(chooseImageTier(bad, { zoom: 1, viewportWidth: 390, pageZoomed: false }), 'low');
  const throwing = resolveImageTiers({ select: () => { throw new Error('x'); } })!;
  assert.equal(chooseImageTier(throwing, { zoom: 1, viewportWidth: 1600, pageZoomed: false }), 'normal');
});

test('large falls back to normal and the page model carries it', () => {
  assert.equal(pickTierSrc({ low: 'l', normal: 'n' }, 'large'), 'n');
  assert.equal(pickTierSrc({ low: 'l', normal: 'n', large: 'x' }, 'large'), 'x');
  const [page] = normalizeFlipbookPages([{ normal: 'n', low: 'l', thumb: 't', large: 'x' }]);
  assert.equal(page.large, 'x');
});
