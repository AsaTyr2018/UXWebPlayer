import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { createEmptyAdminData } from '../state/empty-admin-data.js';
import type {
  AdminData,
  AdminEndpoint,
  AdminPage,
  AdminPlaylist,
  AdminUser,
  AuditEvent,
  DiagnosticCheck
} from '../types.js';

export type Tone = 'positive' | 'negative' | 'warning' | 'neutral';

type NavItem = {
  label: string;
  page: AdminPage;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', page: 'dashboard' },
      { label: 'Media Library', page: 'media-library' },
      { label: 'Playlists', page: 'playlists' },
      { label: 'Endpoints', page: 'endpoints' },
      { label: 'Analytics', page: 'analytics' },
      { label: 'Branding', page: 'branding' }
    ]
  },
  {
    title: 'Administration',
    items: [
      { label: 'Access Control', page: 'access-control' },
      { label: 'Configuration', page: 'configuration' },
      { label: 'Diagnostics', page: 'diagnostics' },
      { label: 'Audit Trail', page: 'audit-trail' }
    ]
  }
];

const ACCESS_API_BASE = '/api/access';
const SESSION_STORAGE_KEY = 'ux-admin-session-token';

type AccessUsersPayload = {
  users: AdminUser[];
  showDefaultAdminWarning: boolean;
};

type AccessSessionPayload = AccessUsersPayload & {
  user: AdminUser;
};

type AccessLoginPayload = AccessSessionPayload & {
  token: string;
};

type AccessUserCreatedPayload = AccessUsersPayload & {
  user: AdminUser;
};

type ApiErrorPayload = {
  message?: string;
};

@customElement('ux-admin-app')
export class UxAdminApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      --bg: #0f172a;
      --bg-muted: #111c36;
      --surface: #ffffff;
      --surface-alt: #f1f5f9;
      --surface-tint: rgba(15, 23, 42, 0.08);
      --border: rgba(15, 23, 42, 0.1);
      --text: #0f172a;
      --text-muted: #475569;
      --accent: #2563eb;
      --accent-soft: rgba(37, 99, 235, 0.12);
      --accent-strong: rgba(37, 99, 235, 0.16);
      --positive: #059669;
      --positive-soft: rgba(5, 150, 105, 0.12);
      --warning: #f59e0b;
      --warning-soft: rgba(245, 158, 11, 0.12);
      --negative: #dc2626;
      --negative-soft: rgba(220, 38, 38, 0.12);
      --sidebar-width: 272px;
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: var(--text);
      background: var(--surface-alt);
      min-height: 100vh;
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    button {
      font: inherit;
    }

    .login-screen {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 16px;
      background:
        radial-gradient(circle at top, rgba(37, 99, 235, 0.12), transparent 55%),
        var(--bg);
    }

    .login-panel {
      display: grid;
      gap: 24px;
      width: min(100%, 440px);
      padding: 40px;
      border-radius: 24px;
      background: rgba(15, 23, 42, 0.85);
      box-shadow: 0 32px 56px rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(16px);
    }

    .login-panel .login-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #e2e8f0;
    }

    .login-panel .login-brand .brand-icon {
      font-size: 32px;
      filter: drop-shadow(0 10px 28px rgba(15, 23, 42, 0.32));
    }

    .login-panel .login-brand .brand-title {
      font-size: 20px;
      font-weight: 600;
    }

    .login-panel .login-brand .brand-subtitle {
      display: block;
      font-size: 14px;
      opacity: 0.8;
    }

    .dashboard {
      display: grid;
      grid-template-columns: var(--sidebar-width) 1fr;
      min-height: 100vh;
      background: var(--surface-alt);
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      background: var(--bg);
      color: #e2e8f0;
      padding: 32px 24px;
      gap: 32px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .brand-icon {
      font-size: 28px;
      filter: drop-shadow(0 6px 18px rgba(15, 23, 42, 0.32));
    }

    .brand-title {
      font-size: 18px;
    }

    .brand-subtitle {
      font-size: 12px;
      color: rgba(226, 232, 240, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .nav {
      display: grid;
      gap: 8px;
    }

    .nav-section {
      font-size: 12px;
      text-transform: uppercase;
      color: rgba(226, 232, 240, 0.5);
      letter-spacing: 0.08em;
      margin: 16px 0 4px;
    }

    .nav-button {
      display: flex;
      width: 100%;
      align-items: center;
      padding: 10px 12px;
      border-radius: 8px;
      color: rgba(226, 232, 240, 0.86);
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .nav-button:hover,
    .nav-button:focus-visible {
      background: rgba(148, 163, 184, 0.15);
      outline: none;
    }

    .nav-button.is-active {
      background: rgba(59, 130, 246, 0.25);
      color: #fff;
    }

    .sidebar-footer {
      margin-top: auto;
      display: grid;
      gap: 16px;
    }

    .status {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: rgba(226, 232, 240, 0.85);
    }

    .status-indicator {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: rgba(45, 212, 191, 0.4);
      box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.15);
    }

    .workspace {
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0));
      padding: 48px 56px;
      display: grid;
      gap: 32px;
    }

    .workspace-header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
    }

    .subtitle {
      margin: 8px 0 0;
      color: var(--text-muted);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .search {
      display: inline-flex;
      align-items: center;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--surface);
      padding: 0 12px;
      height: 44px;
    }

    .search input {
      border: none;
      outline: none;
      font: inherit;
      width: 280px;
      background: transparent;
    }

    .user {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 12px;
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: rgba(15, 23, 42, 0.04);
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      background: rgba(59, 130, 246, 0.2);
      color: var(--accent);
      border-radius: 999px;
      font-weight: 600;
    }

    .user-name {
      font-weight: 600;
    }

    .user-role {
      font-size: 12px;
      color: var(--text-muted);
    }

    button {
      border: none;
      border-radius: 12px;
      padding: 0 18px;
      height: 44px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      background: rgba(15, 23, 42, 0.06);
      color: var(--text);
    }

    button:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    button.primary {
      background: var(--accent);
      color: white;
      box-shadow: 0 14px 24px rgba(37, 99, 235, 0.2);
    }

    button.primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 18px 28px rgba(37, 99, 235, 0.28);
    }

    button.secondary {
      background: rgba(148, 163, 184, 0.2);
      color: white;
    }

    button[disabled] {
      cursor: not-allowed;
      opacity: 0.6;
      box-shadow: none;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 20px;
    }

    .stat-card {
      background: var(--surface);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(15, 23, 42, 0.05);
      display: grid;
      gap: 12px;
      align-content: start;
    }

    .stat-card header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      color: var(--text-muted);
    }

    .stat-value {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .stat-trend {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
    }

    .stat-trend.positive {
      color: var(--positive);
    }

    .stat-trend.warning {
      color: var(--warning);
    }

    .stat-trend.negative {
      color: var(--negative);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.16);
      color: rgba(71, 85, 105, 0.9);
      white-space: nowrap;
    }

    .badge.positive {
      background: var(--positive-soft);
      color: var(--positive);
    }

    .badge.neutral {
      background: var(--accent-soft);
      color: var(--accent);
    }

    .badge.warning {
      background: var(--warning-soft);
      color: var(--warning);
    }

    .badge.negative {
      background: var(--negative-soft);
      color: var(--negative);
    }

    .content-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
    }

    .panel,
    .page-panel {
      background: var(--surface);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(15, 23, 42, 0.05);
      display: grid;
      gap: 20px;
      align-content: start;
    }

    .panel header,
    .page-panel header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .panel h2,
    .page-panel h2 {
      margin: 0;
      font-size: 20px;
      letter-spacing: -0.01em;
    }

    .panel p,
    .page-panel p {
      margin: 4px 0 0;
      color: var(--text-muted);
      font-size: 14px;
    }

    .panel.span-2 {
      grid-column: span 2;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      text-align: left;
      padding: 14px 0;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      font-size: 14px;
    }

    th {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 12px;
      color: var(--text-muted);
    }

    tbody tr:last-of-type td {
      border-bottom: none;
    }

    .endpoint-form {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      background: var(--surface-alt);
      display: grid;
      gap: 16px;
    }

    .endpoint-form header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .endpoint-form h3 {
      margin: 0;
      font-size: 18px;
    }

    .endpoint-form-grid {
      display: grid;
      gap: 16px;
    }

    .endpoint-form label {
      display: grid;
      gap: 6px;
      font-size: 14px;
      color: var(--text-muted);
    }

    .endpoint-form input,
    .endpoint-form select {
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--border);
      font: inherit;
      background: var(--surface);
      color: var(--text);
    }

    .endpoint-form footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .endpoint-form .helper {
      font-size: 13px;
      color: var(--text-muted);
    }

    .endpoint-form .error {
      color: var(--negative);
      font-size: 13px;
    }

    .embed-url {
      font-family: 'Roboto Mono', 'SFMono-Regular', Menlo, monospace;
      font-size: 13px;
      background: var(--surface);
      border-radius: 12px;
      padding: 8px 12px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      overflow-wrap: anywhere;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .embed-url button {
      padding: 0;
      background: none;
      border: none;
      color: var(--accent);
      cursor: pointer;
      font-size: 13px;
    }

    .table-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .table-actions button {
      font-size: 13px;
      padding: 0;
      background: none;
      border: none;
      color: var(--accent);
      cursor: pointer;
    }

    .table-actions button.danger {
      color: var(--negative);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .list {
      display: grid;
      gap: 16px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .list li {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    }

    .list li:last-of-type {
      border-bottom: none;
      padding-bottom: 0;
    }

    .list-title {
      margin: 0;
      font-weight: 600;
    }

    .list-subtitle {
      margin: 6px 0 0;
      color: var(--text-muted);
      font-size: 14px;
    }

    .list-subtitle.warning {
      color: var(--warning);
    }

    .timeline {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 16px;
    }

    .timeline li {
      display: grid;
      grid-template-columns: 16px 1fr;
      gap: 16px;
    }

    .timeline-dot {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      margin-top: 6px;
      background: var(--accent);
    }

    .timeline-dot.positive {
      background: var(--positive);
    }

    .timeline-dot.warning {
      background: var(--warning);
    }

    .timeline-dot.negative {
      background: var(--negative);
    }

    .empty-state {
      display: grid;
      gap: 8px;
      padding: 32px;
      background: rgba(148, 163, 184, 0.12);
      border-radius: 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 14px;
    }

    .empty-state strong {
      color: var(--text);
    }

    .login-card {
      display: grid;
      gap: 16px;
      padding: 24px;
      border-radius: 16px;
      background: var(--surface);
      border: 1px solid rgba(15, 23, 42, 0.08);
      max-width: 420px;
    }

    .login-card h3 {
      margin: 0;
      font-size: 18px;
      letter-spacing: -0.01em;
    }

    .login-card p {
      margin: 0;
      color: var(--text-muted);
      font-size: 14px;
    }

    .form-group {
      display: grid;
      gap: 8px;
    }

    .form-group label {
      font-weight: 600;
      font-size: 14px;
    }

    .form-group input {
      border-radius: 10px;
      border: 1px solid rgba(15, 23, 42, 0.12);
      padding: 12px;
      font: inherit;
    }

    .form-group input:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .form-error {
      margin: 0;
      color: var(--negative);
      font-size: 14px;
    }

    .form-success {
      margin: 0 0 16px;
      color: var(--positive);
      font-size: 14px;
    }

    .invite-form {
      display: grid;
      gap: 16px;
      margin-bottom: 24px;
      padding: 20px;
      border-radius: 14px;
      background: var(--surface);
      border: 1px solid var(--border);
    }

    .invite-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .invite-grid .form-group {
      margin: 0;
    }

    .invite-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .signed-in-banner {
      margin: 0 0 16px;
      font-size: 14px;
      color: var(--text-muted);
    }

    .signed-in-banner strong {
      color: var(--text);
    }

    .callout {
      display: grid;
      gap: 8px;
      padding: 20px;
      border-radius: 14px;
      background: rgba(148, 163, 184, 0.12);
      color: var(--text);
      font-size: 14px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      margin-bottom: 16px;
    }

    .callout strong {
      font-size: 15px;
    }

    .callout.warning {
      background: var(--warning-soft);
      border-color: rgba(245, 158, 11, 0.32);
    }

    .callout.positive {
      background: var(--positive-soft);
      border-color: rgba(5, 150, 105, 0.28);
    }

    .page-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 24px;
    }

    .page-grid.full-width {
      grid-template-columns: minmax(0, 1fr);
    }

    .metadata-list {
      display: grid;
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .metadata-item {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }

    .metadata-item span:first-child {
      color: var(--text-muted);
      font-size: 14px;
    }

    .metadata-item span:last-child {
      font-weight: 600;
    }

    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
    }

    .analytics-card {
      background: var(--surface);
      border-radius: 16px;
      padding: 20px;
      border: 1px solid rgba(15, 23, 42, 0.05);
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
      display: grid;
      gap: 12px;
    }

    .analytics-value {
      font-size: 28px;
      font-weight: 700;
    }

    .analytics-delta.positive {
      color: var(--positive);
    }

    .analytics-delta.negative {
      color: var(--negative);
    }

    .table-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    @media (max-width: 1280px) {
      .dashboard {
        grid-template-columns: 1fr;
      }

      .sidebar {
        flex-direction: row;
        align-items: flex-start;
        gap: 24px;
        flex-wrap: wrap;
      }

      .sidebar-footer {
        min-width: 200px;
      }

      .workspace {
        padding: 32px 24px;
      }

      .workspace-header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-right {
        flex-wrap: wrap;
        justify-content: space-between;
      }

      .search input {
        width: 100%;
      }

      .panel.span-2 {
        grid-column: span 1;
      }

      .stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .content-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .page-grid {
        grid-template-columns: minmax(0, 1fr);
      }

      .invite-grid {
        grid-template-columns: minmax(0, 1fr);
      }

      .analytics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .sidebar {
        flex-wrap: wrap;
        padding: 20px;
      }

      .brand {
        width: 100%;
        justify-content: center;
      }

      .nav {
        width: 100%;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .header-right {
        flex-direction: column;
        align-items: stretch;
      }

      button,
      .search input {
        width: 100%;
      }

      .stats {
        grid-template-columns: 1fr;
      }

      .invite-grid {
        grid-template-columns: 1fr;
      }

      .content-grid {
        grid-template-columns: 1fr;
      }

      .analytics-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  private readonly numberFormatter = new Intl.NumberFormat('en-US');

  private _data: AdminData = createEmptyAdminData();

  @property({ attribute: false })
  get data(): AdminData {
    return this._data;
  }

  set data(value: AdminData) {
    const merged = this.mergeAdminData(value);
    const oldValue = this._data;
    this._data = merged;
    this.requestUpdate('data', oldValue);
  }

  @state()
  private declare activePage: AdminPage;

  @state()
  private declare isAuthenticated: boolean;

  @state()
  private declare authenticatedUser: string | null;

  @state()
  private declare loginUsername: string;

  @state()
  private declare loginPassword: string;

  @state()
  private declare loginError: string | null;

  @state()
  private declare showDefaultAdminWarning: boolean;

  @state()
  private declare sessionToken: string | null;

  @state()
  private declare loginPending: boolean;

  @state()
  private declare isLoadingUsers: boolean;

  @state()
  private declare inviteFormOpen: boolean;

  @state()
  private declare inviteName: string;

  @state()
  private declare inviteUsername: string;

  @state()
  private declare inviteEmail: string;

  @state()
  private declare invitePassword: string;

  @state()
  private declare inviteSubmitting: boolean;

  @state()
  private declare inviteError: string | null;

  @state()
  private declare inviteSuccess: string | null;

  @state()
  private declare endpointFormOpen: boolean;

  @state()
  private declare endpointFormMode: 'create' | 'edit';

  @state()
  private declare endpointFormName: string;

  @state()
  private declare endpointFormPlaylistId: string;

  @state()
  private declare endpointFormSlug: string;

  @state()
  private declare endpointEditingId: string | null;

  @state()
  private declare endpointFormError: string | null;

  @state()
  private declare endpointCopyFeedback: string | null;

  private endpointCopyTimeout: number | null = null;

  constructor() {
    super();
    this.activePage = 'dashboard';
    this.isAuthenticated = false;
    this.authenticatedUser = null;
    this.loginUsername = '';
    this.loginPassword = '';
    this.loginError = null;
    this.showDefaultAdminWarning = false;
    this.sessionToken = null;
    this.loginPending = false;
    this.isLoadingUsers = false;
    this.inviteFormOpen = false;
    this.inviteName = '';
    this.inviteUsername = '';
    this.inviteEmail = '';
    this.invitePassword = '';
    this.inviteSubmitting = false;
    this.inviteError = null;
    this.inviteSuccess = null;
    this.endpointFormOpen = false;
    this.endpointFormMode = 'create';
    this.endpointFormName = '';
    this.endpointFormPlaylistId = '';
    this.endpointFormSlug = '';
    this.endpointEditingId = null;
    this.endpointFormError = null;
    this.endpointCopyFeedback = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.bootstrapFromWindow();
    void this.restoreSession();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.endpointCopyTimeout !== null) {
      window.clearTimeout(this.endpointCopyTimeout);
      this.endpointCopyTimeout = null;
    }
  }

  protected render() {
    if (!this.isAuthenticated) {
      return this.renderLoginScreen();
    }

    return this.renderDashboardLayout();
  }

  private renderDashboardLayout() {
    return html`
      <div class="dashboard">
        <aside class="sidebar">
          <div class="brand" aria-label="UXWebPlayer Admin">
            <span class="brand-icon" aria-hidden="true">🎛️</span>
            <div class="brand-label">
              <span class="brand-title">UXWebPlayer</span>
              <span class="brand-subtitle">Admin Console</span>
            </div>
          </div>
          <nav class="nav" aria-label="Primary">
            ${NAV_SECTIONS.map(
              (section) => html`
                <p class="nav-section">${section.title}</p>
                ${section.items.map((item) => this.renderNavButton(item))}
              `
            )}
          </nav>
          <div class="sidebar-footer">
            <div class="status" role="status" aria-live="polite">
              <span class="status-indicator" aria-hidden="true"></span>
              <span class="status-label">${this.renderSyncStatus()}</span>
            </div>
            <button class="secondary" type="button">Download Manifest</button>
          </div>
        </aside>
        <main class="workspace">
          <header class="workspace-header">
            <div class="header-left">
              <h1>${this.pageTitle}</h1>
              <p class="subtitle">${this.pageSubtitle}</p>
            </div>
            <div class="header-right">
              <label class="search" aria-label="Search admin data">
                <input type="search" placeholder="Search playlists, endpoints, media" />
              </label>
              <button class="primary" type="button">New Playlist</button>
              <div class="user" aria-label="Current user">
                <span class="user-avatar" aria-hidden="true">${this.userInitials}</span>
                <div class="user-meta">
                  <span class="user-name">${this.userDisplayName}</span>
                  <span class="user-role">System Owner</span>
                </div>
              </div>
            </div>
          </header>
          ${this.renderActivePage()}
        </main>
      </div>
    `;
  }

  private renderLoginScreen() {
    return html`
      <section class="login-screen" role="main" aria-labelledby="global-login-form-title">
        <div class="login-panel">
          <div class="login-brand" aria-label="UXWebPlayer Admin">
            <span class="brand-icon" aria-hidden="true">🎛️</span>
            <div class="brand-label">
              <span class="brand-title">UXWebPlayer</span>
              <span class="brand-subtitle">Admin Console</span>
            </div>
          </div>
          ${this.renderLoginForm(
            'global-login-form',
            'Sign in to UXWebPlayer Admin',
            'Authenticate with an administrator account to continue.'
          )}
        </div>
      </section>
    `;
  }

  private renderActivePage() {
    switch (this.activePage) {
      case 'dashboard':
        return this.renderDashboard();
      case 'media-library':
        return this.renderMediaLibrary();
      case 'playlists':
        return this.renderPlaylists();
      case 'endpoints':
        return this.renderEndpoints();
      case 'analytics':
        return this.renderAnalytics();
      case 'branding':
        return this.renderBranding();
      case 'access-control':
        return this.renderAccessControl();
      case 'configuration':
        return this.renderConfiguration();
      case 'diagnostics':
        return this.renderDiagnostics();
      case 'audit-trail':
        return this.renderAuditTrail();
      default:
        return nothing;
    }
  }

  private renderDashboard() {
    const stats = this.getDashboardStats();
    return html`
      <section class="stats" aria-label="Key metrics">
        ${stats.map(
          (stat) => html`
            <article class="stat-card">
              <header>
                <span class="stat-label">${stat.label}</span>
                <span class="badge ${stat.badgeTone}">${stat.badgeLabel}</span>
              </header>
              <p class="stat-value">${stat.value}</p>
              <p class="stat-trend ${stat.trendTone}">${stat.trendLabel}</p>
            </article>
          `
        )}
      </section>
      <section class="content-grid">
        <article class="panel span-2">
          <header>
            <div>
              <h2>Playlist Publishing Queue</h2>
              <p>Review drafts and publish to embeddable endpoints.</p>
            </div>
            <button type="button">Review queue</button>
          </header>
          ${this.renderPublishingQueue()}
        </article>
        <article class="panel">
          <header>
            <div>
              <h2>Endpoint Health</h2>
              <p>Track sync latency and embed status.</p>
            </div>
            <button type="button">Manage endpoints</button>
          </header>
          ${this.renderEndpointHealth(this.data.endpoints)}
        </article>
        <article class="panel">
          <header>
            <div>
              <h2>Recent Activity</h2>
              <p>Latest actions from the admin team.</p>
            </div>
            <button type="button">Export</button>
          </header>
          ${this.renderRecentActivity(this.data.auditTrail)}
        </article>
      </section>
    `;
  }

  private renderPublishingQueue() {
    const queue = this.data.playlists
      .filter((playlist) => playlist.status !== 'published')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6);

    if (!queue.length) {
      return html`<div class="empty-state" data-testid="queue-empty">
        <strong>No playlists waiting to publish.</strong>
        Connect the admin API or import manifests to review publishing tasks.
      </div>`;
    }

    return html`
      <table class="table" aria-label="Playlist publishing queue">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Status</th>
            <th scope="col">Last Updated</th>
            <th scope="col">Owner</th>
          </tr>
        </thead>
        <tbody>
          ${queue.map(
            (entry) => html`
              <tr>
                <td>${entry.name}</td>
                <td>
                  <span class="badge ${this.mapPlaylistTone(entry.status)}">
                    ${this.formatPlaylistStatus(entry.status)}
                  </span>
                </td>
                <td>${entry.updatedAt}</td>
                <td>${entry.owner}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }

  private renderEndpointHealth(endpoints: AdminEndpoint[]) {
    if (!endpoints.length) {
      return html`<div class="empty-state">
        <strong>No endpoints connected.</strong>
        Configure an endpoint to monitor sync health.
      </div>`;
    }

    return html`
      <ul class="list" aria-label="Endpoint health">
        ${endpoints.map(
          (endpoint) => {
            const playlistName = this.resolvePlaylistName(endpoint.playlistId ?? null);
            return html`
            <li>
              <div>
                <p class="list-title">${endpoint.name}</p>
                <p class="list-subtitle ${endpoint.status === 'degraded' ? 'warning' : ''}">
                  ${playlistName === 'Unassigned' ? 'No playlist assigned' : `Playlist: ${playlistName}`}
                  · ${endpoint.lastSync}
                  ${endpoint.latencyMs ? html`· ${endpoint.latencyMs} ms latency` : nothing}
                </p>
                <p class="list-subtitle">Embed: ${this.buildEmbedUrl(endpoint.slug)}</p>
              </div>
              <span class="badge ${this.mapEndpointTone(endpoint.status)}">
                ${this.formatEndpointStatus(endpoint.status)}
              </span>
            </li>
          `;
          }
        )}
      </ul>
    `;
  }

  private renderRecentActivity(events: AuditEvent[]) {
    if (!events.length) {
      return html`<div class="empty-state">
        <strong>No audit activity yet.</strong>
        Changes made in the admin console will appear here.
      </div>`;
    }

    return html`
      <ul class="timeline" aria-label="Recent admin activity">
        ${events
          .slice(0, 6)
          .map(
            (event) => html`
              <li>
                <span class="timeline-dot ${this.mapAuditTone(event.action)}" aria-hidden="true"></span>
                <div>
                  <p>
                    <strong>${event.actor}</strong>
                    ${event.action}
                    <em>${event.target}</em>.
                  </p>
                  <time>${event.timestamp}</time>
                </div>
              </li>
            `
          )}
      </ul>
    `;
  }

  private renderMediaLibrary() {
    if (!this.data.mediaLibrary.length) {
      return html`
        <section class="page-panel" aria-label="Media library empty state">
          <header>
            <div>
              <h2>Media Library</h2>
              <p>Upload audio or video assets to make them available to playlists.</p>
            </div>
            <div class="table-actions">
              <button type="button">Upload media</button>
              <button type="button">Sync folders</button>
            </div>
          </header>
          <div class="empty-state">
            <strong>No media assets found.</strong>
            Run the ingestion CLI or configure a remote adapter to populate the library.
          </div>
        </section>
      `;
    }

    return html`
      <section class="page-panel" aria-label="Media library">
        <header>
          <div>
            <h2>Media Library</h2>
            <p>${this.data.mediaLibrary.length} assets available for playlist curation.</p>
          </div>
          <div class="table-actions">
            <button type="button">Upload media</button>
            <button type="button">Sync folders</button>
          </div>
        </header>
        <table>
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Type</th>
              <th scope="col">Duration</th>
              <th scope="col">Tags</th>
              <th scope="col">Status</th>
              <th scope="col">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            ${this.data.mediaLibrary.map(
              (asset) => html`
                <tr>
                  <td>${asset.title}</td>
                  <td>${asset.type}</td>
                  <td>${this.formatDuration(asset.durationSeconds)}</td>
                  <td>${asset.tags.join(', ') || '—'}</td>
                  <td>
                    <span class="badge ${this.mapAssetTone(asset.status)}">
                      ${this.formatAssetStatus(asset.status)}
                    </span>
                  </td>
                  <td>${asset.updatedAt}</td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </section>
    `;
  }

  private renderPlaylists() {
    if (!this.data.playlists.length) {
      return html`
        <section class="page-panel" aria-label="Playlist overview">
          <header>
            <div>
              <h2>Playlists</h2>
              <p>Create collections of media assets and publish them to endpoints.</p>
            </div>
            <button type="button">Create playlist</button>
          </header>
          <div class="empty-state">
            <strong>No playlists yet.</strong>
            Create a playlist to start arranging curated media experiences.
          </div>
        </section>
      `;
    }

    return html`
      <section class="page-panel" aria-label="Playlists">
        <header>
          <div>
            <h2>Playlists</h2>
            <p>Track publishing status and endpoint coverage for each playlist.</p>
          </div>
          <button type="button">Create playlist</button>
        </header>
        <table>
          <thead>
            <tr>
              <th scope="col">Playlist</th>
              <th scope="col">Status</th>
              <th scope="col">Items</th>
              <th scope="col">Endpoints</th>
              <th scope="col">Owner</th>
              <th scope="col">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            ${this.data.playlists.map(
              (playlist) => html`
                <tr>
                  <td>${playlist.name}</td>
                  <td>
                    <span class="badge ${this.mapPlaylistTone(playlist.status)}">
                      ${this.formatPlaylistStatus(playlist.status)}
                    </span>
                  </td>
                  <td>${playlist.itemCount}</td>
                  <td>${playlist.endpointCount}</td>
                  <td>${playlist.owner}</td>
                  <td>${playlist.updatedAt}</td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </section>
    `;
  }

  private renderEndpoints() {
    const endpoints = this.data.endpoints;
    const copyFeedback = this.endpointCopyFeedback
      ? html`<p class="sr-only" role="status" aria-live="polite">${this.endpointCopyFeedback}</p>`
      : nothing;

    const table = endpoints.length
      ? html`
          <table>
            <thead>
              <tr>
                <th scope="col">Endpoint</th>
                <th scope="col">Playlist</th>
                <th scope="col">Embed URL</th>
                <th scope="col">Status</th>
                <th scope="col">Last Sync</th>
                <th scope="col">Latency</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${endpoints.map((endpoint) => this.renderEndpointRow(endpoint))}
            </tbody>
          </table>
        `
      : html`
          <div class="empty-state">
            <strong>No endpoints defined.</strong>
            Register an endpoint to start embedding the player into external sites.
          </div>
        `;

    return html`
      <section class="page-panel" aria-label="Endpoint management">
        <header>
          <div>
            <h2>Endpoints</h2>
            <p>Provision shareable embeds and assign playlists when you are ready.</p>
          </div>
          <button type="button" data-testid="endpoint-add-button" @click=${this.openCreateEndpointForm}>
            Add endpoint
          </button>
        </header>
        ${this.renderEndpointForm()}
        ${table}
        ${copyFeedback}
      </section>
    `;
  }

  private renderEndpointRow(endpoint: AdminEndpoint) {
    const playlistName = this.resolvePlaylistName(endpoint.playlistId ?? null);
    const embedUrl = this.buildEmbedUrl(endpoint.slug);

    return html`
      <tr>
        <td>${endpoint.name}</td>
        <td>${playlistName}</td>
        <td>
          <span class="embed-url">
            ${embedUrl}
            <button
              type="button"
              @click=${() => this.handleCopyEndpointUrl(embedUrl)}
              data-testid="endpoint-copy-url"
            >
              Copy
            </button>
          </span>
        </td>
        <td>
          <span class="badge ${this.mapEndpointTone(endpoint.status)}">
            ${this.formatEndpointStatus(endpoint.status)}
          </span>
        </td>
        <td>${endpoint.lastSync || '—'}</td>
        <td>${endpoint.latencyMs ? `${endpoint.latencyMs} ms` : '—'}</td>
        <td>
          <div class="table-actions">
            <button type="button" @click=${() => this.openEditEndpointForm(endpoint)} data-testid="endpoint-edit">
              Edit
            </button>
            <button
              type="button"
              class="danger"
              @click=${() => this.handleEndpointDelete(endpoint.id)}
              data-testid="endpoint-remove"
            >
              Remove
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  private renderEndpointForm() {
    if (!this.endpointFormOpen) {
      return nothing;
    }

    const isEdit = this.endpointFormMode === 'edit';
    const embedUrl = this.endpointFormSlug ? this.buildEmbedUrl(this.endpointFormSlug) : '';

    return html`
      <form class="endpoint-form" data-testid="endpoint-form" @submit=${this.handleEndpointFormSubmit}>
        <header>
          <div>
            <h3>${isEdit ? 'Edit endpoint' : 'Create endpoint'}</h3>
            <p class="helper">Endpoint ID ${this.endpointFormSlug || 'pending assignment'}</p>
          </div>
          <button type="button" class="secondary" @click=${this.closeEndpointForm}>Close</button>
        </header>
        <div class="endpoint-form-grid">
          <label for="endpoint-name">
            Endpoint name
            <input
              id="endpoint-name"
              type="text"
              name="endpoint-name"
              placeholder="Kiosk display, livestream, ..."
              .value=${this.endpointFormName}
              @input=${this.handleEndpointNameInput}
              required
            />
          </label>
          <label for="endpoint-playlist">
            Assign playlist
            <select
              id="endpoint-playlist"
              name="endpoint-playlist"
              .value=${this.endpointFormPlaylistId}
              @change=${this.handleEndpointPlaylistChange}
            >
              <option value="">Unassigned</option>
              ${this.data.playlists.map(
                (playlist) => html`<option value=${playlist.id}>${playlist.name}</option>`
              )}
            </select>
            <span class="helper">Endpoints can be created empty and linked later.</span>
          </label>
          <div>
            <span class="helper">Embed URL</span>
            <div class="embed-url">
              ${embedUrl}
              <button type="button" @click=${() => this.handleCopyEndpointUrl(embedUrl)} ?disabled=${!embedUrl}>
                Copy
              </button>
            </div>
          </div>
        </div>
        ${this.endpointFormError ? html`<p class="error" role="alert">${this.endpointFormError}</p>` : nothing}
        <footer>
          <button type="button" class="secondary" @click=${this.closeEndpointForm}>Cancel</button>
          <button type="submit" class="primary">${isEdit ? 'Save changes' : 'Create endpoint'}</button>
        </footer>
      </form>
    `;
  }

  private openCreateEndpointForm() {
    this.endpointFormMode = 'create';
    this.endpointEditingId = null;
    this.endpointFormName = '';
    this.endpointFormPlaylistId = '';
    this.endpointFormSlug = this.generateEndpointSlug();
    this.endpointFormError = null;
    this.endpointFormOpen = true;
  }

  private openEditEndpointForm(endpoint: AdminEndpoint) {
    this.endpointFormMode = 'edit';
    this.endpointEditingId = endpoint.id;
    this.endpointFormName = endpoint.name;
    this.endpointFormPlaylistId = endpoint.playlistId ?? '';
    this.endpointFormSlug = endpoint.slug;
    this.endpointFormError = null;
    this.endpointFormOpen = true;
  }

  private closeEndpointForm() {
    this.endpointFormOpen = false;
    this.endpointEditingId = null;
    this.endpointFormName = '';
    this.endpointFormPlaylistId = '';
    this.endpointFormSlug = '';
    this.endpointFormError = null;
  }

  private handleEndpointFormSubmit(event: Event) {
    event.preventDefault();
    const name = this.endpointFormName.trim();

    if (!name) {
      this.endpointFormError = 'Please provide an endpoint name.';
      return;
    }

    const playlistId = this.endpointFormPlaylistId || null;
    const endpoints = [...this.data.endpoints];

    if (this.endpointFormMode === 'create') {
      let slug = this.endpointFormSlug || this.generateEndpointSlug();
      const existingSlugs = new Set(endpoints.map((endpoint) => endpoint.slug));
      while (existingSlugs.has(slug)) {
        slug = this.generateEndpointSlug();
      }

      const newEndpoint: AdminEndpoint = {
        id: this.createEndpointId(),
        name,
        slug,
        playlistId,
        status: 'pending',
        lastSync: 'Never',
        latencyMs: undefined
      };

      endpoints.push(newEndpoint);
      this.persistEndpoints(endpoints);
    } else if (this.endpointFormMode === 'edit' && this.endpointEditingId) {
      const index = endpoints.findIndex((endpoint) => endpoint.id === this.endpointEditingId);

      if (index === -1) {
        this.endpointFormError = 'Endpoint no longer exists.';
        return;
      }

      endpoints[index] = {
        ...endpoints[index],
        name,
        playlistId
      };

      this.persistEndpoints(endpoints);
    }

    this.closeEndpointForm();
  }

  private handleEndpointNameInput(event: Event) {
    const target = event.target as HTMLInputElement | null;
    this.endpointFormName = target?.value ?? '';
    if (this.endpointFormError) {
      this.endpointFormError = null;
    }
  }

  private handleEndpointPlaylistChange(event: Event) {
    const target = event.target as HTMLSelectElement | null;
    this.endpointFormPlaylistId = target?.value ?? '';
  }

  private handleEndpointDelete(id: string) {
    const endpoint = this.data.endpoints.find((item) => item.id === id);
    if (!endpoint) {
      return;
    }

    const confirmed = window.confirm(
      `Remove endpoint "${endpoint.name}"? Existing embeds will stop receiving updates.`
    );

    if (!confirmed) {
      return;
    }

    const remaining = this.data.endpoints.filter((item) => item.id !== id);
    this.persistEndpoints(remaining);

    if (this.endpointEditingId === id) {
      this.closeEndpointForm();
    }
  }

  private async handleCopyEndpointUrl(url: string) {
    if (!url) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        this.endpointCopyFeedback = 'Embed URL copied to clipboard.';
      } else {
        this.copyTextFallback(url);
        this.endpointCopyFeedback = 'Embed URL ready to paste.';
      }
    } catch (error) {
      console.error('Failed to copy embed URL', error);
      this.endpointCopyFeedback = 'Copy failed. Select and copy manually.';
    }

    if (this.endpointCopyTimeout !== null) {
      window.clearTimeout(this.endpointCopyTimeout);
    }

    this.endpointCopyTimeout = window.setTimeout(() => {
      this.endpointCopyFeedback = null;
      this.endpointCopyTimeout = null;
    }, 4000);
  }

  private copyTextFallback(value: string) {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  private getEmbedBaseUrl(): string {
    if (typeof window === 'undefined' || !window.location) {
      return '/embed/';
    }

    const origin = window.location.origin ?? '';
    const trimmedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    return `${trimmedOrigin}/embed/`;
  }

  private buildEmbedUrl(slug: string): string {
    return `${this.getEmbedBaseUrl()}${slug}`;
  }

  private resolvePlaylistName(playlistId: string | null): string {
    if (!playlistId) {
      return 'Unassigned';
    }

    const playlist = this.data.playlists.find((item) => item.id === playlistId);
    return playlist?.name ?? 'Unassigned';
  }

  private persistEndpoints(endpoints: AdminEndpoint[]) {
    const metrics = {
      ...this.data.metrics,
      ...this.computeEndpointMetrics(endpoints)
    };

    this.data = {
      ...this.data,
      endpoints,
      metrics
    };
  }

  private computeEndpointMetrics(endpoints: AdminEndpoint[]) {
    const activeEndpoints = endpoints.filter((endpoint) => endpoint.status === 'operational').length;
    const endpointsPending = endpoints.filter((endpoint) => endpoint.status === 'pending').length;

    return { activeEndpoints, endpointsPending };
  }

  private generateEndpointSlug(): string {
    const existing = new Set(this.data.endpoints.map((endpoint) => endpoint.slug));
    let candidate = '';

    do {
      candidate = Math.floor(100_000_000 + Math.random() * 900_000_000).toString();
    } while (existing.has(candidate));

    return candidate;
  }

  private createEndpointId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `endpoint-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private renderAnalytics() {
    if (!this.data.analytics.length) {
      return html`
        <section class="page-panel" aria-label="Analytics overview">
          <header>
            <div>
              <h2>Analytics</h2>
              <p>Connect an analytics provider to track playback performance.</p>
            </div>
            <button type="button">Configure analytics</button>
          </header>
          <div class="empty-state">
            <strong>No analytics connected.</strong>
            Wire up event forwarding to populate engagement metrics.
          </div>
        </section>
      `;
    }

    return html`
      <section class="page-panel" aria-label="Analytics">
        <header>
          <div>
            <h2>Analytics</h2>
            <p>Playback engagement across connected endpoints.</p>
          </div>
          <button type="button">Configure analytics</button>
        </header>
        <div class="analytics-grid">
          ${this.data.analytics.map(
            (metric) => html`
              <article class="analytics-card">
                <h3>${metric.label}</h3>
                <span class="analytics-value">
                  ${metric.unit ? `${metric.value}${metric.unit}` : this.numberFormatter.format(metric.value)}
                </span>
                <span class="analytics-delta ${metric.delta >= 0 ? 'positive' : 'negative'}">
                  ${metric.delta >= 0 ? '+' : ''}${metric.delta}% vs last period
                </span>
              </article>
            `
          )}
        </div>
      </section>
    `;
  }

  private renderBranding() {
    const branding = this.data.branding;
    return html`
      <section class="page-panel" aria-label="Branding settings">
        <header>
          <div>
            <h2>Branding</h2>
            <p>Control the appearance of embeds and the admin console.</p>
          </div>
          <button type="button">Edit theme</button>
        </header>
        <ul class="metadata-list">
          <li class="metadata-item"><span>Theme</span><span>${branding.theme}</span></li>
          <li class="metadata-item"><span>Accent color</span><span>${branding.accentColor}</span></li>
          <li class="metadata-item"><span>Background</span><span>${branding.backgroundColor}</span></li>
          <li class="metadata-item"><span>Font</span><span>${branding.fontFamily}</span></li>
          <li class="metadata-item"><span>Token overrides</span><span>${branding.tokenOverrides}</span></li>
          <li class="metadata-item"><span>Logo</span><span>${branding.logo ?? 'Not configured'}</span></li>
        </ul>
      </section>
    `;
  }

  private renderAccessControl() {
    return html`
      <section class="page-panel" aria-label="Access control">
        <header>
          <div>
            <h2>Access Control</h2>
            <p>Manage user roles and monitor access status.</p>
          </div>
          <div class="table-actions">
            <button
              class="primary"
              type="button"
              ?disabled=${!this.isAuthenticated}
              aria-disabled=${!this.isAuthenticated ? 'true' : 'false'}
              title=${this.isAuthenticated ? 'Invite user' : 'Sign in to invite users'}
              @click=${this.handleInviteToggle}
            >
              ${this.inviteFormOpen ? 'Cancel invite' : 'Invite user'}
            </button>
            ${this.isAuthenticated
              ? html`<button class="secondary" type="button" @click=${this.handleSignOut}>Sign out</button>`
              : nothing}
          </div>
        </header>
        ${this.isAuthenticated
          ? html`
              ${this.renderSignedInBanner()}
              ${this.showDefaultAdminWarning ? this.renderDefaultAdminWarning() : nothing}
              ${this.renderInviteForm()}
              ${this.renderUsersTable()}
            `
          : this.renderLoginCard()}
      </section>
    `;
  }

  private renderLoginForm(testId: string, heading: string, description: string) {
    const headingId = `${testId}-title`;
    const descriptionId = `${testId}-description`;
    const errorId = `${testId}-error`;
    const describedBy = this.loginError ? `${descriptionId} ${errorId}` : descriptionId;

    return html`
      <form
        class="login-card"
        data-testid=${testId}
        @submit=${this.handleLoginSubmit}
        novalidate
        aria-labelledby=${headingId}
        aria-describedby=${describedBy}
      >
        <h3 id=${headingId}>${heading}</h3>
        <p id=${descriptionId}>${description}</p>
        <div class="form-group">
          <label for="login-username">Username</label>
          <input
            id="login-username"
            name="username"
            type="text"
            autocomplete="username"
            .value=${this.loginUsername}
            @input=${this.handleLoginInput}
            required
          />
        </div>
        <div class="form-group">
          <label for="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autocomplete="current-password"
            .value=${this.loginPassword}
            @input=${this.handleLoginInput}
            required
          />
        </div>
        ${this.loginError
          ? html`<p class="form-error" id=${errorId} role="alert">${this.loginError}</p>`
          : nothing}
        <button class="primary" type="submit" ?disabled=${this.loginPending}>
          ${this.loginPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    `;
  }

  private renderLoginCard() {
    return this.renderLoginForm(
      'access-login-form',
      'Sign in to manage access',
      'Use the default admin credentials (admin/admin) on first launch.'
    );
  }

  private renderSignedInBanner() {
    if (!this.authenticatedUser) {
      return nothing;
    }

    return html`<p class="signed-in-banner" role="status">Signed in as <strong>${this.userDisplayName}</strong></p>`;
  }

  private renderDefaultAdminWarning() {
    return html`
      <div class="callout warning" role="alert" data-testid="default-admin-warning">
        <strong>Default admin in use.</strong>
        <span>Please create your own admin account and remove the default admin.</span>
      </div>
    `;
  }

  private renderInviteForm() {
    if (!this.isAuthenticated) {
      return nothing;
    }

    if (this.inviteSuccess && !this.inviteFormOpen) {
      return html`<p class="form-success" role="status">${this.inviteSuccess}</p>`;
    }

    if (!this.inviteFormOpen) {
      return nothing;
    }

    const errorId = 'invite-error';
    const describedBy = this.inviteError ? errorId : '';

    return html`
      <form
        class="invite-form"
        @submit=${this.handleInviteSubmit}
        aria-describedby=${describedBy || nothing}
      >
        <div class="invite-grid">
          <div class="form-group">
            <label for="invite-name">Full name</label>
            <input
              id="invite-name"
              name="name"
              type="text"
              autocomplete="name"
              .value=${this.inviteName}
              @input=${this.handleInviteInput}
              required
            />
          </div>
          <div class="form-group">
            <label for="invite-username">Username</label>
            <input
              id="invite-username"
              name="username"
              type="text"
              autocomplete="username"
              .value=${this.inviteUsername}
              @input=${this.handleInviteInput}
              required
            />
          </div>
          <div class="form-group">
            <label for="invite-email">Email</label>
            <input
              id="invite-email"
              name="email"
              type="email"
              autocomplete="email"
              .value=${this.inviteEmail}
              @input=${this.handleInviteInput}
              required
            />
          </div>
          <div class="form-group">
            <label for="invite-password">Password</label>
            <input
              id="invite-password"
              name="password"
              type="password"
              autocomplete="new-password"
              .value=${this.invitePassword}
              @input=${this.handleInviteInput}
              required
            />
          </div>
        </div>
        ${this.inviteError
          ? html`<p class="form-error" id=${errorId} role="alert">${this.inviteError}</p>`
          : nothing}
        <div class="invite-actions">
          <button class="secondary" type="button" @click=${this.handleInviteToggle}>Cancel</button>
          <button class="primary" type="submit" ?disabled=${this.inviteSubmitting}>
            ${this.inviteSubmitting ? 'Creating…' : 'Create admin'}
          </button>
        </div>
      </form>
    `;
  }

  private renderUsersTable() {
    if (this.isLoadingUsers) {
      return html`
        <div class="empty-state">
          <strong>Loading users…</strong>
          Fetching the latest administrators.
        </div>
      `;
    }

    if (!this.data.users.length) {
      return html`
        <div class="empty-state">
          <strong>No users provisioned.</strong>
          Invite collaborators to administrate media and endpoints.
        </div>
      `;
    }

    return html`
      <table class="table" aria-label="Provisioned users">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <th scope="col">Last Active</th>
          </tr>
        </thead>
        <tbody>
          ${this.data.users.map(
            (user) => html`
              <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${this.formatUserRole(user.role)}</td>
                <td>
                  <span class="badge ${this.mapUserTone(user.status)}">
                    ${this.formatUserStatus(user.status)}
                  </span>
                </td>
                <td>${this.formatLastActive(user.lastActive)}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }

  private handleLoginInput(event: Event) {
    const target = event.target as HTMLInputElement | null;
    if (!target) {
      return;
    }

    if (target.name === 'username') {
      this.loginUsername = target.value;
    } else if (target.name === 'password') {
      this.loginPassword = target.value;
    }

    if (this.loginError) {
      this.loginError = null;
    }
  }

  private async handleLoginSubmit(event: Event) {
    event.preventDefault();
    if (this.loginPending) {
      return;
    }

    const username = this.loginUsername.trim();
    const password = this.loginPassword;

    if (!username || !password) {
      this.loginError = 'Enter both username and password.';
      return;
    }

    await this.authenticate(username, password);
  }

  private async handleSignOut() {
    try {
      if (this.sessionToken) {
        await this.authorizedFetch(`${ACCESS_API_BASE}/logout`, { method: 'POST' });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to invalidate session token', error);
    } finally {
      this.clearSessionToken();
      this.isAuthenticated = false;
      this.authenticatedUser = null;
      this.loginUsername = '';
      this.loginPassword = '';
      this.loginError = null;
      this.showDefaultAdminWarning = false;
      this.data = createEmptyAdminData();
      this.inviteFormOpen = false;
      this.resetInviteForm();
      this.inviteSuccess = null;
    }
  }

  private async authenticate(username: string, password: string) {
    this.loginPending = true;
    this.loginError = null;

    try {
      const response = await fetch(`${ACCESS_API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error(await this.readApiError(response));
      }

      const payload = (await response.json()) as AccessLoginPayload;
      this.persistSession(payload.token);
      this.applySessionState(payload);
      this.inviteFormOpen = false;
      this.resetInviteForm();
      this.inviteSuccess = null;
      this.inviteError = null;
    } catch (error) {
      this.loginError = this.getErrorMessage(error, 'Unable to sign in.');
    } finally {
      this.loginPending = false;
    }
  }

  private applySessionState(payload: AccessSessionPayload) {
    this.applyUsersState(payload);
    this.isAuthenticated = true;
    this.authenticatedUser = payload.user.name;
    this.loginUsername = '';
    this.loginPassword = '';
    this.loginError = null;
  }

  private applyUsersState(payload: AccessUsersPayload) {
    this.data = { ...this.data, users: payload.users };
    this.showDefaultAdminWarning = payload.showDefaultAdminWarning;
    this.isLoadingUsers = false;
  }

  private resetInviteForm(clearSuccess = true) {
    this.inviteName = '';
    this.inviteUsername = '';
    this.inviteEmail = '';
    this.invitePassword = '';
    this.inviteSubmitting = false;
    this.inviteError = null;
    if (clearSuccess) {
      this.inviteSuccess = null;
    }
  }

  private handleInviteToggle() {
    if (!this.isAuthenticated) {
      return;
    }

    if (this.inviteFormOpen) {
      this.inviteFormOpen = false;
      this.resetInviteForm(false);
    } else {
      this.inviteFormOpen = true;
      this.resetInviteForm();
    }
  }

  private handleInviteInput(event: Event) {
    const target = event.target as HTMLInputElement | null;
    if (!target) {
      return;
    }

    switch (target.name) {
      case 'name':
        this.inviteName = target.value;
        break;
      case 'username':
        this.inviteUsername = target.value;
        break;
      case 'email':
        this.inviteEmail = target.value;
        break;
      case 'password':
        this.invitePassword = target.value;
        break;
      default:
        break;
    }

    if (this.inviteError) {
      this.inviteError = null;
    }
  }

  private async handleInviteSubmit(event: Event) {
    event.preventDefault();
    if (this.inviteSubmitting) {
      return;
    }

    const name = this.inviteName.trim();
    const username = this.inviteUsername.trim();
    const email = this.inviteEmail.trim();
    const password = this.invitePassword;

    if (!name || !username || !email || !password) {
      this.inviteError = 'Fill in all invite fields.';
      return;
    }

    this.inviteSubmitting = true;
    this.inviteError = null;

    try {
      const response = await this.authorizedFetch(`${ACCESS_API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, username, email, password })
      });

      if (!response.ok) {
        throw new Error(await this.readApiError(response));
      }

      const payload = (await response.json()) as AccessUserCreatedPayload;
      this.applyUsersState(payload);
      this.inviteSuccess = `Created admin account for ${payload.user.name}.`;
      this.inviteFormOpen = false;
      this.resetInviteForm(false);
    } catch (error) {
      this.inviteError = this.getErrorMessage(error, 'Unable to create admin account.');
    } finally {
      this.inviteSubmitting = false;
    }
  }

  private async restoreSession() {
    let token: string | null = null;
    try {
      token = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Unable to access session storage', error);
    }

    if (!token) {
      return;
    }

    this.sessionToken = token;
    this.isLoadingUsers = true;

    try {
      const response = await this.authorizedFetch(`${ACCESS_API_BASE}/session`);
      if (!response.ok) {
        throw new Error(await this.readApiError(response));
      }

      const payload = (await response.json()) as AccessSessionPayload;
      this.applySessionState(payload);
    } catch (error) {
      this.clearSessionToken();
      this.isAuthenticated = false;
      this.authenticatedUser = null;
      // eslint-disable-next-line no-console
      console.warn('Session restoration failed', error);
    } finally {
      this.isLoadingUsers = false;
    }
  }

  private authorizedFetch(input: RequestInfo, init: RequestInit = {}) {
    const headers = new Headers(init.headers ?? {});
    if (this.sessionToken) {
      headers.set('Authorization', `Bearer ${this.sessionToken}`);
    }

    return fetch(input, {
      ...init,
      headers
    });
  }

  private async readApiError(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as ApiErrorPayload;
      if (payload?.message) {
        return payload.message;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to parse API error response', error);
    }

    if (response.status >= 500) {
      return 'Access control service is unavailable.';
    }

    if (response.status === 401) {
      return 'Authentication required.';
    }

    if (response.status === 403) {
      return 'You do not have permission to perform this action.';
    }

    return 'Request failed. Please try again.';
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }

  private persistSession(token: string) {
    this.sessionToken = token;
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Unable to persist session token', error);
    }
  }

  private clearSessionToken() {
    this.sessionToken = null;
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Unable to clear session token', error);
    }
  }

  private get userDisplayName(): string {
    return this.authenticatedUser ?? 'Admin';
  }

  private get userInitials(): string {
    const value = this.authenticatedUser?.trim();
    if (!value) {
      return 'AD';
    }

    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
    }

    return value.slice(0, 2).toUpperCase();
  }

  private renderConfiguration() {
    if (!this.data.configuration.length) {
      return html`
        <section class="page-panel" aria-label="Configuration overview">
          <header>
            <div>
              <h2>Configuration</h2>
              <p>Review runtime settings provided to the player and admin services.</p>
            </div>
            <button type="button">Load config</button>
          </header>
          <div class="empty-state">
            <strong>No configuration loaded.</strong>
            Supply uxplayer.config.json or connect to the configuration API.
          </div>
        </section>
      `;
    }

    return html`
      <section class="page-panel" aria-label="Configuration">
        <header>
          <div>
            <h2>Configuration</h2>
            <p>Current runtime configuration keys shared with embeds.</p>
          </div>
          <button type="button">Load config</button>
        </header>
        <table>
          <thead>
            <tr>
              <th scope="col">Key</th>
              <th scope="col">Value</th>
              <th scope="col">Description</th>
              <th scope="col">Mutable</th>
            </tr>
          </thead>
          <tbody>
            ${this.data.configuration.map(
              (entry) => html`
                <tr>
                  <td>${entry.key}</td>
                  <td>${entry.value}</td>
                  <td>${entry.description}</td>
                  <td>${entry.mutable ? 'Yes' : 'No'}</td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </section>
    `;
  }

  private renderDiagnostics() {
    if (!this.data.diagnostics.length) {
      return html`
        <section class="page-panel" aria-label="Diagnostics">
          <header>
            <div>
              <h2>Diagnostics</h2>
              <p>Run health checks to verify connectivity and manifest integrity.</p>
            </div>
            <button type="button">Run diagnostics</button>
          </header>
          <div class="empty-state">
            <strong>No diagnostics executed.</strong>
            Execute the diagnostic suite to view system health.
          </div>
        </section>
      `;
    }

    return html`
      <section class="page-panel" aria-label="Diagnostics">
        <header>
          <div>
            <h2>Diagnostics</h2>
            <p>Latest health check results for player services.</p>
          </div>
          <button type="button">Run diagnostics</button>
        </header>
        <ul class="list">
          ${this.data.diagnostics.map((check) => this.renderDiagnosticCheck(check))}
        </ul>
      </section>
    `;
  }

  private renderAuditTrail() {
    if (!this.data.auditTrail.length) {
      return html`
        <section class="page-panel" aria-label="Audit trail">
          <header>
            <div>
              <h2>Audit Trail</h2>
              <p>Review who changed playlists, endpoints, or configuration.</p>
            </div>
            <button type="button">Export</button>
          </header>
          <div class="empty-state">
            <strong>No activity recorded.</strong>
            Actions performed in the admin console will be logged here.
          </div>
        </section>
      `;
    }

    return html`
      <section class="page-panel" aria-label="Audit trail">
        <header>
          <div>
            <h2>Audit Trail</h2>
            <p>Chronological log of administrative changes.</p>
          </div>
          <button type="button">Export</button>
        </header>
        <table>
          <thead>
            <tr>
              <th scope="col">Actor</th>
              <th scope="col">Action</th>
              <th scope="col">Target</th>
              <th scope="col">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            ${this.data.auditTrail.map(
              (event) => html`
                <tr>
                  <td>${event.actor}</td>
                  <td>${event.action}</td>
                  <td>${event.target}</td>
                  <td>${event.timestamp}</td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </section>
    `;
  }

  private renderDiagnosticCheck(check: DiagnosticCheck) {
    return html`
      <li>
        <div>
          <p class="list-title">${check.name}</p>
          <p class="list-subtitle">${check.description}</p>
          <p class="list-subtitle">Last run: ${check.lastRun}</p>
        </div>
        <span class="badge ${this.mapDiagnosticTone(check.status)}">
          ${this.formatDiagnosticStatus(check.status)}
        </span>
      </li>
    `;
  }

  private renderNavButton(item: NavItem) {
    const isActive = this.activePage === item.page;
    return html`
      <button
        class="nav-button ${isActive ? 'is-active' : ''}"
        type="button"
        data-page="${item.page}"
        @click=${() => this.handleNavigation(item.page)}
      >
        ${item.label}
      </button>
    `;
  }

  private handleNavigation(page: AdminPage) {
    this.activePage = page;
  }

  private get pageTitle(): string {
    switch (this.activePage) {
      case 'dashboard':
        return 'Dashboard';
      case 'media-library':
        return 'Media Library';
      case 'playlists':
        return 'Playlists';
      case 'endpoints':
        return 'Endpoints';
      case 'analytics':
        return 'Analytics';
      case 'branding':
        return 'Branding';
      case 'access-control':
        return 'Access Control';
      case 'configuration':
        return 'Configuration';
      case 'diagnostics':
        return 'Diagnostics';
      case 'audit-trail':
        return 'Audit Trail';
      default:
        return 'Dashboard';
    }
  }

  private get pageSubtitle(): string {
    switch (this.activePage) {
      case 'dashboard':
        return 'Monitor the health of your media catalog and embedding endpoints.';
      case 'media-library':
        return 'Ingest audio and video assets ready for playlist publishing.';
      case 'playlists':
        return 'Orchestrate curated experiences across devices and endpoints.';
      case 'endpoints':
        return 'Manage embed targets and ensure deployments stay in sync.';
      case 'analytics':
        return 'Review engagement signals and playback diagnostics.';
      case 'branding':
        return 'Align player visuals with your organization’s design system.';
      case 'access-control':
        return 'Provision roles and enforce principle of least privilege.';
      case 'configuration':
        return 'Audit configuration keys shared with the player runtime.';
      case 'diagnostics':
        return 'Verify infrastructure health and manifest integrity.';
      case 'audit-trail':
        return 'Trace administrative changes for compliance and rollback.';
      default:
        return '';
    }
  }

  private getDashboardStats() {
    const metrics = this.data.metrics;
    const assetBadge = metrics.mediaAssetsNew > 0 ? `+${metrics.mediaAssetsNew} new` : 'Awaiting ingest';
    const assetTrend = metrics.mediaAssets > 0 ? `${metrics.mediaAssetsNew} added this week` : 'No assets scanned yet';

    const playlistBadge = metrics.playlistsPending > 0 ? `${metrics.playlistsPending} pending` : 'No pending items';
    const playlistTrend = metrics.publishedPlaylists > 0 ? 'Playlists live' : 'Create your first playlist';

    const endpointBadge = metrics.endpointsPending > 0 ? `${metrics.endpointsPending} pending` : 'All endpoints synced';
    const endpointTrend = metrics.activeEndpoints > 0 ? 'Endpoints operational' : 'Connect your first endpoint';

    const errorTrend = metrics.errorDelta === 0 ? 'Stable' : `${metrics.errorDelta > 0 ? '+' : ''}${metrics.errorDelta} vs yesterday`;

    return [
      {
        label: 'Total Media Assets',
        value: this.numberFormatter.format(metrics.mediaAssets),
        badgeLabel: assetBadge,
        badgeTone: metrics.mediaAssetsNew > 0 ? 'neutral' : 'warning',
        trendLabel: assetTrend,
        trendTone: metrics.mediaAssets > 0 ? 'positive' : 'warning'
      },
      {
        label: 'Published Playlists',
        value: this.numberFormatter.format(metrics.publishedPlaylists),
        badgeLabel: playlistBadge,
        badgeTone: metrics.playlistsPending > 0 ? 'warning' : 'positive',
        trendLabel: playlistTrend,
        trendTone: metrics.publishedPlaylists > 0 ? 'positive' : 'warning'
      },
      {
        label: 'Active Endpoints',
        value: this.numberFormatter.format(metrics.activeEndpoints),
        badgeLabel: endpointBadge,
        badgeTone: metrics.endpointsPending > 0 ? 'warning' : 'positive',
        trendLabel: endpointTrend,
        trendTone: metrics.activeEndpoints > 0 ? 'positive' : 'warning'
      },
      {
        label: 'Playback Errors',
        value: this.numberFormatter.format(metrics.playbackErrors),
        badgeLabel: errorTrend,
        badgeTone: metrics.playbackErrors > 0 ? 'negative' : 'neutral',
        trendLabel: metrics.playbackErrors > 0 ? 'Investigate error logs' : 'No playback errors recorded',
        trendTone: metrics.playbackErrors > 0 ? 'negative' : 'positive'
      }
    ];
  }

  private mergeAdminData(value: AdminData | undefined): AdminData {
    const base = createEmptyAdminData();
    if (!value) {
      return base;
    }

    return {
      ...base,
      ...value,
      metrics: {
        ...base.metrics,
        ...value.metrics
      },
      branding: {
        ...base.branding,
        ...value.branding
      },
      mediaLibrary: value.mediaLibrary ?? base.mediaLibrary,
      playlists: value.playlists ?? base.playlists,
      endpoints: value.endpoints ?? base.endpoints,
      analytics: value.analytics ?? base.analytics,
      users: value.users ?? base.users,
      configuration: value.configuration ?? base.configuration,
      diagnostics: value.diagnostics ?? base.diagnostics,
      auditTrail: value.auditTrail ?? base.auditTrail
    };
  }

  private bootstrapFromWindow() {
    const globalContext = window as typeof window & { __UX_ADMIN_DATA__?: Partial<AdminData> };
    if (globalContext.__UX_ADMIN_DATA__) {
      this.data = globalContext.__UX_ADMIN_DATA__ as AdminData;
    }
  }

  private mapPlaylistTone(status: AdminPlaylist['status']): Tone {
    switch (status) {
      case 'published':
        return 'positive';
      case 'scheduled':
        return 'neutral';
      case 'draft':
        return 'neutral';
      case 'needs_media':
        return 'warning';
      case 'archived':
        return 'negative';
      default:
        return 'neutral';
    }
  }

  private formatPlaylistStatus(status: AdminPlaylist['status']): string {
    switch (status) {
      case 'published':
        return 'Published';
      case 'scheduled':
        return 'Scheduled';
      case 'draft':
        return 'Draft';
      case 'needs_media':
        return 'Needs media';
      case 'archived':
        return 'Archived';
      default:
        return status;
    }
  }

  private mapEndpointTone(status: AdminEndpoint['status']): Tone {
    switch (status) {
      case 'operational':
        return 'positive';
      case 'degraded':
        return 'warning';
      case 'pending':
        return 'neutral';
      case 'disabled':
        return 'negative';
      default:
        return 'neutral';
    }
  }

  private formatEndpointStatus(status: AdminEndpoint['status']): string {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded';
      case 'pending':
        return 'Pending';
      case 'disabled':
        return 'Disabled';
      default:
        return status;
    }
  }

  private mapAuditTone(action: string): Tone {
    if (/deleted|removed|revoked|rollback/i.test(action)) {
      return 'negative';
    }

    if (/flagged|warning/i.test(action)) {
      return 'warning';
    }

    if (/published|created|added/i.test(action)) {
      return 'positive';
    }

    return 'neutral';
  }

  private formatDuration(duration: number): string {
    if (!Number.isFinite(duration) || duration <= 0) {
      return '—';
    }

    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  private mapAssetTone(status: string): Tone {
    switch (status) {
      case 'ready':
        return 'positive';
      case 'processing':
        return 'neutral';
      case 'error':
        return 'negative';
      default:
        return 'neutral';
    }
  }

  private formatAssetStatus(status: string): string {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'processing':
        return 'Processing';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  }

  private formatUserRole(role: string): string {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  }

  private formatLastActive(value: string): string {
    if (!value || value === 'Never') {
      return 'Never';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  private mapUserTone(status: string): Tone {
    switch (status) {
      case 'active':
        return 'positive';
      case 'invited':
        return 'neutral';
      case 'suspended':
        return 'negative';
      default:
        return 'neutral';
    }
  }

  private formatUserStatus(status: string): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'invited':
        return 'Invited';
      case 'suspended':
        return 'Suspended';
      default:
        return status;
    }
  }

  private mapDiagnosticTone(status: DiagnosticCheck['status']): Tone {
    switch (status) {
      case 'pass':
        return 'positive';
      case 'warn':
        return 'warning';
      case 'fail':
        return 'negative';
      default:
        return 'neutral';
    }
  }

  private formatDiagnosticStatus(status: DiagnosticCheck['status']): string {
    switch (status) {
      case 'pass':
        return 'Pass';
      case 'warn':
        return 'Warn';
      case 'fail':
        return 'Fail';
      default:
        return status;
    }
  }

  private renderSyncStatus(): string {
    if (this.data.metrics.activeEndpoints === 0) {
      return 'Awaiting first sync';
    }

    if (this.data.metrics.endpointsPending > 0) {
      return `${this.data.metrics.endpointsPending} endpoints pending approval`;
    }

    return 'Live sync active';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ux-admin-app': UxAdminApp;
  }
}
