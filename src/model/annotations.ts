/**
 * @license FlipbookEngine v0.6.5
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/** A host-provided note marker anchored to a logical page using 0..1 coordinates. */
export interface FlipbookAnnotation {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  text: string;
  color?: string;
}
