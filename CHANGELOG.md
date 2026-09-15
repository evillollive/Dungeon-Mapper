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
- Reserve unique token IDs before queued React updates so consecutive placements remain independently selectable and removable.

### Changed
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
