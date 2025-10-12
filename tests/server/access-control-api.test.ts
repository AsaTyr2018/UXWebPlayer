import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

process.env.ADMIN_DB_PATH = ':memory:';
const brandingTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-branding-api-'));
process.env.BRANDING_DB_PATH = path.join(brandingTestDir, 'branding.json');

import { createAccessControlApp } from '../../src/server/access-control-app.js';
import { db, ensureDefaultAdmin } from '../../src/server/db.js';
import { getBrandingSettings, resetBrandingSettings } from '../../src/server/branding-service.js';

const resetDatabase = () => {
  db.prepare('DELETE FROM admin_users').run();
  ensureDefaultAdmin();
};

describe('access-control API', () => {
  beforeEach(() => {
    resetDatabase();
    resetBrandingSettings();
    const brandingPath = process.env.BRANDING_DB_PATH;
    if (brandingPath && fs.existsSync(brandingPath)) {
      fs.rmSync(brandingPath, { force: true });
    }
  });

  afterEach(() => {
    resetDatabase();
    resetBrandingSettings();
    const brandingPath = process.env.BRANDING_DB_PATH;
    if (brandingPath && fs.existsSync(brandingPath)) {
      fs.rmSync(brandingPath, { force: true });
    }
  });

  afterAll(() => {
    fs.rmSync(brandingTestDir, { recursive: true, force: true });
  });

  it('authenticates the default admin credentials over HTTP', async () => {
    const app = createAccessControlApp();
    const response = await request(app)
      .post('/api/access/login')
      .send({ username: 'admin', password: 'admin' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user?.email).toBe('admin@localhost');
  });

  it('rejects missing bearer tokens when listing users', async () => {
    const app = createAccessControlApp();
    const response = await request(app).get('/api/access/users');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Missing or invalid Authorization header.');
  });

  it('updates branding settings through the media library API', async () => {
    const app = createAccessControlApp();
    const login = await request(app)
      .post('/api/access/login')
      .send({ username: 'admin', password: 'admin' });

    expect(login.status).toBe(200);
    const token = login.body.token as string;

    const response = await request(app)
      .patch('/api/library/branding')
      .set('Authorization', `Bearer ${token}`)
      .send({
        theme: 'custom',
        accentColor: '#0ea5e9',
        backgroundColor: '#0f172a',
        fontFamily: 'Space Grotesk',
        logo: '  https://cdn.example.com/brand.svg  ',
        tokenOverrides: 6
      });

    expect(response.status).toBe(200);
    expect(response.body.branding).toMatchObject({
      theme: 'custom',
      accentColor: '#0ea5e9',
      backgroundColor: '#0f172a',
      fontFamily: 'Space Grotesk',
      logo: 'https://cdn.example.com/brand.svg',
      tokenOverrides: 6
    });

    const stored = getBrandingSettings();
    expect(stored).toMatchObject({
      theme: 'custom',
      accentColor: '#0ea5e9',
      backgroundColor: '#0f172a',
      fontFamily: 'Space Grotesk',
      logo: 'https://cdn.example.com/brand.svg',
      tokenOverrides: 6
    });
  });
});
