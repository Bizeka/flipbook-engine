import { computed } from '@preact/signals-core';
import type { FlipbookHotspot } from '../model/hotspots';
import type { FlipbookStore } from '../state/store';

interface HotspotLayerProps {
  store: FlipbookStore;
  pageIndex: number;
  onActivate: (hotspot: FlipbookHotspot) => void;
  onClose: () => void;
}

export function HotspotLayer(props: HotspotLayerProps) {
  const hotspots = computed(() => props.store.hotspots.value.filter((item) => item.pageIndex === props.pageIndex));
  return (
    <div class="bk-hotspot-layer">
      {hotspots.value.map((hotspot) => (
        <button
          type="button"
          class="bk-hotspot"
          style={`left:${Math.max(0, Math.min(1, hotspot.x)) * 100}%;top:${Math.max(0, Math.min(1, hotspot.y)) * 100}%;width:${Math.max(0, Math.min(1, hotspot.width)) * 100}%;height:${Math.max(0, Math.min(1, hotspot.height)) * 100}%;`}
          aria-label={hotspot.label}
          onClick={() => props.onActivate(hotspot)}
        >
          <span class="bk-hotspot-label">{hotspot.label}</span>
        </button>
      ))}
      {computed(() => {
        const active = props.store.hotspots.value.find((item) => item.id === props.store.activeHotspotId.value && item.pageIndex === props.pageIndex);
        if (!active) return null;
        return (
          <div class="bk-hotspot-popup" role="dialog" aria-label={active.label}>
            <div class="bk-hotspot-popup-heading">
              <strong>{active.label}</strong>
              <button type="button" class="bk-hotspot-popup-close" onClick={props.onClose} aria-label="Close">×</button>
            </div>
            {active.content ? <p>{active.content}</p> : null}
            {active.href ? <a href={active.href} target={active.target || '_blank'} rel="noopener noreferrer">{active.href}</a> : null}
          </div>
        );
      })}
    </div>
  );
}
