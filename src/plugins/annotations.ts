/** @license FlipbookEngine v1.0.0 | SPDX-License-Identifier: AGPL-3.0-or-later */
import { createFeaturePlugin } from './feature';
import type { FlipbookPlugin } from './index';

export function createAnnotationsPlugin(): FlipbookPlugin {
  return createFeaturePlugin('annotations', (engine) => ({
    get: (pageIndex?: number) => engine.getAnnotations(pageIndex),
    close: () => engine.closeAnnotation()
  }));
}

export const annotationsPlugin = createAnnotationsPlugin();
