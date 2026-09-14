/** @license FlipbookEngine v1.0.0 | SPDX-License-Identifier: AGPL-3.0-or-later */
import { createFeaturePlugin } from './feature';
import type { FlipbookPlugin } from './index';

export function createDeepLinkPlugin(): FlipbookPlugin {
  return createFeaturePlugin('deep-link', (engine) => ({
    getUrl: (pageIndex?: number) => engine.getPageUrl(pageIndex),
    goToPage: (pageIndex: number) => engine.goToPage(pageIndex)
  }));
}

export const deepLinkPlugin = createDeepLinkPlugin();
