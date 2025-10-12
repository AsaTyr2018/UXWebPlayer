import fs from 'node:fs';
import path from 'node:path';

import type { AnalyticsMetric } from '../admin/types.js';

const DEFAULT_ANALYTICS_METRICS: AnalyticsMetric[] = [
  {
    id: 'streams-24h',
    label: 'Streams (24h)',
    value: 4280,
    delta: 12
  },
  {
    id: 'unique-listeners',
    label: 'Unique listeners',
    value: 1268,
    delta: 5
  },
  {
    id: 'completion-rate',
    label: 'Completion rate',
    value: 78,
    delta: -3,
    unit: '%'
  },
  {
    id: 'avg-session-length',
    label: 'Avg. session length',
    value: 32,
    delta: 8,
    unit: 'm'
  }
];

const ANALYTICS_STORE_PATH = path.resolve(
  process.env.ANALYTICS_DB_PATH ?? path.join('data', 'analytics.json')
);

type AnalyticsState = {
  metrics: AnalyticsMetric[];
  updatedAt: string;
};

let cachedState: AnalyticsState | null = null;

const cloneMetric = (metric: AnalyticsMetric): AnalyticsMetric => ({ ...metric });

const defaultState = (): AnalyticsState => ({
  metrics: DEFAULT_ANALYTICS_METRICS.map(cloneMetric),
  updatedAt: new Date(0).toISOString()
});

const ensureStoreDirectory = () => {
  const directory = path.dirname(ANALYTICS_STORE_PATH);
  fs.mkdirSync(directory, { recursive: true });
};

const sanitizeNumber = (value: unknown, fallback: number) => {
  if (typeof value !== 'number') {
    return fallback;
  }

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return value;
};

const sanitizeString = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const sanitizeUnit = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeMetric = (metric: Partial<AnalyticsMetric>, index: number): AnalyticsMetric => {
  const fallback = DEFAULT_ANALYTICS_METRICS[index] ?? DEFAULT_ANALYTICS_METRICS[0];

  return {
    id: sanitizeString(metric.id, fallback.id ?? `metric-${index + 1}`),
    label: sanitizeString(metric.label, fallback.label ?? `Metric ${index + 1}`),
    value: sanitizeNumber(metric.value, fallback.value ?? 0),
    delta: sanitizeNumber(metric.delta, fallback.delta ?? 0),
    unit: sanitizeUnit(metric.unit) ?? fallback.unit
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
    const parsed = JSON.parse(raw) as Partial<AnalyticsState>;
    const metrics = Array.isArray(parsed.metrics)
      ? parsed.metrics.map((metric, index) => sanitizeMetric(metric, index))
      : defaultState().metrics;
    const state: AnalyticsState = {
      metrics,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString()
    };
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

export const getAnalyticsMetrics = (): AnalyticsMetric[] => {
  return loadState().metrics.map(cloneMetric);
};

export const setAnalyticsMetrics = (metrics: AnalyticsMetric[]): AnalyticsMetric[] => {
  const sanitized = metrics.map((metric, index) => sanitizeMetric(metric, index));
  const state: AnalyticsState = {
    metrics: sanitized.map(cloneMetric),
    updatedAt: new Date().toISOString()
  };
  writeState(state);
  return sanitized.map(cloneMetric);
};

export const resetAnalyticsMetrics = () => {
  cachedState = null;
  if (fs.existsSync(ANALYTICS_STORE_PATH)) {
    fs.rmSync(ANALYTICS_STORE_PATH, { force: true });
  }
};
