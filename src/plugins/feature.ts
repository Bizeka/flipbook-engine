/**
 * @license FlipbookEngine v0.8.0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { FlipbookEngine } from '../engine';
import type { FlipbookPlugin, FlipbookPluginApiHandler, FlipbookPluginContext } from './index';

export type FeatureApiFactory = (engine: FlipbookEngine, context: FlipbookPluginContext) => Record<string, FlipbookPluginApiHandler>;

export function createFeaturePlugin(name: string, factory: FeatureApiFactory): FlipbookPlugin {
  return {
    name,
    install(engine, context) {
      const cleanups = Object.entries(factory(engine, context)).map(([apiName, handler]) => context.registerApi(apiName, handler));
      return () => cleanups.forEach((cleanup) => cleanup());
    }
  };
}
