/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

import flipbookEngineStyles from '../styles/flipbook-engine.css?inline';

export type FlipbookThemeMode = 'auto' | 'light' | 'dark';

export interface ThemeConfiguration {
  theme?: FlipbookThemeMode;
  primaryColor?: string;
  cssVariables?: Record<string, string>;
}

let styleInjected = false;

export function ensureRuntimeStyles() {
  if (typeof document === 'undefined' || styleInjected) return;

  const styleId = 'flipbook-engine-runtime-styles';
  if (document.getElementById(styleId)) {
    styleInjected = true;
    return;
  }

  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = flipbookEngineStyles;
  document.head.appendChild(styleEl);
  styleInjected = true;
}

export function applyThemeConfiguration(container: HTMLElement, config: ThemeConfiguration) {
  container.classList.add('bk-container');
  container.classList.remove('bk-theme-light', 'bk-theme-dark');

  if (config.theme === 'light') container.classList.add('bk-theme-light');
  if (config.theme === 'dark') container.classList.add('bk-theme-dark');

  if (config.primaryColor) {
    container.style.setProperty('--accentcolor', config.primaryColor);
  }

  const userVariables = config.cssVariables ?? {};
  Object.entries(userVariables).forEach(([name, value]) => {
    const variableName = name.startsWith('--') ? name : `--${name}`;
    container.style.setProperty(variableName, value);
  });
}
