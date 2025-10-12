import express from 'express';
import multer from 'multer';
import type { Request } from 'express';
import {
  computeLibraryMetrics,
  createAssets,
  createPlaylist,
  deleteAsset,
  deletePlaylist,
  findPlaylistById,
  listAssets,
  listPlaylists,
  updateAsset,
  assetArtworkUrl,
  updateAssetArtwork,
  removeAssetArtwork,
  updatePlaylist,
  LibraryNotFoundError,
  LibraryValidationError,
  type MediaAssetRecord,
  type PlaylistMediaType
} from './media-library-service.js';
import {
  createEndpoint,
  deleteEndpoint,
  getEndpointById,
  listEndpoints,
  updateEndpoint,
  EndpointNotFoundError,
  EndpointValidationError
} from './endpoint-service.js';
import type { EndpointStatus } from '../admin/types.js';
import { assertAuthenticated } from './http-auth.js';
import { getAnalyticsSnapshot } from './analytics-service.js';
import { getBrandingSettings, updateBrandingSettings } from './branding-service.js';
import type { BrandingSettings } from '../admin/types.js';
import {
  DEFAULT_ENDPOINT_PLAYER_VARIANT,
  DEFAULT_ENDPOINT_VISUALIZER_SETTINGS,
  isEndpointPlayerVariant,
  normalizeEndpointVisualizerSettings,
  type EndpointPlayerVariant,
  type EndpointVisualizerSettings
} from '../types/endpoint.js';

const upload = multer({ storage: multer.memoryStorage() });

const handleLibraryError = (
  error: unknown,
  response: express.Response,
  next: express.NextFunction
) => {
  if (error instanceof LibraryValidationError) {
    response.status(400).json({ message: error.message });
    return;
  }

  if (error instanceof LibraryNotFoundError) {
    response.status(404).json({ message: error.message });
    return;
  }

  next(error);
};

const handleEndpointError = (
  error: unknown,
  response: express.Response,
  next: express.NextFunction
) => {
  if (error instanceof EndpointValidationError) {
    response.status(400).json({ message: error.message });
    return;
  }

  if (error instanceof EndpointNotFoundError) {
    response.status(404).json({ message: error.message });
    return;
  }

  next(error);
};

const formatType = (type: PlaylistMediaType): 'music' | 'video' => {
  return type === 'video' ? 'video' : 'music';
};

const mapAssetToResponse = (asset: MediaAssetRecord) => ({
  id: asset.id,
  playlistId: asset.playlistId,
  type: formatType(asset.type),
  title: asset.title,
  durationSeconds: asset.durationSeconds,
  tags: asset.tags,
  status: asset.status,
  updatedAt: asset.updatedAt,
  artist: asset.artist ?? '',
  album: asset.album ?? '',
  genre: asset.genre ?? '',
  year: asset.year ?? '',
  description: asset.description ?? '',
  size: asset.size,
  originalName: asset.originalName,
  artworkUrl: assetArtworkUrl(asset)
});

const mapEndpointToResponse = (endpoint: ReturnType<typeof listEndpoints>[number]) => ({
  id: endpoint.id,
  name: endpoint.name,
  slug: endpoint.slug,
  playlistId: endpoint.playlistId,
  playerVariant: endpoint.playerVariant,
  visualizer: endpoint.visualizer,
  status: endpoint.status,
  lastSync: endpoint.lastSync ?? 'Never',
  latencyMs: endpoint.latencyMs ?? undefined
});

const normalizePlaylistId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizePlayerVariant = (value: unknown): EndpointPlayerVariant => {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_ENDPOINT_PLAYER_VARIANT;
  }

  if (typeof value !== 'string') {
    throw new EndpointValidationError('Invalid player variant.');
  }

  const candidate = value.trim();

  if (isEndpointPlayerVariant(candidate)) {
    return candidate;
  }

  throw new EndpointValidationError('Invalid player variant.');
};

const normalizeVisualizerSettingsInput = (value: unknown): EndpointVisualizerSettings => {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_ENDPOINT_VISUALIZER_SETTINGS;
  }

  if (typeof value === 'string') {
    return normalizeEndpointVisualizerSettings({ mode: value });
  }

  if (typeof value === 'object') {
    return normalizeEndpointVisualizerSettings(value);
  }

  throw new EndpointValidationError('Invalid visualizer configuration.');
};

const assertPlaylistExists = (playlistId: string | null) => {
  if (!playlistId) {
    return;
  }

  const playlist = findPlaylistById(playlistId);
  if (!playlist) {
    throw new EndpointValidationError('Assigned playlist not found.');
  }
};

export const createMediaLibraryRouter = () => {
  const router = express.Router();

  router.use(assertAuthenticated as express.RequestHandler);

  router.get('/state', (_request, response) => {
    const playlists = listPlaylists();
    const assets = listAssets();
    const endpoints = listEndpoints();
    const metrics = computeLibraryMetrics();

    const endpointAssignments = new Map<string, number>();
    for (const endpoint of endpoints) {
      if (endpoint.playlistId) {
        const current = endpointAssignments.get(endpoint.playlistId) ?? 0;
        endpointAssignments.set(endpoint.playlistId, current + 1);
      }
    }

    const activeEndpoints = endpoints.filter((endpoint) => endpoint.status === 'operational').length;
    const endpointsPending = endpoints.filter((endpoint) => endpoint.status === 'pending').length;

    response.json({
      metrics: {
        mediaAssets: metrics.mediaAssets,
        mediaAssetsNew: metrics.mediaAssetsNew,
        publishedPlaylists: metrics.publishedPlaylists,
        playlistsPending: metrics.playlistsPending,
        activeEndpoints,
        endpointsPending,
        playbackErrors: 0,
        errorDelta: 0
      },
      playlists: playlists.map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
        type: formatType(playlist.type),
        status: assets.some((asset) => asset.playlistId === playlist.id) ? 'published' : 'needs_media',
        updatedAt: playlist.updatedAt,
        createdAt: playlist.createdAt,
        owner: 'System',
        itemCount: assets.filter((asset) => asset.playlistId === playlist.id).length,
        endpointCount: endpointAssignments.get(playlist.id) ?? 0
      })),
      endpoints: endpoints.map(mapEndpointToResponse),
      mediaLibrary: assets.map(mapAssetToResponse),
      analytics: getAnalyticsSnapshot(),
      branding: getBrandingSettings()
    });
  });

  router.patch('/branding', (request, response, next) => {
    try {
      const body = request.body;

      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        response.status(400).json({ message: 'Branding payload must be an object.' });
        return;
      }

      const updates = body as Partial<BrandingSettings>;
      const branding = updateBrandingSettings(updates);
      response.json({ branding });
    } catch (error) {
      next(error);
    }
  });

  router.post('/playlists', (request, response, next) => {
    try {
      const { name, type } = request.body ?? {};
      const playlist = createPlaylist({ name, type });
      response.status(201).json({
        playlist: {
          id: playlist.id,
          name: playlist.name,
          type: formatType(playlist.type),
          status: 'needs_media',
          updatedAt: playlist.updatedAt,
          createdAt: playlist.createdAt,
          owner: 'System',
          itemCount: 0,
          endpointCount: 0
        }
      });
    } catch (error) {
      handleLibraryError(error, response, next);
    }
  });

  router.patch('/playlists/:playlistId', (request, response, next) => {
    try {
      const { playlistId } = request.params;
      const { name } = request.body ?? {};
      const playlist = updatePlaylist(playlistId, { name });
      const assets = listAssets();
      response.json({
        playlist: {
          id: playlist.id,
          name: playlist.name,
          type: formatType(playlist.type),
          status: assets.some((asset) => asset.playlistId === playlist.id) ? 'published' : 'needs_media',
          updatedAt: playlist.updatedAt,
          createdAt: playlist.createdAt,
          owner: 'System',
          itemCount: assets.filter((asset) => asset.playlistId === playlist.id).length,
          endpointCount: 0
        }
      });
    } catch (error) {
      handleLibraryError(error, response, next);
    }
  });

  router.delete('/playlists/:playlistId', (request, response, next) => {
    try {
      const { playlistId } = request.params;
      deletePlaylist(playlistId);
      response.status(204).end();
    } catch (error) {
      handleLibraryError(error, response, next);
    }
  });

  router.post('/endpoints', (request, response, next) => {
    try {
      const { name, playlistId, playerVariant, visualizer } = request.body ?? {};
      if (typeof name !== 'string') {
        throw new EndpointValidationError('Endpoint name is required.');
      }

      const normalizedPlaylistId = normalizePlaylistId(playlistId);
      assertPlaylistExists(normalizedPlaylistId);

      const endpoint = createEndpoint({
        name,
        playlistId: normalizedPlaylistId,
        playerVariant: normalizePlayerVariant(playerVariant),
        visualizer: normalizeVisualizerSettingsInput(visualizer)
      });
      response.status(201).json({ endpoint: mapEndpointToResponse(endpoint) });
    } catch (error) {
      handleEndpointError(error, response, next);
    }
  });

  router.patch('/endpoints/:endpointId', (request, response, next) => {
    try {
      const { endpointId } = request.params;
      const existing = getEndpointById(endpointId);
      if (!existing) {
        throw new EndpointNotFoundError('Endpoint not found.');
      }

      const updates: Parameters<typeof updateEndpoint>[1] = {};
      const { name, playlistId, status, playerVariant, visualizer } = request.body ?? {};

      if (name !== undefined) {
        if (typeof name !== 'string') {
          throw new EndpointValidationError('Endpoint name must be a string.');
        }

        updates.name = name;
      }

      if (playlistId !== undefined) {
        const normalizedPlaylistId = normalizePlaylistId(playlistId);
        assertPlaylistExists(normalizedPlaylistId);
        updates.playlistId = normalizedPlaylistId;
      }

      if (playerVariant !== undefined) {
        updates.playerVariant = normalizePlayerVariant(playerVariant);
      }

      if (visualizer !== undefined) {
        updates.visualizer = normalizeVisualizerSettingsInput(visualizer);
      }

      if (status !== undefined) {
        if (typeof status !== 'string') {
          throw new EndpointValidationError('Invalid endpoint status.');
        }

        const normalizedStatus = status.trim();
        const allowedStatuses: EndpointStatus[] = ['operational', 'degraded', 'pending', 'disabled'];
        if (!allowedStatuses.includes(normalizedStatus as EndpointStatus)) {
          throw new EndpointValidationError('Invalid endpoint status.');
        }

        if (normalizedStatus === 'operational') {
          const playlistCandidate =
            updates.playlistId !== undefined ? updates.playlistId : existing.playlistId;

          if (!playlistCandidate) {
            throw new EndpointValidationError('Assign a playlist before activating an endpoint.');
          }

          assertPlaylistExists(playlistCandidate);
        }

        updates.status = normalizedStatus as EndpointStatus;
      }

      const endpoint = updateEndpoint(endpointId, updates);
      response.json({ endpoint: mapEndpointToResponse(endpoint) });
    } catch (error) {
      handleEndpointError(error, response, next);
    }
  });

  router.delete('/endpoints/:endpointId', (request, response, next) => {
    try {
      const { endpointId } = request.params;
      deleteEndpoint(endpointId);
      response.status(204).end();
    } catch (error) {
      handleEndpointError(error, response, next);
    }
  });

  router.post(
    '/playlists/:playlistId/assets',
    upload.array('files'),
    (request, response, next) => {
      try {
        const { playlistId } = request.params;
        const files = (request.files ?? []) as Express.Multer.File[];
        const created = createAssets({
          playlistId,
          files: files.map((file) => ({
            buffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size
          }))
        });

        response.status(201).json({
          assets: created.map(mapAssetToResponse)
        });
      } catch (error) {
        handleLibraryError(error, response, next);
      }
    }
  );

  router.patch('/assets/:assetId', (request, response, next) => {
    try {
      const { assetId } = request.params;
      const asset = updateAsset(assetId, request.body ?? {});
      response.json({ asset: mapAssetToResponse(asset) });
    } catch (error) {
      handleLibraryError(error, response, next);
    }
  });

  router.post(
    '/assets/:assetId/artwork',
    upload.single('artwork'),
    (request, response, next) => {
      try {
        const { assetId } = request.params;
        const file = request.file;
        if (!file) {
          response.status(400).json({ message: 'Artwork file is required.' });
          return;
        }

        const asset = updateAssetArtwork(assetId, {
          buffer: file.buffer,
          mimeType: file.mimetype,
          originalName: file.originalname,
          size: file.size
        });

        response.json({ asset: mapAssetToResponse(asset) });
      } catch (error) {
        handleLibraryError(error, response, next);
      }
    }
  );

  router.delete('/assets/:assetId/artwork', (request, response, next) => {
    try {
      const { assetId } = request.params;
      const asset = removeAssetArtwork(assetId);
      response.json({ asset: mapAssetToResponse(asset) });
    } catch (error) {
      handleLibraryError(error, response, next);
    }
  });

  router.delete('/assets/:assetId', (request, response, next) => {
    try {
      const { assetId } = request.params;
      deleteAsset(assetId);
      response.status(204).end();
    } catch (error) {
      handleLibraryError(error, response, next);
    }
  });

  return router;
};

export type MediaLibraryRouter = ReturnType<typeof createMediaLibraryRouter>;
