/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

import { defineComponent, h, ref, onMounted, onBeforeUnmount, onUpdated, watch, camelize, PropType } from 'vue';
import { FlipbookEngine, FlipbookEngineOptions, FlipbookPageAsset } from '../index';
import { OPTION_KEY_SET, changedOptions, cloneData, sameValue, WRAPPER_EVENTS } from '../core/wrapperOptions';

type FlipbookVueOptions = Omit<FlipbookEngineOptions, 'theme'> & { theme?: 'auto' | 'light' | 'dark' };

/** An `on*` attribute is a Vue event listener, except the two engine options that are callbacks. */
const isListener = (key: string) => /^on[A-Z]/.test(key) && key !== 'onShare' && key !== 'onDownload';

export const Flipbook = defineComponent({
    name: 'Flipbook',
    // Options arrive either as one `options` object or as plain props (`:allowDownload="false"`, `show-thumbs`);
    // anything that is not an option (class, style, id, data-*) goes to the root element.
    inheritAttrs: false,
    props: {
        pdfUrl: {
            type: String,
            required: false,
            default: ''
        },
        pages: {
            type: Array as PropType<FlipbookPageAsset[]>,
            required: false,
            default: () => []
        },
        options: {
            type: Object as PropType<FlipbookVueOptions>,
            default: () => ({})
        }
    },
    // Every forwarded engine event is a Vue event: `@error`, `@hotspot-open` (or `@hotspotOpen`).
    emits: [...WRAPPER_EVENTS],
    setup(props, { attrs, emit, expose }) {
        const containerRef = ref<HTMLElement | null>(null);
        let engine: FlipbookEngine | null = null;
        let unsubscribers: Array<() => void> = [];

        const attrOptions = (): Record<string, unknown> => {
            const found: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(attrs)) {
                const name = camelize(key);
                if (OPTION_KEY_SET.has(name) && !isListener(name)) found[name] = value;
            }
            return found;
        };
        // The `options` object wins over a plain prop of the same name.
        const currentOptions = () => ({ ...attrOptions(), ...props.options }) as FlipbookEngineOptions;
        let appliedOptions: FlipbookEngineOptions | null = null;
        // A copy of the pages the engine was loaded with, so an in-place edit of the array is still seen as a change.
        let appliedPages: FlipbookPageAsset[] = [];
        let appliedUrl = '';

        onMounted(() => {
            if (!containerRef.value) return;

            appliedOptions = currentOptions();
            engine = new FlipbookEngine(containerRef.value, appliedOptions);
            unsubscribers = WRAPPER_EVENTS.map((name) => engine!.on(name, (e: any) => emit(name, e)));
            appliedPages = cloneData(props.pages);
            appliedUrl = props.pdfUrl;
            engine.setPages(props.pages, props.pdfUrl).catch(console.error);
        });

        onBeforeUnmount(() => {
            unsubscribers.forEach((off) => off());
            unsubscribers = [];
            engine?.destroy();
            engine = null;
        });

        // Plain props are not reactive; the component updates when they change, and only what changed is sent,
        // so a re-render never resets what the reader changed in the viewer (bookmarks, notes, layout).
        onUpdated(() => {
            if (!engine) return;
            const next = currentOptions();
            const changed = changedOptions(appliedOptions, next);
            appliedOptions = next;
            if (Object.keys(changed).length > 0) engine.updateOptions(changed as Partial<FlipbookEngineOptions>);
        });

        // An edit inside the `options` object (for example pushing a hotspot) keeps the same reference, so it is re-sent whole.
        watch(() => props.options, () => {
            if (!engine) return;
            appliedOptions = currentOptions();
            engine.updateOptions(appliedOptions);
        }, { deep: true });

        // Source changes are handled together to guarantee one reinitialization per update, and only when the
        // source really differs: a new but equal `pages` array must not rebuild the book.
        watch([() => props.pdfUrl, () => props.pages], ([newPdfUrl, newPages]) => {
            if (!engine) return;
            if (newPdfUrl === appliedUrl && sameValue(newPages, appliedPages)) return;
            appliedUrl = newPdfUrl;
            appliedPages = cloneData(newPages);
            engine.setPages(newPages || [], newPdfUrl || '').catch(console.error);
        }, { deep: true });

        expose({
            getEngine: () => engine,
            engine: () => engine,
            getCurrentPage: () => engine?.getCurrentPage() ?? 0,
            getTotalPages: () => engine?.getTotalPages() ?? 0,
            nextPage: () => engine?.nextPage(),
            prevPage: () => engine?.prevPage(),
            goToPage: (index: number) => engine?.goToPage(index),
            flipNext: () => engine?.nextPage(),
            flipPrev: () => engine?.prevPage(),
            turnToPage: (index: number) => engine?.goToPage(index)
        });

        return () => {
            const { class: className, style, ...rest } = attrs as Record<string, unknown>;
            const hostAttrs = Object.fromEntries(Object.entries(rest).filter(([key]) => !OPTION_KEY_SET.has(camelize(key)) || isListener(camelize(key))));
            return h('div', {
                ...hostAttrs,
                class: className as any,
                style: [{ width: '100%', height: '100%', minHeight: '400px' }, style as any],
                ref: containerRef
            });
        };
    }
});
