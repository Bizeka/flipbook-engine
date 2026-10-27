/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

import { enMessages } from './locales/en';
import { trMessages } from './locales/tr';

export interface FlipbookMessages {
  textSelection: string;
  emptyStateTitle: string;
  thumbnails: string;
  singlePageMode: string;
  pages: string;
  previous: string;
  next: string;
  zoomOut: string;
  zoomIn: string;
  fullscreen: string;
  settings: string;
  downloadCatalog: string;
  share: string;
  bookmark: string;
  removeBookmark: string;
  notes: string;
  saveNote: string;
  clearNote: string;
  closeNote: string;
  editNote: string;
  deleteNote: string;
  play: string;
  pause: string;
  tableOfContents: string;
  search: string;
  searchPlaceholder: string;
  clearSearch: string;
  closeSearch: string;
  noSearchResults: string;
  searchUnavailable: string;
  closeHotspot: string;
  annotation: string;
  saving: string;
  noteFailed: string;
  searching: string;
  searchFailed: string;
  closeContents: string;
  moreActions: string;
  sound: string;
  myNotes: string;
  currentPage: string;
  allNotes: string;
  privateNotes: string;
  noNotes: string;
  addNote: string;
  pageHasNote: string;
  page: string;
  noteSaved: string;
  confirmDeleteNote: string;
  cancel: string;
  placeNote: string;
  keyboardShortcuts: string;
  resetZoom: string;
  noteColor: string;
  noteGroup: string;
  noGroup: string;
  allGroups: string;
  /** Fallback swatch label; {n} is the 1-based position. */
  noteColorLabel: string;
}

export const builtInMessages = {
  en: enMessages,
  tr: trMessages
} as const;

export type FlipbookLocale = keyof typeof builtInMessages;
export type PartialFlipbookMessages = Partial<FlipbookMessages>;

export interface I18nConfiguration {
  locale?: FlipbookLocale | string;
  messages?: Partial<Record<string, PartialFlipbookMessages>>;
}

export function resolveMessages(config: I18nConfiguration = {}): FlipbookMessages {
  const locale = config.locale ?? 'en';
  const builtIn = builtInMessages[locale as FlipbookLocale] ?? builtInMessages.en;
  const custom = config.messages?.[locale] ?? {};
  return {
    ...builtInMessages.en,
    ...builtIn,
    ...custom
  };
}
