/**
 * @license FlipbookEngine v0.8.0
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/** A normalized text rectangle returned by the client-side PDF text search. */
export interface FlipbookSearchHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A page-level match returned by the client-side PDF text search. */
export interface FlipbookSearchResult {
  pageIndex: number;
  pageNumber: number;
  matches: number;
  snippet: string;
  sourcePageNumber?: number;
  highlights?: FlipbookSearchHighlight[];
}

export interface FlipbookSearchOptions {
  caseSensitive?: boolean;
  maxResults?: number;
}
