import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

type Tone = 'positive' | 'negative' | 'warning' | 'neutral';

type StatCard = {
  label: string;
  value: string;
  badge: { label: string; tone: Tone };
  trend: { label: string; tone: Tone };
};

type PlaylistEntry = {
  name: string;
  status: { label: string; tone: Tone };
  updated: string;
  owner: string;
};

type EndpointHealth = {
  name: string;
  subtitle: string;
  tone: Tone;
};

type TimelineEvent = {
  tone: Tone;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
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

    .nav-link {
      padding: 10px 12px;
      border-radius: 8px;
      color: rgba(226, 232, 240, 0.86);
      transition: background 0.2s ease, color 0.2s ease;
    }

    .nav-link:hover {
      background: rgba(148, 163, 184, 0.15);
    }

    .nav-link.is-active {
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

    button.ghost {
      background: rgba(15, 23, 42, 0.06);
      color: var(--text);
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

    .panel {
      background: var(--surface);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(15, 23, 42, 0.05);
      display: grid;
      gap: 20px;
      align-content: start;
    }

    .panel header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .panel h2 {
      margin: 0;
      font-size: 20px;
      letter-spacing: -0.01em;
    }

    .panel p {
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
      margin: 4px 0 0;
      color: var(--text-muted);
      font-size: 13px;
    }

    .list-subtitle.warning {
      color: var(--warning);
    }

    .timeline {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 18px;
    }

    .timeline li {
      display: grid;
      grid-template-columns: 16px 1fr;
      gap: 12px;
      align-items: start;
    }

    .timeline-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      margin-top: 6px;
      background: rgba(148, 163, 184, 0.4);
    }

    .timeline-dot.positive {
      background: var(--positive);
    }

    .timeline-dot.neutral {
      background: rgba(148, 163, 184, 0.8);
    }

    .timeline-dot.warning {
      background: var(--warning);
    }

    .timeline-dot.negative {
      background: var(--negative);
    }

    .timeline time {
      color: var(--text-muted);
      font-size: 12px;
    }

    @media (max-width: 1024px) {
      .dashboard {
        grid-template-columns: 1fr;
      }

      .sidebar {
        position: sticky;
        top: 0;
        flex-direction: row;
        overflow-x: auto;
        gap: 20px;
      }

      .nav {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
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

      .content-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  private readonly stats: StatCard[] = [
    {
      label: 'Total Media Assets',
      value: '1,284',
      badge: { label: '+24 new', tone: 'neutral' },
      trend: { label: '+4.2% vs last week', tone: 'positive' }
    },
    {
      label: 'Published Playlists',
      value: '38',
      badge: { label: 'Live', tone: 'positive' },
      trend: { label: '98% synced', tone: 'positive' }
    },
    {
      label: 'Active Endpoints',
      value: '14',
      badge: { label: '2 pending', tone: 'warning' },
      trend: { label: 'Sync delayed on 2 embeds', tone: 'warning' }
    },
    {
      label: 'Playback Errors',
      value: '5',
      badge: { label: 'Alerts', tone: 'negative' },
      trend: { label: '-2 since yesterday', tone: 'negative' }
    }
  ];

  private readonly playlists: PlaylistEntry[] = [
    {
      name: 'Featured Acoustic Sessions',
      status: { label: 'Ready', tone: 'positive' },
      updated: 'Today 09:12',
      owner: 'Alex Doe'
    },
    {
      name: 'Morning Focus Mix',
      status: { label: 'Draft', tone: 'neutral' },
      updated: 'Today 08:43',
      owner: 'Casey Lee'
    },
    {
      name: 'Podcast Spotlight',
      status: { label: 'Needs media', tone: 'warning' },
      updated: 'Yesterday 21:18',
      owner: 'Jordan Smith'
    },
    {
      name: 'Video Launchpad',
      status: { label: 'Scheduled', tone: 'positive' },
      updated: 'Yesterday 17:02',
      owner: 'Alex Doe'
    }
  ];

  private readonly endpoints: EndpointHealth[] = [
    {
      name: 'Homepage Hero Widget',
      subtitle: 'Last sync 38 seconds ago',
      tone: 'positive'
    },
    {
      name: 'Mobile App Feed',
      subtitle: 'Sync delayed · Investigating CDN',
      tone: 'warning'
    },
    {
      name: 'Partner Portal Playlist',
      subtitle: 'Last sync 4 minutes ago',
      tone: 'neutral'
    }
  ];

  private readonly timeline: TimelineEvent[] = [
    {
      tone: 'positive',
      actor: 'Alex Doe',
      action: 'published',
      target: 'Featured Acoustic Sessions',
      timestamp: 'Today · 09:15'
    },
    {
      tone: 'neutral',
      actor: 'Casey Lee',
      action: 'uploaded 12 audio files to',
      target: 'Morning Focus Mix',
      timestamp: 'Today · 08:47'
    },
    {
      tone: 'warning',
      actor: 'Monitoring Bot',
      action: 'flagged sync delay on',
      target: 'Mobile App Feed',
      timestamp: 'Today · 08:05'
    },
    {
      tone: 'negative',
      actor: 'Jordan Smith',
      action: 'rolled back',
      target: 'Video Launchpad manifest',
      timestamp: 'Yesterday · 19:32'
    }
  ];

  protected render() {
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
            <p class="nav-section">Overview</p>
            ${this.renderNavLink('Dashboard', true)}
            ${this.renderNavLink('Media Library')}
            ${this.renderNavLink('Playlists')}
            ${this.renderNavLink('Endpoints')}
            ${this.renderNavLink('Analytics')}
            ${this.renderNavLink('Branding')}
            <p class="nav-section">Administration</p>
            ${this.renderNavLink('Access Control')}
            ${this.renderNavLink('Configuration')}
            ${this.renderNavLink('Diagnostics')}
            ${this.renderNavLink('Audit Trail')}
          </nav>
          <div class="sidebar-footer">
            <div class="status" role="status" aria-live="polite">
              <span class="status-indicator" aria-hidden="true"></span>
              <span class="status-label">Live sync active</span>
            </div>
            <button class="secondary" type="button">Download Manifest</button>
          </div>
        </aside>
        <main class="workspace">
          <header class="workspace-header">
            <div class="header-left">
              <h1>Dashboard</h1>
              <p class="subtitle">
                Monitor the health of your media catalog and embedding endpoints.
              </p>
            </div>
            <div class="header-right">
              <label class="search" aria-label="Search admin data">
                <input type="search" placeholder="Search playlists, endpoints, media" />
              </label>
              <button class="primary" type="button">New Playlist</button>
              <div class="user" aria-label="Current user">
                <span class="user-avatar" aria-hidden="true">AD</span>
                <div class="user-meta">
                  <span class="user-name">Alex Doe</span>
                  <span class="user-role">Administrator</span>
                </div>
              </div>
            </div>
          </header>

          <section class="stats" aria-label="Key metrics">
            ${this.stats.map(
              (stat) => html`
                <article class="stat-card">
                  <header>
                    <span class="stat-label">${stat.label}</span>
                    <span class="badge ${stat.badge.tone}">${stat.badge.label}</span>
                  </header>
                  <p class="stat-value">${stat.value}</p>
                  <p class="stat-trend ${stat.trend.tone}">${stat.trend.label}</p>
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
                <button class="ghost" type="button">View all</button>
              </header>
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
                  ${this.playlists.map(
                    (entry) => html`
                      <tr>
                        <td>${entry.name}</td>
                        <td><span class="badge ${entry.status.tone}">${entry.status.label}</span></td>
                        <td>${entry.updated}</td>
                        <td>${entry.owner}</td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            </article>

            <article class="panel">
              <header>
                <div>
                  <h2>Endpoint Health</h2>
                  <p>Track sync latency and embed status.</p>
                </div>
                <button class="ghost" type="button">Manage</button>
              </header>
              <ul class="list" aria-label="Endpoint health">
                ${this.endpoints.map(
                  (endpoint) => html`
                    <li>
                      <div>
                        <p class="list-title">${endpoint.name}</p>
                        <p class="list-subtitle ${endpoint.tone === 'warning' ? 'warning' : ''}">
                          ${endpoint.subtitle}
                        </p>
                      </div>
                      <span class="badge ${endpoint.tone}">
                        ${this.formatBadge(endpoint.tone)}
                      </span>
                    </li>
                  `
                )}
              </ul>
            </article>

            <article class="panel">
              <header>
                <div>
                  <h2>Recent Activity</h2>
                  <p>Latest actions from the admin team.</p>
                </div>
                <button class="ghost" type="button">Export</button>
              </header>
              <ul class="timeline" aria-label="Recent admin activity">
                ${this.timeline.map(
                  (event) => html`
                    <li>
                      <span class="timeline-dot ${event.tone}" aria-hidden="true"></span>
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
            </article>
          </section>
        </main>
      </div>
    `;
  }

  private renderNavLink(label: string, active = false) {
    const classes = {
      'nav-link': true,
      'is-active': active
    };

    const className = Object.entries(classes)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join(' ');

    return html`<a class="${className}" href="#">${label}</a>`;
  }

  private formatBadge(tone: Tone): string {
    switch (tone) {
      case 'positive':
        return 'Operational';
      case 'warning':
        return 'Degraded';
      case 'negative':
        return 'Alert';
      default:
        return 'Syncing';
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ux-admin-app': UxAdminApp;
  }
}
