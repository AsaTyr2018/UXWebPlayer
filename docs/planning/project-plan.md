# UXWebPlayer Embeddable Multimedia Library – Project Plan

## Vision
Create a lightweight, framework-agnostic multimedia library that can be embedded into any HTML or PHP website. The library must feel native in diverse environments, deliver top-tier audio/video playback, and offer an admin-friendly configuration model.

## Strategic Goals
1. **Universal format support:** Handle the most common audio (MP3, WAV, FLAC, AAC, OGG) and video (MP4, WebM, MKV, AVI) formats with graceful degradation when a browser lacks codec support.
2. **Modular embedding:** Provide script and style bundles that can be dropped into existing pages without bundler tooling. Offer optional ES module entry points for modern stacks.
3. **Configurable media sourcing:** Enforce a predictable directory layout (`./music/`, `./video/`, expandable via config) while allowing remote/media-server integration via adapters.
4. **Delightful UX:** Deliver a modern UI with responsive layout, integrated playlist, and accessible controls compliant with WCAG 2.2 AA.
5. **Admin productivity:** Supply configuration files, diagnostics, and theming hooks so site maintainers can manage content and branding without diving into code.

## User Profiles
- **End Users:** Visitors on desktop or mobile devices consuming media via embedded widgets.
- **Site Admins:** Non-technical editors uploading files to designated folders, adjusting configuration, and monitoring playback metrics.
- **Developers/Integrators:** Engineers embedding the library, customizing themes, or extending media sources.

## Core Requirements
| Area | Requirement |
| --- | --- |
| Media Ingestion | Default local directories `./music/` and `./video/`; allow overrides via JSON/YAML config. Support nested subfolders for categorization. |
| Format Coverage | Abstract playback engine that auto-detects supported codecs and falls back to compatible transcoded sources where provided. |
| Playlist | Auto-generate playlists per folder, enable manual ordering via metadata file, support shuffle/repeat. |
| UI | Modern card-based layout, collapsible playlist panel, hover states, keyboard shortcuts, and theming tokens. |
| Accessibility | Full keyboard navigation, ARIA roles, caption/subtitle support, configurable color contrast. |
| Embedding | Single `<script>` + `<link>` embed snippet with data attributes, plus modular API for programmatic control. |
| Admin Tools | Config validator, CLI/Node script for media scanning, optional analytics hook emitting playback events. |

## Technical Architecture
1. **Core Runtime**
   - Vanilla TypeScript transpiled to ES5 UMD bundle and ES module build.
   - Event-driven playback manager orchestrating HTMLMediaElement instances.
   - Dependency-free core; optional adapters for analytics or CDN providers.
2. **Media Adapters**
   - Local file adapter (default) reads directory manifest generated at build/deploy time.
   - Extensible adapter interface for remote APIs (e.g., REST/GraphQL).
3. **Configuration Layer**
   - `uxplayer.config.json` schema validated on initialization.
   - Supports folder mappings, autoplay rules, theme selection, and feature toggles.
4. **UI Layer**
   - Web Components for player shell, playlist, and controls to avoid framework lock-in.
   - CSS custom properties for theming; dark/light presets included.
5. **Build & Distribution**
   - Rollup or Vite build pipeline producing minified assets, source maps, and TypeScript declarations.
   - CDN-ready distribution folder (`/dist`) with versioned assets.
6. **Testing & QA**
   - Unit tests (Vitest/Jest) for playback logic and config parsing.
   - Visual regression tests via Storybook + Chromatic (optional) for UI components.
   - Accessibility audits with Axe and keyboard navigation scripts.

## UX Principles
- **Instant Feedback:** Loaders and progress states for buffering and playlist generation.
- **Predictable Controls:** Consistent placement of play/pause, skip, volume, and fullscreen toggles.
- **Context Awareness:** Display metadata (title, artist, duration) with support for multilingual content.
- **Responsive Layout:** Playlist drawer adapts between side panel (desktop) and bottom sheet (mobile).
- **Customization:** Offer theming presets and allow injection of custom CSS while maintaining accessibility.

## Admin & Operations Experience
- **Directory Management:** Provide CLI command `uxplayer scan` to generate media manifests and highlight unsupported formats.
- **Config Editing:** Supply commented JSON schema and optional web-based config editor template.
- **Monitoring:** Emit events for play, pause, error, and completion; document how to forward to analytics platforms.
- **Localization:** Support translation files for UI strings, defaulting to English with fallback chain.
- **Version Control:** Encourage storing configuration and manifests within the hosting repo for traceability.

## Roadmap
1. **Foundation (Milestone 1)**
   - Establish build tooling, TypeScript project, and basic audio playback with playlist.
   - Implement config loader with folder mapping support.
   - Deliver documentation for embedding snippet.
2. **Enhanced Media Support (Milestone 2)**
   - Add video playback with responsive layout.
   - Introduce manifest generator CLI and metadata management.
   - Expand format testing matrix and fallback handling.
3. **UX Polish (Milestone 3)**
   - Integrate accessibility enhancements, keyboard shortcuts, and customizable themes.
   - Add admin dashboard template for monitoring and config editing.
   - Provide analytics hooks and localization support.
4. **Stabilization (Milestone 4)**
   - Harden test coverage, add CI pipeline, and prepare versioned release packages.
   - Publish developer SDK docs and migration guides.

## Success Metrics
- Time-to-embed under 5 minutes for new integrators.
- 95%+ browser compatibility coverage (desktop & mobile) for listed formats.
- Zero critical accessibility issues flagged by automated audits.
- Positive admin feedback on content management workflows in quarterly reviews.

## Open Questions
- Should we bundle optional transcoding service integration for unsupported codecs?
- What analytics platforms do our target admins prefer (Google Analytics, Matomo, custom)?
- Do we need DRM considerations for premium content, or is this out of scope?

## Next Steps
1. Validate requirements with stakeholders (admins, integrators).
2. Define detailed technical specifications and config schema.
3. Prototype core audio player with playlist and collect usability feedback.
4. Establish repository structure, coding standards, and contribution guidelines.
