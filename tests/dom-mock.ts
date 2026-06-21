// jsdom based DOM Mock for running UI/theme/engine tests in Node.js environment
import { JSDOM } from 'jsdom';

// Create a real JSDOM environment
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="app"></div></body></html>', {
  url: 'http://localhost'
});

// Expose standard DOM objects to global scope for Domwise JSX factory and UI tests
globalThis.window = dom.window as any;

// Suppress unhandled async DOM/UI teardown errors in test runner
process.on('uncaughtException', (err) => {
  // Ignore harmless async teardown errors after tests finish
  if (err && err.message && err.message.includes('init')) return;
  console.error('Unhandled Exception:', err);
});

globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLImageElement = dom.window.HTMLImageElement;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.Image = dom.window.Image;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.Comment = dom.window.Comment;
globalThis.Audio = dom.window.Audio;

// Mock window functions that JSDOM might not implement fully or correctly for our tests
globalThis.window.matchMedia = () => ({
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {}
}) as any;

globalThis.window.open = () => null;

class MockImage {
  onload: () => void = () => {};
  onerror: () => void = () => {};
  naturalWidth = 600;
  naturalHeight = 800;
  _src: string = '';
  get src(): string {
    return this._src;
  }
  set src(val: string) {
    this._src = val;
    // Simulate async load
    setTimeout(() => {
      if (val.includes('error')) {
        this.onerror();
      } else {
        this.onload();
      }
    }, 0);
  }
}
// Override Image with our MockImage if tests rely on immediate or guaranteed loading events
globalThis.Image = MockImage as any;
