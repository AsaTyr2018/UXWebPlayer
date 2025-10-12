## [2025-10-10 20:15] Establish planning baseline
**Change Type:** Standard Change
**Why:** Capture initial concept and documentation scaffolding
**What changed:** Added project plan, refreshed README, and created changelog structure
**Impact:** Documentation only; no code or API impact
**Testing:** Not applicable (docs-only)
**Docs:** README updated with links to planning and changelog docs
**Rollback Plan:** Revert commit creating documentation updates
**Refs:** N/A

## [2025-10-10 21:00] Clarify scope decisions and planning detail
**Change Type:** Standard Change
**Why:** Record resolved scope questions and extend planning roadmap
**What changed:** Updated project plan with scope decisions, milestone deliverables, operational guidelines, risk matrix, and research tasks
**Impact:** Documentation only; informs future implementation planning
**Testing:** Not applicable (docs-only)
**Docs:** Updated `docs/planning/project-plan.md`
**Rollback Plan:** Revert documentation update commit
**Refs:** N/A

## [2025-10-10 21:30] Outline optional feature modules
**Change Type:** Standard Change
**Why:** Capture optional enhancements that add value during the planning phase
**What changed:** Documented audio visualization, ambient scenes, and metadata spotlight modules in the project plan
**Impact:** Documentation only; shapes future feature prioritization without affecting current implementation
**Testing:** Not applicable (docs-only)
**Docs:** Updated `docs/planning/project-plan.md`
**Rollback Plan:** Revert documentation update commit
**Refs:** N/A

## [2025-10-10 22:00] Evaluate technology stack direction
**Change Type:** Standard Change
**Why:** Identify the most suitable technologies for an embeddable multimedia player
**What changed:** Added a technology stack evaluation covering language choice, component model, styling, tooling, testing, and emerging options
**Impact:** Documentation only; informs future implementation decisions without altering code
**Testing:** Not applicable (docs-only)
**Docs:** Updated `docs/planning/project-plan.md`
**Rollback Plan:** Revert documentation update commit
**Refs:** N/A

## [2025-10-10 22:30] Narrow framework selection for player UI
**Change Type:** Standard Change
**Why:** Rule out unsuitable frameworks and commit to a modern, feature-rich option for the embeddable player
**What changed:** Updated the technology stack evaluation with comparative analysis of component frameworks, tooling, and styling strategies; selected Lit as the primary UI framework
**Impact:** Documentation only; clarifies future implementation choices without code changes
**Testing:** Not applicable (docs-only)
**Docs:** Updated `docs/planning/project-plan.md`
**Rollback Plan:** Revert documentation update commit
**Refs:** N/A
## [2025-10-10 23:00] Scaffold project folder structure
**Change Type:** Standard Change
**Why:** Establish repository layout aligned with the approved architecture roadmap
**What changed:** Created source, configuration, media, testing, tooling, and public asset directories with placeholders for future implementation
**Impact:** Prepares workspace for upcoming development; no user-facing changes yet
**Testing:** Not applicable (repository structure only)
**Docs:** N/A (structure only)
**Rollback Plan:** Remove newly created directories or revert the associated commit
**Refs:** N/A

## [2025-10-11 00:00] Prioritize admin dashboard and live embedding endpoints
**Change Type:** Standard Change
**Why:** Align project plan with new directive for central media administration and dynamic embeds
**What changed:** Updated project plan vision, goals, requirements, architecture, roadmap, and success metrics to include authenticated admin dashboard, playlist endpoints, and instant propagation expectations
**Impact:** Documentation only; informs future implementation priorities without altering runtime behavior
**Testing:** Not applicable (docs-only)
**Docs:** Updated `docs/planning/project-plan.md`
**Rollback Plan:** Revert documentation update commit
**Refs:** N/A

## [2025-10-11 01:00] Add admin dashboard demo layout
**Change Type:** Standard Change  
**Why:** Provide a tangible reference for the planned admin console experience  
**What changed:** Added a static dashboard demo under `docs/demo/` with HTML/CSS layout, usage notes, and README pointers  
**Impact:** Documentation-only preview; no runtime impact  
**Testing:** Not applicable (static demo)  
**Docs:** README and `docs/demo/README.md` updated  
**Rollback Plan:** Remove the `docs/demo/` directory and revert README entry  
**Refs:** N/A

## [2025-10-11 02:00] Prototype admin console with Lit and Vite
**Change Type:** Normal Change
**Why:** Implement the interactive admin shell aligned with the approved technology plan
**What changed:** Added a Lit-based `<ux-admin-app>` component mirroring the dashboard demo, configured Vite/TypeScript tooling, and seeded Vitest coverage
**Impact:** Introduces a runnable admin console prototype served via Vite; no impact on existing embed snippets
**Testing:** `npm run test -- --run`
**Docs:** README updated with admin console instructions and tooling overview
**Rollback Plan:** Revert the admin console component, tooling files, and README/Changelog updates
**Refs:** N/A

## [2025-10-12 13:52] Bind dev server to 0.0.0.0:2222
**Change Type:** Standard Change
**Why:** Ensure `npm run dev` is reachable from containerized and LAN environments
**What changed:** Configured the Vite dev server host and port defaults to `0.0.0.0:2222` and documented the new binding
**Impact:** Development server now listens on the specified address and port; no runtime effect on builds
**Testing:** Not applicable (configuration only)
**Docs:** README updated with new dev server details
**Rollback Plan:** Revert the Vite config and README updates
**Refs:** N/A

## [2025-10-12 15:30] Build admin pages and remove demo data
**Change Type:** Normal Change
**Why:** Replace the one-page dashboard mock with a navigable admin console ready for real data sources
**What changed:** Added typed admin data models, empty state scaffolding for every admin page, removed hard-coded demo arrays, enabled runtime data bootstrapping, refreshed tests, and documented the new workflow
**Impact:** Developers see zeroed metrics and guidance until live data is supplied; all admin sections are now reachable within the component
**Testing:** `npm run test`
**Docs:** README updated with navigation overview and data bootstrapping instructions
**Rollback Plan:** Revert commit and restore previous demo-driven component implementation
**Refs:** N/A

## [2025-10-12 14:13] Add default admin access control workflow
**Change Type:** Normal Change
**Why:** Provide an initial authentication flow and prompt replacement of bootstrap credentials
**What changed:** Implemented an Access Control sign-in form with default admin validation, seeded default admin user data, surfaced a post-login warning, refreshed tests, and documented the workflow
**Impact:** Access Control page now requires signing in; administrators receive guidance to replace the default admin account
**Testing:** `npm run test`
**Docs:** README updated with access control instructions
**Rollback Plan:** Revert the access control login commit and restore the previous empty user state
**Refs:** N/A
## [2025-10-12 18:00] Gate admin console behind login dialog
**Change Type:** Normal Change
**Why:** Ensure the admin experience prompts for authentication instead of rendering a blank screen when no session exists
**What changed:** Added a dedicated login screen gating the console, centralized the sign-in form markup, surfaced signed-in user context, refreshed Vitest coverage, and updated README guidance
**Impact:** Administrators must authenticate before navigating the console; default credentials remain `admin` / `admin` until replaced
**Testing:** `npm run test`
**Docs:** README updated with authentication instructions
**Rollback Plan:** Revert the commit introducing the login screen changes
**Refs:** N/A

## [2025-10-12 20:00] Persist admin access control with SQLite API
**Change Type:** Normal Change
**Why:** Provide durable admin account management and secure authentication beyond the static default credentials
**What changed:** Added an Express access-control API backed by SQLite and bcrypt, implemented session token handling, exposed an invite workflow in `<ux-admin-app>`, expanded Vitest coverage for server and UI flows, and wired README guidance for running the API
**Impact:** Admin users must run `npm run api` alongside the Vite dev server; credentials are now persisted in `data/admin.sqlite` and default admin remains until operators add replacements
**Testing:** `npm run test`
**Docs:** README updated with API usage and configuration
**Rollback Plan:** Revert this change set and remove the new dependencies and server files; delete `data/admin.sqlite` if created
**Refs:** N/A

## [2025-10-13 09:00] Embed access control API into Vite dev server
**Change Type:** Normal Change  
**Why:** Simplify development by avoiding a separate process for the SQLite-backed API  
**What changed:** Refactored the Express app into a reusable factory, mounted it as Vite middleware for dev/preview, added HTTP-level tests with Supertest, updated tooling dependencies, and refreshed documentation  
**Impact:** `npm run dev` now serves the API at `/api`; `npm run api` remains available for standalone scenarios  
**Testing:** `npm run test`  
**Docs:** README updated with new startup instructions  
**Rollback Plan:** Revert the middleware integration, restore the old `vite.config.ts` proxy, and remove the new test dependency  
**Refs:** N/A

## [2025-10-12 15:20] Implement endpoint management workflow
**Change Type:** Normal Change
**Why:** Allow administrators to mint embed endpoints and manage playlist assignments
**What changed:** Added endpoint creation/edit/delete UI with automatic 9-digit slug generation, clipboard helpers, and supporting state logic plus unit coverage
**Impact:** Enables in-app endpoint provisioning; no breaking changes to existing playlists or analytics views
**Testing:** `npm run test`
**Docs:** README updated with endpoint management capability
**Rollback Plan:** Revert the endpoint management UI commit set

**Refs:** N/A

## [2025-10-12 15:28] Align embed URLs with host origin
**Change Type:** Normal Change
**Why:** Ensure generated embed links work across staging and production hosts
**What changed:** Derived embed URLs from the current browser origin, updated README guidance, and added Vitest coverage for the dynamic host behavior
**Impact:** Embed links now match the domain serving the admin console; no configuration changes required
**Testing:** `npm run test -- --run`
**Docs:** README updated with embed origin behavior
**Rollback Plan:** Revert the embed origin alignment commit
**Refs:** N/A

## [2025-10-14 09:30] Stream playlists through embeds and toggle endpoints
**Change Type:** Normal Change
**Why:** Deliver end-to-end playback for published endpoints and give admins runtime control over embed availability
**What changed:** Added an endpoint store and API routes for listing, creating, updating, and deleting endpoints; exposed a public `/api/embed/:slug/stream` route plus static media delivery; upgraded the embed script and styles to render playable queues; wired the admin console to the new backend with create/edit/delete/status actions; refreshed server and UI tests for streaming scenarios; documented the workflow
**Impact:** Embeds now stream assigned playlists once endpoints are activated, and admins can disable embeds without deleting configuration; backward compatibility preserved for existing playlists and uploads
**Testing:** `npm run test`
**Docs:** README updated with streaming API and activation guidance
**Rollback Plan:** Revert the streaming feature commits and delete the endpoint datastore and embed player updates
**Refs:** N/A

## [2025-10-13 12:00] Implement media library and playlist management
**Change Type:** Normal Change
**Why:** Deliver the end-to-end workflow for curating playlists, uploading media, and editing metadata from the admin console
**What changed:** Added an Express media library API with playlist-scoped storage, wired the admin UI for playlist creation, media uploads, metadata editing, and deletion, persisted library state to disk, refreshed tests, and documented the workflow and configuration
**Impact:** Admins can manage music and video collections directly in the console; files are stored under `MEDIA_ROOT` and metadata persists across restarts  
**Testing:** `npm run test`  
**Docs:** README updated with media workflow and configuration details
**Rollback Plan:** Revert this change and remove generated media folders/JSON datastore
**Refs:** N/A
 
## [2025-10-13 13:30] Add media library service regression tests
**Change Type:** Standard Change
**Why:** Ensure the media library workflow is covered by unit tests and prevent filesystem regressions
**What changed:** Added a Vitest suite that exercises playlist creation, asset uploads, metadata updates, deletion cascades, metrics, and validation errors; serialized the Vitest worker pool to avoid SQLite contention; hardened default admin bootstrapping against duplicate inserts
**Impact:** Improved test coverage and stability; runtime behavior unchanged apart from more robust default admin creation
**Testing:** `npm run test -- --run`
**Docs:** N/A
**Rollback Plan:** Revert the test addition commit and delete `tests/server/media-library-service.test.ts`
**Refs:** N/A

## [2025-10-12 16:23] Document admin data model and embedding workflow
**Change Type:** Standard Change  
**Why:** Surface the latest admin data contract and explain how to publish endpoint streams into external websites  
**What changed:** Expanded README with an Admin Data Model overview, data bootstrapping references, and a step-by-step embed guide highlighting iframe usage and the environment-aware slugged URLs  
**Impact:** Clarifies how to hydrate the console with structured data and how to drop embeds into any site; no code changes required  
**Testing:** Not applicable (documentation-only)  
**Docs:** README updated  
**Rollback Plan:** Revert this documentation commit  
**Refs:** N/A

## [2025-10-12 16:34] Serve dedicated embed player shell
**Change Type:** Normal Change  
**Why:** Endpoint URLs should load the media player without exposing the admin console  
**What changed:** Added an Express route for `/embed/:slug`, introduced a lightweight embed HTML/CSS/JS bundle, wired Vitest coverage, and documented the dedicated shell  
**Impact:** Endpoint links now resolve to a standalone player container; admin panel access remains behind authenticated URLs  
**Testing:** `npm run test`  
**Docs:** README updated with embed shell details  
**Rollback Plan:** Revert the embed shell commit and remove the new public assets  
**Refs:** N/A

## [2025-10-12 17:24] Persist analytics and branding state
**Change Type:** Normal Change  
**Why:** Populate the Analytics and Branding admin pages with durable server-backed data  
**What changed:** Added analytics and branding services with JSON stores, extended the media library API payload, surfaced metrics and theme values in the admin app, and introduced Vitest coverage for the new services and UI rendering  
**Impact:** Admin operators see pre-populated analytics metrics and persisted branding settings; new env vars allow overriding data store paths without breaking existing flows  
**Testing:** `npm run test`  
**Docs:** README updated with analytics/branding storage details and new configuration variables  
**Rollback Plan:** Revert analytics/branding service commits and remove related README and test updates  
**Refs:** N/A

## [2025-10-13 18:45] Enable branding editor workflows
**Change Type:** Normal Change  
**Why:** Allow administrators to manage branding settings without editing JSON files manually  
**What changed:** Added a PATCH `/api/library/branding` route, introduced an editable branding form in the admin console with validation and feedback, and expanded Vitest coverage for the new API and UI flows  
**Impact:** Branding updates can be performed through the authenticated console; stored settings remain backward compatible  
**Testing:** `npm run test`  
**Docs:** README updated with branding editor details  
**Rollback Plan:** Revert the branding workflow commit and remove the new API route and UI form  
**Refs:** N/A

## [2025-10-13 20:10] Add global and per-endpoint analytics snapshots
**Change Type:** Normal Change  
**Why:** Capture analytics trends at both the account and endpoint level for richer reporting  
**What changed:** Extended the analytics service to persist global and per-endpoint metrics, updated the admin payload and UI to render the new snapshot, refreshed Vitest coverage, and documented the JSON store shape  
**Impact:** Administrators now see combined and per-endpoint analytics without breaking existing data; stored JSON gains new fields but is backward compatible via sanitization  
**Testing:** `npm run test`  
**Docs:** README updated with analytics snapshot details  
**Rollback Plan:** Revert the analytics snapshot commit and restore the previous metrics-only payload  
**Refs:** N/A

## [2025-10-14 09:30] Refresh analytics feed and reactive branding theme
**Change Type:** Normal Change
**Why:** Replace demo analytics data with live metrics and ensure branding changes update the admin theme immediately
**What changed:** Recomputed analytics snapshots from playlist, asset, and endpoint stores with persisted deltas, overhauled branding token application to drive CSS variables, and expanded Vitest coverage for both features
**Impact:** Analytics now reflect real library activity while branding edits instantly retheme the console; existing stores remain compatible
**Testing:** `npm run test`
**Docs:** README updated with live analytics and branding token behaviour
**Rollback Plan:** Revert the analytics/branding refresh commit to restore the previous static metrics and styling behaviour
**Refs:** N/A

## [2025-10-14 14:30] Add configurable player variants
**Change Type:** Normal Change
**Why:** Offer multiple embed footprints so endpoints can match kiosk screens, compact layouts, or ambient audio needs
**What changed:** Persisted a `playerVariant` on endpoints, exposed selection controls in the admin form, validated the value server-side, updated embed runtime logic and styling for large/medium/small/background layouts, and extended Vitest coverage for API and UI flows
**Impact:** Newly created and existing endpoints default to the medium layout while admins can pick other variants; embeds adapt automatically without breaking older data thanks to safe defaults
**Testing:** `npm run test`
**Docs:** README updated with player variant guidance
**Rollback Plan:** Revert the player variant commit to restore the single-layout player
**Refs:** N/A

## [2025-10-13 16:00] Restructure large embed layout
**Change Type:** Normal Change  
**Why:** Align the large player variant with the specified playlist and visualization layout  
**What changed:** Updated the embed player markup to place the playlist on the left, introduced a right-side visualization pane with transport controls beneath it, refreshed the associated styling, and documented the adjusted layout  
**Impact:** Large embeds now surface the new two-column layout; medium, small, and background variants retain their existing behavior  
**Testing:** `npm run test -- --run`  
**Docs:** README variant table updated  
**Rollback Plan:** Revert the embed player script, stylesheet, README, and changelog updates  
**Refs:** N/A

## [2025-10-14 19:00] Normalize endpoint player variant selection
**Change Type:** Normal Change
**Why:** Large player embeds reverted to medium when creating or editing endpoints
**What changed:** Lowercased and defaulted player variant coercion, normalized API payloads inside the admin console, and expanded Vitest coverage for large variant selection and legacy data
**Impact:** Admins can reliably choose the large player layout; existing endpoints with capitalized variants load with the correct footprint
**Testing:** `npm run test`
**Docs:** N/A (existing guidance still accurate)
**Rollback Plan:** Revert the normalization commit
**Refs:** N/A

## [2025-10-14 20:49] Fix endpoint layout selection during edits
**Change Type:** Normal Change
**Why:** Editing an endpoint reset the player layout dropdown to Large regardless of the saved value
**What changed:** Ensured the player layout select marks the saved variant as selected and added a regression test covering edit flows
**Impact:** Admins now see and preserve the correct player layout when editing endpoints; no backward-compatibility concerns
**Testing:** `npm test -- tests/admin/admin-app.test.ts`
**Docs:** N/A (existing guidance still accurate)
**Rollback Plan:** Revert this commit
**Refs:** N/A

## [2025-10-15 11:45] Fade large player artwork into visualization
**Change Type:** Normal Change  
**Why:** Deliver the specified five-second cover art reveal before transitioning the large embed to its visualization pane  
**What changed:** Added artwork storage to the media library service, exposed upload/remove controls in the admin media editor, streamed artwork URLs to embeds, and updated the large player script and styles to fade covers into the visualization placeholder  
**Impact:** Large player embeds now show uploaded cover art before dimming to the visualization; other variants remain unchanged and tracks without art fall back to the existing placeholder  
**Testing:** `npm run test`  
**Docs:** README feature list and media workflow updated  
**Rollback Plan:** Revert the artwork support commit to restore the previous placeholder behavior and API payload  
**Refs:** N/A

## [2025-10-12 22:09] Cover admin visualizer configuration
**Change Type:** Normal Change  
**Why:** Validate endpoint visualizer controls and document the persisted settings.  
**What changed:** Added helper utilities and Vitest cases exercising visualizer mode and rotation interval workflows, updated endpoint fixtures to include visualizer data, refreshed README guidance, and recorded the update.  
**Impact:** Improves confidence that admin edits honor visualizer choices; documentation now reflects the stored configuration. No backward-compatibility concerns.  
**Testing:** `npx vitest run --reporter=basic`  
**Docs:** README updated with visualizer details.  
**Rollback Plan:** Revert the commit introducing the visualizer test/doc updates.  
**Refs:** N/A
