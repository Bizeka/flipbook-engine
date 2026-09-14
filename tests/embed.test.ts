import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { createFlipbookEmbedController } from '../src/embed.ts';

test('embed controller sends commands and resolves responses from the iframe', async () => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  const sent: any[] = [];
  (iframe.contentWindow as any).postMessage = (message: unknown, origin: string) => sent.push({ message, origin });

  const controller = createFlipbookEmbedController(iframe);
  const resultPromise = controller.goToPage(4);

  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].message, {
    type: 'flipbook:command',
    command: 'goToPage',
    payload: { pageIndex: 4 },
    requestId: 'flipbook-1'
  });
  assert.equal(sent[0].origin, 'http://localhost');

  window.dispatchEvent(new window.MessageEvent('message', {
    source: iframe.contentWindow,
    origin: 'http://localhost',
    data: {
      type: 'flipbook:response',
      requestId: 'flipbook-1',
      ok: true,
      result: { currentPage: 4, totalPages: 10, zoom: 1 }
    }
  }));

  assert.deepEqual(await resultPromise, { currentPage: 4, totalPages: 10, zoom: 1 });
  controller.destroy();
  iframe.remove();
});

test('embed controller ignores messages from another origin or window', async () => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  const sent: any[] = [];
  (iframe.contentWindow as any).postMessage = (message: unknown) => sent.push(message);

  const controller = createFlipbookEmbedController(iframe, { responseTimeout: 20 });
  const resultPromise = controller.getState();

  window.dispatchEvent(new window.MessageEvent('message', {
    source: window,
    origin: 'http://localhost',
    data: {
      type: 'flipbook:response',
      requestId: 'flipbook-1',
      ok: true,
      result: { currentPage: 0, totalPages: 1, zoom: 1 }
    }
  }));
  window.dispatchEvent(new window.MessageEvent('message', {
    source: iframe.contentWindow,
    origin: 'https://untrusted.example',
    data: {
      type: 'flipbook:response',
      requestId: 'flipbook-1',
      ok: true,
      result: { currentPage: 0, totalPages: 1, zoom: 1 }
    }
  }));

  await assert.rejects(resultPromise, /timed out/i);
  assert.equal(sent.length, 1);
  controller.destroy();
  iframe.remove();
});

test('embed controller forwards iframe events to subscribers', () => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  (iframe.contentWindow as any).postMessage = () => {};

  const controller = createFlipbookEmbedController(iframe);
  const events: any[] = [];
  const unsubscribe = controller.on('pageChange', (payload) => events.push(payload));

  window.dispatchEvent(new window.MessageEvent('message', {
    source: iframe.contentWindow,
    origin: 'http://localhost',
    data: {
      type: 'flipbook:event',
      event: 'pageChange',
      payload: { currentPage: 1, pageNumber: 2, totalPages: 3, isSingle: true }
    }
  }));

  assert.deepEqual(events, [{ currentPage: 1, pageNumber: 2, totalPages: 3, isSingle: true }]);
  unsubscribe();
  controller.destroy();
  iframe.remove();
});

test('embed controller exposes the asynchronous search command', async () => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  const sent: any[] = [];
  (iframe.contentWindow as any).postMessage = (message: unknown, origin: string) => sent.push({ message, origin });
  const controller = createFlipbookEmbedController(iframe);
  const resultPromise = controller.search('catalog', { maxResults: 5 });
  assert.equal(sent[0].message.command, 'search');
  assert.deepEqual(sent[0].message.payload, { query: 'catalog', options: { maxResults: 5 } });
  window.dispatchEvent(new window.MessageEvent('message', {
    source: iframe.contentWindow,
    origin: 'http://localhost',
    data: { type: 'flipbook:response', requestId: sent[0].message.requestId, ok: true, result: [{ pageIndex: 0, pageNumber: 1, matches: 1, snippet: 'catalog' }] }
  }));
  assert.equal((await resultPromise)[0].pageNumber, 1);
  controller.destroy();
  iframe.remove();
});


test('embed controller exposes TOC read and update commands', async () => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  const sent: any[] = [];
  (iframe.contentWindow as any).postMessage = (message: unknown, origin: string) => sent.push({ message, origin });
  const controller = createFlipbookEmbedController(iframe);

  const tocPromise = controller.getToc();
  assert.equal(sent[0].message.command, 'getToc');
  window.dispatchEvent(new window.MessageEvent('message', {
    source: iframe.contentWindow,
    origin: 'http://localhost',
    data: { type: 'flipbook:response', requestId: sent[0].message.requestId, ok: true, result: [{ title: 'Products', pageIndex: 2 }] }
  }));
  assert.deepEqual(await tocPromise, [{ title: 'Products', pageIndex: 2 }]);

  const entries = [{ title: 'Updated', pageIndex: 4 }];
  const updatePromise = controller.setToc(entries, true);
  assert.equal(sent[1].message.command, 'setToc');
  assert.deepEqual(sent[1].message.payload, { entries, show: true });
  window.dispatchEvent(new window.MessageEvent('message', {
    source: iframe.contentWindow,
    origin: 'http://localhost',
    data: { type: 'flipbook:response', requestId: sent[1].message.requestId, ok: true, result: { currentPage: 0, totalPages: 5, zoom: 1 } }
  }));
  assert.equal((await updatePromise).totalPages, 5);
  controller.destroy();
  iframe.remove();
});
