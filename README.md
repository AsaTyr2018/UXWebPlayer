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

## Configuration
| Setting | Default | Description |
| --- | --- | --- |
| `musicDir` | `./music/` | Relative path for audio assets. |
| `videoDir` | `./video/` | Relative path for video assets. |
| `theme` | `"light"` | Visual theme preset; supports `light`, `dark`, or custom tokens. |

Additional planning details live in [`docs/planning/project-plan.md`](docs/planning/project-plan.md).

## Development
Documentation is under construction. Planned topics include build tooling, testing, and embedding examples.

## Changelog
See [`Changelog/Changelog.md`](Changelog/Changelog.md).

## License
MIT
