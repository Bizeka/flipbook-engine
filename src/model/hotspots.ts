/**
 * @license FlipbookEngine v1.0.0
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type FlipbookHotspotKind = 'info' | 'media' | 'gallery' | 'commerce';
export type FlipbookHotspotMediaType = 'image' | 'video' | 'audio' | 'embed';

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

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

function seconds(value: string | null): number {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return match ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0) : 0;
}

/**
 * Turns a YouTube or Vimeo watch, share, shorts or embed link into a player URL
 * (youtube-nocookie, Vimeo with do-not-track). Any other host returns null and is never embedded.
 */
export function resolveEmbedUrl(src: string): string | null {
  let url: URL;
  try { url = new URL(src.trim()); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^(www\.|m\.)/, '');
  const parts = url.pathname.split('/').filter(Boolean);
  let id: string | undefined;
  if (host === 'youtu.be') id = parts[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = parts[0] === 'watch' ? url.searchParams.get('v') ?? undefined
      : ['embed', 'shorts', 'live', 'v'].includes(parts[0]) ? parts[1] : undefined;
  }
  if (id !== undefined) {
    if (!YOUTUBE_ID.test(id)) return null;
    const start = seconds(url.searchParams.get('t') ?? url.searchParams.get('start'));
    return 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0' + (start ? '&start=' + start : '');
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const vimeoId = parts[0] === 'video' ? parts[1] : parts[0];
    if (!vimeoId || !VIMEO_ID.test(vimeoId)) return null;
    const hash = parts[0] === 'video' ? url.searchParams.get('h') : parts[1];
    return 'https://player.vimeo.com/video/' + vimeoId + '?dnt=1' + (hash && /^[a-f0-9]{6,20}$/i.test(hash) ? '&h=' + hash : '');
  }
  return null;
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
  /** Optional single image, video, audio or YouTube/Vimeo embed. A YouTube or Vimeo link given as `video` is embedded too. */
  media?: FlipbookHotspotMedia;
  /** Optional gallery of image previews. */
  gallery?: FlipbookHotspotGalleryItem[];
}
