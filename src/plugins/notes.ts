/** @license FlipbookEngine v0.8.0 | SPDX-License-Identifier: AGPL-3.0-or-later */
import { createFeaturePlugin } from './feature';
import type { FlipbookPlugin } from './index';

export function createNotesPlugin(): FlipbookPlugin {
  return createFeaturePlugin('notes', (engine) => ({
    getAll: () => engine.getNotes(),
    get: (pageIndex?: number) => engine.getNote(pageIndex),
    set: (pageIndex: number, note: string) => engine.setNote(pageIndex, note),
    clear: (pageIndex?: number) => engine.clearNote(pageIndex)
  }));
}

export const notesPlugin = createNotesPlugin();
