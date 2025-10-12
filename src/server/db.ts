import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface AdminUserRow {
  id: string;
  username: string;
  username_normalized: string;
  password_hash: string;
  name: string;
  email: string;
  email_normalized: string;
  role: string;
  status: string;
  is_default: number;
  created_at: string;
  last_active: string | null;
}

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin';
const DEFAULT_ADMIN_NAME = 'Default Admin';
const DEFAULT_ADMIN_EMAIL = 'admin@localhost';

const DEFAULT_ROLE = 'owner';
const DEFAULT_STATUS = 'active';

const FILENAME = fileURLToPath(import.meta.url);
const ROOT_DIR = path.dirname(path.dirname(FILENAME));
const REPO_ROOT = path.resolve(ROOT_DIR, '..');

const DB_ENV_PATH = process.env.ADMIN_DB_PATH;

const resolveDatabasePath = () => {
  if (DB_ENV_PATH && DB_ENV_PATH.trim().length > 0) {
    const trimmed = DB_ENV_PATH.trim();
    if (trimmed === ':memory:') {
      return ':memory:';
    }

    const absolute = path.isAbsolute(trimmed) ? trimmed : path.resolve(REPO_ROOT, trimmed);

    const directory = path.dirname(absolute);
    mkdirSync(directory, { recursive: true });
    return absolute;
  }

  const dataDirectory = path.join(REPO_ROOT, 'data');
  mkdirSync(dataDirectory, { recursive: true });
  return path.join(dataDirectory, 'admin.sqlite');
};

const db = new Database(resolveDatabasePath());

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    username_normalized TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    email_normalized TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '${DEFAULT_STATUS}',
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_active TEXT
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_admin_users_created_at
    ON admin_users (created_at DESC)
`);

const hasAnyUsers = () => {
  const row = db.prepare('SELECT COUNT(*) as count FROM admin_users').get() as { count: number };
  return row.count > 0;
};

const createDefaultAdmin = () => {
  const existing = db
    .prepare('SELECT id FROM admin_users WHERE username_normalized = ?')
    .get(DEFAULT_ADMIN_USERNAME.toLowerCase()) as { id?: string } | undefined;

  if (existing?.id) {
    return;
  }

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);

  db.prepare(
    `INSERT INTO admin_users (
      id,
      username,
      username_normalized,
      password_hash,
      name,
      email,
      email_normalized,
      role,
      status,
      is_default,
      created_at,
      last_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    DEFAULT_ADMIN_USERNAME,
    DEFAULT_ADMIN_USERNAME.toLowerCase(),
    passwordHash,
    DEFAULT_ADMIN_NAME,
    DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_EMAIL.toLowerCase(),
    DEFAULT_ROLE,
    DEFAULT_STATUS,
    1,
    timestamp,
    null
  );
};

if (!hasAnyUsers()) {
  createDefaultAdmin();
}

export { db };

export const ensureDefaultAdmin = () => {
  createDefaultAdmin();
};
