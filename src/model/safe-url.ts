/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Returns the URL when it is safe to put in a link or window.open: relative paths and
 * http(s), mailto and tel. javascript:, data:, vbscript: and other schemes return undefined.
 */
export function safeLinkUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // Control characters and whitespace inside a scheme can hide "javascript:" from naive checks.
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return undefined;
  try {
    const base = typeof document !== 'undefined' && document.baseURI ? document.baseURI : 'https://localhost/';
    const url = new URL(trimmed, base);
    return LINK_PROTOCOLS.has(url.protocol) ? trimmed : undefined;
  } catch {
    return undefined;
  }
}
