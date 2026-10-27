/**
 * @license FlipbookEngine v1.0.0
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/** A host-provided note marker anchored to a logical page using 0..1 coordinates. */
export interface FlipbookAnnotation {
  document?: import('./note-editor').FlipbookNoteDocument;
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  text: string;
  color?: string;
  groupKey?: string;
}

/** A selectable pin colour; `value` is any CSS colour. */
export interface FlipbookNoteColor { value: string; label?: string }
/** A note group the student can file a coordinate note under. */
export interface FlipbookNoteGroup { key: string; label: string; description?: string; color?: string }
export type FlipbookNoteGroupProvider = (signal: AbortSignal) => Promise<FlipbookNoteGroup[]> | FlipbookNoteGroup[];
export type FlipbookSearchHighlightStyle = 'highlight' | 'underline' | 'bubble';

export const DEFAULT_NOTE_COLORS: FlipbookNoteColor[] = [
  { value: '#e5484d' }, { value: '#f5a524' }, { value: '#30a46c' }, { value: '#0091ff' }, { value: '#8e4ec6' }
];

/** The default palette is on unless the host passes `false` or an empty list. */
export function normalizeNoteColors(input: FlipbookNoteColor[] | string[] | boolean | undefined): FlipbookNoteColor[] {
  if (input === false) return [];
  if (input === undefined || input === true) return DEFAULT_NOTE_COLORS;
  return input.map(item => typeof item === 'string' ? { value: item } : item).filter(item => item && typeof item.value === 'string' && item.value.trim());
}

export function normalizeNoteGroups(input: FlipbookNoteGroup[] | undefined): FlipbookNoteGroup[] {
  const seen = new Set<string>();
  return (input ?? []).filter(group => group && group.key && !seen.has(group.key) && seen.add(group.key));
}

const CSS_COLOR = /^(#[0-9a-f]{3,8}|[a-z]+|(?:rgb|hsl)a?\([0-9a-z%.,\s\/-]+\))$/i;
/** Returns the colour when it is a plain CSS colour that is safe inside a style attribute. */
export const safeCssColor = (value: string | undefined): string | undefined => value && CSS_COLOR.test(value) ? value : undefined;

/** Highlighter fill by default; underline and bubble on request. */
export function normalizeSearchHighlightStyle(style: unknown): FlipbookSearchHighlightStyle {
  return style === 'underline' || style === 'bubble' ? style : 'highlight';
}
