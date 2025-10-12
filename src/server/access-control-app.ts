import fs from 'node:fs';
import path from 'node:path';

import cors from 'cors';
import express, { type Request } from 'express';
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
import { createMediaLibraryRouter } from './media-library-app.js';
import { extractBearerToken, requireBearerToken } from './http-auth.js';
import {
  findPlaylistById,
  listAssets,
  mediaRootPath,
  type MediaAssetRecord
} from './media-library-service.js';
import { findEndpointBySlug } from './endpoint-service.js';

const EMBED_TEMPLATE_PATH = path.resolve(process.cwd(), 'public/embed.html');
const isProduction = process.env.NODE_ENV === 'production';
let cachedEmbedTemplate: string | null = null;

const assetPlaybackUrl = (asset: MediaAssetRecord) => {
  const typeDirectory = asset.type === 'video' ? 'video' : 'music';
  return `/media/${typeDirectory}/${asset.playlistId}/${asset.filename}`;
};

const mapAssetToTrack = (asset: MediaAssetRecord) => ({
  id: asset.id,
  title: asset.title,
  artist: asset.artist ?? '',
  durationSeconds: asset.durationSeconds,
  src: assetPlaybackUrl(asset),
  mimeType: asset.mimeType
});

const readEmbedTemplate = () => {
  if (!isProduction || cachedEmbedTemplate === null) {
    cachedEmbedTemplate = fs.readFileSync(EMBED_TEMPLATE_PATH, 'utf8');
  }

  return cachedEmbedTemplate;
};

export const createAccessControlApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/media', express.static(mediaRootPath));

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
    const token = extractBearerToken(request);
    if (token) {
      deleteSession(token);
    }

    response.status(204).end();
  });

  app.get('/api/access/session', (request, response, next) => {
    try {
      const token = requireBearerToken(request);
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
      const token = requireBearerToken(request);
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
      const token = requireBearerToken(request);
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

  app.use('/api/library', createMediaLibraryRouter());

  app.get('/api/embed/:slug/stream', (request, response, next) => {
    try {
      const slug = (request.params.slug ?? '').trim();

      if (!slug) {
        response.status(404).json({ message: 'Endpoint not found.' });
        return;
      }

      const endpoint = findEndpointBySlug(slug);

      if (!endpoint) {
        response.status(404).json({ message: 'Endpoint not found.' });
        return;
      }

      const playlist = endpoint.playlistId ? findPlaylistById(endpoint.playlistId) : null;
      const shouldStream = endpoint.status === 'operational' || endpoint.status === 'degraded';
      const assets = shouldStream && playlist ? listAssets() : [];
      const tracks = shouldStream && playlist
        ? assets
            .filter((asset) => asset.playlistId === playlist.id && asset.status === 'ready')
            .map((asset) => mapAssetToTrack(asset))
        : [];

      response.json({
        endpoint: {
          name: endpoint.name,
          slug: endpoint.slug,
          status: endpoint.status,
          lastSync: endpoint.lastSync
        },
        playlist: playlist
          ? {
              id: playlist.id,
              name: playlist.name,
              type: playlist.type
            }
          : null,
        tracks
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/embed/:slug', (request, response, next) => {
    try {
      const slug = (request.params.slug ?? '').trim();

      if (!slug || !/^[A-Za-z0-9-]{3,64}$/.test(slug)) {
        response.status(404).send('Endpoint not found.');
        return;
      }

      const template = readEmbedTemplate();
      const html = template.replaceAll('%%ENDPOINT_SLUG%%', slug);

      response.type('html').send(html);
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        response.status(500).send('Embed template missing.');
        return;
      }

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

  return app;
};

export type AccessControlApp = ReturnType<typeof createAccessControlApp>;

