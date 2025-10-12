import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsSnapshot } from '../../src/admin/types.js';

const createTempEnvironment = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-analytics-'));
  return {
    directory,
    analytics: path.join(directory, 'analytics.json'),
    mediaLibrary: path.join(directory, 'media-library.json'),
    mediaRoot: path.join(directory, 'media'),
    endpoints: path.join(directory, 'endpoints.json')
  };
};

describe('analytics-service', () => {
  let tempDir: string;

  beforeEach(() => {
    const paths = createTempEnvironment();
    tempDir = paths.directory;
    process.env.ANALYTICS_DB_PATH = paths.analytics;
    process.env.MEDIA_LIBRARY_DB_PATH = paths.mediaLibrary;
    process.env.MEDIA_ROOT = paths.mediaRoot;
    process.env.ENDPOINT_STORE_PATH = paths.endpoints;
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.ANALYTICS_DB_PATH;
    delete process.env.MEDIA_LIBRARY_DB_PATH;
    delete process.env.MEDIA_ROOT;
    delete process.env.ENDPOINT_STORE_PATH;
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('derives analytics metrics from the live library state', async () => {
    const mediaLibrary = await import('../../src/server/media-library-service.js');
    const endpoints = await import('../../src/server/endpoint-service.js');

    const playlist = mediaLibrary.createPlaylist({ name: 'Main Stage', type: 'music' });
    mediaLibrary.createAssets({
      playlistId: playlist.id,
      files: [
        {
          buffer: Buffer.from('audio'),
          originalName: 'intro.mp3',
          mimeType: 'audio/mpeg',
          size: 4
        }
      ]
    });

    const endpoint = endpoints.createEndpoint({ name: 'Stage Stream', playlistId: playlist.id });
    endpoints.updateEndpoint(endpoint.id, { status: 'operational', latencyMs: 120 });

    const service = await import('../../src/server/analytics-service.js');
    const snapshot = service.getAnalyticsSnapshot();

    expect(snapshot.global).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'media-assets', value: 1 }),
        expect.objectContaining({ id: 'published-playlists', value: 1 }),
        expect.objectContaining({ id: 'operational-endpoints', value: 1 }),
        expect.objectContaining({ id: 'total-endpoints', value: 1 })
      ])
    );

    const endpointAnalytics = snapshot.perEndpoint.find((entry) => entry.endpointId === endpoint.id);
    expect(endpointAnalytics).toBeDefined();
    expect(endpointAnalytics?.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'track-count', value: 1 }),
        expect.objectContaining({ id: 'status-score', value: 100 }),
        expect.objectContaining({ id: 'hours-since-sync', value: 0 })
      ])
    );
  });

  it('computes deltas relative to the previously stored snapshot', async () => {
    const mediaLibrary = await import('../../src/server/media-library-service.js');
    const endpoints = await import('../../src/server/endpoint-service.js');
    const service = await import('../../src/server/analytics-service.js');

    const playlist = mediaLibrary.createPlaylist({ name: 'Lobby', type: 'music' });
    mediaLibrary.createAssets({
      playlistId: playlist.id,
      files: [
        {
          buffer: Buffer.from('audio'),
          originalName: 'lobby.mp3',
          mimeType: 'audio/mpeg',
          size: 4
        }
      ]
    });

    const endpoint = endpoints.createEndpoint({ name: 'Lobby Stream', playlistId: playlist.id });
    endpoints.updateEndpoint(endpoint.id, { status: 'operational' });

    const initial = service.getAnalyticsSnapshot();
    const initialAssets = initial.global.find((metric) => metric.id === 'media-assets');
    expect(initialAssets?.delta).toBe(0);

    mediaLibrary.createAssets({
      playlistId: playlist.id,
      files: [
        {
          buffer: Buffer.from('audio2'),
          originalName: 'walk-in.mp3',
          mimeType: 'audio/mpeg',
          size: 8
        }
      ]
    });

    const next = service.getAnalyticsSnapshot();
    const mediaAssetsMetric = next.global.find((metric) => metric.id === 'media-assets');
    expect(mediaAssetsMetric?.value).toBe(2);
    expect(mediaAssetsMetric?.delta).toBe(1);
  });

  it('sanitizes manual snapshot updates before persisting', async () => {
    const service = await import('../../src/server/analytics-service.js');

    const updated = service.setAnalyticsSnapshot({
      updatedAt: new Date(0).toISOString(),
      global: [{ id: '', label: '', value: Number.NaN, delta: Number.NaN }],
      perEndpoint: [
        {
          endpointId: '',
          endpointName: '',
          endpointSlug: '',
          metrics: [{ id: '', label: '', value: Number.NaN, delta: Number.NaN, unit: '' }]
        }
      ]
    });

    expect(updated.global[0]).toMatchObject({ id: 'metric-1', label: 'Metric 1', value: 0, delta: 0 });
    expect(updated.perEndpoint[0]).toMatchObject({ endpointId: 'endpoint-1', endpointSlug: 'endpoint-1' });

    const raw = fs.readFileSync(process.env.ANALYTICS_DB_PATH!, 'utf8');
    const parsed = JSON.parse(raw) as AnalyticsSnapshot;
    expect(parsed.global[0]).toMatchObject({ id: 'metric-1', label: 'Metric 1', value: 0, delta: 0 });
  });
});
