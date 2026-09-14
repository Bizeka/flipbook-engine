/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

export {
  FlipbookEngine,
  type FlipbookEngineOptions,
  type FlipbookLocaleMessages,
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

export type { FlipbookTocEntry } from './model/toc';
export type { FlipbookSearchHighlight, FlipbookSearchResult, FlipbookSearchOptions } from './model/search';
export type { FlipbookHotspot } from './model/hotspots';
export type { FlipbookAnnotation } from './model/annotations';
export { normalizeFlipbookToc } from './model/toc';

export {
  normalizeFlipbookPages,
  isFlipbookPageAsset
} from './model/pages';

export type {
  FlipbookLocale,
  FlipbookMessages,
  PartialFlipbookMessages
} from './i18n/service';

export type { FlipbookThemeMode, FlipbookBackgroundStyle, FlipbookBackgrounds } from './theme/theme';
export type { PdfPageMode, PdfPageLayout } from './core/PdfRenderer';
export { isA3Landscape } from './core/PdfRenderer';

export { FlipbookEmbedBridge, createFlipbookEmbedController } from './embed';
export type { FlipbookEmbedOptions, FlipbookEmbedCommandName, FlipbookEmbedCommand, FlipbookEmbedEvent, FlipbookEmbedResponse, FlipbookEmbedState, FlipbookEmbedController } from './embed';
