import test from 'node:test';
import assert from 'node:assert/strict';
import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { resolveEmbedUrl } from '../src/model/hotspots.ts';

const pages = [
  { normal: 'one.png', low: 'one.png', thumb: 'one.png' },
  { normal: 'two.png', low: 'two.png', thumb: 'two.png' }
];

test('resolveEmbedUrl turns YouTube and Vimeo links into player URLs and rejects other hosts', () => {
  const yt = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0';
  assert.equal(resolveEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), yt);
  assert.equal(resolveEmbedUrl('https://youtu.be/dQw4w9WgXcQ'), yt);
  assert.equal(resolveEmbedUrl('https://m.youtube.com/shorts/dQw4w9WgXcQ'), yt);
  assert.equal(resolveEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ'), yt);
  assert.equal(resolveEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=1m30s'), yt + '&start=90');
  assert.equal(resolveEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42'), yt + '&start=42');
  assert.equal(resolveEmbedUrl('https://vimeo.com/76979871'), 'https://player.vimeo.com/video/76979871?dnt=1');
  assert.equal(resolveEmbedUrl('https://vimeo.com/76979871/abc123def0'), 'https://player.vimeo.com/video/76979871?dnt=1&h=abc123def0');
  assert.equal(resolveEmbedUrl('https://player.vimeo.com/video/76979871'), 'https://player.vimeo.com/video/76979871?dnt=1');
  assert.equal(resolveEmbedUrl('https://example.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(resolveEmbedUrl('https://www.youtube.com/watch?v=bad"id'), null);
  assert.equal(resolveEmbedUrl('javascript:alert(1)'), null);
  assert.equal(resolveEmbedUrl('/media/demo.mp4'), null);
});

test('hotspot embeds render a sandboxed player, other embed hosts fall back to a link', async () => {
  const engine = new FlipbookEngine('#app', {
    soundEnabled: false,
    hotspots: [
      { id: 'yt', pageIndex: 0, x: .1, y: .1, width: .2, height: .1, label: 'Lesson video', kind: 'media', media: { type: 'embed', src: 'https://youtu.be/dQw4w9WgXcQ' } },
      { id: 'as-video', pageIndex: 0, x: .4, y: .1, width: .2, height: .1, label: 'Vimeo', kind: 'media', media: { type: 'video', src: 'https://vimeo.com/76979871' } },
      { id: 'other', pageIndex: 0, x: .7, y: .1, width: .2, height: .1, label: 'Other', kind: 'media', media: { type: 'embed', src: 'https://example.com/player/1' } }
    ]
  });
  await engine.init('', pages);

  engine.activateHotspot('yt');
  let frame = document.querySelector('.bk-hotspot-media-embed iframe');
  assert.equal(frame?.getAttribute('src'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
  assert.equal(frame?.getAttribute('title'), 'Lesson video');
  assert.match(frame?.getAttribute('allow') ?? '', /fullscreen/);
  assert.match(frame?.getAttribute('sandbox') ?? '', /allow-scripts/);
  assert.doesNotMatch(frame?.getAttribute('sandbox') ?? '', /allow-top-navigation/);
  assert.ok(document.querySelector('.bk-hotspot-popup.has-embed'));

  engine.activateHotspot('as-video');
  frame = document.querySelector('.bk-hotspot-media-embed iframe');
  assert.equal(frame?.getAttribute('src'), 'https://player.vimeo.com/video/76979871?dnt=1');
  assert.equal(document.querySelector('video.bk-hotspot-media-video'), null);

  engine.activateHotspot('other');
  assert.equal(document.querySelector('.bk-hotspot-media-embed'), null);
  const link = document.querySelector('.bk-hotspot-popup a.bk-hotspot-link');
  assert.equal(link?.getAttribute('href'), 'https://example.com/player/1');
  assert.equal(link?.getAttribute('rel'), 'noopener noreferrer');
  engine.destroy();
});
