/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

export interface FlipbookTocEntry {
  id?: string;
  title: string;
  pageIndex: number;
  children?: FlipbookTocEntry[];
}

function normalizeEntry(entry: FlipbookTocEntry, totalPages: number, id: string): FlipbookTocEntry | null {
  if (!entry || typeof entry.title !== 'string' || !entry.title.trim() || !Number.isFinite(entry.pageIndex)) return null;
  const maxIndex = Math.max(0, totalPages - 1);
  const children = Array.isArray(entry.children)
    ? entry.children.map((child, index) => normalizeEntry(child, totalPages, id + '-' + index)).filter((child): child is FlipbookTocEntry => child !== null)
    : [];
  return {
    id: entry.id ?? id,
    title: entry.title.trim(),
    pageIndex: Math.max(0, Math.min(maxIndex, Math.trunc(entry.pageIndex))),
    ...(children.length ? { children } : {})
  };
}

export function normalizeFlipbookToc(entries: FlipbookTocEntry[], totalPages: number): FlipbookTocEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry, index) => normalizeEntry(entry, totalPages, 'toc-' + index)).filter((entry): entry is FlipbookTocEntry => entry !== null);
}