# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added
- Three authored launch encounters: The Lantern Crypt, Alder Crossing and Kestrel Docking Bay, with player-safe creation previews and independent editable copies containing public and private notes.
- Original monochrome print companions for materials, connected walls, doors, stairs and legacy token affiliations, plus a quarter-inch overview scale for A4/Letter output. New artwork is awaiting owner and physical-paper review.
- Three owner-approved Folio first-use illustrations for the empty map collection, private project backup and local player display, with solid monitor stands, clear dashed connectors and monochrome/forced-color treatments.
- A consistent family of 32 original line icons for navigation, project actions, save/offline status, export and player-display controls, with text-scaled SVG artwork and unchanged accessible control names.
- Twelve original, owner-approved Folio token designs with shape-coded affiliation frames, monochrome print companions and two furnished sample scenes.

### Fixed
- Keep keyboard-focused controls fully visible in short contextual sheets, including Firefox at 200% interface text. Preserve fractional inspector coordinates without native number-input rounding. Local results and outstanding hosted qualification are tracked in the UX-09 handoff.
- Keep failed-startup recovery controls available when another tab restores the same project first, instead of showing a blank editor. The original remains downloadable and Retry restore opens the newer saved project.
- Reserve unique token IDs before queued React updates so consecutive placements remain independently selectable and removable.

### Changed
- Strengthened the outer contours and interior strokes of all 24 monochrome Folio furnishings at the owner's request. Color artwork, path geometry, saved IDs, tokens and map symbols are unchanged; the revised print appearance is awaiting owner review.
- Locally implemented exact-artifact Pages gating: one production build is verified and consumed by each browser engine before eligible main runs can package and deploy it. Required check names and suites are preserved. Hosted enforcement and publication remain unverified.
- Reconciled public guides and in-app shortcut help with Your maps, Edit, Prepare, Run and the local player display. Documented private project backup versus session recovery scope, explicit import copies, offline readiness and unqualified release/device limits.
- Owner-approved print door revision: capital H/V overlays without the center line, matched letter clearance, and clean lock/trap symbols retaining their outer orientation posts.
- Print furnishings use neutral charcoal ink, and print fog uses neutral gray with crisp edges. Approved furnishing/token geometry and color-mode artwork are unchanged.
- Avoid full map/art repaints when only cursor coordinates change, while retaining live tool previews. Added repeatable F05 dense-map diagnostics; painting and representative-device performance qualification remain open.
- Refreshed `README.md` as a shareable landing page while preserving the detailed tool reference in `docs/FEATURES.md`.
- Added `docs/DEVELOPMENT.md` for setup/test details and `docs/SHARING.md` for launch positioning, demo scripts, repo metadata, and follow-up sharing work.

## [2026-05-16]

### Added
- `CONTRIBUTING.md` with setup, validation, and PR guidance
- `CODE_OF_CONDUCT.md`
- `docs/ARCHITECTURE.md` and `docs/README.md` for docs navigation
- Issue templates under `.github/ISSUE_TEMPLATE/`
- `PULL_REQUEST_TEMPLATE.md`

### Changed
- README front matter refreshed with badges, quick start, feature highlights, theme gallery, and docs links
- Roadmap updated to mark Phase 12.3 as complete
