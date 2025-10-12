import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type PlaylistMediaType = 'music' | 'video';

export class LibraryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LibraryValidationError';
  }
}

export class LibraryNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LibraryNotFoundError';
  }
}

export interface PlaylistRecord {
  id: string;
  name: string;
  type: PlaylistMediaType;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAssetRecord {
  id: string;
  playlistId: string;
  type: PlaylistMediaType;
  title: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'ready' | 'processing' | 'error';
  durationSeconds: number;
  tags: string[];
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
  description?: string;
  artworkFilename?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MediaLibraryState {
  playlists: PlaylistRecord[];
  assets: MediaAssetRecord[];
}

const MEDIA_ROOT = path.resolve(process.env.MEDIA_ROOT ?? 'media');
const MEDIA_LIBRARY_DB_PATH = path.resolve(
  process.env.MEDIA_LIBRARY_DB_PATH ?? path.join('data', 'media-library.json')
);

export const mediaRootPath = MEDIA_ROOT;
export const mediaLibraryStorePath = MEDIA_LIBRARY_DB_PATH;

const ensureDirectory = (value: string) => {
  fs.mkdirSync(value, { recursive: true });
};

const artworkRoot = path.join(MEDIA_ROOT, 'artwork');

const ensureMediaRoot = () => {
  ensureDirectory(MEDIA_ROOT);
  ensureDirectory(path.join(MEDIA_ROOT, 'music'));
  ensureDirectory(path.join(MEDIA_ROOT, 'video'));
  ensureDirectory(artworkRoot);
};

let cachedState: MediaLibraryState | null = null;

const loadState = (): MediaLibraryState => {
  if (cachedState) {
    return cachedState;
  }

  ensureMediaRoot();

  if (!fs.existsSync(MEDIA_LIBRARY_DB_PATH)) {
    cachedState = { playlists: [], assets: [] };
    return cachedState;
  }

  try {
    const raw = fs.readFileSync(MEDIA_LIBRARY_DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<MediaLibraryState>;
    const playlists = Array.isArray(parsed.playlists) ? parsed.playlists : [];
    const assets = Array.isArray(parsed.assets) ? parsed.assets : [];
    cachedState = { playlists, assets };
    return cachedState;
  } catch (error) {
    cachedState = { playlists: [], assets: [] };
    return cachedState;
  }
};

const saveState = (state: MediaLibraryState) => {
  ensureDirectory(path.dirname(MEDIA_LIBRARY_DB_PATH));
  fs.writeFileSync(MEDIA_LIBRARY_DB_PATH, JSON.stringify(state, null, 2), 'utf8');
  cachedState = state;
};

export const findPlaylistById = (playlistId: string): PlaylistRecord | null => {
  const state = loadState();
  const playlist = state.playlists.find((entry) => entry.id === playlistId);
  return playlist ?? null;
};

const playlistDirectory = (playlist: PlaylistRecord) => {
  return path.join(MEDIA_ROOT, playlist.type, playlist.id);
};

const artworkDirectory = (playlist: PlaylistRecord) => {
  return path.join(artworkRoot, playlist.id);
};

const formatTimestamp = () => new Date().toISOString();

const mapAssetFilePath = (asset: MediaAssetRecord, playlist: PlaylistRecord) => {
  return path.join(playlistDirectory(playlist), asset.filename);
};

const mapAssetArtworkPath = (asset: MediaAssetRecord, playlist: PlaylistRecord) => {
  if (!asset.artworkFilename) {
    return null;
  }

  return path.join(artworkDirectory(playlist), asset.artworkFilename);
};

export const assetArtworkUrl = (asset: MediaAssetRecord): string | null => {
  if (!asset.artworkFilename) {
    return null;
  }

  return `/media/artwork/${asset.playlistId}/${asset.artworkFilename}`;
};

export const listPlaylists = (): PlaylistRecord[] => {
  const state = loadState();
  return state.playlists.map((entry) => ({ ...entry }));
};

export const listAssets = (): MediaAssetRecord[] => {
  const state = loadState();
  return state.assets.map((entry) => ({ ...entry }));
};

export interface CreatePlaylistInput {
  name: string;
  type: PlaylistMediaType;
}

export const createPlaylist = (input: CreatePlaylistInput): PlaylistRecord => {
  const name = input.name.trim();
  const type = input.type;

  if (!name) {
    throw new LibraryValidationError('Playlist name is required.');
  }

  if (type !== 'music' && type !== 'video') {
    throw new LibraryValidationError('Playlist type must be "music" or "video".');
  }

  const state = loadState();
  const timestamp = formatTimestamp();
  const playlist: PlaylistRecord = {
    id: randomUUID(),
    name,
    type,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  state.playlists = [playlist, ...state.playlists];

  ensureDirectory(playlistDirectory(playlist));
  ensureDirectory(artworkDirectory(playlist));
  saveState(state);

  return playlist;
};

export const updatePlaylist = (playlistId: string, updates: Partial<Pick<PlaylistRecord, 'name'>>) => {
  const state = loadState();
  const playlist = state.playlists.find((entry) => entry.id === playlistId);

  if (!playlist) {
    throw new LibraryNotFoundError('Playlist not found.');
  }

  if (updates.name !== undefined) {
    const name = updates.name.trim();
    if (!name) {
      throw new LibraryValidationError('Playlist name is required.');
    }

    playlist.name = name;
  }

  playlist.updatedAt = formatTimestamp();

  saveState(state);
  return { ...playlist };
};

export const deletePlaylist = (playlistId: string) => {
  const state = loadState();
  const playlist = state.playlists.find((entry) => entry.id === playlistId);
  if (!playlist) {
    throw new LibraryNotFoundError('Playlist not found.');
  }

  const playlistDir = playlistDirectory(playlist);
  const artworkDir = artworkDirectory(playlist);

  const assetsToRemove = state.assets.filter((asset) => asset.playlistId === playlistId);
  for (const asset of assetsToRemove) {
    const filePath = mapAssetFilePath(asset, playlist);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }

    const artworkPath = mapAssetArtworkPath(asset, playlist);
    if (artworkPath && fs.existsSync(artworkPath)) {
      fs.rmSync(artworkPath, { force: true });
    }
  }

  state.assets = state.assets.filter((asset) => asset.playlistId !== playlistId);
  state.playlists = state.playlists.filter((entry) => entry.id !== playlistId);
  saveState(state);

  if (fs.existsSync(playlistDir)) {
    fs.rmSync(playlistDir, { recursive: true, force: true });
  }

  if (fs.existsSync(artworkDir)) {
    fs.rmSync(artworkDir, { recursive: true, force: true });
  }
};

export interface CreateAssetInput {
  playlistId: string;
  files: Array<{
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
  }>;
}

export const createAssets = (input: CreateAssetInput): MediaAssetRecord[] => {
  const state = loadState();
  const playlist = state.playlists.find((entry) => entry.id === input.playlistId);

  if (!playlist) {
    throw new LibraryNotFoundError('Playlist not found.');
  }

  if (!Array.isArray(input.files) || input.files.length === 0) {
    throw new LibraryValidationError('Upload at least one file.');
  }

  const directory = playlistDirectory(playlist);
  ensureDirectory(directory);
  ensureDirectory(artworkDirectory(playlist));

  const createdAssets: MediaAssetRecord[] = [];
  for (const file of input.files) {
    const timestamp = formatTimestamp();
    const id = randomUUID();
    const extension = path.extname(file.originalName) || (playlist.type === 'music' ? '.mp3' : '.mp4');
    const filename = `${id}${extension}`;
    const filePath = path.join(directory, filename);

    fs.writeFileSync(filePath, file.buffer);

    const asset: MediaAssetRecord = {
      id,
      playlistId: playlist.id,
      type: playlist.type,
      title: path.parse(file.originalName).name,
      filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      status: 'ready',
      durationSeconds: 0,
      tags: [],
      artist: '',
      album: '',
      genre: '',
      year: '',
      description: '',
      artworkFilename: null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    state.assets.unshift(asset);
    createdAssets.push({ ...asset });
  }

  saveState(state);

  return createdAssets;
};

export interface UpdateAssetInput {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
  description?: string;
}

export const updateAsset = (assetId: string, updates: UpdateAssetInput): MediaAssetRecord => {
  const state = loadState();
  const asset = state.assets.find((entry) => entry.id === assetId);

  if (!asset) {
    throw new LibraryNotFoundError('Asset not found.');
  }

  if (updates.title !== undefined) {
    const title = updates.title.trim();
    if (!title) {
      throw new LibraryValidationError('Title is required.');
    }

    asset.title = title;
  }

  if (updates.artist !== undefined) {
    asset.artist = updates.artist.trim();
  }

  if (updates.album !== undefined) {
    asset.album = updates.album.trim();
  }

  if (updates.genre !== undefined) {
    asset.genre = updates.genre.trim();
  }

  if (updates.year !== undefined) {
    asset.year = updates.year.trim();
  }

  if (updates.description !== undefined) {
    asset.description = updates.description.trim();
  }

  asset.updatedAt = formatTimestamp();

  saveState(state);
  return { ...asset };
};

export const deleteAsset = (assetId: string) => {
  const state = loadState();
  const asset = state.assets.find((entry) => entry.id === assetId);

  if (!asset) {
    throw new LibraryNotFoundError('Asset not found.');
  }

  const playlist = findPlaylistById(asset.playlistId);
  if (playlist) {
    const filePath = mapAssetFilePath(asset, playlist);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }

    const artworkPath = mapAssetArtworkPath(asset, playlist);
    if (artworkPath && fs.existsSync(artworkPath)) {
      fs.rmSync(artworkPath, { force: true });
    }
  }

  state.assets = state.assets.filter((entry) => entry.id !== assetId);
  saveState(state);
};

export interface UpdateAssetArtworkInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  size: number;
}

const allowedArtworkMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const deriveArtworkExtension = (input: UpdateAssetArtworkInput) => {
  if (input.mimeType === 'image/jpeg') {
    return '.jpg';
  }

  if (input.mimeType === 'image/png') {
    return '.png';
  }

  if (input.mimeType === 'image/webp') {
    return '.webp';
  }

  if (input.mimeType === 'image/gif') {
    return '.gif';
  }

  const extension = path.extname(input.originalName).toLowerCase();
  if (extension) {
    return extension;
  }

  return '.jpg';
};

export const updateAssetArtwork = (
  assetId: string,
  file: UpdateAssetArtworkInput
): MediaAssetRecord => {
  if (!allowedArtworkMimeTypes.has(file.mimeType)) {
    throw new LibraryValidationError('Artwork must be a JPEG, PNG, GIF, or WebP image.');
  }

  const state = loadState();
  const asset = state.assets.find((entry) => entry.id === assetId);

  if (!asset) {
    throw new LibraryNotFoundError('Asset not found.');
  }

  const playlist = findPlaylistById(asset.playlistId);
  if (!playlist) {
    throw new LibraryNotFoundError('Playlist not found.');
  }

  ensureDirectory(artworkDirectory(playlist));

  const extension = deriveArtworkExtension(file);
  const filename = `${asset.id}${extension}`;
  const artworkPath = path.join(artworkDirectory(playlist), filename);

  fs.writeFileSync(artworkPath, file.buffer);

  asset.artworkFilename = filename;
  asset.updatedAt = formatTimestamp();
  saveState(state);

  return { ...asset };
};

export const removeAssetArtwork = (assetId: string): MediaAssetRecord => {
  const state = loadState();
  const asset = state.assets.find((entry) => entry.id === assetId);

  if (!asset) {
    throw new LibraryNotFoundError('Asset not found.');
  }

  const playlist = findPlaylistById(asset.playlistId);
  if (playlist && asset.artworkFilename) {
    const artworkPath = mapAssetArtworkPath(asset, playlist);
    if (artworkPath && fs.existsSync(artworkPath)) {
      fs.rmSync(artworkPath, { force: true });
    }
  }

  asset.artworkFilename = null;
  asset.updatedAt = formatTimestamp();
  saveState(state);

  return { ...asset };
};

export interface MediaLibraryMetrics {
  mediaAssets: number;
  mediaAssetsNew: number;
  publishedPlaylists: number;
  playlistsPending: number;
}

export const computeLibraryMetrics = (): MediaLibraryMetrics => {
  const state = loadState();
  const assets = state.assets.length;
  const publishedPlaylists = state.playlists.filter((playlist) =>
    state.assets.some((asset) => asset.playlistId === playlist.id)
  ).length;
  const playlistsPending = state.playlists.filter((playlist) =>
    !state.assets.some((asset) => asset.playlistId === playlist.id)
  ).length;

  return {
    mediaAssets: assets,
    mediaAssetsNew: Math.min(assets, 5),
    publishedPlaylists,
    playlistsPending
  };
};

export const resetMediaLibrary = () => {
  cachedState = null;
  if (fs.existsSync(MEDIA_LIBRARY_DB_PATH)) {
    fs.rmSync(MEDIA_LIBRARY_DB_PATH, { force: true });
  }
};
