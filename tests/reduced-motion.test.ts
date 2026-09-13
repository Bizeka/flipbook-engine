import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

import { prefersReducedMotion, resolveFlippingTime } from '../src/adapters/PageFlipAdapter.ts';

test('reduced-motion preference disables page flip animation', () => {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = (() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as any;

  assert.equal(prefersReducedMotion(), true);
  assert.equal(resolveFlippingTime(800), 0);

  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as any;
  assert.equal(prefersReducedMotion(), false);
  assert.equal(resolveFlippingTime(800), 800);
  assert.equal(resolveFlippingTime(undefined), 1000);
  assert.equal(resolveFlippingTime(0), 0);

  window.matchMedia = originalMatchMedia;
});

test('explicit reduced-motion override is deterministic', () => {
  assert.equal(resolveFlippingTime(500, true), 0);
  assert.equal(resolveFlippingTime(500, false), 500);
});