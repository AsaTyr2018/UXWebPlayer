# UXWebPlayer

Embeddable multimedia library designed to deliver audio and video playback inside any HTML or PHP website.

## Features
- Modern, accessible player UI with integrated playlist management.
- Configurable media directory mapping for music and video collections.
- Extensible adapters for local folders, remote media sources, and analytics hooks.
- Responsive admin console shell ready for playlist, endpoint, and monitoring tooling.

## Quick Start
```html
<link rel="stylesheet" href="/dist/uxwebplayer.css" />
<script src="/dist/uxwebplayer.umd.js"></script>
<div data-uxplayer></div>
```

## Configuration
| Setting | Default | Description |
| --- | --- | --- |
| `musicDir` | `./music/` | Relative path for audio assets. |
| `videoDir` | `./video/` | Relative path for video assets. |
| `theme` | `"light"` | Visual theme preset; supports `light`, `dark`, or custom tokens. |

## Admin Console
Open [`public/admin/index.html`](public/admin/index.html) in a browser to explore the production-ready dashboard shell. The layout mirrors the interactive demo in `docs/demo/` and is the foundation for wiring playlists, endpoints, and monitoring data.

## Documentation
- Planning overview: [`docs/planning/project-plan.md`](docs/planning/project-plan.md)
- Dashboard demo reference: open [`docs/demo/index.html`](docs/demo/index.html) directly in a browser for a responsive walkthrough of interaction states.

## Development
Documentation is under construction. Planned topics include build tooling, testing, embedding examples, and wiring the admin console to live data sources.

## Changelog
See [`Changelog/Changelog.md`](Changelog/Changelog.md).

## License
MIT
