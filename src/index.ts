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
export type { FlipbookSearchProvider, FlipbookSearchProgress, FlipbookSearchProgressReporter, FlipbookNoteProvider, FlipbookAnnotationProvider } from './model/backend';
export type { FlipbookSearchHighlight, FlipbookSearchResult, FlipbookSearchOptions } from './model/search';
export type { FlipbookHotspot, FlipbookHotspotKind, FlipbookHotspotMedia, FlipbookHotspotMediaType, FlipbookHotspotGalleryItem } from './model/hotspots';
export { resolveEmbedUrl } from './model/hotspots';
export type { FlipbookAnnotation, FlipbookNoteColor, FlipbookNoteGroup, FlipbookNoteGroupProvider, FlipbookSearchHighlightStyle } from './model/annotations';
export { DEFAULT_NOTE_COLORS } from './model/annotations';
export type { FlipbookNoteDocument, FlipbookNoteValue, FlipbookNoteEditor, FlipbookNoteEditorFactory } from './model/note-editor';
export { FlipbookPluginRegistry } from './plugins';
export type { FlipbookPlugin, FlipbookPluginContext, FlipbookPluginApiHandler, FlipbookPluginEventHandler, FlipbookPluginPanel, FlipbookPluginToolbarButton } from './plugins';
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

export type { FlipbookTextRun, FlipbookTextPage, FlipbookTextLayerProvider } from './model/text-layer';
