import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

test('placing a coordinate note works when crypto.randomUUID is unavailable', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  try {
    const engine = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false, singleMode: true, annotationProvider: async () => {} });
    await engine.init('', [{ normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' }]);
    engine.beginAnnotation();
    engine.placeAnnotation(0, .5, .5);
    const pending = (engine as any).store.pendingAnnotation.value;
    assert.ok(pending && pending.id.length > 0);
    engine.destroy();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor); else delete (globalThis as { crypto?: unknown }).crypto;
  }
});
