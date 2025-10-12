import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { requireSession, type Session } from './session-store.js';

export interface AuthenticatedRequest extends Request {
  session?: Session;
}

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

export const extractBearerToken = (request: Request) => {
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

export const requireBearerToken = (request: Request) => {
  const token = extractBearerToken(request);
  if (!token) {
    throw new SessionError('Missing or invalid Authorization header.');
  }

  return token;
};

export const assertAuthenticated: RequestHandler = (request, _response, next) => {
  try {
    const token = requireBearerToken(request);
    const session = requireSession(token);
    (request as AuthenticatedRequest).session = session;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuthenticated = (handler: RequestHandler): RequestHandler => {
  return (request: Request, response: Response, next: NextFunction) => {
    try {
      assertAuthenticated(request, response, (error?: unknown) => {
        if (error) {
          next(error);
          return;
        }

        handler(request, response, next);
      });
    } catch (error) {
      next(error);
    }
  };
};
