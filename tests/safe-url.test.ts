import test from 'node:test';
import assert from 'node:assert/strict';
import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { safeLinkUrl } from '../src/model/safe-url.ts';

const pages = [
  { normal: 'one.png', low: 'one.png', thumb: 'one.png' },
  { normal: 'two.png', low: 'two.png', thumb: 'two.png' }
];

test('safeLinkUrl keeps web, mail, phone and relative links and drops script schemes', () => {
  for (const ok of ['https://example.com/a?b=1', 'http://example.com', '/products/42', 'products/42', '#page=3', 'mailto:a@b.co', 'tel:+905551112233']) {
    assert.equal(safeLinkUrl(ok), ok);
  }
  for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', 'file:///etc/passwd', '', '   ', null, 42]) {
    assert.equal(safeLinkUrl(bad), undefined, String(bad));
  }
});

test('hotspot links with unsafe schemes are not rendered', async () => {
  const engine = new FlipbookEngine('#app', {
    soundUrl: '',
    hotspots: [
      { id: 'bad', pageIndex: 0, x: .1, y: .1, width: .2, height: .1, label: 'Bad', href: 'javascript:alert(1)', gallery: [{ src: '/a.png', href: 'javascript:alert(2)' }] },
      { id: 'good', pageIndex: 0, x: .4, y: .1, width: .2, height: .1, label: 'Good', href: '/products/42' }
    ]
  });
  await engine.init('', pages);
  engine.activateHotspot('bad');
  assert.equal(document.querySelector('.bk-hotspot-popup a'), null);
  assert.ok(document.querySelector('.bk-hotspot-gallery-selected'));
  engine.activateHotspot('good');
  assert.equal(document.querySelector('.bk-hotspot-popup a.bk-hotspot-link')?.getAttribute('href'), '/products/42');
  engine.destroy();
});
