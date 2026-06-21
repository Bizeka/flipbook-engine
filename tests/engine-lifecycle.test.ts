import test from 'node:test';
import assert from 'node:assert/strict';

// Load DOM mock
import './dom-mock.ts';

import { FlipbookEngine } from '../src/engine.ts';

test('engine lifecycle - initializes successfully with pdfUrl', async () => {
  const engine = new FlipbookEngine('#app', {
    theme: 'light'
  });

  // Call init (which triggers engine initialization)
  await engine.init('mock.pdf', [
    { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
    { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
  ]);

  assert.equal(engine.getTotalPages(), 2);
  assert.equal(engine.getCurrentPage(), 0);
  
  // Clean up

});

test('engine lifecycle - updateOptions updates configuration runtime', async () => {
  const engine = new FlipbookEngine('#app', {
    theme: 'light'
  });

  await engine.init('mock.pdf', [
    { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
    { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
  ]);
  
  // Check default options
  const appContainer = document.querySelector('#app') as any;
  assert.ok(appContainer.classList.contains('bk-theme-light'));

  // Update options to dark theme
  engine.updateOptions({ theme: 'dark' });
  assert.ok(appContainer.classList.contains('bk-theme-dark'));
  assert.ok(!appContainer.classList.contains('bk-theme-light'));


});

test('engine lifecycle - handles page updates and resets state', async () => {
  const engine = new FlipbookEngine('#app', {
    theme: 'light'
  });

  await engine.init('mock.pdf', [
    { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
    { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
  ]);
  assert.equal(engine.getTotalPages(), 2);

  // Destroying resets container content

});

test('engine api - setSingleMode toggles single page view mode', async () => {
  const engine = new FlipbookEngine('#app', {});
  await engine.init('mock.pdf', [
    { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
    { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
  ]);

  // Set single page mode
  engine.setSingleMode(true);
  
  await Promise.resolve(); // Wait for signal DOM update
  // Verify UI toggle
  const singleBtn = document.querySelector('.bz-hide-mobile') as any;
  assert.ok(singleBtn.classList.contains('active'));

  // Disable single page mode
  engine.setSingleMode(false);
  await Promise.resolve(); // Wait for signal DOM update
  assert.ok(!singleBtn.classList.contains('active'));


});

test('engine api - getZoom and setZoom updates scale', async () => {
  const engine = new FlipbookEngine('#app', {});
  await engine.init('mock.pdf', [
    { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
    { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
  ]);

  // Initial zoom should be 1
  assert.equal(engine.getZoom(), 1);

  // Zoom in
  engine.setZoom(2.5);
  assert.equal(engine.getZoom(), 2.5);

  // Zoom back out
  engine.setZoom(1);
  assert.equal(engine.getZoom(), 1);


});

test('engine api - goToPage moves to specific page', async () => {
  const engine = new FlipbookEngine('#app', {});
  await engine.init('mock.pdf', [
    { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
    { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
  ]);

  engine.setSingleMode(true);
  assert.equal(engine.getCurrentPage(), 0);

  // Go to page index 1
  engine.goToPage(1);
  assert.equal(engine.getCurrentPage(), 1);


});
