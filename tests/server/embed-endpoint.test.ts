import fs from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createAccessControlApp } from '../../src/server/access-control-app.js';
import {
  createPlaylist,
  createAssets,
  resetMediaLibrary,
  mediaRootPath
} from '../../src/server/media-library-service.js';
import {
  createEndpoint,
  updateEndpoint,
  resetEndpointStore
} from '../../src/server/endpoint-service.js';

describe('embed endpoints', () => {
  beforeEach(() => {
    resetMediaLibrary();
    resetEndpointStore();
    if (fs.existsSync(mediaRootPath)) {
      fs.rmSync(mediaRootPath, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(mediaRootPath)) {
      fs.rmSync(mediaRootPath, { recursive: true, force: true });
    }
    resetMediaLibrary();
    resetEndpointStore();
  });

  it('returns the embed player shell for a valid slug', async () => {
    const app = createAccessControlApp();
    const response = await request(app).get('/embed/123456789');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain("window.__UX_EMBED_SLUG__ = '123456789'");
    expect(response.text).not.toContain('<ux-admin-app>');
  });

  it('returns 404 for invalid slugs', async () => {
    const app = createAccessControlApp();
    const response = await request(app).get('/embed/../../etc/passwd');

    expect(response.status).toBe(404);
  });

  it('returns playlist metadata and tracks for operational endpoints', async () => {
    const playlist = createPlaylist({ name: 'In-Store', type: 'music' });
    createAssets({
      playlistId: playlist.id,
      files: [
        {
          buffer: Buffer.from('test-audio'),
          originalName: 'warmup.mp3',
          mimeType: 'audio/mpeg',
          size: 10
        }
      ]
    });
    const endpoint = createEndpoint({ name: 'Lobby', playlistId: playlist.id });
    updateEndpoint(endpoint.id, { status: 'operational' });

    const app = createAccessControlApp();
    const response = await request(app).get(`/api/embed/${endpoint.slug}/stream`);

    expect(response.status).toBe(200);
    expect(response.body.endpoint.status).toBe('operational');
    expect(response.body.playlist.name).toBe('In-Store');
    expect(response.body.tracks).toHaveLength(1);
    expect(response.body.tracks[0]).toMatchObject({
      title: 'warmup',
      mimeType: 'audio/mpeg'
    });
    expect(response.body.tracks[0].src).toMatch(/\/media\/music\//);
  });

  it('returns an empty track list when the endpoint is pending activation', async () => {
    const playlist = createPlaylist({ name: 'Preview', type: 'music' });
    const endpoint = createEndpoint({ name: 'Booth', playlistId: playlist.id });

    const app = createAccessControlApp();
    const response = await request(app).get(`/api/embed/${endpoint.slug}/stream`);

    expect(response.status).toBe(200);
    expect(response.body.endpoint.status).toBe('pending');
    expect(response.body.tracks).toEqual([]);
  });

  it('returns 404 when the endpoint slug is unknown', async () => {
    const app = createAccessControlApp();
    const response = await request(app).get('/api/embed/unknown-slug/stream');

    expect(response.status).toBe(404);
  });
});
