import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'media-library-service-'));
const customMediaRoot = path.join(tempRoot, 'media-root');
const customStorePath = path.join(tempRoot, 'store', 'media-library.json');

process.env.MEDIA_ROOT = customMediaRoot;
process.env.MEDIA_LIBRARY_DB_PATH = customStorePath;

type MediaLibraryModule = typeof import('../../src/server/media-library-service.js');

let mediaService: MediaLibraryModule;

const ensureCleanState = () => {
  if (mediaService) {
    mediaService.resetMediaLibrary();
  }
  fs.rmSync(customMediaRoot, { recursive: true, force: true });
  fs.rmSync(path.dirname(customStorePath), { recursive: true, force: true });
};

describe('media-library-service', () => {
  beforeAll(async () => {
    mediaService = await import('../../src/server/media-library-service.js');
    ensureCleanState();
  });

  beforeEach(() => {
    ensureCleanState();
  });

  afterEach(() => {
    ensureCleanState();
  });

  afterAll(() => {
    ensureCleanState();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const readMediaFile = (playlistId: string, filename: string, type: 'music' | 'video') => {
    const filePath = path.join(customMediaRoot, type, playlistId, filename);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  };

  it('creates playlists with trimmed names and prepares directories', () => {
    const playlist = mediaService.createPlaylist({ name: '  Chill Mix  ', type: 'music' });

    expect(playlist.name).toBe('Chill Mix');
    expect(mediaService.listPlaylists().map((entry) => entry.id)).toContain(playlist.id);
    expect(mediaService.mediaRootPath).toBe(customMediaRoot);
    expect(fs.existsSync(mediaService.mediaRootPath)).toBe(true);

    const playlistDir = path.join(customMediaRoot, 'music', playlist.id);
    expect(fs.existsSync(playlistDir)).toBe(true);
  });

  it('stores uploaded assets under the playlist directory', () => {
    const playlist = mediaService.createPlaylist({ name: 'Uploads', type: 'music' });

    const [firstAsset, secondAsset] = mediaService.createAssets({
      playlistId: playlist.id,
      files: [
        {
          buffer: Buffer.from('first-track'),
          originalName: 'track-one.mp3',
          mimeType: 'audio/mpeg',
          size: 1024
        },
        {
          buffer: Buffer.from('second-track'),
          originalName: 'track-two.mp3',
          mimeType: 'audio/mpeg',
          size: 2048
        }
      ]
    });

    expect(firstAsset.playlistId).toBe(playlist.id);
    expect(secondAsset.playlistId).toBe(playlist.id);

    const storedAssets = mediaService.listAssets();
    expect(storedAssets.length).toBe(2);
    expect(readMediaFile(playlist.id, firstAsset.filename, playlist.type)).toBe('first-track');
    expect(readMediaFile(playlist.id, secondAsset.filename, playlist.type)).toBe('second-track');
    expect(firstAsset.artworkFilename).toBeNull();
  });

  it('stores and removes artwork files for an asset', () => {
    const playlist = mediaService.createPlaylist({ name: 'Artwork', type: 'music' });
    const [asset] = mediaService.createAssets({
      playlistId: playlist.id,
      files: [
        {
          buffer: Buffer.from('artwork-audio'),
          originalName: 'artwork.mp3',
          mimeType: 'audio/mpeg',
          size: 1234
        }
      ]
    });

    const imageBuffer = Buffer.from('fake-image-bytes');
    const updated = mediaService.updateAssetArtwork(asset.id, {
      buffer: imageBuffer,
      mimeType: 'image/png',
      originalName: 'cover.png',
      size: imageBuffer.length
    });

    expect(updated.artworkFilename).toMatch(/\.png$/);

    const artworkPath = path.join(customMediaRoot, 'artwork', playlist.id, updated.artworkFilename ?? '');
    expect(fs.existsSync(artworkPath)).toBe(true);

    const cleared = mediaService.removeAssetArtwork(asset.id);
    expect(cleared.artworkFilename).toBeNull();
    expect(fs.existsSync(artworkPath)).toBe(false);
  });

  it('updates asset metadata with trimmed values', () => {
    const playlist = mediaService.createPlaylist({ name: 'Metadata', type: 'music' });
    const [asset] = mediaService.createAssets({
      playlistId: playlist.id,
      files: [
        {
          buffer: Buffer.from('metadata-track'),
          originalName: 'metadata-track.mp3',
          mimeType: 'audio/mpeg',
          size: 512
        }
      ]
    });

    const updated = mediaService.updateAsset(asset.id, {
      title: '  Updated Title  ',
      artist: '  Artist Name  ',
      album: '  Album Name  ',
      genre: '  Electronic  ',
      year: ' 2024 ',
      description: '  Energetic mix  '
    });

    expect(updated.title).toBe('Updated Title');
    expect(updated.artist).toBe('Artist Name');
    expect(updated.album).toBe('Album Name');
    expect(updated.genre).toBe('Electronic');
    expect(updated.year).toBe('2024');
    expect(updated.description).toBe('Energetic mix');

    const stored = mediaService.listAssets().find((entry) => entry.id === asset.id);
    expect(stored?.title).toBe('Updated Title');
    expect(stored?.artist).toBe('Artist Name');
  });

  it('deletes assets and removes files from disk', () => {
    const playlist = mediaService.createPlaylist({ name: 'Deletions', type: 'music' });
    const [asset] = mediaService.createAssets({
      playlistId: playlist.id,
      files: [
        {
          buffer: Buffer.from('to-delete'),
          originalName: 'delete-me.mp3',
          mimeType: 'audio/mpeg',
          size: 256
        }
      ]
    });

    const filePath = path.join(customMediaRoot, playlist.type, playlist.id, asset.filename);
    expect(fs.existsSync(filePath)).toBe(true);

    mediaService.deleteAsset(asset.id);

    expect(fs.existsSync(filePath)).toBe(false);
    expect(mediaService.listAssets()).toHaveLength(0);
  });

  it('deletes playlists and cascades to nested assets and directories', () => {
    const playlist = mediaService.createPlaylist({ name: 'Cascade', type: 'video' });
    const [asset] = mediaService.createAssets({
      playlistId: playlist.id,
      files: [
        {
          buffer: Buffer.from('video-bytes'),
          originalName: 'clip-one.mp4',
          mimeType: 'video/mp4',
          size: 4096
        }
      ]
    });

    const directory = path.join(customMediaRoot, playlist.type, playlist.id);
    const assetPath = path.join(directory, asset.filename);
    expect(fs.existsSync(assetPath)).toBe(true);

    mediaService.deletePlaylist(playlist.id);

    expect(fs.existsSync(directory)).toBe(false);
    expect(mediaService.listPlaylists()).toHaveLength(0);
    expect(mediaService.listAssets()).toHaveLength(0);
  });

  it('computes metrics for published and pending playlists', () => {
    const published = mediaService.createPlaylist({ name: 'Published', type: 'music' });
    const pending = mediaService.createPlaylist({ name: 'Pending', type: 'music' });

    mediaService.createAssets({
      playlistId: published.id,
      files: [
        {
          buffer: Buffer.from('published-track'),
          originalName: 'published-track.mp3',
          mimeType: 'audio/mpeg',
          size: 128
        }
      ]
    });

    const metrics = mediaService.computeLibraryMetrics();
    expect(metrics.mediaAssets).toBe(1);
    expect(metrics.mediaAssetsNew).toBe(1);
    expect(metrics.publishedPlaylists).toBe(1);
    expect(metrics.playlistsPending).toBe(1);
  });

  it('validates playlist and asset operations with helpful errors', () => {
    expect(() => mediaService.createPlaylist({ name: '   ', type: 'music' })).toThrow(mediaService.LibraryValidationError);

    expect(() =>
      mediaService.createAssets({
        playlistId: 'missing-playlist',
        files: [
          {
            buffer: Buffer.from('no-playlist'),
            originalName: 'missing.mp3',
            mimeType: 'audio/mpeg',
            size: 64
          }
        ]
      })
    ).toThrow(mediaService.LibraryNotFoundError);

    const playlist = mediaService.createPlaylist({ name: 'Validation', type: 'music' });

    expect(() =>
      mediaService.createAssets({
        playlistId: playlist.id,
        files: []
      })
    ).toThrow(mediaService.LibraryValidationError);

    const [asset] = mediaService.createAssets({
      playlistId: playlist.id,
      files: [
        {
          buffer: Buffer.from('valid-track'),
          originalName: 'valid.mp3',
          mimeType: 'audio/mpeg',
          size: 64
        }
      ]
    });

    expect(() => mediaService.updateAsset(asset.id, { title: '   ' })).toThrow(mediaService.LibraryValidationError);
    expect(() => mediaService.updateAsset('missing', { title: 'example' })).toThrow(mediaService.LibraryNotFoundError);
    expect(() => mediaService.deleteAsset('missing')).toThrow(mediaService.LibraryNotFoundError);
    expect(() => mediaService.deletePlaylist('missing')).toThrow(mediaService.LibraryNotFoundError);
  });
});
