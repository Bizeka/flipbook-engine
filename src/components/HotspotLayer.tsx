/**
 * @license FlipbookEngine v1.0.0
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { computed, signal } from '@preact/signals-core';
import { resolveMessages } from '../i18n/service';
import type { FlipbookHotspot, FlipbookHotspotMedia } from '../model/hotspots';
import type { FlipbookAnnotation } from '../model/annotations';
import type { FlipbookStore } from '../state/store';

interface HotspotLayerProps {
  store: FlipbookStore;
  pageIndex: number;
  onActivate: (hotspot: FlipbookHotspot) => void;
  onClose: () => void;
  onAnnotationActivate: (annotation: FlipbookAnnotation) => void;
  onAnnotationClose: () => void;
}

function renderMedia(media: FlipbookHotspotMedia, fallbackLabel: string) {
  if (media.type === 'image') {
    return <img class="bk-hotspot-media-image" src={media.src} alt={media.alt || ''} loading="lazy" />;
  }
  if (media.type === 'video') {
    return <video class="bk-hotspot-media-video" controls preload="metadata" poster={media.poster} aria-label={media.alt || fallbackLabel}><source src={media.src} /></video>;
  }
  return <audio class="bk-hotspot-media-audio" controls preload="metadata" aria-label={media.alt || fallbackLabel}><source src={media.src} /></audio>;
}

function stopPageFlipInteraction(event: Event): void {
  // Keep popup/media gestures from reaching page-flip listeners. Do not preventDefault:
  // media controls and native scrolling must remain usable.
  event.stopPropagation();
}

function normalizedRectStyle(hotspot: FlipbookHotspot): string {
  const clamp = (value: number) => Math.max(0, Math.min(1, value)) * 100;
  return 'left:' + clamp(hotspot.x) + '%;top:' + clamp(hotspot.y) + '%;width:' + clamp(hotspot.width) + '%;height:' + clamp(hotspot.height) + '%;';
}

export function HotspotLayer(props: HotspotLayerProps) {
  const messages = computed(() => resolveMessages({ locale: props.store.locale.value, messages: props.store.messages.value }));
  const hotspots = computed(() => props.store.hotspots.value.filter((item) => item.pageIndex === props.pageIndex));
  const annotations = computed(() => props.store.annotations.value.filter((item) => item.pageIndex === props.pageIndex));
  const activeGalleryIndex = signal(0);
  return (
    <div class="bk-hotspot-layer">
      {hotspots.value.map((hotspot) => (
        <button type="button" class="bk-hotspot" style={normalizedRectStyle(hotspot)} aria-label={hotspot.label} onClick={() => { activeGalleryIndex.value = 0; props.onActivate(hotspot); }}>
          <span class="bk-hotspot-label">{hotspot.label}</span>
        </button>
      ))}
      {annotations.value.map((annotation) => (
        <button type="button" class="bk-annotation-marker" style={'left:' + Math.max(0, Math.min(1, annotation.x)) * 100 + '%;top:' + Math.max(0, Math.min(1, annotation.y)) * 100 + '%;' + (annotation.color ? 'color:' + annotation.color + ';' : '')} aria-label={annotation.text} onClick={() => props.onAnnotationActivate(annotation)}>●</button>
      ))}
      {computed(() => {
        const active = props.store.hotspots.value.find((item) => item.id === props.store.activeHotspotId.value && item.pageIndex === props.pageIndex);
        if (!active) return null;
        const gallery = active.gallery || [];
        const selectedIndex = gallery.length ? Math.min(activeGalleryIndex.value, gallery.length - 1) : 0;
        const selectedGalleryItem = gallery[selectedIndex];
        return (
          <div class="bk-hotspot-popup" onPointerDown={stopPageFlipInteraction} onPointerMove={stopPageFlipInteraction} onPointerUp={stopPageFlipInteraction} onPointerCancel={stopPageFlipInteraction} onTouchStart={stopPageFlipInteraction} onTouchMove={stopPageFlipInteraction} onTouchEnd={stopPageFlipInteraction} onMouseDown={stopPageFlipInteraction} role="dialog" aria-label={active.label}>
            <div class="bk-hotspot-popup-heading"><strong>{active.label}</strong><button type="button" class="bk-hotspot-popup-close" onClick={props.onClose} aria-label={computed(() => messages.value.closeHotspot || 'Close popup')}>×</button></div>
            {active.content ? <p>{active.content}</p> : null}
            {active.media ? <div class="bk-hotspot-popup-media">{renderMedia(active.media, active.label)}</div> : null}
            {selectedGalleryItem ? (
              <div class="bk-hotspot-gallery" aria-label={active.label + ' gallery'}>
                <div class="bk-hotspot-gallery-thumbs">
                  {gallery.map((item, index) => (
                    <button type="button" class={computed(() => 'bk-hotspot-gallery-thumb' + (index === selectedIndex ? ' is-selected' : ''))} onClick={() => { activeGalleryIndex.value = index; }} aria-label={item.alt || 'Gallery image ' + (index + 1)} aria-pressed={computed(() => index === selectedIndex ? 'true' : 'false')}>
                      <img src={item.src} alt={item.alt || ''} loading="lazy" />
                    </button>
                  ))}
                </div>
                {selectedGalleryItem.href ? (
                  <a href={selectedGalleryItem.href} target={selectedGalleryItem.target || '_blank'} rel="noopener noreferrer"><img class="bk-hotspot-gallery-selected" src={selectedGalleryItem.src} alt={selectedGalleryItem.alt || ''} /></a>
                ) : <img class="bk-hotspot-gallery-selected" src={selectedGalleryItem.src} alt={selectedGalleryItem.alt || ''} />}
              </div>
            ) : null}
            {active.href ? <a class="bk-hotspot-link" href={active.href} target={active.target || '_blank'} rel="noopener noreferrer">{active.kind === 'commerce' ? active.label : active.href}</a> : null}
          </div>
        );
      })}
      {computed(() => {
        const active = props.store.annotations.value.find((item) => item.id === props.store.activeAnnotationId.value && item.pageIndex === props.pageIndex);
        if (!active) return null;
        return (
          <div class="bk-annotation-popup" onPointerDown={stopPageFlipInteraction} onPointerMove={stopPageFlipInteraction} onPointerUp={stopPageFlipInteraction} onPointerCancel={stopPageFlipInteraction} onTouchStart={stopPageFlipInteraction} onTouchMove={stopPageFlipInteraction} onTouchEnd={stopPageFlipInteraction} onMouseDown={stopPageFlipInteraction} role="dialog" aria-label={computed(() => messages.value.annotation || 'Page annotation')}>
            <div class="bk-hotspot-popup-heading"><strong>{computed(() => messages.value.annotation || 'Page annotation')}</strong><button type="button" class="bk-hotspot-popup-close" onClick={props.onAnnotationClose} aria-label="Close">×</button></div>
            <p>{active.text}</p>
          </div>
        );
      })}
    </div>
  );
}
