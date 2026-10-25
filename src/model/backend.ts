import type { FlipbookSearchOptions, FlipbookSearchResult } from './search';
import type { FlipbookAnnotation } from './annotations';
import type { FlipbookNoteDocument } from './note-editor';

/** Host-owned storage and authorization stay outside the viewer. Indexes are zero-based. */
/** Reported by a search provider while it prepares or scans its index; `total` is 0 when unknown. */
export interface FlipbookSearchProgress { completed: number; total: number }
export type FlipbookSearchProgressReporter = (progress: FlipbookSearchProgress) => void;
export type FlipbookSearchProvider = (query: string, options: FlipbookSearchOptions, signal: AbortSignal, reportProgress?: FlipbookSearchProgressReporter) => Promise<FlipbookSearchResult[]>;
export type FlipbookNoteProvider = (pageIndex: number, note: string | null, signal: AbortSignal, document?: FlipbookNoteDocument) => Promise<void>;
export type FlipbookAnnotationProvider = (annotation: FlipbookAnnotation, action: 'save' | 'delete', signal: AbortSignal) => Promise<void>;
