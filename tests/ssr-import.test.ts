import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// A bare Node process has no window, document or DOMMatrix: importing the package must not touch them.
const dist = resolve('dist/flipbook-engine.js');

test('the built ESM entry imports in Node without browser globals', { skip: !existsSync(dist) && 'dist is not built' }, () => {
  const script = `const m = await import(${JSON.stringify(pathToFileURL(dist).href)}); if (typeof m.FlipbookEngine !== 'function') process.exit(3); console.log('ok');`;
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /ok/);
});

test('the PDF.js bindings are not evaluated at import time', async () => {
  assert.equal(typeof (globalThis as any).DOMMatrix, 'undefined');
  const { createPdfJsPageSource } = await import('../src/core/pdfJsPageSource.ts');
  const source = createPdfJsPageSource({});
  assert.equal(typeof source.loadDocument, 'function');
  source.destroy();
});
