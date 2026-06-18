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
            required: true
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
        let unsubscribeChange: () => void;
 
        onMounted(() => {
            if (!containerRef.value) return;
 
            engine = new FlipbookEngine(containerRef.value, props.options as any);
 
            unsubscribeChange = engine.on('pageChange', (e: any) => emit('pageChange', e));
 
            engine.init(props.pdfUrl, props.pages || []).catch(console.error);
        });
 
        onBeforeUnmount(() => {
            if (unsubscribeChange) unsubscribeChange();
            if (engine) {
                engine.destroy();
                engine = null;
            }
        });
 
        watch(() => props.options, (newOptions) => {
            if (engine) {
                engine.updateOptions(newOptions as any);
            }
        }, { deep: true });
 
        watch(() => props.pages, (newPages) => {
            if (engine) {
                engine.setPages(newPages || []);
            }
        }, { deep: true });

        expose({
            getEngine: () => engine,
            flipNext: () => (engine as any)?.ui?.bkNext?.click(),
            flipPrev: () => (engine as any)?.ui?.bkPrev?.click(),
            turnToPage: (idx: number) => {
                if (engine && (engine as any).pageFlip) {
                    (engine as any).pageFlip.flip(idx);
                }
            }
        });

        return () => h('div', {
            ref: containerRef,
            style: { width: '100%', height: '100%', minHeight: '400px' }
        });
    }
});
