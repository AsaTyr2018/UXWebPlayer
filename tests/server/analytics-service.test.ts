import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsSnapshot } from '../../src/admin/types.js';

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

  it('returns default analytics snapshot when no store exists', async () => {
    const service = await import('../../src/server/analytics-service.js');
    const snapshot = service.getAnalyticsSnapshot();

    expect(snapshot.global).toHaveLength(4);
    expect(snapshot.perEndpoint).toHaveLength(2);
    expect(snapshot.global[0]).toMatchObject({ id: 'streams-24h', value: expect.any(Number) });
    expect(snapshot.perEndpoint[0]).toMatchObject({ endpointId: 'endpoint-main-stage' });
  });

  it('persists global and endpoint analytics updates to disk', async () => {
    const service = await import('../../src/server/analytics-service.js');
    const nextSnapshot = {
      updatedAt: new Date(0).toISOString(),
      global: [
        { id: 'plays', label: 'Plays', value: 1024, delta: 12 },
        { id: 'listeners', label: 'Listeners', value: 256, delta: -4, unit: '%' }
      ],
      perEndpoint: [
        {
          endpointId: 'endpoint-a',
          endpointName: 'Stage A',
          endpointSlug: 'stage-a',
          metrics: [{ id: 'plays', label: 'Plays', value: 512, delta: 6 }]
        }
      ]
    };

    const updated = service.setAnalyticsSnapshot(nextSnapshot);
    expect(updated.global).toHaveLength(2);
    expect(updated.perEndpoint).toHaveLength(1);
    expect(updated.perEndpoint[0].metrics).toHaveLength(1);

    const raw = fs.readFileSync(process.env.ANALYTICS_DB_PATH!, 'utf8');
    const parsed = JSON.parse(raw) as AnalyticsSnapshot;
    expect(parsed.global).toHaveLength(2);
    expect(parsed.perEndpoint).toHaveLength(1);
    expect(parsed.perEndpoint[0]).toMatchObject({ endpointId: 'endpoint-a', endpointSlug: 'stage-a' });

    const reloaded = service.getAnalyticsSnapshot();
    expect(reloaded).toEqual(updated);
  });
});
