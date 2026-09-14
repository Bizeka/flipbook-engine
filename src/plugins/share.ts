/** @license FlipbookEngine v1.0.0 | SPDX-License-Identifier: AGPL-3.0-or-later */
import { createFeaturePlugin } from './feature';
import type { FlipbookPlugin } from './index';

export function createSharePlugin(): FlipbookPlugin {
  return createFeaturePlugin('share', (engine) => ({
    getUrl: (pageIndex?: number) => engine.getPageUrl(pageIndex)
  }));
}

export const sharePlugin = createSharePlugin();
