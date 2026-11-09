import { test, expect, type Page } from '@playwright/test';

const pageImage = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="white"/></svg>';

async function open(page: Page, options: Record<string, unknown> = {}) {
  await page.setContent('<div id="one" style="width:800px;height:600px"></div>');
  await page.evaluate(() => { (window as any).pdfjsLib = { GlobalWorkerOptions: {} }; });
  await page.addStyleTag({ path: 'dist/flipbook-engine.css' });
  await page.addScriptTag({ path: 'dist/flipbook-engine.iife.js' });
  await page.evaluate(async ({ image, options }) => {
    const Engine = (window as any).FlipbookEngine.FlipbookEngine;
    const pages = [1, 2, 3, 4, 5, 6].map(() => ({ normal: image, low: image, thumb: image }));
    const engine = new Engine('#one', { soundEnabled: false, singleMode: true, drawing: true, ...options });
    await engine.init('', pages);
    (window as any).__engine = engine;
  }, { image: pageImage, options });
  await expect(page.locator('#one .bk-drawing-layer').first()).toBeAttached();
}

const currentPage = (page: Page) => page.evaluate(() => (window as any).__engine.getCurrentPage());
const strokeCount = (page: Page) => page.evaluate(() => (window as any).__engine.getStrokes().length);

test.describe('single page, mouse', () => {
  test.use({ viewport: { width: 1000, height: 700 } });

  test('a drag in drawing mode draws a stroke and does not turn the page', async ({ page }) => {
    await open(page);
    await page.evaluate(() => (window as any).__engine.setDrawingMode(true));
    const box = (await page.locator('#one .bk-single-page').first().boundingBox())!;
    const y = box.y + box.height * .5;
    await page.mouse.move(box.x + box.width * .8, y);
    await page.mouse.down();
    // A long horizontal drag is a swipe outside drawing mode.
    for (let step = 1; step <= 12; step++) await page.mouse.move(box.x + box.width * (.8 - step * .05), y + Math.sin(step) * 8);
    await page.mouse.up();
    await expect(page.locator('#one .bk-single-page path[data-stroke-id]')).toHaveCount(1);
    expect(await strokeCount(page)).toBe(1);
    expect(await currentPage(page)).toBe(0);
    const stroke = await page.evaluate(() => (window as any).__engine.getStrokes(0)[0]);
    expect(stroke.page).toBe(0);
    expect(stroke.points.length).toBeGreaterThan(1);
    expect(stroke.points.every((p: number[]) => p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1)).toBe(true);
    await page.keyboard.press('ArrowRight');
    expect(await currentPage(page)).toBe(0);
  });

  test('a highlight multiplies with the page and keeps its opacity, a pen is opaque', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { const e = (window as any).__engine; e.setDrawingMode(true); e.setDrawingTool({ tool: 'highlight', color: '#ffeb3b' }); });
    const box = (await page.locator('#one .bk-single-page').first().boundingBox())!;
    const draw = async (y: number) => { await page.mouse.move(box.x + 40, box.y + y); await page.mouse.down(); await page.mouse.move(box.x + 140, box.y + y + 5, { steps: 4 }); await page.mouse.up(); };
    await draw(60);
    await page.evaluate(() => (window as any).__engine.setDrawingTool({ tool: 'pen', color: '#212121' }));
    await draw(160);
    const highlight = page.locator('#one .bk-single-page .bk-drawing-svg--highlight path');
    const pen = page.locator('#one .bk-single-page .bk-drawing-svg--pen path');
    await expect(highlight).toHaveCount(1);
    await expect(pen).toHaveCount(1);
    expect(await highlight.getAttribute('stroke-opacity')).toBe('0.5');
    expect(await pen.getAttribute('stroke-opacity')).toBe('1');
    expect(await page.locator('#one .bk-single-page .bk-drawing-svg--highlight').evaluate((el) => getComputedStyle(el).mixBlendMode)).toBe('multiply');
  });

  test('the eraser removes a stroke by tap, and Escape leaves drawing mode', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      const e = (window as any).__engine;
      e.addStroke({ page: 0, tool: 'pen', color: '#f00', points: [[.2, .5], [.8, .5]] });
      e.setDrawingMode(true);
    });
    await expect(page.locator('#one .bk-single-page path[data-stroke-id]')).toHaveCount(1);
    await page.evaluate(() => (window as any).__engine.setDrawingTool({ tool: 'eraser' }));
    const box = (await page.locator('#one .bk-single-page').first().boundingBox())!;
    await page.mouse.click(box.x + box.width * .5, box.y + box.height * .5 + 3);
    await expect(page.locator('#one .bk-single-page path[data-stroke-id]')).toHaveCount(0);
    expect(await strokeCount(page)).toBe(0);
    await page.locator('#one .bk-toolbar button').first().focus();
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => (window as any).__engine.isDrawingMode())).toBe(false);
  });

  test('outside drawing mode the page takes no drawing input', async ({ page }) => {
    await open(page);
    const box = (await page.locator('#one .bk-single-page').first().boundingBox())!;
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 60, { steps: 3 }); await page.mouse.up();
    expect(await strokeCount(page)).toBe(0);
  });
});

test.describe('double page', () => {
  test.use({ viewport: { width: 1200, height: 800 } });

  test('a drag over a page draws instead of folding or turning it', async ({ page }) => {
    await open(page, { singleMode: false });
    await page.evaluate(() => (window as any).__engine.setDrawingMode(true));
    await expect(page.locator('#one .bz-page-content .bk-drawing-input').first()).toBeAttached();
    const box = (await page.locator('#one .bk-book').boundingBox())!;
    // Starting in the bottom corner is a page fold outside drawing mode.
    const x = box.x + box.width - 12, y = box.y + box.height - 12;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 300, y - 40, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    expect(await strokeCount(page)).toBe(1);
    expect(await currentPage(page)).toBe(0);
    await expect(page.locator('#one .bz-page-content path[data-stroke-id]')).toHaveCount(1);
  });
});

test.describe('touch', () => {
  test.use({ hasTouch: true, viewport: { width: 820, height: 700 } });

  test('one finger draws, two fingers pinch and never leave a stroke', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'raw multi-touch needs the Chrome protocol');
    await open(page);
    await page.evaluate(() => (window as any).__engine.setDrawingMode(true));
    const client = await page.context().newCDPSession(page);
    const box = (await page.locator('#one .bk-single-page').first().boundingBox())!;
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const touch = (type: string, points: Array<{ x: number; y: number; id: number }>) => client.send('Input.dispatchTouchEvent', { type, touchPoints: points });

    await touch('touchStart', [{ x: cx - 60, y: cy, id: 1 }]);
    for (let step = 1; step <= 6; step++) await touch('touchMove', [{ x: cx - 60 + step * 20, y: cy + step * 4, id: 1 }]);
    await touch('touchEnd', []);
    await expect.poll(() => strokeCount(page)).toBe(1);
    expect(await currentPage(page)).toBe(0);

    // A second finger lands mid-stroke: the stroke is dropped and the fingers zoom the page.
    await touch('touchStart', [{ x: cx - 40, y: cy - 40, id: 1 }]);
    await touch('touchMove', [{ x: cx - 30, y: cy - 40, id: 1 }]);
    await touch('touchStart', [{ x: cx - 30, y: cy - 40, id: 1 }, { x: cx + 40, y: cy - 40, id: 2 }]);
    for (let step = 1; step <= 6; step++) await touch('touchMove', [{ x: cx - 30 - step * 15, y: cy - 40, id: 1 }, { x: cx + 40 + step * 15, y: cy - 40, id: 2 }]);
    await touch('touchEnd', []);
    await page.waitForTimeout(300);
    expect(await strokeCount(page)).toBe(1);
    expect(await currentPage(page)).toBe(0);
    await expect(page.locator('#one .bk-drawing-preview')).toHaveCount(0);
    const scaled = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('#one *')].some(el => /scale\(([\d.]+)\)/.test(el.style.transform) && Number(/scale\(([\d.]+)\)/.exec(el.style.transform)![1]) > 1));
    expect(scaled).toBe(true);
  });

  test('a touch while a pen is active does not draw', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'raw touch needs the Chrome protocol');
    await open(page);
    await page.evaluate(() => (window as any).__engine.setDrawingMode(true));
    const client = await page.context().newCDPSession(page);
    const box = (await page.locator('#one .bk-single-page').first().boundingBox())!;
    const x = box.x + 60, y = box.y + 80;
    await page.evaluate(() => { document.body.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'pen', pointerId: 77, bubbles: true })); });
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 40, y: y + 10, id: 1 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(100);
    expect(await strokeCount(page)).toBe(0);
  });
});
