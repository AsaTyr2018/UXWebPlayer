import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { AdminUser } from '../admin/types.js';
import { db, ensureDefaultAdmin, type AdminUserRow } from './db.js';

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const normalize = (value: string) => value.trim().toLowerCase();

const mapRowToAdminUser = (row: AdminUserRow): AdminUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status,
  lastActive: row.last_active ?? 'Never'
});

const VALID_ROLES: AdminUser['role'][] = ['owner', 'admin', 'editor', 'viewer'];

const selectUserByUsername = db.prepare(`SELECT * FROM admin_users WHERE username_normalized = ?`);

const selectUserByEmail = db.prepare(`SELECT * FROM admin_users WHERE email_normalized = ?`);

const selectUserById = db.prepare(`SELECT * FROM admin_users WHERE id = ?`);

const selectUsers = db.prepare(`SELECT * FROM admin_users ORDER BY created_at DESC`);

const insertUser = db.prepare(
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
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NULL)`
);

const updateLastActive = db.prepare(`UPDATE admin_users SET last_active = ? WHERE id = ?`);

const countDefaultAdmins = db.prepare(`SELECT COUNT(*) as count FROM admin_users WHERE is_default = 1`);

const ensureAccountIsActive = (row: AdminUserRow) => {
  if (row.status !== 'active') {
    throw new AuthenticationError('Account is not active.');
  }
};

const validatePassword = (password: string) => {
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long.');
  }
};

const validateEmail = (email: string) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Enter a valid email address.');
  }
};

const validateUsername = (username: string) => {
  if (username.length < 3) {
    throw new ValidationError('Username must be at least 3 characters long.');
  }
};

const validateRole = (role: string) => {
  if (!VALID_ROLES.includes(role as AdminUser['role'])) {
    throw new ValidationError('Invalid role.');
  }
};

export const listAdminUsers = (): AdminUser[] => {
  ensureDefaultAdmin();
  const rows = selectUsers.all() as AdminUserRow[];
  return rows.map((row) => mapRowToAdminUser(row));
};

export const defaultAdminPresent = (): boolean => {
  const result = countDefaultAdmins.get() as { count: number } | undefined;
  return (result?.count ?? 0) > 0;
};

export const authenticateAdmin = (username: string, password: string) => {
  const normalizedUsername = normalize(username);
  const row = selectUserByUsername.get(normalizedUsername) as AdminUserRow | undefined;

  if (!row) {
    throw new AuthenticationError('Invalid credentials.');
  }

  ensureAccountIsActive(row);

  const passwordMatches = bcrypt.compareSync(password, row.password_hash);
  if (!passwordMatches) {
    throw new AuthenticationError('Invalid credentials.');
  }

  const timestamp = new Date().toISOString();
  updateLastActive.run(timestamp, row.id);

  const users = listAdminUsers();

  return {
    user: mapRowToAdminUser({ ...row, last_active: timestamp }),
    users,
    showDefaultAdminWarning: defaultAdminPresent()
  };
};

export interface CreateAdminInput {
  name: string;
  username: string;
  email: string;
  password: string;
  role?: AdminUser['role'];
}

export const createAdminUser = (input: CreateAdminInput) => {
  const name = input.name.trim();
  const username = input.username.trim();
  const email = input.email.trim();
  const role = input.role ?? 'admin';
  const password = input.password;

  if (!name) {
    throw new ValidationError('Name is required.');
  }

  validateUsername(username);
  validateEmail(email);
  validatePassword(password);
  validateRole(role);

  const normalizedUsername = normalize(username);
  const normalizedEmail = normalize(email);

  const existingUsername = selectUserByUsername.get(normalizedUsername) as AdminUserRow | undefined;
  if (existingUsername) {
    throw new ValidationError('Username already exists.');
  }

  const existingEmail = selectUserByEmail.get(normalizedEmail) as AdminUserRow | undefined;
  if (existingEmail) {
    throw new ValidationError('Email already exists.');
  }

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(password, 10);

  insertUser.run(
    id,
    username,
    normalizedUsername,
    passwordHash,
    name,
    email,
    normalizedEmail,
    role,
    'active',
    timestamp
  );

  const users = listAdminUsers();

  return {
    user: users.find((entry) => entry.id === id)!,
    users,
    showDefaultAdminWarning: defaultAdminPresent()
  };
};

export const getAdminUserById = (id: string): AdminUser | null => {
  const row = selectUserById.get(id) as AdminUserRow | undefined;
  if (!row) {
    return null;
  }

  return mapRowToAdminUser(row);
};
