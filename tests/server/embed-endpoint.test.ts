import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { createAccessControlApp } from '../../src/server/access-control-app.js';

describe('embed endpoints', () => {
  it('returns the embed player shell for a valid slug', async () => {
    const app = createAccessControlApp();
    const response = await request(app).get('/embed/123456789');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain("window.__UX_EMBED_SLUG__ = '123456789'");
    expect(response.text).not.toContain('<ux-admin-app>');
  });

  it('returns 404 for invalid slugs', async () => {
    const app = createAccessControlApp();
    const response = await request(app).get('/embed/../../etc/passwd');

    expect(response.status).toBe(404);
  });
});
