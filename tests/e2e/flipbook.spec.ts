import { test, expect } from '@playwright/test';

const pageImage = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><rect width="120" height="160" fill="white"/></svg>';

test.beforeEach(async ({ page }) => {
  await page.setContent('<div id="one" style="width:640px;height:480px"></div><div id="two" style="width:640px;height:480px"></div>');
  await page.evaluate(() => {
    (window as any).pdfjsLib = {
      GlobalWorkerOptions: {},
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 2,
          getPage: async () => ({
            getViewport: ({ scale }: { scale: number }) => ({ width: 100 * scale, height: 140 * scale }),
            render: () => ({ promise: Promise.resolve() })
          }),
          destroy: () => {}
        }),
        destroy: () => {}
      })
    };
  });
  await page.addStyleTag({ path: 'dist/flipbook-engine.css' });
  await page.addScriptTag({ path: 'dist/flipbook-engine.iife.js' });
});

test('PDF-only initialization renders a small document without a pages array', async ({ page }) => {
  await page.evaluate(async () => {
    const Engine = (window as any).FlipbookEngine.FlipbookEngine;
    const engine = new Engine('#one');
    await engine.init('/fixtures/catalog.pdf');
  });

  await expect(page.locator('#one .bz-page')).toHaveCount(2);
  await expect(page.locator('#one .page-content').first()).toHaveAttribute('src', /^data:image/);
});

test('two vanilla instances remain isolated and keyboard thumbnails navigate', async ({ page }) => {
  await page.evaluate(async (image) => {
    const Engine = (window as any).FlipbookEngine.FlipbookEngine;
    const pages = [
      { normal: image, low: image, thumb: image },
      { normal: image, low: image, thumb: image }
    ];
    const first = new Engine('#one');
    const second = new Engine('#two');
    await Promise.all([first.init('', pages), second.init('', pages)]);
    (window as any).__engines = { first, second };
  }, pageImage);

  await expect(page.locator('#one .bz-page')).toHaveCount(2);
  await expect(page.locator('#two .bz-page')).toHaveCount(2);
  await expect(page.locator('[id]').evaluateAll((elements) => new Set(elements.map((element) => element.id)).size)).resolves.toBe(2);

  await page.getByRole('button', { name: 'Go to page 2' }).first().press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__engines.first.getCurrentPage())).toBe(1);
  await expect.poll(() => page.evaluate(() => (window as any).__engines.second.getCurrentPage())).toBe(0);

  await page.evaluate(() => {
    (window as any).__engines.first.destroy();
    (window as any).__engines.second.destroy();
  });
});
