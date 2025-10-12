import cors from 'cors';
import express from 'express';
import type { Request } from 'express';
import {
  AuthenticationError,
  ValidationError,
  authenticateAdmin,
  createAdminUser,
  defaultAdminPresent,
  getAdminUserById,
  listAdminUsers
} from './access-control-service.js';
import { createSession, deleteSession, requireSession } from './session-store.js';

const app = express();
app.use(cors());
app.use(express.json());

const extractToken = (request: Request) => {
  const header = request.get('authorization');
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
};

const requireToken = (request: Request) => {
  const token = extractToken(request);
  if (!token) {
    const error = new Error('Missing or invalid Authorization header.');
    error.name = 'SessionError';
    throw error;
  }

  return token;
};

app.post('/api/access/login', (request, response, next) => {
  try {
    const { username, password } = request.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new ValidationError('Username and password are required.');
    }

    const result = authenticateAdmin(username, password);
    const session = createSession(result.user.id);

    response.json({
      token: session.token,
      user: result.user,
      users: result.users,
      showDefaultAdminWarning: result.showDefaultAdminWarning
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/access/logout', (request, response) => {
  const token = extractToken(request);
  if (token) {
    deleteSession(token);
  }

  response.status(204).end();
});

app.get('/api/access/session', (request, response, next) => {
  try {
    const token = requireToken(request);
    const session = requireSession(token);
    const user = getAdminUserById(session.userId);

    if (!user) {
      deleteSession(token);
      response.status(401).json({ message: 'Session expired.' });
      return;
    }

    response.json({
      user,
      users: listAdminUsers(),
      showDefaultAdminWarning: defaultAdminPresent()
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/access/users', (request, response, next) => {
  try {
    const token = requireToken(request);
    requireSession(token);

    response.json({
      users: listAdminUsers(),
      showDefaultAdminWarning: defaultAdminPresent()
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/access/users', (request, response, next) => {
  try {
    const token = requireToken(request);
    requireSession(token);

    const { name, username, email, password, role } = request.body ?? {};
    if (
      typeof name !== 'string' ||
      typeof username !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      throw new ValidationError('Name, username, email, and password are required.');
    }

    const result = createAdminUser({ name, username, email, password, role });

    response.status(201).json({
      user: result.user,
      users: result.users,
      showDefaultAdminWarning: result.showDefaultAdminWarning
    });
  } catch (error) {
    next(error);
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: any, _request: Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ValidationError) {
    response.status(400).json({ message: error.message });
    return;
  }

  if (error instanceof AuthenticationError) {
    response.status(401).json({ message: error.message });
    return;
  }

  if (error?.name === 'SessionError') {
    response.status(401).json({ message: error.message ?? 'Invalid session token.' });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(error);
  response.status(500).json({ message: 'Unexpected server error.' });
});

const port = Number.parseInt(process.env.PORT ?? '4000', 10);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Access control API listening on http://0.0.0.0:${port}`);
});
