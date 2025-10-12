# Admin Dashboard Demo

This static demo highlights the planned admin dashboard layout described in `docs/planning/project-plan.md`. It focuses on the shell experience for playlist management, endpoint monitoring, and team activity tracking.

## Preview

Open `docs/demo/index.html` in any modern browser. No build step is required.

## Layout Highlights

- Persistent sidebar with navigation for library, playlist, endpoint, and admin tooling.
- Header actions for global search, quick playlist creation, and user session context.
- Summary metrics for media coverage, publishing health, endpoint status, and error monitoring.
- Detail panels for publishing queues, endpoint health, and recent activity.
- Responsive breakpoints that collapse the sidebar and reflow panels on tablets and phones.

## Next Steps

- Replace placeholder data with live API responses once the admin backend is available.
- Wire the layout into the production admin shell and hydrate with Lit components.
- Extend the demo with interaction states (filters, dialogs) as flows are specified.
