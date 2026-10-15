import type { FlipbookSearchOptions, FlipbookSearchResult } from './search';
import type { FlipbookAnnotation } from './annotations';
import type { FlipbookNoteDocument } from './note-editor';

/** Host-owned storage and authorization stay outside the viewer. Indexes are zero-based. */
export type FlipbookSearchProvider = (query: string, options: FlipbookSearchOptions, signal: AbortSignal) => Promise<FlipbookSearchResult[]>;
export type FlipbookNoteProvider = (pageIndex: number, note: string | null, signal: AbortSignal, document?: FlipbookNoteDocument) => Promise<void>;
export type FlipbookAnnotationProvider = (annotation: FlipbookAnnotation, action: 'save' | 'delete', signal: AbortSignal) => Promise<void>;
