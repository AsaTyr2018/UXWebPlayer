import { afterEach, beforeEach, describe, expect, it } from 'vitest';

process.env.ADMIN_DB_PATH = ':memory:';

import {
  AuthenticationError,
  ValidationError,
  authenticateAdmin,
  createAdminUser,
  defaultAdminPresent,
  listAdminUsers
} from '../../src/server/access-control-service.js';
import { db, ensureDefaultAdmin } from '../../src/server/db.js';

const resetDatabase = () => {
  db.prepare('DELETE FROM admin_users').run();
  ensureDefaultAdmin();
};

describe('access-control-service', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterEach(() => {
    resetDatabase();
  });

  it('authenticates the default admin credentials', () => {
    const result = authenticateAdmin('admin', 'admin');
    expect(result.user.name).toBe('Default Admin');
    expect(result.user.email).toBe('admin@localhost');
    expect(result.showDefaultAdminWarning).toBe(true);
    expect(result.users.length).toBe(1);
  });

  it('updates last active timestamp after authentication', () => {
    const before = listAdminUsers();
    expect(before[0]?.lastActive).toBe('Never');

    authenticateAdmin('admin', 'admin');

    const after = listAdminUsers();
    expect(after[0]?.lastActive).not.toBe('Never');
  });

  it('creates a new admin account with unique username and email', () => {
    const result = createAdminUser({
      name: 'Alice Example',
      username: 'alice',
      email: 'alice@example.com',
      password: 'strongpass',
      role: 'admin'
    });

    expect(result.user.email).toBe('alice@example.com');
    expect(defaultAdminPresent()).toBe(true);

    const users = listAdminUsers();
    expect(users.some((user) => user.email === 'alice@example.com')).toBe(true);
    expect(users.length).toBe(2);
  });

  it('rejects duplicate usernames and emails', () => {
    createAdminUser({
      name: 'Alice Example',
      username: 'alice',
      email: 'alice@example.com',
      password: 'strongpass',
      role: 'admin'
    });

    expect(() =>
      createAdminUser({
        name: 'Alice Clone',
        username: 'alice',
        email: 'alice2@example.com',
        password: 'anotherpass',
        role: 'admin'
      })
    ).toThrow(ValidationError);

    expect(() =>
      createAdminUser({
        name: 'Alice Clone',
        username: 'alice2',
        email: 'alice@example.com',
        password: 'anotherpass',
        role: 'admin'
      })
    ).toThrow(ValidationError);
  });

  it('enforces password length requirements', () => {
    expect(() =>
      createAdminUser({
        name: 'Short Password',
        username: 'shorty',
        email: 'short@example.com',
        password: 'short',
        role: 'admin'
      })
    ).toThrow(ValidationError);
  });

  it('rejects invalid login attempts', () => {
    expect(() => authenticateAdmin('admin', 'wrong-password')).toThrow(AuthenticationError);
  });
});
