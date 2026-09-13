/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

import { defineComponent, h, ref, onMounted, onBeforeUnmount, watch, PropType } from 'vue';
import { FlipbookEngine, FlipbookEngineOptions, FlipbookPageAsset } from '../index';

export const Flipbook = defineComponent({
    name: 'Flipbook',
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
            type: Object as PropType<Omit<FlipbookEngineOptions, 'theme'> & { theme?: 'auto' | 'light' | 'dark' }>,
            default: () => ({})
        }
    },
    emits: ['pageChange'],
    setup(props, { emit, expose }) {
        const containerRef = ref<HTMLElement | null>(null);
        let engine: FlipbookEngine | null = null;
        let unsubscribeChange: (() => void) | undefined;

        onMounted(() => {
            if (!containerRef.value) return;

            engine = new FlipbookEngine(containerRef.value, props.options as any);
            unsubscribeChange = engine.on('pageChange', (e: any) => emit('pageChange', e));
            engine.setPages(props.pages, props.pdfUrl).catch(console.error);
        });

        onBeforeUnmount(() => {
            unsubscribeChange?.();
            engine?.destroy();
            engine = null;
        });

        watch(() => props.options, (newOptions) => {
            engine?.updateOptions(newOptions as any);
        }, { deep: true });

        // Source changes are handled together to guarantee one reinitialization per update.
        watch([() => props.pdfUrl, () => props.pages], ([newPdfUrl, newPages]) => {
            engine?.setPages(newPages || [], newPdfUrl || '').catch(console.error);
        }, { deep: true });

        expose({
            getEngine: () => engine,
            engine: () => engine,
            nextPage: () => engine?.nextPage(),
            prevPage: () => engine?.prevPage(),
            goToPage: (index: number) => engine?.goToPage(index),
            flipNext: () => engine?.nextPage(),
            flipPrev: () => engine?.prevPage(),
            turnToPage: (index: number) => engine?.goToPage(index)
        });

        return () => h('div', {
            ref: containerRef,
            style: { width: '100%', height: '100%', minHeight: '400px' }
        });
    }
});
