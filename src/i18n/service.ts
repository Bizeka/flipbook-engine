/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

import { enMessages } from './locales/en';
import { trMessages } from './locales/tr';

export interface FlipbookMessages {
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
