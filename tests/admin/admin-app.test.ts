import { describe, expect, it } from 'vitest';
import '../../src/admin/components/admin-app';
import { createEmptyAdminData } from '../../src/admin/state/empty-admin-data';

const flush = async (element: Element) => {
  await (element as any).updateComplete;
};

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

  it('renders playlist entries when data is provided', async () => {
    const element = document.createElement('ux-admin-app') as any;
    document.body.appendChild(element);

    const data = createEmptyAdminData();
    data.playlists = [
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
    element.data = data;

    await flush(element);

    await loginAsDefaultAdmin(element);

    const rows = element.shadowRoot?.querySelectorAll('tbody tr');
    expect(rows?.length).toBeGreaterThanOrEqual(1);
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
