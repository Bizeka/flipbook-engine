import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

import { FlipbookEngine } from '../src/engine.ts';
import { VERSION } from '../src/version.ts';

test('the engine reports one version, from the class and from an instance', () => {
  assert.ok(VERSION.length > 0);
  assert.equal(FlipbookEngine.version, VERSION);
  assert.equal(new FlipbookEngine('#app').version, VERSION);
});
