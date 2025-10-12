import fs from 'node:fs';
import path from 'node:path';

import type {
  AnalyticsMetric,
  AnalyticsSnapshot,
  EndpointAnalytics
} from '../admin/types.js';

const DEFAULT_GLOBAL_METRICS: AnalyticsMetric[] = [
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

const DEFAULT_ENDPOINT_ANALYTICS: EndpointAnalytics[] = [
  {
    endpointId: 'endpoint-main-stage',
    endpointName: 'Main Stage Stream',
    endpointSlug: 'main-stage',
    metrics: [
      {
        id: 'plays-24h',
        label: 'Plays (24h)',
        value: 1720,
        delta: 9
      },
      {
        id: 'listeners',
        label: 'Listeners',
        value: 864,
        delta: 6
      },
      {
        id: 'completion',
        label: 'Completion rate',
        value: 81,
        delta: 4,
        unit: '%'
      }
    ]
  },
  {
    endpointId: 'endpoint-community',
    endpointName: 'Community Radio',
    endpointSlug: 'community-radio',
    metrics: [
      {
        id: 'plays-24h',
        label: 'Plays (24h)',
        value: 820,
        delta: 5
      },
      {
        id: 'listeners',
        label: 'Listeners',
        value: 402,
        delta: 2
      },
      {
        id: 'completion',
        label: 'Completion rate',
        value: 74,
        delta: -2,
        unit: '%'
      }
    ]
  }
];

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
  global: DEFAULT_GLOBAL_METRICS.map(cloneMetric),
  perEndpoint: DEFAULT_ENDPOINT_ANALYTICS.map(cloneEndpointAnalytics)
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

const sanitizeMetric = (
  metric: Partial<AnalyticsMetric>,
  index: number,
  fallbacks: AnalyticsMetric[] = DEFAULT_GLOBAL_METRICS
): AnalyticsMetric => {
  const fallback = fallbacks[index] ?? fallbacks[0];

  return {
    id: sanitizeString(metric.id, fallback.id ?? `metric-${index + 1}`),
    label: sanitizeString(metric.label, fallback.label ?? `Metric ${index + 1}`),
    value: sanitizeNumber(metric.value, fallback.value ?? 0),
    delta: sanitizeNumber(metric.delta, fallback.delta ?? 0),
    unit: sanitizeUnit(metric.unit) ?? fallback.unit
  };
};

const sanitizeEndpointAnalytics = (
  analytics: Partial<EndpointAnalytics> & {
    metrics?: Array<Partial<AnalyticsMetric>>;
  },
  index: number
): EndpointAnalytics => {
  const fallback = DEFAULT_ENDPOINT_ANALYTICS[index] ?? DEFAULT_ENDPOINT_ANALYTICS[0];
  const metrics = Array.isArray(analytics.metrics)
    ? analytics.metrics.map((metric, metricIndex) => sanitizeMetric(metric, metricIndex, fallback.metrics))
    : fallback.metrics.map(cloneMetric);

  return {
    endpointId: sanitizeString(analytics.endpointId, fallback.endpointId ?? `endpoint-${index + 1}`),
    endpointName: sanitizeString(analytics.endpointName, fallback.endpointName ?? `Endpoint ${index + 1}`),
    endpointSlug: sanitizeString(analytics.endpointSlug, fallback.endpointSlug ?? `endpoint-${index + 1}`),
    metrics
  };
};

const sanitizeState = (state: Partial<AnalyticsSnapshot>): AnalyticsState => {
  const fallback = defaultState();

  const global = Array.isArray(state.global)
    ? state.global.map((metric, index) => sanitizeMetric(metric, index, DEFAULT_GLOBAL_METRICS))
    : fallback.global.map(cloneMetric);

  const perEndpoint = Array.isArray(state.perEndpoint)
    ? state.perEndpoint.map((entry, index) => sanitizeEndpointAnalytics(entry, index))
    : fallback.perEndpoint.map(cloneEndpointAnalytics);

  return {
    updatedAt: typeof state.updatedAt === 'string' ? state.updatedAt : fallback.updatedAt,
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

export const getAnalyticsSnapshot = (): AnalyticsSnapshot => {
  const state = loadState();
  return {
    updatedAt: state.updatedAt,
    global: state.global.map(cloneMetric),
    perEndpoint: state.perEndpoint.map(cloneEndpointAnalytics)
  };
};

export const setAnalyticsSnapshot = (snapshot: AnalyticsSnapshot): AnalyticsSnapshot => {
  const sanitized = sanitizeState(snapshot);
  const nextState: AnalyticsState = {
    updatedAt: new Date().toISOString(),
    global: sanitized.global.map(cloneMetric),
    perEndpoint: sanitized.perEndpoint.map(cloneEndpointAnalytics)
  };
  writeState(nextState);
  return {
    updatedAt: nextState.updatedAt,
    global: nextState.global.map(cloneMetric),
    perEndpoint: nextState.perEndpoint.map(cloneEndpointAnalytics)
  };
};

export const getAnalyticsMetrics = (): AnalyticsMetric[] => {
  return getAnalyticsSnapshot().global;
};

export const setAnalyticsMetrics = (metrics: AnalyticsMetric[]): AnalyticsMetric[] => {
  const current = getAnalyticsSnapshot();
  const updated = setAnalyticsSnapshot({
    updatedAt: current.updatedAt,
    global: metrics,
    perEndpoint: current.perEndpoint
  });
  return updated.global;
};

export const resetAnalyticsMetrics = () => {
  cachedState = null;
  if (fs.existsSync(ANALYTICS_STORE_PATH)) {
    fs.rmSync(ANALYTICS_STORE_PATH, { force: true });
  }
};
