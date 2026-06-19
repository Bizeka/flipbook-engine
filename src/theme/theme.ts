/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

export type FlipbookThemeMode = 'auto' | 'light' | 'dark';

export interface ThemeConfiguration {
  theme?: FlipbookThemeMode;
  primaryColor?: string;
  cssVariables?: Record<string, string>;
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
