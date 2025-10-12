import crypto from 'node:crypto';

export interface Session {
  token: string;
  userId: string;
  createdAt: number;
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

const sessions = new Map<string, Session>();

const isExpired = (session: Session) => Date.now() - session.createdAt > SESSION_TTL_MS;

export const createSession = (userId: string) => {
  const token = crypto.randomUUID();
  const session: Session = { token, userId, createdAt: Date.now() };
  sessions.set(token, session);
  return session;
};

export const getSession = (token: string) => {
  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  if (isExpired(session)) {
    sessions.delete(token);
    return null;
  }

  return session;
};

export const deleteSession = (token: string) => {
  sessions.delete(token);
};

export const requireSession = (token: string) => {
  const session = getSession(token);
  if (!session) {
    const error = new Error('Invalid session token.');
    error.name = 'SessionError';
    throw error;
  }

  return session;
};
