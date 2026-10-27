/**
 * @license FlipbookEngine v1.0.0
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { computed, signal } from '@preact/signals-core';
import { resolveMessages } from '../i18n/service';
import type { FlipbookHotspot, FlipbookHotspotMedia } from '../model/hotspots';
import { safeCssColor, type FlipbookAnnotation } from '../model/annotations';
import { safeLinkUrl } from '../model/safe-url';
import type { FlipbookStore } from '../state/store';
import { renderNoteDocument } from '../model/note-editor';


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

/** Closes the bubble on Escape or on a press outside both the bubble and its pin. */
function bindBubbleDismiss(bubble: HTMLElement, store: FlipbookStore) {
  const doc = bubble.ownerDocument;
  const close = () => { store.hoverAnnotationId.value = null; };
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
  const onPress = (event: Event) => {
    const target = event.target as Element | null;
    if (!bubble.contains(target) && !target?.closest('.bk-annotation-marker')) close();
  };
  doc.addEventListener('keydown', onKey);
  doc.addEventListener('pointerdown', onPress, true);
  let attached = false;
  const observer = new (doc.defaultView!.MutationObserver)(() => {
    if (bubble.isConnected) { attached = true; return; }
    if (!attached) return;
    doc.removeEventListener('keydown', onKey); doc.removeEventListener('pointerdown', onPress, true); observer.disconnect();
  });
  observer.observe(doc.body, { childList: true, subtree: true });
}

export function HotspotLayer(props: HotspotLayerProps) {
  const messages = computed(() => resolveMessages({ locale: props.store.locale.value, messages: props.store.messages.value }));
  const hotspots = computed(() => props.store.hotspots.value.filter((item) => item.pageIndex === props.pageIndex));
  const annotations = computed(() => props.store.annotations.value.filter((item) => item.pageIndex === props.pageIndex));
  const activeGalleryIndex = signal(0);
  // Mouse leave waits briefly so the pointer can travel from the pin into the bubble.
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  // Single-page and spread layers can coexist, so bubble ids must be unique per layer.
  const layerKey = Math.random().toString(36).slice(2, 8);
  return (
    <div class="bk-hotspot-layer">
      {hotspots.value.map((hotspot) => (
        <button type="button" class="bk-hotspot" style={normalizedRectStyle(hotspot)} aria-label={hotspot.label} onClick={() => { activeGalleryIndex.value = 0; props.onActivate(hotspot); }}>
          <span class="bk-hotspot-label">{hotspot.label}</span>
        </button>
      ))}
      {computed(() => <div class="bk-annotation-markers">{annotations.value.map((annotation) => {
        const color = annotation.color ?? props.store.noteGroups.value.find((group) => group.key === annotation.groupKey)?.color;
        const show = () => { props.store.hoverAnnotationId.value = annotation.id; };
        const hide = () => { if (props.store.hoverAnnotationId.value === annotation.id) props.store.hoverAnnotationId.value = null; };
        const hideSoon = () => { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 180); };
        const showNow = () => { clearTimeout(hideTimer); show(); };
        let touched = false, wasShown = false;
        return <button type="button" data-annotation-id={annotation.id} class={computed(() => 'bk-annotation-marker' + (props.store.activeAnnotationId.value === annotation.id ? ' active' : ''))}
          style={'left:' + Math.max(0, Math.min(1, annotation.x)) * 100 + '%;top:' + Math.max(0, Math.min(1, annotation.y)) * 100 + '%;' + (safeCssColor(color) ? '--bk-pin:' + color + ';' : '')}
          aria-label={annotation.text} aria-describedby={computed(() => props.store.hoverAnnotationId.value === annotation.id ? 'bk-note-bubble-' + layerKey + '-' + annotation.id : undefined)}
          onPointerDown={(event: PointerEvent) => { touched = event.pointerType === 'touch' || event.pointerType === 'pen'; wasShown = props.store.hoverAnnotationId.value === annotation.id; stopPageFlipInteraction(event); }} onTouchStart={stopPageFlipInteraction} onMouseDown={stopPageFlipInteraction}
          onPointerEnter={(event: PointerEvent) => { if (event.pointerType === 'mouse') showNow(); }} onPointerLeave={(event: PointerEvent) => { if (event.pointerType === 'mouse') hideSoon(); }}
          onFocus={show} onBlur={hide}
          onKeyDown={(event: KeyboardEvent) => { if (event.key === 'Escape' && props.store.hoverAnnotationId.value === annotation.id) { event.stopPropagation(); hide(); } }}
          onClick={(event: Event) => {
            event.stopPropagation();
            // First touch tap previews the note; a second tap opens it.
            if (touched && !wasShown) { touched = false; show(); return; }
            touched = false; props.onAnnotationActivate(annotation);
          }} />;
      })}</div>)}
      {computed(() => {
        const note = annotations.value.find((item) => item.id === props.store.hoverAnnotationId.value);
        if (!note || props.store.activeAnnotationId.value === note.id) return null;
        const group = props.store.noteGroups.value.find((item) => item.key === note.groupKey);
        const side = note.x < .3 ? ' is-start' : note.x > .55 ? ' is-end' : '', below = note.y < .3 ? ' is-below' : '';
        return <div id={'bk-note-bubble-' + layerKey + '-' + note.id} role="tooltip" ref={(element: HTMLElement) => bindBubbleDismiss(element, props.store)} class={'bk-note-bubble' + side + below}
          style={'left:' + Math.max(0, Math.min(1, note.x)) * 100 + '%;top:' + Math.max(0, Math.min(1, note.y)) * 100 + '%;'}
          onPointerDown={stopPageFlipInteraction} onTouchStart={stopPageFlipInteraction} onMouseDown={stopPageFlipInteraction}
          onPointerEnter={(event: PointerEvent) => { if (event.pointerType === 'mouse') clearTimeout(hideTimer); }} onPointerLeave={(event: PointerEvent) => { if (event.pointerType === 'mouse') hideTimer = setTimeout(() => { props.store.hoverAnnotationId.value = null; }, 180); }}>
          {group ? <span class="bk-note-bubble-group">{group.label}</span> : null}
          <div class="bk-note-bubble-body">{renderNoteDocument(note.document, note.text)}</div>
        </div>;
      })}
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
                {safeLinkUrl(selectedGalleryItem.href) ? (
                  <a href={safeLinkUrl(selectedGalleryItem.href)} target={selectedGalleryItem.target || '_blank'} rel="noopener noreferrer"><img class="bk-hotspot-gallery-selected" src={selectedGalleryItem.src} alt={selectedGalleryItem.alt || ''} /></a>
                ) : <img class="bk-hotspot-gallery-selected" src={selectedGalleryItem.src} alt={selectedGalleryItem.alt || ''} />}
              </div>
            ) : null}
            {safeLinkUrl(active.href) ? <a class="bk-hotspot-link" href={safeLinkUrl(active.href)} target={active.target || '_blank'} rel="noopener noreferrer">{active.kind === 'commerce' ? active.label : active.href}</a> : null}
          </div>
        );
      })}
      {computed(() => {
        if (props.store.canAnnotate.value) return null;
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
