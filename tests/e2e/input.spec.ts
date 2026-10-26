import { test, expect, type Page } from '@playwright/test';

const pageImage = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="white"/></svg>';

async function open(page: Page, options: Record<string, unknown> = {}) {
  await page.setContent('<div id="one" style="width:800px;height:600px"></div>');
  await page.evaluate(() => { (window as any).pdfjsLib = { GlobalWorkerOptions: {} }; });
  await page.addStyleTag({ path: 'dist/flipbook-engine.css' });
  await page.addScriptTag({ path: 'dist/flipbook-engine.iife.js' });
  await page.evaluate(async ({ image, options }) => {
    const Engine = (window as any).FlipbookEngine.FlipbookEngine;
    const pages = [1, 2, 3, 4].map(() => ({ normal: image, low: image, thumb: image }));
    const engine = new Engine('#one', { soundEnabled: false, singleMode: true, annotationProvider: async () => {},
      annotations: [{ id: 'a', pageIndex: 0, x: .5, y: .5, text: 'Pin note', groupKey: 'g' }], noteGroups: [{ key: 'g', label: 'Group' }], ...options });
    await engine.init('', pages);
    (window as any).__engine = engine;
  }, { image: pageImage, options });
  await expect(page.locator('#one .bk-single-page .bk-annotation-marker')).toHaveCount(1);
}

const scaleOf = (page: Page) => page.evaluate(() => {
  const match = [...document.querySelectorAll<HTMLElement>('#one *')].map(el => el.style.transform).find(value => value.includes('scale('));
  return match ? Number(/scale\(([\d.]+)\)/.exec(match)![1]) : 1;
});

test.describe('touch', () => {
  test.use({ hasTouch: true, viewport: { width: 820, height: 700 } });

  test('double tap zooms in and a second double tap fits the page', async ({ page }) => {
    await open(page);
    const box = (await page.locator('#one .bk-single-page').first().boundingBox())!;
    const x = box.x + box.width * .3, y = box.y + box.height * .7;
    await page.touchscreen.tap(x, y); await page.touchscreen.tap(x, y);
    await expect.poll(() => scaleOf(page)).toBe(2.5);
    await page.touchscreen.tap(x, y); await page.touchscreen.tap(x, y);
    await expect.poll(() => scaleOf(page)).toBe(1);
  });

  test('tapping a pin previews the note, tapping elsewhere dismisses it', async ({ page }) => {
    await open(page);
    await page.locator('#one .bk-single-page .bk-annotation-marker').tap();
    await expect(page.locator('#one .bk-single-page .bk-note-bubble')).toContainText('Pin note');
    await page.touchscreen.tap(30, 30);
    await expect(page.locator('#one .bk-single-page .bk-note-bubble')).toHaveCount(0);
  });

  test('long press places a note', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'raw multi-touch needs the Chrome protocol');
    await open(page);
    const client = await page.context().newCDPSession(page);
    const box = (await page.locator('#one .bk-single-page').first().boundingBox())!;
    const x = box.x + box.width * .25, y = box.y + box.height * .25;
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await page.waitForTimeout(750);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('#one .bk-note-popover')).toBeVisible();
    await page.keyboard.press('Escape');
  });
});

test.describe('desktop keyboard', () => {
  test.use({ viewport: { width: 1000, height: 700 } });

  test('arrows pan a zoomed page, Escape peels one layer, tabs use arrow keys', async ({ page }) => {
    await open(page);
    await page.locator('#one .bk-btn--notes').click();
    const tabs = page.locator('#one .bk-note-tabs [role="tab"]');
    await expect(tabs).toHaveCount(2);
    await tabs.nth(1).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(0)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#one .bk-notes-panel')).toBeHidden();

    await page.locator('#one [aria-label="Zoom In"]').first().click();
    await page.locator('#one [aria-label="Zoom In"]').first().click();
    await expect.poll(() => scaleOf(page)).toBe(2);
    await page.locator('#one .bk-toolbar button').first().focus();
    await page.locator('#one .bk-wrapper').press('ArrowDown');
    expect(await page.evaluate(() => (window as any).__engine.getCurrentPage())).toBe(0);
  });

  test('hover bubble stays reachable and closes on Escape', async ({ page }) => {
    await open(page);
    const marker = page.locator('#one .bk-single-page .bk-annotation-marker');
    await marker.hover();
    const bubble = page.locator('#one .bk-single-page .bk-note-bubble');
    await expect(bubble).toContainText('Pin note');
    await bubble.hover();
    await page.waitForTimeout(300);
    await expect(bubble).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(bubble).toHaveCount(0);
  });
});
