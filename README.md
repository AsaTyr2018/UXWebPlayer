# UXWebPlayer

Embeddable multimedia library designed to deliver audio and video playback inside any HTML or PHP website.

## Features
- Modern, accessible player UI with integrated playlist management.
- Configurable media directory mapping for music and video collections.
- Extensible adapters for local folders, remote media sources, and analytics hooks.

## Quick Start
```html
<link rel="stylesheet" href="/dist/uxwebplayer.css" />
<script src="/dist/uxwebplayer.umd.js"></script>
<div data-uxplayer></div>
```

## Admin Console Prototype
The Lit + Vite-based admin dashboard mirrors the layout defined in [`docs/demo`](docs/demo) and will evolve into the authenticated management surface.

```bash
npm install
npm run dev
```

The dev server hosts `index.html`, which mounts the `<ux-admin-app>` Web Component showcasing the planned dashboard shell. It now binds to `0.0.0.0:2222` for container and LAN access.

## Configuration
| Setting | Default | Description |
| --- | --- | --- |
| `musicDir` | `./music/` | Relative path for audio assets. |
| `videoDir` | `./video/` | Relative path for video assets. |
| `theme` | `"light"` | Visual theme preset; supports `light`, `dark`, or custom tokens. |

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
```

Documentation is under construction. Planned topics include player build tooling, embedding examples, and wiring the admin console to live data sources.

## Changelog
See [`Changelog/Changelog.md`](Changelog/Changelog.md).

## License
MIT
