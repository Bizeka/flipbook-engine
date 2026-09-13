import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { InteractionManager } from '../src/core/InteractionManager.ts';
import { createFlipbookStore } from '../src/state/store.ts';

test('interaction listeners stop mutating state after destroy', () => {
  const container = document.createElement('div');
  const store = createFlipbookStore();
  const manager = new InteractionManager(container, {} as any, store);
  manager.init();
  store.zoomState.value = { ...store.zoomState.value, isActive: true, scale: 2 };

  const wheel = new Event('wheel', { cancelable: true }) as any;
  wheel.deltaX = 12;
  wheel.deltaY = 4;
  container.dispatchEvent(wheel);
  assert.equal(store.zoomState.value.translateX, -12);

  manager.destroy();
  const before = store.zoomState.value.translateX;
  const afterDestroyWheel = new Event('wheel', { cancelable: true }) as any;
  afterDestroyWheel.deltaX = 20;
  container.dispatchEvent(afterDestroyWheel);
  assert.equal(store.zoomState.value.translateX, before);
});
