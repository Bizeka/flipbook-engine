/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

export {
  FlipbookEngine,
  type FlipbookEngineOptions,
  type PageImages,
  type FlipbookEngineEventMap,
  type FlipbookEngineEventName
} from './engine';

export type {
  FlipbookPageAsset,
  FlipbookPageKind,
  FlipbookCropMode,
  FlipbookSplitDirection,
  NormalizedFlipbookPage
} from './model/pages';

export {
  normalizeFlipbookPages,
  isFlipbookPageAsset
} from './model/pages';

export type {
  FlipbookLocale,
  FlipbookMessages,
  PartialFlipbookMessages
} from './i18n/service';

export type { FlipbookThemeMode } from './theme/theme';
