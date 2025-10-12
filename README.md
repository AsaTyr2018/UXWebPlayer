# UXWebPlayer

Embeddable multimedia library designed to deliver audio and video playback inside any HTML or PHP website.

## Features
- Modern, accessible player UI with integrated playlist management.
- Server-backed media library that stores uploads by playlist and media type.
- In-app metadata editing for tracks and videos, including artist, genre, and descriptive fields.
- Endpoint management to mint unique embed URLs and connect them to playlists.
- Embed links mirror the current admin origin so staging and production hosts stay aligned.

## Quick Start
```html
<link rel="stylesheet" href="/dist/uxwebplayer.css" />
<script src="/dist/uxwebplayer.umd.js"></script>
<div data-uxplayer></div>
```

## Admin Console Prototype
The Lit + Vite-based admin dashboard now implements the full navigation shell (Dashboard, Media Library, Playlists, Endpoints, Analytics, Branding, Access Control, Configuration, Diagnostics, and Audit Trail). Media Library and Playlists are wired to the embedded API so you can create playlists, upload media, edit metadata, and persist everything to disk during development.

```bash
npm install
npm run dev   # Start the Vite dev server with the embedded access control API
```

The dev server hosts `index.html`, which mounts the `<ux-admin-app>` Web Component showcasing the multi-page admin experience. It binds to `0.0.0.0:2222` for container and LAN access.

### Data bootstrapping
Provide runtime data by assigning the `data` property on `<ux-admin-app>` or by defining `window.__UX_ADMIN_DATA__` before the component upgrades. The structure must match `AdminData` in [`src/admin/types.ts`](src/admin/types.ts). When no data is provided the UI surfaces zeroed metrics and guidance for connecting the live admin API.

### Authentication & access control
- Admin accounts live in `data/admin.sqlite` (override with `ADMIN_DB_PATH`). Passwords are hashed with bcrypt before storage.
- Sign in through the Access Control dialog; a session token is stored in `sessionStorage` and revoked on sign-out.
- Default credentials remain `admin` / `admin` so operators can bootstrap their first login before inviting teammates.
- After signing in, use the **Invite user** form to provision additional administrators and retire the default account when ready.

### Access Control API
- The dev server exposes the Express-based access service on `/api` without requiring a separate process.
- Use `npm run api` when you need the API outside the Vite environment (for example, end-to-end tests or integration with another host).
- The API issues short-lived bearer tokens and persists admin accounts to SQLite. Each restart recreates the default admin if no other accounts exist.

### Media library workflow
1. Create an empty playlist from the **Playlists** page and choose whether it manages music or video assets.
2. Open the **Media Library**, upload one or more files through the multi-select form, and assign them to a playlist.
3. Edit titles, artist details, genres, and descriptions inline; delete assets when they are no longer needed.

Uploads are stored under `MEDIA_ROOT/music/<playlistId>` or `MEDIA_ROOT/video/<playlistId>` depending on the playlist type, and metadata persists in `MEDIA_LIBRARY_DB_PATH`.

## Configuration
| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | Port for the embedded API server. |
| `ADMIN_DB_PATH` | `data/admin.sqlite` | SQLite database for admin accounts (`:memory:` supported for tests). |
| `MEDIA_ROOT` | `media` | Root directory where playlist folders (`music/<playlistId>` and `video/<playlistId>`) are created. |
| `MEDIA_LIBRARY_DB_PATH` | `data/media-library.json` | JSON datastore that tracks playlists, assets, and metadata. |

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
