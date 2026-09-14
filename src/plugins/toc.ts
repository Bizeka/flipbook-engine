/** @license FlipbookEngine v1.0.0 | SPDX-License-Identifier: AGPL-3.0-or-later */
import { createFeaturePlugin } from './feature';
import type { FlipbookTocEntry } from '../model/toc';
import type { FlipbookPlugin } from './index';

export function createTocPlugin(): FlipbookPlugin {
  return createFeaturePlugin('toc', (engine) => ({
    get: () => engine.getToc(),
    set: (entries: FlipbookTocEntry[], show?: boolean) => engine.setToc(entries, show)
  }));
}

export const tocPlugin = createTocPlugin();
