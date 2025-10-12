# UXWebPlayer

Embeddable multimedia library designed to deliver audio and video playback inside any HTML or PHP website.

## Features
- Modern, accessible player UI with integrated playlist management.
- Server-backed media library that stores uploads by playlist and media type.
- In-app metadata editing for tracks and videos, including artist, genre, and descriptive fields.
- Endpoint management to mint unique embed URLs, connect them to playlists, and switch embeds on or off instantly.
- Configurable player variants (large, medium, small, background audio) selectable per endpoint to match the embed footprint.
- Large player variant surfaces uploaded cover art for five seconds before blending into the visualization pane so feature walls stay dynamic.
- Dedicated `/embed/:slug` player shell so published endpoints never expose the admin console.
- Embed links mirror the current admin origin so staging and production hosts stay aligned.
- Public streaming API that delivers playlist metadata and tracks to active embeds.
- Persisted analytics metrics and branding themes so the admin console reflects playback health and appearance settings across sessions.
- Inline branding editor to tune themes, colors, fonts, and logos without leaving the console.
- Analytics dashboard derives live counts from playlists, media assets, and endpoint status, persisting prior snapshots for trend deltas.
- Branding updates immediately retheme the admin console by recalculating CSS tokens for backgrounds, accents, and typography.

## Quick Start
```html
<link rel="stylesheet" href="/dist/uxwebplayer.css" />
<script src="/dist/uxwebplayer.umd.js"></script>
<div data-uxplayer></div>
```

## Admin Data Model
- `AdminData` aggregates dashboard metrics, playlists, endpoints, analytics, branding, user roster, configuration, diagnostics, and audit entries so the console can render every page offline or through a live API.【F:src/admin/types.ts†L1-L105】
- `createEmptyAdminData()` returns the zeroed structure used before the API responds, making it easy to hydrate the console in demos or tests.【F:src/admin/state/empty-admin-data.ts†L1-L28】
- Inject data by setting the `<ux-admin-app>` `data` property or populating `window.__UX_ADMIN_DATA__` before the component upgrades; the structure must match `AdminData` to avoid runtime gaps.【F:README.md†L29-L33】

## Admin Console Prototype
The Lit + Vite-based admin dashboard now implements the full navigation shell (Dashboard, Media Library, Playlists, Endpoints, Analytics, Branding, Access Control, Configuration, Diagnostics, and Audit Trail). Media Library and Playlists are wired to the embedded API so you can create playlists, upload media, edit metadata, and persist everything to disk during development.

```bash
npm install
npm run dev   # Start the Vite dev server with the embedded access control API
```

The dev server hosts `index.html`, which mounts the `<ux-admin-app>` Web Component showcasing the multi-page admin experience. It binds to `0.0.0.0:2222` for container and LAN access.

Analytics snapshots—covering global trends and per-endpoint engagement—are regenerated from the media library and endpoint stores on each request. The latest snapshot is saved to `data/analytics.json` (override with `ANALYTICS_DB_PATH`) so deltas track how the library evolves between requests.【F:src/server/analytics-service.ts†L5-L350】 Branding preferences live in `data/branding.json` (override with `BRANDING_DB_PATH`) and drive the admin console’s CSS tokens whenever settings change.【F:src/server/branding-service.ts†L5-L123】【F:src/admin/components/admin-app.ts†L1-L3200】

### Data bootstrapping
Provide runtime data by assigning the `data` property on `<ux-admin-app>` or by defining `window.__UX_ADMIN_DATA__` before the component upgrades. The structure must match `AdminData` in [`src/admin/types.ts`](src/admin/types.ts). When no data is provided the UI surfaces zeroed metrics and guidance for connecting the live admin API.【F:README.md†L29-L33】【F:src/admin/state/empty-admin-data.ts†L1-L28】

### Authentication & access control
- Admin accounts live in `data/admin.sqlite` (override with `ADMIN_DB_PATH`). Passwords are hashed with bcrypt before storage.
- Sign in through the Access Control dialog; a session token is stored in `sessionStorage` and revoked on sign-out.
- Default credentials remain `admin` / `admin` so operators can bootstrap their first login before inviting teammates.
- After signing in, use the **Invite user** form to provision additional administrators and retire the default account when ready.

### Access Control API
- The dev server exposes the Express-based access service on `/api` without requiring a separate process.
- Use `npm run api` when you need the API outside the Vite environment (for example, end-to-end tests or integration with another host).
- The API issues short-lived bearer tokens and persists admin accounts to SQLite. Each restart recreates the default admin if no other accounts exist.

## Embedding an Endpoint Stream
1. Create or select an endpoint in the admin console to mint a unique slug; embed URLs always use the current origin so staging and production players stay environment-aware. Activate the endpoint once its playlist is ready so embeds begin streaming immediately.【F:tests/admin/admin-app.test.ts†L184-L280】【F:src/admin/components/admin-app.ts†L1909-L2146】
2. Publish the playlist you want to expose, then drop an `<iframe>` into your website that points at the embed URL, for example:
   ```html
   <iframe
     src="https://your-host/embed/123456789"
     title="UX Web Player"
     loading="lazy"
     allow="autoplay; encrypted-media"
     style="width: 100%; min-height: 420px; border: 0;"
   ></iframe>
   ```
3. Optionally load the standalone player bundle if you need to tailor the UI beyond the iframe; the UMD build bootstraps any `<div data-uxplayer>` container and calls `/api/embed/:slug/stream` to hydrate the playlist for the selected endpoint.【F:README.md†L13-L18】【F:public/assets/scripts/embed-player.js†L1-L214】

The standalone embed served from `/embed/:slug` renders a lightweight player shell without admin navigation. It injects the resolved slug into the page, fetches the streaming payload, and plays queued tracks while surfacing clear status messaging for pending or disabled endpoints.【F:public/embed.html†L1-L22】【F:public/assets/scripts/embed-player.js†L1-L214】

### Player variants

Each endpoint stores a `playerVariant` so operators can choose the embed footprint when creating or editing the record. The admin console surfaces the variant selector, the API persists the choice, and the embed runtime swaps layouts at fetch time.【F:src/admin/components/admin-app.ts†L2148-L2337】【F:src/server/media-library-app.ts†L258-L315】【F:public/assets/scripts/embed-player.js†L1-L214】

| Variant | Layout | Typical use |
| --- | --- | --- |
| **Large** | Playlist navigation on the left, visualization or cover panel on the right with transport controls directly beneath it. | Lobby displays and feature walls that showcase upcoming visualization work. |
| **Medium** | Default playlist list with standard controls. | General-purpose embeds where the full queue is useful. |
| **Small** | Compact transport controls without the visible playlist. | Space-constrained sidebars or mobile surfaces. |
| **Background** | 1px autoplay loop without controls for ambient sound beds. | Hidden background audio that should start automatically inside an experience. |

### Streaming API

- `GET /api/embed/:slug/stream` returns `{ endpoint, playlist, tracks }` so custom clients can hydrate players with the same payload the embed consumes.【F:src/server/access-control-app.ts†L20-L171】
- Track `src` URLs point to `/media/<type>/<playlistId>/<filename>`, which Express serves read-only from the media library storage tree.【F:src/server/access-control-app.ts†L20-L171】
- Endpoints start in `pending` status and must be activated from the admin console before streams are exposed; disable them at any time to pause playback without deleting configuration.【F:src/admin/components/admin-app.ts†L1909-L2146】

### Media library workflow
1. Create an empty playlist from the **Playlists** page and choose whether it manages music or video assets.
2. Open the **Media Library**, upload one or more files through the multi-select form, and assign them to a playlist.
3. Edit titles, artist details, genres, descriptions, and upload dedicated cover artwork inline; delete assets when they are no longer needed.

Uploads are stored under `MEDIA_ROOT/music/<playlistId>` or `MEDIA_ROOT/video/<playlistId>` depending on the playlist type, and metadata persists in `MEDIA_LIBRARY_DB_PATH`.

## Configuration
| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | Port for the embedded API server. |
| `ADMIN_DB_PATH` | `data/admin.sqlite` | SQLite database for admin accounts (`:memory:` supported for tests). |
| `MEDIA_ROOT` | `media` | Root directory where playlist folders (`music/<playlistId>` and `video/<playlistId>`) are created. |
| `MEDIA_LIBRARY_DB_PATH` | `data/media-library.json` | JSON datastore that tracks playlists, assets, and metadata. |
| `ANALYTICS_DB_PATH` | `data/analytics.json` | JSON datastore for persisted analytics metrics surfaced on the Analytics page. |
| `BRANDING_DB_PATH` | `data/branding.json` | JSON datastore for branding settings applied across embeds and the admin console. |

## Documentation
- Planning overview: [`docs/planning/project-plan.md`](docs/planning/project-plan.md)
- Admin dashboard demo layout: open [`docs/demo/index.html`](docs/demo/index.html) directly in a browser for a responsive walkthrough of the planned console shell.

## Development
### Tooling
- [`lit`](https://lit.dev) powers the Web Components used across the player and admin dashboard.
- [`vite`](https://vitejs.dev) handles development and bundling for the admin console prototype.

### Scripts
```bash
npm run dev    # Start the Vite dev server on http://0.0.0.0:2222
npm run build  # Produce the static admin bundle in dist/admin
npm run test   # Execute Vitest unit tests
npm run api    # Optional: run the access control API as a standalone service
```

Documentation is under construction. Planned topics include player build tooling, embedding examples, and wiring the admin console to live data sources.

## Changelog
See [`Changelog/Changelog.md`](Changelog/Changelog.md).

## License
MIT
