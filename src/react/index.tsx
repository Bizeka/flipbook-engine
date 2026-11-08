/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

/** @jsxImportSource react */
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { FlipbookEngine, FlipbookEngineOptions, FlipbookPageAsset } from '../index';
import { changedOptions, sameValue } from '../core/wrapperOptions';

export interface FlipbookProps extends Omit<FlipbookEngineOptions, 'theme'> {
    className?: string;
    style?: React.CSSProperties;
    pdfUrl?: string;
    pages?: FlipbookPageAsset[];
    theme?: 'auto' | 'light' | 'dark';
    onPageChange?: (e: { currentPage: number; totalPages: number }) => void;
}

export interface FlipbookRef {
    engine: FlipbookEngine | null;
    getCurrentPage: () => number;
    getTotalPages: () => number;
    nextPage: () => void;
    prevPage: () => void;
    goToPage: (pageIndex: number) => void;
    flipNext: () => void;
    flipPrev: () => void;
    turnToPage: (pageIndex: number) => void;
}

/** Keeps the first of several equal values, so a new but equal `pages` array does not count as a change. */
function useStable<T>(value: T): T {
    const kept = useRef(value);
    if (!sameValue(kept.current, value)) kept.current = value;
    return kept.current;
}

export const Flipbook = forwardRef<FlipbookRef, FlipbookProps>(({
    className,
    style,
    pdfUrl,
    pages,
    onPageChange,
    ...options
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<FlipbookEngine | null>(null);
    const stablePages = useStable(pages);
    // The latest callback, so a handler that closes over state is never stale.
    const onPageChangeRef = useRef(onPageChange);
    onPageChangeRef.current = onPageChange;
    // The options the engine currently holds; later renders send only what changed.
    const appliedOptions = useRef<typeof options | null>(null);

    useImperativeHandle(ref, () => ({
        get engine() { return engineRef.current; },
        getCurrentPage: () => engineRef.current?.getCurrentPage() ?? 0,
        getTotalPages: () => engineRef.current?.getTotalPages() ?? 0,
        nextPage: () => engineRef.current?.nextPage(),
        prevPage: () => engineRef.current?.prevPage(),
        goToPage: (index: number) => engineRef.current?.goToPage(index),
        flipNext: () => engineRef.current?.nextPage(),
        flipPrev: () => engineRef.current?.prevPage(),
        turnToPage: (index: number) => engineRef.current?.goToPage(index)
    }), []);

    // Create one engine for the mounted component. Source data is managed by the
    // separate effect below so PDF-only renders do not trigger a second empty init.
    useEffect(() => {
        if (!containerRef.current) return;

        const engine = new FlipbookEngine(containerRef.current, options);
        engineRef.current = engine;
        appliedOptions.current = options;
        const unsubscribeChange = engine.on('pageChange', (e: any) => onPageChangeRef.current?.(e));

        return () => {
            unsubscribeChange();
            engine.destroy();
            engineRef.current = null;
        };
        // The engine is intentionally created once per mount, including Strict Mode remounts.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // A source update is the only place that initializes or reinitializes the engine.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.setPages(stablePages, pdfUrl).catch(console.error);
    }, [pdfUrl, stablePages]);

    // Runs after every render, but only changed options reach the engine: re-sending all of them would reset
    // what the reader changed in the viewer (bookmarks, notes, layout, thumbnail rail) on every parent render.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;
        const changed = changedOptions(appliedOptions.current, options);
        appliedOptions.current = options;
        if (Object.keys(changed).length > 0) engine.updateOptions(changed);
    });

    return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', minHeight: '400px', ...style }} />;
});

Flipbook.displayName = 'Flipbook';
