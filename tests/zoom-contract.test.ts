import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { InteractionManager } from '../src/core/InteractionManager.ts';
import { createFlipbookStore } from '../src/state/store.ts';

test('interaction zoom uses the public five-times maximum', () => {
  const container = document.createElement('div');
  const store = createFlipbookStore();
  const manager = new InteractionManager(container, {} as any, store);

  for (let i = 0; i < 12; i++) manager.zoomIn();
  assert.equal(store.zoomState.value.scale, 5);
  assert.equal(store.zoomState.value.isActive, true);

  for (let i = 0; i < 12; i++) manager.zoomOut();
  assert.equal(store.zoomState.value.scale, 1);
  assert.equal(store.zoomState.value.isActive, false);
  manager.destroy();
});
