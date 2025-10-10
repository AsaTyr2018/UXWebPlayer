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

## Technology Stack Evaluation

- **Language & Runtime Choice:** TypeScript remains the most ergonomic path for an embeddable web library. It compiles to standards-compliant JavaScript that runs anywhere, adds static typing for maintainability, and integrates cleanly with both legacy `<script>` embeds and modern module consumers. We avoid framework lock-in while still benefiting from modern tooling (ESNext syntax, decorators, async/await) that down-compiles for older browsers.
- **Component Model:** Standards-based Web Components (Custom Elements + Shadow DOM) provide encapsulation without imposing a framework dependency on host pages. They coexist with existing CMS themes, can be lazily registered, and expose lifecycle hooks for integrators. Libraries such as Lit could accelerate ergonomics, but staying framework-free keeps bundles smaller and avoids duplicate runtime costs when embedded alongside other frameworks.
- **Styling Strategy:** CSS custom properties and logical properties allow runtime theming without recompilation. Pairing them with a lightweight design token system ensures admins can override colors, spacing, or typography while preserving accessibility targets. Scoped styles via Shadow DOM reduce conflicts with host site CSS.
- **Build & Distribution Tooling:** Vite offers fast development workflows and leverages esbuild for dev transforms while outputting Rollup-quality production bundles. Rollup remains an option if we prefer a single toolchain, but Vite's dev-server ergonomics support rapid iteration on UI polish. Both can emit dual builds (UMD + ESM) and TypeScript declarations.
- **Testing Utilities:** Vitest aligns with Vite and shares transform pipelines, simplifying configuration. Playwright-based smoke tests can validate browser APIs without relying on a full framework harness. Storybook (with Web Components support) remains the preferred environment for visual regression coverage.
- **Consideration of Emerging Options:** WebAssembly (via Rust or AssemblyScript) is unnecessary for core playback because HTMLMediaElement already delegates decoding to the browser. WASM may be explored later for optional DSP features (e.g., waveform analysis) but adds binary size and complicates hosting. Similarly, SPA frameworks (React, Vue, Svelte) offer developer familiarity yet burden embedders with extra runtimes; they remain viable for auxiliary dashboards rather than the core widget.
- **Backward Compatibility:** Targeting evergreen browsers with ES2019 output balances modern features and compatibility. For long-tail support, we can ship an ES5 fallback bundle guarded by feature detection, keeping the main bundle lean for modern consumers.

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

## Scope Decisions
- **Optional transcoding integration:** Provide only minimal hooks so self-hosted or third-party pipelines can drop in assets. Focus core engineering on native playback; target ≥95% coverage with in-house capabilities.
- **Analytics integration:** Out of scope for the embeddable player. Document event hooks so site admins can forward events to their preferred platforms independently.
- **DRM considerations:** Out of scope for the core release. Site admins remain responsible for DRM enforcement at the hosting layer.

## Expanded Planning

### Milestone Deliverables
| Milestone | Key Deliverables | Acceptance Criteria |
| --- | --- | --- |
| Foundation | TypeScript project scaffold, audio playback module, base playlist UI, config loader with schema validation. | Audio files in default directories playable on desktop/mobile; config errors reported with actionable messages. |
| Enhanced Media Support | Video renderer, responsive layout for mixed media, manifest generator CLI with metadata ingestion. | Video assets render alongside audio without layout shifts; CLI outputs manifest and warnings for unsupported files. |
| UX Polish | Accessibility enhancements, theming presets, keyboard shortcuts, localization pipeline. | Axe audit passes with zero critical issues; admins can switch themes and provide translations without code changes. |
| Stabilization | CI pipeline, automated tests, documentation set (developer guide, embedding guide), versioned release artifacts. | CI executes lint/test suite; documentation reviewed and linked from README; release bundle validated across target browsers. |

### Operational Guidelines
- **Configuration lifecycle:** Store `uxplayer.config.json` under version control, with sample profiles for development, staging, and production.
- **Release cadence:** Target monthly tagged releases until v1.0.0, then adopt semantic versioning with changelog updates per release.
- **Support policy:** Maintain compatibility with the two latest major versions of Chrome, Firefox, Safari, and Edge. Document fallback experience for legacy browsers.

### Optional Feature Modules
- **Audio visualization pack:** Ship a lightweight canvas-based waveform and spectrum visualizer that syncs with audio playback for music-only deployments. Expose theme tokens for colors and animation intensity so admins can align visuals with branding.
- **Dynamic ambient scenes:** Offer optional background animations (e.g., subtle gradients or particle effects) that respond to playback state while respecting accessibility preferences for reduced motion.
- **Metadata spotlight:** Provide a collapsible panel for extended metadata such as lyrics, liner notes, or podcast show notes, leveraging the existing localization pipeline.

### Risk & Mitigation Matrix
| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Browser codec gaps exceed 5% coverage target. | Medium | High | Provide clear unsupported-format messaging, document self-hosted transcoding workflow, and monitor user reports for format prioritization. |
| Configuration errors hinder onboarding. | Medium | Medium | Ship schema-based validation with descriptive errors, add CLI `--dry-run` mode, and publish troubleshooting guide. |
| Accessibility regressions during UX polish phase. | Low | High | Automate axe-core tests in CI and require manual keyboard walkthroughs before release. |
| Build footprint grows beyond lightweight goals. | Medium | Medium | Track bundle size in CI, enforce size budget thresholds, and prefer native APIs over heavy dependencies. |

### Next Research Tasks
1. Prototype playlist performance with large manifests (≥500 items) to validate virtualization needs.
2. Assess feasibility of service worker caching for offline-first scenarios without overcomplicating scope.
3. Draft theming token catalog covering typography, spacing, and color primitives.
4. Outline localization file format (JSON vs. ICU messages) and fallback rules.

## Next Steps
1. Validate requirements with stakeholders (admins, integrators).
2. Define detailed technical specifications and config schema.
3. Prototype core audio player with playlist and collect usability feedback.
4. Establish repository structure, coding standards, and contribution guidelines.
