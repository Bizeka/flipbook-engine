// Consumer type test (issue #29): every package entry point must resolve to real types.
// Each @ts-expect-error fails the check when the export silently becomes `any`.
import { FlipbookEngine, VERSION, type FlipbookEngineOptions } from 'flipbookengine';
import { normalizeFlipbookPages } from 'flipbookengine/core';
import { FlipbookPluginRegistry } from 'flipbookengine/plugins';
import { notesPlugin } from 'flipbookengine/plugins/notes';
import { bookmarksPlugin } from 'flipbookengine/plugins/bookmarks';
import { tocPlugin } from 'flipbookengine/plugins/toc';
import { searchPlugin } from 'flipbookengine/plugins/search';
import { annotationsPlugin } from 'flipbookengine/plugins/annotations';
import { hotspotsPlugin } from 'flipbookengine/plugins/hotspots';
import { sharePlugin } from 'flipbookengine/plugins/share';
import { deepLinkPlugin } from 'flipbookengine/plugins/deep-link';
import { Flipbook as ReactFlipbook, type FlipbookProps } from 'flipbookengine/react';
import { Flipbook as VueFlipbook } from 'flipbookengine/vue';

// @ts-expect-error a class is not a symbol
export const t1: symbol = FlipbookEngine;
// @ts-expect-error VERSION is a string
export const t2: symbol = VERSION;
// @ts-expect-error options are an object type
export const t3: FlipbookEngineOptions = 123;
// @ts-expect-error a function is not a symbol
export const t4: symbol = normalizeFlipbookPages;
// @ts-expect-error a class is not a symbol
export const t5: symbol = FlipbookPluginRegistry;
// @ts-expect-error a plugin is not a symbol
export const t6: symbol = notesPlugin;
// @ts-expect-error a plugin is not a symbol
export const t7: symbol = bookmarksPlugin;
// @ts-expect-error a plugin is not a symbol
export const t8: symbol = tocPlugin;
// @ts-expect-error a plugin is not a symbol
export const t9: symbol = searchPlugin;
// @ts-expect-error a plugin is not a symbol
export const t10: symbol = annotationsPlugin;
// @ts-expect-error a plugin is not a symbol
export const t11: symbol = hotspotsPlugin;
// @ts-expect-error a plugin is not a symbol
export const t12: symbol = sharePlugin;
// @ts-expect-error a plugin is not a symbol
export const t13: symbol = deepLinkPlugin;
// @ts-expect-error a component is not a symbol
export const t14: symbol = ReactFlipbook;
// @ts-expect-error props are an object type
export const t15: FlipbookProps = 123;
// @ts-expect-error a component is not a symbol
export const t16: symbol = VueFlipbook;
