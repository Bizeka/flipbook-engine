import test from 'node:test';
import assert from 'node:assert/strict';

// Load DOM mock
import './dom-mock.ts';

import { applyThemeConfiguration } from '../src/theme/theme.ts';
import { resolveMessages } from '../src/i18n/service.ts';

test('theme configuration - applies default container class', () => {
  const container = document.createElement('div');
  applyThemeConfiguration(container, {});

  assert.ok(container.classList.contains('bk-container'));
});

test('theme configuration - applies light theme mode class', () => {
  const container = document.createElement('div');
  applyThemeConfiguration(container, { theme: 'light' });

  assert.ok(container.classList.contains('bk-container'));
  assert.ok(container.classList.contains('bk-theme-light'));
  assert.ok(!container.classList.contains('bk-theme-dark'));
});

test('theme configuration - applies dark theme mode class', () => {
  const container = document.createElement('div');
  applyThemeConfiguration(container, { theme: 'dark' });

  assert.ok(container.classList.contains('bk-container'));
  assert.ok(container.classList.contains('bk-theme-dark'));
  assert.ok(!container.classList.contains('bk-theme-light'));
});

test('theme configuration - applies primary color as css variable', () => {
  const container = document.createElement('div');
  applyThemeConfiguration(container, { primaryColor: '#ff0000' });

  assert.equal(container.style.getPropertyValue('--flipbook-accent'), '#ff0000');
});

test('theme configuration - applies custom css variables', () => {
  const container = document.createElement('div');
  applyThemeConfiguration(container, {
    cssVariables: {
      'custom-var': '12px',
      '--another-var': 'blue'
    }
  });

  assert.equal(container.style.getPropertyValue('--custom-var'), '12px');
  assert.equal(container.style.getPropertyValue('--another-var'), 'blue');
});

test('i18n service - resolves to default en locale messages', () => {
  const msgs = resolveMessages({});
  assert.equal(msgs.previous, 'Previous');
  assert.equal(msgs.emptyStateTitle, 'No data available.');
});

test('i18n service - resolves to tr locale messages', () => {
  const msgs = resolveMessages({ locale: 'tr' });
  assert.equal(msgs.previous, 'Önceki');
  assert.equal(msgs.emptyStateTitle, 'Veri bulunamadi.');
});

test('i18n service - falls back to en for unknown locales', () => {
  const msgs = resolveMessages({ locale: 'fr' });
  assert.equal(msgs.previous, 'Previous');
});

test('i18n service - merges custom overrides correctly', () => {
  const msgs = resolveMessages({
    locale: 'en',
    messages: {
      en: {
        previous: 'Backwards',
        next: 'Forwards'
      }
    }
  });

  assert.equal(msgs.previous, 'Backwards');
  assert.equal(msgs.next, 'Forwards');
  assert.equal(msgs.settings, 'Settings'); // remains default
});



test('theme configuration - applies separate light and dark backgrounds', () => {
  const container = document.createElement('div');
  applyThemeConfiguration(container, {
    theme: 'auto',
    background: {
      light: { color: '#f8fafc', image: '/images/light.webp', size: 'cover' },
      dark: { color: '#0f172a', image: '/images/dark.webp', position: 'top center' }
    }
  });

  assert.equal(container.classList.contains('bk-theme-auto'), true);
  assert.equal(container.style.getPropertyValue('--flipbook-bg-light-color'), '#f8fafc');
  assert.equal(container.style.getPropertyValue('--flipbook-bg-dark-color'), '#0f172a');
  assert.equal(container.style.getPropertyValue('--flipbook-bg-light-image'), 'url("/images/light.webp")');
  assert.equal(container.style.getPropertyValue('--flipbook-bg-dark-image'), 'url("/images/dark.webp")');
  assert.equal(container.style.getPropertyValue('--flipbook-bg-light-size'), 'cover');
  assert.equal(container.style.getPropertyValue('--flipbook-bg-dark-position'), 'top center');
});
