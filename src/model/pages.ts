/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

export type FlipbookPageKind = 'single' | 'spread' | 'cover';
export type FlipbookCropMode = 'full' | 'left' | 'right';
export type FlipbookSplitDirection = 'ltr' | 'rtl';

export interface FlipbookPageAsset {
  id?: string;
  pageNumber?: number;
  pageNumbers?: number[];
  kind?: FlipbookPageKind;
  splitDirection?: FlipbookSplitDirection;
  normal: string;
  low: string;
  thumb: string;
}

export interface NormalizedFlipbookPage {
  index: number;
  assetId: string;
  pageNumber: number;
  cropMode: FlipbookCropMode;
  normal: string;
  low: string;
  thumb: string;
}

export function isFlipbookPageAsset(value: unknown): value is FlipbookPageAsset {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as FlipbookPageAsset;
  return typeof candidate.normal === 'string'
    && typeof candidate.low === 'string'
    && typeof candidate.thumb === 'string';
}

function getAssetPageNumbers(asset: FlipbookPageAsset): number[] {
  if (Array.isArray(asset.pageNumbers) && asset.pageNumbers.length > 0) {
    return asset.pageNumbers;
  }

  if (typeof asset.pageNumber === 'number') {
    if (asset.kind === 'spread') return [asset.pageNumber, asset.pageNumber + 1];
    return [asset.pageNumber];
  }

  return [];
}

function getSpreadCropModes(splitDirection: FlipbookSplitDirection): FlipbookCropMode[] {
  return splitDirection === 'rtl' ? ['right', 'left'] : ['left', 'right'];
}

export function normalizeFlipbookPages(assets: FlipbookPageAsset[]): NormalizedFlipbookPage[] {
  const normalized: NormalizedFlipbookPage[] = [];
  let fallbackPageNumber = 1;

  assets.forEach((asset, assetIndex) => {
    const kind = asset.kind ?? 'single';
    const assetId = asset.id ?? `asset-${assetIndex}`;
    const splitDirection = asset.splitDirection ?? 'ltr';
    const pageNumbers = getAssetPageNumbers(asset);

    if (kind === 'spread') {
      const spreadNumbers = pageNumbers.length >= 2 ? pageNumbers.slice(0, 2) : [fallbackPageNumber, fallbackPageNumber + 1];
      const cropModes = getSpreadCropModes(splitDirection);

      spreadNumbers.forEach((pageNumber, spreadIndex) => {
        normalized.push({
          index: normalized.length,
          assetId,
          pageNumber,
          cropMode: cropModes[spreadIndex] ?? 'full',
          normal: asset.normal,
          low: asset.low,
          thumb: asset.thumb
        });
      });

      fallbackPageNumber = spreadNumbers[spreadNumbers.length - 1] + 1;
      return;
    }

    const pageNumber = pageNumbers[0] ?? fallbackPageNumber;
    normalized.push({
      index: normalized.length,
      assetId,
      pageNumber,
      cropMode: 'full',
      normal: asset.normal,
      low: asset.low,
      thumb: asset.thumb
    });
    fallbackPageNumber = pageNumber + 1;
  });

  return normalized;
}
