/** @license FlipbookEngine v0.8.0 | SPDX-License-Identifier: AGPL-3.0-or-later */
import { createFeaturePlugin } from './feature';
import type { FlipbookSearchOptions } from '../model/search';
import type { FlipbookPlugin } from './index';

export function createSearchPlugin(): FlipbookPlugin {
  return createFeaturePlugin('search', (engine) => ({
    search: (query: string, options?: FlipbookSearchOptions) => engine.search(query, options),
    clear: () => engine.clearSearch(),
    getResults: () => engine.getSearchResults()
  }));
}

export const searchPlugin = createSearchPlugin();
