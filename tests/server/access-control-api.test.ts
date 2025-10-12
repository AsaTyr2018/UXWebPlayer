import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

process.env.ADMIN_DB_PATH = ':memory:';

import { createAccessControlApp } from '../../src/server/access-control-app.js';
import { db, ensureDefaultAdmin } from '../../src/server/db.js';

const resetDatabase = () => {
  db.prepare('DELETE FROM admin_users').run();
  ensureDefaultAdmin();
};

describe('access-control API', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterEach(() => {
    resetDatabase();
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
});
