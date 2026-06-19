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
    pdfUrl: string;
    pages?: FlipbookPageAsset[];
    theme?: 'auto' | 'light' | 'dark';
    onPageChange?: (e: { currentPage: number; totalPages: number }) => void;
}

export interface FlipbookRef {
    engine: FlipbookEngine | null;
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
        flipNext: () => engineRef.current?.nextPage(),
        flipPrev: () => engineRef.current?.prevPage(),
        turnToPage: (idx: number) => {
            if (engineRef.current) {
                engineRef.current.goToPage(idx);
            }
        }
    }));

    useEffect(() => {
        if (!containerRef.current) return;

        const engine = new FlipbookEngine(containerRef.current, options);
        engineRef.current = engine;

        const unsubscribeChange = engine.on('pageChange', (e: any) => onPageChange?.(e));

        engine.init(pdfUrl, pages || []).catch(console.error);

        return () => {
            unsubscribeChange();
            engine.destroy();
            engineRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.updateOptions(options);
        }
    }, [options]);

    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.setPages(pages || []);
        }
    }, [pages]);

    return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', minHeight: '400px', ...style }} />;
});

Flipbook.displayName = 'Flipbook';
