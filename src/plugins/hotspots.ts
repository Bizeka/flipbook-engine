/** @license FlipbookEngine v0.8.0 | SPDX-License-Identifier: AGPL-3.0-or-later */
import { createFeaturePlugin } from './feature';
import type { FlipbookPlugin } from './index';

export function createHotspotsPlugin(): FlipbookPlugin {
  return createFeaturePlugin('hotspots', (engine) => ({
    get: (pageIndex?: number) => engine.getHotspots(pageIndex),
    activate: (id: string) => engine.activateHotspot(id),
    close: () => engine.closeHotspot()
  }));
}

export const hotspotsPlugin = createHotspotsPlugin();
