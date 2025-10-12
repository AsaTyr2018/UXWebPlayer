import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../src/admin/components/admin-app';
import { createEmptyAdminData } from '../../src/admin/state/empty-admin-data';

const flush = async (element: Element) => {
  await (element as any).updateComplete;
  await Promise.resolve();
  await (element as any).updateComplete;
};

const createDefaultUser = () => ({
  id: 'user-default-admin',
  name: 'Default Admin',
  email: 'admin@localhost',
  role: 'owner',
  status: 'active' as const,
  lastActive: new Date().toISOString()
});

const createLoginPayload = () => {
  const user = createDefaultUser();
  return {
    token: 'test-session-token',
    user,
    users: [user],
    showDefaultAdminWarning: true
  };
};

const createJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

type TestLibraryState = {
  metrics: {
    mediaAssets: number;
    mediaAssetsNew: number;
    publishedPlaylists: number;
    playlistsPending: number;
    activeEndpoints: number;
    endpointsPending: number;
    playbackErrors: number;
    errorDelta: number;
  };
  playlists: ReturnType<typeof createEmptyAdminData>['playlists'];
  mediaLibrary: ReturnType<typeof createEmptyAdminData>['mediaLibrary'];
  endpoints: ReturnType<typeof createEmptyAdminData>['endpoints'];
};

let fetchMock: ReturnType<typeof vi.fn>;
let libraryState: TestLibraryState;
let endpointCounter: number;

beforeEach(() => {
  sessionStorage.clear();
  endpointCounter = 0;
  libraryState = {
    metrics: {
      mediaAssets: 0,
      mediaAssetsNew: 0,
      publishedPlaylists: 0,
      playlistsPending: 0,
      activeEndpoints: 0,
      endpointsPending: 0,
      playbackErrors: 0,
      errorDelta: 0
    },
    playlists: [],
    mediaLibrary: [],
    endpoints: []
  };

  // @ts-expect-error expose for tests
  globalThis.__TEST_LIBRARY_STATE__ = libraryState;

  const recomputeMetrics = () => {
    const mediaAssets = libraryState.mediaLibrary.length;
    const publishedPlaylists = libraryState.playlists.filter((playlist) =>
      libraryState.mediaLibrary.some((asset) => asset.playlistId === playlist.id)
    ).length;
    const playlistsPending = libraryState.playlists.length - publishedPlaylists;
    const activeEndpoints = libraryState.endpoints.filter((endpoint) => endpoint.status === 'operational').length;
    const endpointsPending = libraryState.endpoints.filter((endpoint) => endpoint.status === 'pending').length;

    libraryState.metrics = {
      mediaAssets,
      mediaAssetsNew: Math.min(mediaAssets, 5),
      publishedPlaylists,
      playlistsPending,
      activeEndpoints,
      endpointsPending,
      playbackErrors: 0,
      errorDelta: 0
    };
  };

  fetchMock = vi.fn(async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.endsWith('/api/access/login') && (!init || init.method === 'POST')) {
      return createJsonResponse(createLoginPayload());
    }

    if (url.endsWith('/api/access/logout')) {
      return new Response(null, { status: 204 });
    }

    if (url.endsWith('/api/access/session')) {
      return new Response(JSON.stringify({ message: 'Session expired.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.endsWith('/api/access/users')) {
      return createJsonResponse({
        user: {
          id: 'user-new-admin',
          name: 'New Admin',
          email: 'new@admin.test',
          role: 'admin',
          status: 'active',
          lastActive: new Date().toISOString()
        },
        users: [createDefaultUser()],
        showDefaultAdminWarning: false
      }, 201);
    }

    if (url.endsWith('/api/library/state') && method === 'GET') {
      recomputeMetrics();
      return createJsonResponse(libraryState);
    }

    if (url.endsWith('/api/library/endpoints') && method === 'POST') {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const slug = String(100_000_000 + endpointCounter).padStart(9, '0');
      endpointCounter += 1;
      const endpoint = {
        id: `endpoint-${endpointCounter}`,
        name: body.name ?? '',
        slug,
        playlistId: body.playlistId ?? null,
        status: 'pending',
        lastSync: 'Never',
        latencyMs: undefined
      } as TestLibraryState['endpoints'][number];

      libraryState.endpoints = [...libraryState.endpoints, endpoint];
      recomputeMetrics();

      return createJsonResponse({ endpoint }, 201);
    }

    if (url.includes('/api/library/endpoints/') && method === 'PATCH') {
      const endpointId = url.split('/').pop() ?? '';
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const endpoint = libraryState.endpoints.find((item) => item.id === endpointId);

      if (!endpoint) {
        return createJsonResponse({ message: 'Endpoint not found' }, 404);
      }

      if (body.name !== undefined) {
        endpoint.name = body.name;
      }

      if (body.playlistId !== undefined) {
        endpoint.playlistId = body.playlistId || null;
      }

      if (body.status !== undefined) {
        endpoint.status = body.status;
        if (body.status === 'operational') {
          endpoint.lastSync = new Date().toISOString();
        }
        if (body.status === 'disabled') {
          endpoint.lastSync = endpoint.lastSync ?? 'Never';
        }
      }

      recomputeMetrics();

      return createJsonResponse({ endpoint });
    }

    if (url.includes('/api/library/endpoints/') && method === 'DELETE') {
      const endpointId = url.split('/').pop() ?? '';
      const exists = libraryState.endpoints.some((item) => item.id === endpointId);
      if (!exists) {
        return createJsonResponse({ message: 'Endpoint not found' }, 404);
      }

      libraryState.endpoints = libraryState.endpoints.filter((item) => item.id !== endpointId);
      recomputeMetrics();
      return new Response(null, { status: 204 });
    }

    return createJsonResponse({ message: 'Not found' }, 404);
  });

  // @ts-expect-error - override fetch for tests
  global.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  sessionStorage.clear();
  // @ts-expect-error cleanup
  delete globalThis.__TEST_LIBRARY_STATE__;
});

const loginAsDefaultAdmin = async (element: Element) => {
  const root = element.shadowRoot;
  if (!root) {
    throw new Error('shadowRoot not ready');
  }

  const usernameInput = root.querySelector('#login-username') as HTMLInputElement | null;
  const passwordInput = root.querySelector('#login-password') as HTMLInputElement | null;

  if (!usernameInput || !passwordInput) {
    throw new Error('Login inputs not found');
  }

  usernameInput.value = 'admin';
  usernameInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

  passwordInput.value = 'admin';
  passwordInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

  const submitButton =
    (root.querySelector('[data-testid="global-login-form"] button[type="submit"]') as HTMLButtonElement | null) ??
    (root.querySelector('[data-testid="access-login-form"] button[type="submit"]') as HTMLButtonElement | null);

  if (!submitButton) {
    throw new Error('Login submit button not found');
  }

  submitButton.click();

  await flush(element);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await flush(element);
};

describe('ux-admin-app', () => {
  it('requires authentication before showing dashboard', async () => {
    const element = document.createElement('ux-admin-app');
    document.body.appendChild(element);

    await flush(element);

    const loginForm = element.shadowRoot?.querySelector('[data-testid="global-login-form"]');
    expect(loginForm).toBeTruthy();
    expect(element.shadowRoot?.querySelector('.dashboard')).toBeNull();

    await loginAsDefaultAdmin(element);

    expect(element.shadowRoot?.querySelector('.dashboard')).not.toBeNull();
  });

  it('renders stat cards using metrics data', async () => {
    const element = document.createElement('ux-admin-app');
    document.body.appendChild(element);

    await flush(element);

    await loginAsDefaultAdmin(element);

    const statCards = element.shadowRoot?.querySelectorAll('.stat-card');
    expect(statCards?.length).toBe(4);

    const values = Array.from(statCards ?? []).map((card) =>
      card.querySelector('.stat-value')?.textContent?.trim()
    );
    expect(values).toContain('0');
  });

  it('shows an empty publishing queue message without playlists', async () => {
    const element = document.createElement('ux-admin-app');
    document.body.appendChild(element);

    await flush(element);

    await loginAsDefaultAdmin(element);

    const emptyState = element.shadowRoot?.querySelector('[data-testid="queue-empty"]');
    expect(emptyState?.textContent).toMatch(/No playlists waiting to publish/);
  });

  it('navigates to the media library page', async () => {
    const element = document.createElement('ux-admin-app');
    document.body.appendChild(element);

    await flush(element);

    await loginAsDefaultAdmin(element);

    const mediaNav = element.shadowRoot?.querySelector('[data-page="media-library"]') as HTMLButtonElement;
    mediaNav.click();

    await flush(element);

    const heading = element.shadowRoot?.querySelector('h2');
    expect(heading?.textContent).toContain('Media Library');
  });

  it('uses the current origin when rendering endpoint embed URLs', async () => {
    const element = document.createElement('ux-admin-app') as any;
    document.body.appendChild(element);

    const state = (globalThis as any).__TEST_LIBRARY_STATE__ as TestLibraryState;
    state.endpoints = [
      {
        id: 'endpoint-1',
        name: 'Lobby Display',
        slug: '123456789',
        status: 'operational',
        playlistId: null,
        lastSync: '2025-01-01T12:00:00Z',
        latencyMs: 42
      }
    ];

    await flush(element);
    await loginAsDefaultAdmin(element);

    const endpointsNav = element.shadowRoot?.querySelector('[data-page="endpoints"]') as HTMLButtonElement;
    endpointsNav?.click();

    await flush(element);

    const embedSpan = element.shadowRoot?.querySelector('tbody .embed-url') as HTMLSpanElement | null;
    expect(embedSpan).toBeTruthy();

    const embedText = embedSpan
      ? Array.from(embedSpan.childNodes)
          .map((node) => node.textContent?.trim() ?? '')
          .find((value) => value.startsWith(window.location.origin))
      : undefined;
    expect(embedText).toBe(`${window.location.origin}/embed/123456789`);
  });

  it('renders playlist entries when data is provided', async () => {
    const element = document.createElement('ux-admin-app') as any;
    document.body.appendChild(element);

    const state = (globalThis as any).__TEST_LIBRARY_STATE__ as TestLibraryState;
    state.playlists = [
      {
        id: 'pl-1',
        name: 'Launch Playlist',
        status: 'draft',
        updatedAt: '2025-01-01 09:00',
        owner: 'Team Admin',
        itemCount: 12,
        endpointCount: 3
      }
    ];

    await flush(element);

    await loginAsDefaultAdmin(element);

    const rows = element.shadowRoot?.querySelectorAll('tbody tr');
    expect(rows?.length).toBeGreaterThanOrEqual(1);
  });

  it('creates an endpoint with a generated embed URL', async () => {
    const element = document.createElement('ux-admin-app') as any;
    document.body.appendChild(element);

    const state = (globalThis as any).__TEST_LIBRARY_STATE__ as TestLibraryState;
    state.playlists = [
      {
        id: 'pl-assign',
        name: 'Launch Playlist',
        status: 'published',
        updatedAt: '2025-01-01 09:00',
        owner: 'Team Admin',
        itemCount: 12,
        endpointCount: 3
      }
    ];

    await flush(element);

    await loginAsDefaultAdmin(element);

    const navButton = element.shadowRoot?.querySelector('[data-page="endpoints"]') as HTMLButtonElement;
    navButton.click();

    await flush(element);

    const addButton = element.shadowRoot?.querySelector('[data-testid="endpoint-add-button"]') as HTMLButtonElement;
    addButton.click();

    await flush(element);

    const nameInput = element.shadowRoot?.querySelector('#endpoint-name') as HTMLInputElement;
    nameInput.value = 'Expo Booth';
    nameInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    const playlistSelect = element.shadowRoot?.querySelector('#endpoint-playlist') as HTMLSelectElement;
    playlistSelect.value = 'pl-assign';
    playlistSelect.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    const submitButton = element.shadowRoot?.querySelector('[data-testid="endpoint-form"] button.primary') as HTMLButtonElement;
    submitButton.click();

    await flush(element);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flush(element);

    const rows = element.shadowRoot?.querySelectorAll('tbody tr');
    expect(rows?.length).toBe(1);

    const playlistCell = rows?.[0]?.querySelectorAll('td')?.[1]?.textContent?.trim();
    expect(playlistCell).toBe('Launch Playlist');

    const embedCell = rows?.[0]?.querySelector('.embed-url');
    const embedText = embedCell?.textContent?.replace('Copy', '').trim();
    const originPattern = window.location.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(embedText).toMatch(new RegExp(`^${originPattern}/embed/\\d{9}$`));
  });

  it('allows activating and disabling an endpoint', async () => {
    const element = document.createElement('ux-admin-app') as any;
    document.body.appendChild(element);

    const state = (globalThis as any).__TEST_LIBRARY_STATE__ as TestLibraryState;
    state.playlists = [
      {
        id: 'pl-toggle',
        name: 'Main Loop',
        status: 'published',
        updatedAt: '2025-01-01T00:00:00Z',
        owner: 'Team Admin',
        itemCount: 5,
        endpointCount: 1
      }
    ];
    state.endpoints = [
      {
        id: 'endpoint-toggle',
        name: 'Atrium Screen',
        slug: '222222222',
        status: 'pending',
        playlistId: 'pl-toggle',
        lastSync: 'Never',
        latencyMs: undefined
      }
    ];

    await flush(element);
    await loginAsDefaultAdmin(element);

    const endpointsNav = element.shadowRoot?.querySelector('[data-page="endpoints"]') as HTMLButtonElement;
    endpointsNav?.click();

    await flush(element);

    const toggleButton = element.shadowRoot?.querySelector('[data-testid="endpoint-toggle"]') as HTMLButtonElement;
    expect(toggleButton?.textContent).toContain('Activate');
    expect(toggleButton?.disabled).toBe(false);

    toggleButton?.click();

    await flush(element);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flush(element);

    const activatedButton = element.shadowRoot?.querySelector('[data-testid="endpoint-toggle"]') as HTMLButtonElement;
    expect(activatedButton?.textContent).toContain('Disable');

    activatedButton?.click();

    await flush(element);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flush(element);

    const disabledButton = element.shadowRoot?.querySelector('[data-testid="endpoint-toggle"]') as HTMLButtonElement;
    expect(disabledButton?.textContent).toContain('Activate');
  });

  it('warns after signing in with the default admin credentials', async () => {
    const element = document.createElement('ux-admin-app');
    document.body.appendChild(element);

    await flush(element);

    await loginAsDefaultAdmin(element);

    const accessNav = element.shadowRoot?.querySelector('[data-page="access-control"]') as HTMLButtonElement;
    accessNav.click();

    await flush(element);

    const warning = element.shadowRoot?.querySelector('[data-testid="default-admin-warning"]');
    expect(warning?.textContent).toMatch(/Please create your own admin account and remove the default admin/);
  });
});
