/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

export type FlipbookThemeMode = 'auto' | 'light' | 'dark';

export interface FlipbookBackgroundStyle {
  color?: string;
  image?: string;
  size?: string;
  position?: string;
  repeat?: string;
}

export interface FlipbookBackgrounds {
  light?: FlipbookBackgroundStyle | null;
  dark?: FlipbookBackgroundStyle | null;
}

export interface ThemeConfiguration {
  theme?: FlipbookThemeMode;
  primaryColor?: string;
  cssVariables?: Record<string, string>;
  background?: FlipbookBackgrounds | null;
  /** @deprecated Use background.light/dark instead. */
  backgroundColor?: string;
  /** @deprecated Use background.light/dark instead. */
  backgroundImage?: string;
}

function toCssImage(image?: string): string | undefined {
  if (!image) return undefined;
  const escaped = image.replace(/["\\\r\n]/g, (character) => '\\' + character);
  return 'url("' + escaped + '")';
}

export function applyThemeConfiguration(container: HTMLElement, config: ThemeConfiguration) {
  container.classList.add('bk-container');
  container.classList.remove('bk-theme-light', 'bk-theme-dark');
  container.classList.add('bk-theme-' + (config.theme ?? 'auto'));

  if (config.primaryColor) {
    container.style.setProperty('--flipbook-accent', config.primaryColor);
  }

  const background = config.background ?? {};
  const legacyLight = config.backgroundColor || config.backgroundImage
    ? { color: config.backgroundColor, image: config.backgroundImage }
    : undefined;
  const setBackground = (prefix: string, style?: FlipbookBackgroundStyle | null) => {
    const values: Record<string, string | undefined> = {
      ['--flipbook-bg-' + prefix + '-color']: style?.color,
      ['--flipbook-bg-' + prefix + '-image']: toCssImage(style?.image),
      ['--flipbook-bg-' + prefix + '-size']: style?.size,
      ['--flipbook-bg-' + prefix + '-position']: style?.position,
      ['--flipbook-bg-' + prefix + '-repeat']: style?.repeat
    };
    Object.entries(values).forEach(([name, value]) => {
      if (value) container.style.setProperty(name, value);
      else container.style.removeProperty(name);
    });
  };
  setBackground('light', background.light ?? legacyLight);
  setBackground('dark', background.dark);

  const userVariables = config.cssVariables ?? {};
  Object.entries(userVariables).forEach(([name, value]) => {
    const variableName = name.startsWith('--') ? name : '--' + name;
    container.style.setProperty(variableName, value);
  });
}
