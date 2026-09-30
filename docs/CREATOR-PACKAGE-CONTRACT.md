# Creator package v1 contract

**Status:** GH-N01 draft, September 30, 2026. Not an implemented format.
**Parent:** [GitHub integration roadmap](./GITHUB-INTEGRATION-ROADMAP.md).
**Source inspected:** `76c921ed763176ae196f3a42a0a92adcc51daa1a`.

## Owner decisions

- Start locally, with no GitHub connection, uploads or Actions usage.
- Include both **Map layout** and **DM encounter** profiles in the first version.
- Offer **CC BY 4.0** and **CC BY-SA 4.0** for the creator's own contribution,
  requiring an explicit choice with no preselected default.
- Existing artwork/content licenses remain unchanged. Imported material needs
  separate rights information. A license choice does not publish anything.

The remaining package resource envelope below needs owner approval before the
builder/importer contract is finalized. Implementation and its acceptance
evidence must subsequently distinguish this draft from shipped behavior.

## Profiles and field policy

Both profiles are for other map authors, not players. They expose full authored
geometry, including secret passages and undiscovered hazards. Never derive them
by copying a private backup or flattening a player projection.

Build a fresh payload from known fields. Unknown properties at every depth stay
in the source project and are excluded from the package. A local review report
identifies omissions without copying secret values or arbitrary unknown keys
into public manifests, filenames, README text, telemetry or logs.

| Field group | Map layout | DM encounter |
| --- | --- | --- |
| Package title, creator name and summary | Explicit publication input; no automatic account/device/project-name substitution | Same |
| Per-level names | Reviewable publication names, initially neutral `Level 1`, etc.; do not silently copy private `meta.name` or `publicName` | Same |
| Dimensions, tile size, base/per-tile theme and floor materials | Preserve selected-level geometry and known visual settings | Same |
| Tile types, vector rooms/walls/paths/rivers and structural references | Preserve authored shape/type/flow/door data, including secret/trapped geometry | Same |
| `discovered`, `discoveredType`, fog/explored arrays and initiative order | Do not copy play progress | Same |
| Notes and tile `noteId` links | Exclude notes and remove their links, with a visible omission summary | Explicitly selected notes only; disclose that DM labels/descriptions are private source content. Keep links only to included notes |
| Player, NPC and monster tokens | Exclude all | Individually reviewable inclusion; no automatic selection of player tokens or hidden entities |
| Visible furnishing stamps | Include as layout artwork after dependency/rights review | Same |
| Hidden stamps | Exclude with a visible omission summary | Explicit inclusion only, retain intentional hidden semantics |
| Freehand player/GM annotations and area markers | Exclude as potentially revealing encounter information | Explicit inclusion only, with each original kind preserved |
| Light positions/radii/colors | Preserve layout geometry; use neutral publication labels | Original labels require explicit inclusion review |
| Paper/edge/hand-drawn/atmosphere settings | Known visual fields only | Same |
| Imported backgrounds/custom image or path assets | Only explicitly reviewed referenced assets with rights information | Same |
| Project libraries | Only the dependency closure of included content | Same |
| Scene templates/unselected levels | Exclude; never export the whole library by convenience | Same |
| Local record/revision IDs, recovery/session data, credentials and unknown extensions | Never include | Never include |

Numeric map-entity IDs may remain where they connect tiles, notes, rivers and
stair links. They are not local Library IDs. New local project identity is
allocated on import, and package identity is separate from both.

A DM-encounter selection is not blanket permission to publish every field.
Group selections must show what will be included and permit deselection before
the exact immutable review snapshot is accepted. Keep geometry with embedded
text/imagery visibly in the review scope; automation cannot identify every
human-readable secret.

For a new imported authoring copy, start at its first selected level with a
fresh visibility state: fog enabled, all cells hidden, dynamic fog off, no
exploration/initiative/discovery progress. This does not make the authoring
copy player-safe; starting a session still uses the existing Prepare workflow.
It avoids inheriting the sender's disclosure progress or publishing on import.

## Dependency closure and compatibility

Selected source levels retain order and map to contiguous output indices.
Stair links whose endpoints are both selected are remapped. A link to an
unselected level blocks finalization until the author either includes that
level or explicitly approves omitting that link. Do not remove links silently.
Invalid or ambiguous entity/reference IDs block publication rather than being
repaired into an unexplained different map.

Resolve all references in tiles, theme overrides, room fill/wall/door hints,
included stamps and river parent/tributary relationships. Custom themes include
only referenced custom tiles and required base styling. Unused assets and
scene templates are not part of the closure. Do not fetch missing remote art.
Unknown semantic tile/material/catalog versions require explicit compatibility
handling, not a success-shaped visual fallback in the sharing preview.

Built-in art should be referenced by catalog identity/version rather than
embedding an entire app asset library in every map. Include its source and
license notices in package attribution where applicable. The receiving app
must check catalog compatibility before accepting the package.

The current `decodeProject`/`encodeProject` private contract stays version 1
and remains lossless for unknown data. The creator package has its own format
version and stricter public schema. Its allowlisted authoring payload can use
the existing project decoder after package validation, not as the publication
policy itself. Future unsupported package versions fail with instructions to
keep the original file; no partial Library write occurs.

## Files, identity and rights

The canonical output is a set of ordinary files under one map directory:
`manifest.json`, `map.json`, `preview.png`, `README.md`, `LICENSE.txt`,
`ATTRIBUTION.json` and referenced files under `assets/`. ZIP is transport, not
a separate schema. Data-URL assets must not remain as hidden duplicate artwork
inside JSON when the same source is externalized into `assets/`.

The manifest identifies format/profile, package identity/content version,
compatible schemas/catalogs and sorted member paths/sizes/SHA-256 hashes.
Do not include the manifest in its own hash list. Reject undeclared members,
duplicate normalized paths, missing members and mismatched bytes on import.
Canonical JSON, stable paths and fixed transport metadata make repeated
generation deterministic for the same publication input. Do not derive content
identity from a private project name, local UUID or wall-clock timestamp.

The review snapshot covers exactly the bytes to be downloaded. If source
content, level selections, names, rights or inclusion settings change, the
review must be regenerated. Preview the package payload, not the unfiltered
source. A preview of a mixed-license composition is not automatically covered
solely by the creator's chosen Creative Commons license.

`LICENSE.txt` must clearly scope the CC choice to the creator's own contribution
and point to component notices. Attribution records author/source/license and
any required notice/source offer for included existing material. Preserve
upstream licensing through import and remix; an author cannot declare
third-party work to be their own by checking a box.

The audit found AGPL-3.0-or-later notices for Folio floors, furnishings, tokens,
print artwork and the authored launch encounter compositions. They must not be
relicensed as CC merely because an unchanged sample was opened in the editor.
Current saved projects do not reliably record that origin. Publication must
therefore collect/retain relevant source declarations and make this limitation
explicit; unknown rights cannot be inferred from a missing provenance field.
Known or declared pre-existing material keeps its original terms. Compatibility
of redistributed source and flattened previews remains a release review
requirement, not a legal guarantee supplied by the UI.

## Measured inputs and proposed resource envelope

Read-only structural measurement reused all 35 bundled samples, F05 and the
existing rich/medium/large preservation fixtures: 39 synthetic inputs total.
No renderer, hosted operation, dependency installation or application rebuild
was used. Inputs were unchanged after inspection.

| Observed maximum | Value |
| --- | --- |
| Serialized project JSON | 8,177,446 bytes, approximately 7.80 MiB |
| Levels / aggregate cells | 8 / 131,072 |
| Longest map side | 128 cells |
| Top-level placed entities across all levels | 431 |
| Structural depth / visited values | 7 / 714,293 |
| Embedded images | One unique image per rich fixture; this is not broad image-load evidence |

Receipt: session `20233d90-7a79-4423-a564-f75af5b08662`,
`files/github-package-contract-measurements.json`; reproducible local measurement
script `files/github-package-contract-measure.mjs`. These are input sizes and
counts, not latency, native memory or reference-hardware acceptance.

Proposed v1 sharing limits, **pending owner approval**:

| Boundary | Proposed maximum | Reason / required follow-through |
| --- | --- | --- |
| Downloaded ZIP | 32 MiB | Bounded read before archive inspection; directory import uses the expanded limits |
| Sum of actual expanded member bytes | 64 MiB | Independent of ZIP header claims; stop decompression before crossing the bound |
| `map.json` | 16 MiB | Approximately twice the largest retained raw project; extracted asset bytes are additionally bounded |
| Levels / aggregate tile cells | 32 / 262,144 | Headroom over the measured 8-level/131,072-cell fixture; not a change to existing editor or backup limits |
| Archive members / nesting depth | 256 / 32 | Bound file bookkeeping and structured traversal; paths remain flat except the approved asset directory |
| Individual decoded custom image | 10 MiB encoded source and 24 million pixels | Reuse the current trace-image safety ceilings as a starting point, then exercise rich multi-asset cases before acceptance |

Also bound vector points, metadata/text and total decoded image work during
implementation using measured/adversarial cases, not untrusted declared sizes.
No worker may preallocate from an unvalidated dimension, count or byte claim.
Reject unsafe images/paths/types before rendering and never execute scripts,
HTML, external SVG resources or repository code from a package.

An oversized sharing package gets an explicit error and retains the private
original. Offer smaller selected-level/asset packages or the existing private
backup path, never silent downsampling, truncation or field loss. The private
backup importer and existing saved projects are not subject to new sharing
caps. Passing these limits is not a performance/support certification.

## Required fixtures and completion evidence

Reuse rich preservation/F05 fixtures for geometry, assets, multilevel links
and private state. Add a focused synthetic creator fixture covering:

- Both profiles, public/private note pairs, player/hidden tokens and hidden stamps.
- Private source names, annotated geometry, unknown keys/values at every depth
  and unselected levels/libraries containing unique disclosure sentinels.
- A link crossing the level selection, duplicate/invalid IDs and missing assets.
- Original CC contributions alongside existing licensed assets/sample content.
- Repeated exports from the same snapshot, unknown package versions and
  fresh-ID imports with pre-existing local projects/sessions.
- Every byte/count/depth boundary below, at and above its limit; hostile ZIP
  sizes/paths, mismatched hashes, conflicting selections and cancellation.

The fixture is not passing policy evidence by itself. GH-N02/GH-N03 must assert
the actual generated member bytes, omission review, immutable source and
storage outcomes. Build each profile's allowlist explicitly, with coverage that
fails when an application field is added without a sharing-policy decision.

GH-N01 closes only when the field/dependency/rights policy and resource
envelope are accepted. GH-N02 through GH-N04 and their local GH-N10 evidence
remain separate implementation milestones. Hosted usage remains zero.
