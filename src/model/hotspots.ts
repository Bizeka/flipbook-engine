/**
 * @license FlipbookEngine v1.0.0
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type FlipbookHotspotKind = 'info' | 'media' | 'gallery' | 'commerce';
export type FlipbookHotspotMediaType = 'image' | 'video' | 'audio';

export interface FlipbookHotspotMedia {
  type: FlipbookHotspotMediaType;
  src: string;
  alt?: string;
  poster?: string;
}

export interface FlipbookHotspotGalleryItem {
  src: string;
  alt?: string;
  href?: string;
  target?: string;
}

/** An interactive overlay anchored to a logical page. Coordinates are 0..1. */
export interface FlipbookHotspot {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  /** Controls the semantic presentation in the popup. */
  kind?: FlipbookHotspotKind;
  /** Plain-text description; HTML is never interpreted. */
  content?: string;
  /** Optional commerce/product destination. */
  href?: string;
  target?: string;
  /** Optional single image, video, or audio preview. */
  media?: FlipbookHotspotMedia;
  /** Optional gallery of image previews. */
  gallery?: FlipbookHotspotGalleryItem[];
}
