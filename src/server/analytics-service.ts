import fs from 'node:fs';
import path from 'node:path';

import type {
  AnalyticsMetric,
  AnalyticsSnapshot,
  EndpointAnalytics,
  EndpointStatus
} from '../admin/types.js';
import type { MediaAssetRecord, PlaylistRecord } from './media-library-service.js';
import { computeLibraryMetrics, listAssets, listPlaylists } from './media-library-service.js';
import type { EndpointRecord } from './endpoint-service.js';
import { listEndpoints } from './endpoint-service.js';

const ANALYTICS_STORE_PATH = path.resolve(
  process.env.ANALYTICS_DB_PATH ?? path.join('data', 'analytics.json')
);

type AnalyticsState = AnalyticsSnapshot;

let cachedState: AnalyticsState | null = null;

const cloneMetric = (metric: AnalyticsMetric): AnalyticsMetric => ({ ...metric });

const cloneEndpointAnalytics = (analytics: EndpointAnalytics): EndpointAnalytics => ({
  endpointId: analytics.endpointId,
  endpointName: analytics.endpointName,
  endpointSlug: analytics.endpointSlug,
  metrics: analytics.metrics.map(cloneMetric)
});

const defaultState = (): AnalyticsState => ({
  updatedAt: new Date(0).toISOString(),
  global: [],
  perEndpoint: []
});

const ensureStoreDirectory = () => {
  const directory = path.dirname(ANALYTICS_STORE_PATH);
  fs.mkdirSync(directory, { recursive: true });
};

const sanitizeMetric = (
  metric: Partial<AnalyticsMetric>,
  fallbackId: string,
  fallbackLabel: string
): AnalyticsMetric => {
  const id = typeof metric.id === 'string' && metric.id.trim().length > 0
    ? metric.id.trim()
    : fallbackId;
  const label = typeof metric.label === 'string' && metric.label.trim().length > 0
    ? metric.label.trim()
    : fallbackLabel;
  const value = typeof metric.value === 'number' && Number.isFinite(metric.value) ? metric.value : 0;
  const delta = typeof metric.delta === 'number' && Number.isFinite(metric.delta) ? metric.delta : 0;
  const unit = typeof metric.unit === 'string' && metric.unit.trim().length > 0 ? metric.unit.trim() : undefined;
  return { id, label, value, delta, unit };
};

const sanitizeEndpointAnalytics = (
  analytics: Partial<EndpointAnalytics> & {
    metrics?: Array<Partial<AnalyticsMetric>>;
  },
  index: number
): EndpointAnalytics => {
  const metrics = Array.isArray(analytics.metrics)
    ? analytics.metrics.map((metric, metricIndex) =>
        sanitizeMetric(metric, `metric-${metricIndex + 1}`, `Metric ${metricIndex + 1}`)
      )
    : [];

  const fallbackId = `endpoint-${index + 1}`;
  return {
    endpointId:
      typeof analytics.endpointId === 'string' && analytics.endpointId.trim().length > 0
        ? analytics.endpointId.trim()
        : fallbackId,
    endpointName:
      typeof analytics.endpointName === 'string' && analytics.endpointName.trim().length > 0
        ? analytics.endpointName.trim()
        : `Endpoint ${index + 1}`,
    endpointSlug:
      typeof analytics.endpointSlug === 'string' && analytics.endpointSlug.trim().length > 0
        ? analytics.endpointSlug.trim()
        : fallbackId,
    metrics
  };
};

const sanitizeState = (state: Partial<AnalyticsSnapshot>): AnalyticsState => {
  const global = Array.isArray(state.global)
    ? state.global.map((metric, index) =>
        sanitizeMetric(metric, `metric-${index + 1}`, `Metric ${index + 1}`)
      )
    : [];

  const perEndpoint = Array.isArray(state.perEndpoint)
    ? state.perEndpoint.map((entry, index) => sanitizeEndpointAnalytics(entry, index))
    : [];

  return {
    updatedAt: typeof state.updatedAt === 'string' ? state.updatedAt : new Date(0).toISOString(),
    global,
    perEndpoint
  };
};

const loadState = (): AnalyticsState => {
  if (cachedState) {
    return cachedState;
  }

  ensureStoreDirectory();

  if (!fs.existsSync(ANALYTICS_STORE_PATH)) {
    cachedState = defaultState();
    return cachedState;
  }

  try {
    const raw = fs.readFileSync(ANALYTICS_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AnalyticsSnapshot>;
    const state = sanitizeState(parsed);
    cachedState = state;
    return state;
  } catch (error) {
    cachedState = defaultState();
    return cachedState;
  }
};

const writeState = (state: AnalyticsState) => {
  ensureStoreDirectory();
  fs.writeFileSync(ANALYTICS_STORE_PATH, JSON.stringify(state, null, 2), 'utf8');
  cachedState = state;
};

const cloneSnapshot = (snapshot: AnalyticsSnapshot): AnalyticsSnapshot => ({
  updatedAt: snapshot.updatedAt,
  global: snapshot.global.map(cloneMetric),
  perEndpoint: snapshot.perEndpoint.map(cloneEndpointAnalytics)
});

const createMetric = (
  id: string,
  label: string,
  value: number,
  previousMetrics: Map<string, AnalyticsMetric>,
  unit?: string
): AnalyticsMetric => {
  const previous = previousMetrics.get(id);
  const delta = previous ? value - previous.value : 0;
  return { id, label, value, delta, unit };
};

const statusScore: Record<EndpointStatus, number> = {
  operational: 100,
  degraded: 55,
  pending: 20,
  disabled: 0
};

const hoursSince = (iso: string | null | undefined): number | null => {
  if (!iso) {
    return null;
  }

  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  const diff = Date.now() - timestamp;
  const hours = diff / (1000 * 60 * 60);
  return Math.max(0, Math.round(hours));
};

const buildAssetIndex = (assets: MediaAssetRecord[]) => {
  const index = new Map<string, MediaAssetRecord[]>();
  for (const asset of assets) {
    const list = index.get(asset.playlistId) ?? [];
    list.push(asset);
    index.set(asset.playlistId, list);
  }
  return index;
};

const createEndpointMetric = (
  endpointMetrics: Map<string, AnalyticsMetric>,
  id: string,
  label: string,
  value: number,
  unit?: string
): AnalyticsMetric => {
  const previous = endpointMetrics.get(id);
  const delta = previous ? value - previous.value : 0;
  return { id, label, value, delta, unit };
};

const generateGlobalMetrics = (previous: AnalyticsSnapshot): AnalyticsMetric[] => {
  const metrics = computeLibraryMetrics();
  const endpoints = listEndpoints();
  const previousMetrics = new Map(previous.global.map((metric) => [metric.id, metric]));

  const operational = endpoints.filter((endpoint) => endpoint.status === 'operational').length;
  const totalEndpoints = endpoints.length;

  return [
    createMetric('media-assets', 'Media assets', metrics.mediaAssets, previousMetrics),
    createMetric('published-playlists', 'Published playlists', metrics.publishedPlaylists, previousMetrics),
    createMetric('operational-endpoints', 'Operational endpoints', operational, previousMetrics),
    createMetric('total-endpoints', 'Total endpoints', totalEndpoints, previousMetrics)
  ];
};

const buildEndpointName = (endpoint: EndpointRecord, playlists: PlaylistRecord[]): string => {
  if (endpoint.name.trim().length > 0) {
    return endpoint.name;
  }

  const playlist = playlists.find((entry) => entry.id === endpoint.playlistId);
  return playlist ? `${playlist.name} stream` : 'Endpoint';
};

const generatePerEndpointAnalytics = (previous: AnalyticsSnapshot): EndpointAnalytics[] => {
  const endpoints = listEndpoints();
  const playlists = listPlaylists();
  const assets = listAssets();
  const assetIndex = buildAssetIndex(assets);
  const previousEndpoints = new Map(previous.perEndpoint.map((entry) => [entry.endpointId, entry]));

  return endpoints.map((endpoint, index) => {
    const previousEntry = previousEndpoints.get(endpoint.id);
    const previousMetrics = previousEntry
      ? new Map(previousEntry.metrics.map((metric) => [metric.id, metric]))
      : new Map<string, AnalyticsMetric>();
    const playlistAssets = endpoint.playlistId ? assetIndex.get(endpoint.playlistId) ?? [] : [];
    const trackCount = playlistAssets.length;
    const totalDurationSeconds = playlistAssets.reduce((sum, asset) => sum + (asset.durationSeconds ?? 0), 0);
    const runtimeMinutes = Math.round(totalDurationSeconds / 60);
    const score = statusScore[endpoint.status] ?? 0;
    const sinceSync = hoursSince(endpoint.lastSync);
    const latency = typeof endpoint.latencyMs === 'number' && Number.isFinite(endpoint.latencyMs)
      ? Math.round(endpoint.latencyMs)
      : null;

    const metrics: AnalyticsMetric[] = [
      createEndpointMetric(previousMetrics, 'track-count', 'Tracks available', trackCount),
      createEndpointMetric(previousMetrics, 'runtime-minutes', 'Runtime (min)', runtimeMinutes, 'm'),
      createEndpointMetric(previousMetrics, 'status-score', 'Status score', score)
    ];

    if (sinceSync !== null) {
      metrics.push(createEndpointMetric(previousMetrics, 'hours-since-sync', 'Hours since sync', sinceSync, 'h'));
    }

    if (latency !== null) {
      metrics.push(createEndpointMetric(previousMetrics, 'latency', 'Latency', latency, 'ms'));
    }

    return {
      endpointId: endpoint.id,
      endpointName: buildEndpointName(endpoint, playlists) ?? `Endpoint ${index + 1}`,
      endpointSlug: endpoint.slug,
      metrics
    };
  });
};

const buildSnapshot = (previous: AnalyticsSnapshot): AnalyticsSnapshot => {
  const global = generateGlobalMetrics(previous);
  const perEndpoint = generatePerEndpointAnalytics(previous);

  return {
    updatedAt: new Date().toISOString(),
    global,
    perEndpoint
  };
};

export const getAnalyticsSnapshot = (): AnalyticsSnapshot => {
  const previous = loadState();
  const snapshot = buildSnapshot(previous);
  writeState(snapshot);
  return cloneSnapshot(snapshot);
};

export const setAnalyticsSnapshot = (snapshot: AnalyticsSnapshot): AnalyticsSnapshot => {
  const sanitized = sanitizeState(snapshot);
  const nextState: AnalyticsState = {
    updatedAt: new Date().toISOString(),
    global: sanitized.global.map(cloneMetric),
    perEndpoint: sanitized.perEndpoint.map(cloneEndpointAnalytics)
  };
  writeState(nextState);
  return cloneSnapshot(nextState);
};

export const getAnalyticsMetrics = (): AnalyticsMetric[] => {
  return getAnalyticsSnapshot().global;
};

export const setAnalyticsMetrics = (metrics: AnalyticsMetric[]): AnalyticsMetric[] => {
  const sanitizedMetrics = metrics.map((metric, index) =>
    sanitizeMetric(metric, `metric-${index + 1}`, `Metric ${index + 1}`)
  );
  const current = loadState();
  const nextState: AnalyticsState = {
    updatedAt: new Date().toISOString(),
    global: sanitizedMetrics.map(cloneMetric),
    perEndpoint: current.perEndpoint.map(cloneEndpointAnalytics)
  };
  writeState(nextState);
  return nextState.global.map(cloneMetric);
};

export const resetAnalyticsMetrics = () => {
  cachedState = null;
  if (fs.existsSync(ANALYTICS_STORE_PATH)) {
    fs.rmSync(ANALYTICS_STORE_PATH, { force: true });
  }
};
