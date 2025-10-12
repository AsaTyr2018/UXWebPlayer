import fs from 'node:fs';
import path from 'node:path';

import type { BrandingSettings } from '../admin/types.js';

type BrandingState = {
  settings: BrandingSettings;
  updatedAt: string;
};

const BRANDING_STORE_PATH = path.resolve(
  process.env.BRANDING_DB_PATH ?? path.join('data', 'branding.json')
);

let cachedState: BrandingState | null = null;

const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  theme: 'light',
  accentColor: '#2563eb',
  backgroundColor: '#ffffff',
  logo: undefined,
  fontFamily: 'Inter, sans-serif',
  tokenOverrides: 0
};

const allowedThemes: BrandingSettings['theme'][] = ['light', 'dark', 'custom'];

const ensureStoreDirectory = () => {
  const directory = path.dirname(BRANDING_STORE_PATH);
  fs.mkdirSync(directory, { recursive: true });
};

const cloneSettings = (settings: BrandingSettings): BrandingSettings => ({ ...settings });

const defaultState = (): BrandingState => ({
  settings: cloneSettings(DEFAULT_BRANDING_SETTINGS),
  updatedAt: new Date(0).toISOString()
});

const sanitizeTheme = (value: unknown, fallback: BrandingSettings['theme']) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return allowedThemes.includes(normalized as BrandingSettings['theme'])
    ? (normalized as BrandingSettings['theme'])
    : fallback;
};

const sanitizeColor = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized;
  }

  return fallback;
};

const sanitizeFontFamily = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const sanitizeLogo = (value: unknown, fallback: string | undefined) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeTokenOverrides = (value: unknown, fallback: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value));
};

const sanitizeSettings = (updates: Partial<BrandingSettings>, base: BrandingSettings): BrandingSettings => ({
  theme: sanitizeTheme(updates.theme, base.theme),
  accentColor: sanitizeColor(updates.accentColor, base.accentColor),
  backgroundColor: sanitizeColor(updates.backgroundColor, base.backgroundColor),
  logo: sanitizeLogo(updates.logo, base.logo),
  fontFamily: sanitizeFontFamily(updates.fontFamily, base.fontFamily),
  tokenOverrides: sanitizeTokenOverrides(updates.tokenOverrides, base.tokenOverrides)
});

const loadState = (): BrandingState => {
  if (cachedState) {
    return cachedState;
  }

  ensureStoreDirectory();

  if (!fs.existsSync(BRANDING_STORE_PATH)) {
    cachedState = defaultState();
    return cachedState;
  }

  try {
    const raw = fs.readFileSync(BRANDING_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<BrandingState>;
    const base = cloneSettings(DEFAULT_BRANDING_SETTINGS);
    const settings = parsed.settings
      ? sanitizeSettings(parsed.settings, base)
      : base;
    const state: BrandingState = {
      settings,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString()
    };
    cachedState = state;
    return state;
  } catch (error) {
    cachedState = defaultState();
    return cachedState;
  }
};

const writeState = (state: BrandingState) => {
  ensureStoreDirectory();
  fs.writeFileSync(BRANDING_STORE_PATH, JSON.stringify(state, null, 2), 'utf8');
  cachedState = state;
};

export const getBrandingSettings = (): BrandingSettings => {
  return cloneSettings(loadState().settings);
};

export const updateBrandingSettings = (updates: Partial<BrandingSettings>): BrandingSettings => {
  const current = loadState().settings;
  const sanitized = sanitizeSettings(updates, current);
  const state: BrandingState = {
    settings: cloneSettings(sanitized),
    updatedAt: new Date().toISOString()
  };
  writeState(state);
  return cloneSettings(sanitized);
};

export const resetBrandingSettings = () => {
  cachedState = null;
  if (fs.existsSync(BRANDING_STORE_PATH)) {
    fs.rmSync(BRANDING_STORE_PATH, { force: true });
  }
};
