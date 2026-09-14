/**
 * @license FlipbookEngine v1.0.0
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/** A normalized interactive overlay anchored to a logical page. Coordinates are 0..1. */
export interface FlipbookHotspot {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  content?: string;
  href?: string;
  target?: string;
}
