import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createTempStorePath = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-branding-'));
  return { directory, file: path.join(directory, 'branding.json') };
};

describe('branding-service', () => {
  let tempDir: string;

  beforeEach(() => {
    const store = createTempStorePath();
    tempDir = store.directory;
    process.env.BRANDING_DB_PATH = store.file;
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.BRANDING_DB_PATH;
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns default branding settings when no store exists', async () => {
    const service = await import('../../src/server/branding-service.js');
    const settings = service.getBrandingSettings();

    expect(settings).toMatchObject({ theme: 'light', accentColor: '#2563eb' });
  });

  it('sanitizes and persists branding updates', async () => {
    const service = await import('../../src/server/branding-service.js');
    const updated = service.updateBrandingSettings({
      theme: 'custom',
      accentColor: '#111827',
      backgroundColor: '#0f172a',
      fontFamily: 'Space Grotesk',
      tokenOverrides: 3.8,
      logo: '  https://cdn.example.com/logo.svg  '
    });

    expect(updated).toEqual({
      theme: 'custom',
      accentColor: '#111827',
      backgroundColor: '#0f172a',
      fontFamily: 'Space Grotesk',
      tokenOverrides: 4,
      logo: 'https://cdn.example.com/logo.svg'
    });

    const raw = fs.readFileSync(process.env.BRANDING_DB_PATH!, 'utf8');
    expect(JSON.parse(raw)).toMatchObject({ settings: updated });

    const reloaded = service.getBrandingSettings();
    expect(reloaded).toEqual(updated);
  });

  it('rejects invalid colors and themes', async () => {
    const service = await import('../../src/server/branding-service.js');
    service.updateBrandingSettings({ accentColor: '#111111' });

    const updated = service.updateBrandingSettings({
      theme: 'invalid-theme' as any,
      accentColor: 'nope',
      backgroundColor: '123456',
      tokenOverrides: -10
    });

    expect(updated).toMatchObject({
      theme: 'light',
      accentColor: '#111111',
      backgroundColor: '#ffffff',
      tokenOverrides: 0
    });
  });
});
