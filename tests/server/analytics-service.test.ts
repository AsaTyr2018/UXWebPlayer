import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createTempStorePath = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-analytics-'));
  return { directory, file: path.join(directory, 'analytics.json') };
};

describe('analytics-service', () => {
  let tempDir: string;

  beforeEach(() => {
    const store = createTempStorePath();
    tempDir = store.directory;
    process.env.ANALYTICS_DB_PATH = store.file;
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.ANALYTICS_DB_PATH;
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns default metrics when no store exists', async () => {
    const service = await import('../../src/server/analytics-service.js');
    const metrics = service.getAnalyticsMetrics();

    expect(metrics).toHaveLength(4);
    expect(metrics[0]).toMatchObject({ id: 'streams-24h', value: expect.any(Number) });
  });

  it('persists metrics updates to disk', async () => {
    const service = await import('../../src/server/analytics-service.js');
    const nextMetrics = [
      { id: 'plays', label: 'Plays', value: 1024, delta: 12 },
      { id: 'listeners', label: 'Listeners', value: 256, delta: -4, unit: '%' }
    ];

    const updated = service.setAnalyticsMetrics(nextMetrics);
    expect(updated).toHaveLength(2);

    const raw = fs.readFileSync(process.env.ANALYTICS_DB_PATH!, 'utf8');
    const parsed = JSON.parse(raw) as { metrics: Array<Record<string, unknown>> };
    expect(parsed.metrics).toHaveLength(2);
    expect(parsed.metrics[0]).toMatchObject({ id: 'plays', label: 'Plays', value: 1024, delta: 12 });
    expect(parsed.metrics[1]).toMatchObject({ id: 'listeners', label: 'Listeners', value: 256, delta: -4, unit: '%' });

    const reloaded = service.getAnalyticsMetrics();
    expect(reloaded).toEqual(updated);
  });
});
