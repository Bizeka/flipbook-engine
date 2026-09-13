/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

/** @jsxImportSource react */
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { FlipbookEngine, FlipbookEngineOptions, FlipbookPageAsset } from '../index';

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
    nextPage: () => void;
    prevPage: () => void;
    goToPage: (pageIndex: number) => void;
    flipNext: () => void;
    flipPrev: () => void;
    turnToPage: (pageIndex: number) => void;
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

    useImperativeHandle(ref, () => ({
        get engine() { return engineRef.current; },
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
        const unsubscribeChange = engine.on('pageChange', (e: any) => onPageChange?.(e));

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
        engine.setPages(pages, pdfUrl).catch(console.error);
    }, [pdfUrl, pages]);

    useEffect(() => {
        engineRef.current?.updateOptions(options);
    }, [options]);

    return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', minHeight: '400px', ...style }} />;
});

Flipbook.displayName = 'Flipbook';
