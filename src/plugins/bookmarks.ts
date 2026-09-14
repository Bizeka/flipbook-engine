/** @license FlipbookEngine v1.0.0 | SPDX-License-Identifier: AGPL-3.0-or-later */
import { createFeaturePlugin } from './feature';
import type { FlipbookPlugin } from './index';

export function createBookmarksPlugin(): FlipbookPlugin {
  return createFeaturePlugin('bookmarks', (engine) => ({
    getAll: () => engine.getBookmarkedPages(),
    isBookmarked: (pageIndex?: number) => engine.isBookmarked(pageIndex),
    set: (pageIndex: number, bookmarked = true) => engine.setBookmark(pageIndex, bookmarked),
    toggle: (pageIndex?: number) => engine.toggleBookmark(pageIndex)
  }));
}

export const bookmarksPlugin = createBookmarksPlugin();
