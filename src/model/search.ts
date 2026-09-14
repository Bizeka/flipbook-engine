/**
 * @license FlipbookEngine v0.6.5
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/** A page-level match returned by the client-side PDF text search. */
export interface FlipbookSearchResult {
  pageIndex: number;
  pageNumber: number;
  matches: number;
  snippet: string;
  sourcePageNumber?: number;
}

export interface FlipbookSearchOptions {
  caseSensitive?: boolean;
  maxResults?: number;
}
