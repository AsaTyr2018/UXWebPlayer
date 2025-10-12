import express from 'express';
import multer from 'multer';
import type { Request } from 'express';
import {
  computeLibraryMetrics,
  createAssets,
  createPlaylist,
  deleteAsset,
  deletePlaylist,
  listAssets,
  listPlaylists,
  updateAsset,
  updatePlaylist,
  LibraryNotFoundError,
  LibraryValidationError,
  type MediaAssetRecord,
  type PlaylistMediaType
} from './media-library-service.js';
import { assertAuthenticated } from './http-auth.js';

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
  originalName: asset.originalName
});

export const createMediaLibraryRouter = () => {
  const router = express.Router();

  router.use(assertAuthenticated as express.RequestHandler);

  router.get('/state', (_request, response) => {
    const playlists = listPlaylists();
    const assets = listAssets();
    const metrics = computeLibraryMetrics();

    response.json({
      metrics: {
        mediaAssets: metrics.mediaAssets,
        mediaAssetsNew: metrics.mediaAssetsNew,
        publishedPlaylists: metrics.publishedPlaylists,
        playlistsPending: metrics.playlistsPending,
        activeEndpoints: 0,
        endpointsPending: 0,
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
        endpointCount: 0
      })),
      mediaLibrary: assets.map(mapAssetToResponse)
    });
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
