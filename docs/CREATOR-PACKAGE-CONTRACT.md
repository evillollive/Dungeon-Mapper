# Creator package v1 contract

**Status:** Complete account-free local package workflow, September 30, 2026.
GH-N01 through GH-N04 and scoped GH-N10 are locally covered; GitHub connection
and hosted release qualification are not implemented/passed.
**Parent:** [GitHub integration roadmap](./GITHUB-INTEGRATION-ROADMAP.md).
**Source inspected:** `76c921ed763176ae196f3a42a0a92adcc51daa1a`.

## Owner decisions

- Start locally, with no GitHub connection, uploads or Actions usage.
- Include both **Map layout** and **DM encounter** profiles in the first version.
- Offer **CC BY 4.0** and **CC BY-SA 4.0** for the creator's own contribution,
  requiring an explicit choice with no preselected default.
- Existing artwork/content licenses remain unchanged. Imported material needs
  separate rights information. A license choice does not publish anything.
- The owner approved the v1 resource envelope below. These are sharing limits,
  not new restrictions on existing private backups or saved projects.
- Include restricted SVG alongside PNG/JPEG/WebP. Reject unsupported SVG
  features explicitly rather than altering the original artwork.
- Use the lower aggregate image budget: 24 million decoded pixels per level
  across distinct images, processing levels sequentially. This is approximately
  96 MiB of raw RGBA pixels before browser overhead, not an absolute heap limit.
- Include an inherited-license path. AGPL-licensed sample/adapted maps retain
  their source license/notices; original contributions still have the explicit
  CC BY / CC BY-SA choice.

Implementation evidence must distinguish the internal review draft from a
complete, licensed package and from a shipped feature.

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

Owner-approved v1 sharing limits:

| Boundary | Approved maximum | Reason / required follow-through |
| --- | --- | --- |
| Downloaded ZIP | 32 MiB | Bounded read before archive inspection; directory import uses the expanded limits |
| Sum of actual expanded member bytes | 64 MiB | Independent of ZIP header claims; stop decompression before crossing the bound |
| `map.json` | 16 MiB | Approximately twice the largest retained raw project; extracted asset bytes are additionally bounded |
| Levels / aggregate tile cells | 32 / 262,144 | Headroom over the measured 8-level/131,072-cell fixture; not a change to existing editor or backup limits |
| Archive members / nesting depth | 256 / 32 | Bound file bookkeeping and structured traversal; paths remain flat except the approved asset directory |
| Individual decoded custom image | 10 MiB encoded source and 24 million pixels | Reuse the current trace-image safety ceilings as a starting point, then exercise rich multi-asset cases before acceptance |
| Distinct decoded images needed by one level | 24 million pixels in aggregate | Owner selected the lower ceiling; repeated references to the same bytes count once and levels are processed sequentially |

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

## Local content-selection foundation

`src/utils/creatorPackageFields.ts` defines recursive field allowlists checked
against the application types. A newly added model field requires an explicit
policy, rather than being spread into shared content automatically.
`src/utils/creatorProject.ts` prepares an isolated trusted review draft with
the selected profile, publication names, explicit encounter selections,
dependency closure, reference errors and fresh visibility state.

The draft returns local omission paths and assets requiring rights review.
Neither is a public manifest or permission to download/upload the content.
Byte/member/image bounds belong to final package assembly and intake; do not
apply the `map.json` limit prematurely to an internal draft containing embedded
images that will be extracted and deduplicated. Level/cell limits are enforced
before allocating the sharing copy.

Local coverage uses `src/test/creatorPackageFixture.ts`, unchanged F05 inputs
and existing private-backup cases. It covers disclosure sentinels, selected
DM content, stale/ambiguous references, library closure, legacy theme aliases,
determinism and independent copies, plus below/at/above level/cell limits.
The current targeted run has 39 passing cases in two files; application and
fixture type checks and changed-file lint also pass. The retained report is
`files/github-creator-core-unit.json` in the current session. These are core
unit results, not browser, archive, license-compliance or release qualification.

### Image admission foundation

`creatorAssets.ts`, `creatorImageDimensions.ts` and `creatorSvg.ts` now inspect
embedded static PNG/JPEG/WebP and restricted SVG inputs without fetching remote
resources or rewriting accepted bytes. Encoded size and declared raster
dimensions are checked before invoking the existing native image loader.
Decoded dimensions are checked afterward; the validation image is released.
Cancellation and decoding errors propagate explicitly.

SVG admission supports basic paths, groups, rectangles, circles, ellipses,
lines, polylines/polygons and bounded numeric transforms/paint attributes.
It requires an explicit viewBox and UTF-8 input. Scripts, event handlers,
external references, styles, embedded HTML, fonts/rendered text, animation,
nested SVGs, gradients and filters are rejected. There is no automatic
rasterization or partial sanitization. Titles, descriptions and comments are
retained and surfaced as metadata for subsequent publication review.
Animated PNG/WebP is outside the static-image contract.

The vector guards bound markup before DOM parsing, then elements (4,096),
numeric/path/transform work (200,000), metadata text (16,384 characters),
nesting and finite coordinate magnitudes. Numeric dimensions are checked
against the pixel ceiling, including a size inferred from an explicit single
axis and extreme aspect ratio. These guards do not certify total native
decoder/GPU memory or hostile-image safety beyond the recorded coverage.

The retained local unit report `files/github-creator-assets-unit.json` covers
112 cases across asset admission, creator selection and existing creation
behavior, including the actual encoded-byte boundary. Application/fixture
type checks and changed-file lint pass. The isolated source-module browser
probe in `files/github-creator-assets-browser-final.json` decoded the same
four synthetic PNG/JPEG/WebP/SVG files in Chromium, Firefox and WebKit, retained
their exact bytes/dimensions and rejected the controlled unsafe inputs without
external requests. It records engine versions and exact source/probe hashes.
An initial tooling-only CommonJS import failure occurred before browser launch;
the earlier successful source-module probe is retained separately.

This is not a production-bundle, complete package, license-compliance or broad
image-corpus qualification receipt. GH-N02 still needs per-package asset/rights
accounting, deterministic members and preview generation. GH-N03/GH-N04 still
need archive intake, independent Library import and the review/download UI.
The image-admission milestone required no GitHub connection, upload, dependency
addition or hosted run.

### Canonical members and ZIP transport foundation

The subsequent transport work adds `creatorPackageFormat.ts` and `creatorZip.ts`.
The former defines the format identifiers, exact member-path allowlist,
canonical JSON and SHA-256 identities. It rejects missing/duplicate/unsafe
members, unsupported JSON values and excessive bytes/counts. Byte-view checks
work across realms, rather than rejecting valid encoder/worker output based
on its JavaScript constructor.

ZIP encoding uses the inspected MIT-licensed `fflate` 0.8.3 dependency, with
fixed timestamps and path order. An owned snapshot protects reviewed input
buffers from transfer or later mutation. Compression operations run sequentially;
completed workers are terminated, cancellation terminates outstanding work,
and accumulated ZIP output is checked against the 32 MiB limit before copying
another chunk. This is not an absolute native-memory measurement.

The retained `files/github-creator-transport-unit.json` records 92 passing
cases across transport and asset guards. Coverage includes actual
incompressible ZIP output crossing its ceiling, below/at/above map/expanded
byte and member-count limits, deterministic roundtrip bytes, one compression
operation at a time, cancellation/retry and the selected per-level image
budget. Application/fixture types and targeted lint pass. Initial cross-realm
byte detection and constructor-sensitive test comparisons were corrected
without weakening byte-by-byte comparisons.

These helpers encode a byte envelope; they do not yet assemble a complete
creator package, validate an incoming archive or authorize its content.
Rights/manifest assembly, preview generation, archive intake and Library/UI
integration remain in progress. The existing Creative Commons decision covers original creator contributions,
not permission to relicense an existing map.

The dependency installation followed the manifest change and added only
`fflate`, without lifecycle scripts or unrelated upgrades. No GitHub connection,
upload, remote mutation or hosted run has occurred.

### Inherited-license and provenance foundation

The owner approved the inherited-license path. `creatorProvenance.ts` now
validates source credits separately from the private backup schema and
restricts sharing choices according to declared inherited terms. Original
content has the two CC choices; CC BY-SA adaptations retain share-alike;
declared AGPL adaptations use AGPL-3.0-or-later. Mixed AGPL/CC BY-SA or unknown
map-license combinations stop for compatibility review rather than inventing
a conversion. Missing provenance is not proof of authorship.

New bundled sample copies retain source notices as level metadata. Existing
saved maps are not retroactively rewritten. Project/level/template provenance
is opaque to ordinary private persistence, including future unknown versions.
Creator sharing validates it and stops on unresolved formats. Source notices
travel through copied map content, scene templates, independent template
creation, level history and undo/redo. New unrelated blank geometry does not
inherit another map's license just because reusable libraries were copied;
the libraries/templates retain their own associated credits.

The provenance work brought a necessary part of GH-N06 forward. It exposed a
history snapshot omission: provenance must be explicitly captured/restored
with content rather than surviving undo accidentally. The targeted hook case
now verifies undo and redo across a cross-project paste. Template application
continues respecting the existing saved-workspace checkpoint gate.

`files/github-creator-provenance-unit.json` retains 115 passing cases across
seven files for inherited choices, sample copies, creation, source preservation,
clipboard/templates and edit history. Application/fixture types and targeted
lint pass. This is not an ownership detector or proof of legal compatibility;
declarations, preserved source notices and publication review remain necessary.
Full package assembly, import and UI are still not available.

## Complete local package workflow

Source `4525a58f3653a4631b44e2ec563c576deec7acf9` completes the first account-free
slice. The preceding
foundation entries remain chronological evidence, not the current availability
statement. `CreatorShareDialog` is available from Library cards and the editor's
Export dialog. It captures an independent source snapshot, requires explicit
publication identity/profile/license/rights choices, shows exact previews,
omissions (with pagination), member hashes and source/image notices, and requires
a second acknowledgement before requesting the ZIP download.

`creatorPackage.ts` assembles canonical metadata, component notices and reviewed
content. Images are externalized by hash without byte changes; preview levels
render sequentially with the approved per-level image budget and released
surfaces. Identical input produces identical members within each tested engine;
native PNG encoding differs across engines and is not claimed byte-identical
between browser implementations.

`creatorZipIntake.ts` validates regular-file paths, directory/local-header
agreement, flags, CRC and actual streamed expanded lengths. Unsupported links,
encryption, ZIP64, duplicate/colliding paths, mixed package roots, hidden extra
members, excessive declared/actual sizes and malformed streams fail explicitly.
`creatorPackageImport.ts` checks all member identities, schema/catalog/profile,
asset dependencies, source notices, image admission and decoded budgets before
returning an isolated candidate. Directory input uses the same member inspection.
The Library writes only after confirmation through its existing fresh-project
path. No public URL, token or arbitrary repository code is fetched/executed.

Inherited background credits are stored with their level, so reordering/selecting
levels does not relabel an asset as newly owned. Project-wide reusable asset
credits remain separate. Known inherited credits are read-only in the publishing
review. Ordinary opaque future provenance remains recoverable in private
backups but blocks sharing until understood. Attribution is not an ownership
detector, legal review or compatibility guarantee.

The required runner has one new `Creator sharing reviewed ZIP and independent
Library import` case per engine. It checks real production UI selection,
downloads/member hashes, absence of unselected disclosure sentinels, a 390x440
review viewport, unchanged native records, cancelled/malformed input, new local
identity, editor re-entry with inherited license choices and native directory
selection. No existing timeout, retry, required check or acceptance bound changed.
Initial label-selector failure is retained in `files/github-creator-ui-first`;
the actual combobox accessible names were used for the correction.

Retained local evidence in session `20233d90-7a79-4423-a564-f75af5b08662`:

- `files/github-package-roundtrip-initial/`: real source-module assembly/ZIP
  roundtrip and repeated-member-byte checks on all three engines, with actual
  ZIP/PNG files and source/probe hashes. Not a production-bundle receipt.
- `files/github-creator-ui-second/` and `github-creator-ui-other-engines/`:
  initial successful production journeys; later final receipts supersede these
  for code that changed afterward.
- `files/github-creator-offline-final/`: the same production journey completed
  after cache readiness and shutdown of its sole HTTP origin, before opening
  creator sharing. All three engines reloaded the Library and completed
  download, independent import, malformed/cancelled input and directory
  selection. Receipt records build-file hashes and the journey identity.
- `files/github-creator-workflow-unit.json`: the prior 276-case selected
  regression run; later additions include directory equivalence and
  refused-import retry, recorded in the final receipt rather than retroactively
  changing this report.
- `files/github-creator-workflow-unit-final.json` and `github-creator-ui-final/`:
  the final selected run has 276 passing cases across fifteen unit/component/hook
  files and three passing production browser journeys, without skips/retries.
  This is not the entire application test suite.
- `files/github-creator-final-source.json` and `github-creator-final-dist/`:
  source, report and production-byte identities. Every production file and the
  journey source from the stopped-origin campaign were checked against this
  final candidate; no offline run was relabeled by revision alone.

The Vite App chunk still exceeds the existing 500 kB advisory; it is not
suppressed. Creator screens, import logic and ZIP code have their own lazy
chunks and are included in the production offline precache. Dependency/runtime
usage adds no remote service and no hosted trigger.

This is bounded local implementation/qualification, not a final release receipt.
No legal compatibility certification, screen-reader/device/participant
acceptance, total native/GPU-memory guarantee or broad hostile-image-corpus
assessment is claimed. Physical printing and the original UX-09 gates are
unchanged. GH-N05 public-link fetching, GitHub-linked version checks, account
authorization, remote publishing, evidence transfer and hosted qualification
remain distinct subsequent work.

**Accounting:** zero hosted runner minutes approved, zero triggers and zero
queued/running reservations for this slice. No pushes, PR mutations, uploads,
app registration, deployment, delegated agents or native-setting changes.
Local compute/disk and account-wide quota remain unmetered/unknown. The new
required-runner journey adds three future engine cases and must be included
in any later publication budget.

## Public GitHub reader preparation, not enabled

The next local GH-N05 step adds an unwired `creatorGitHub.ts` transport prototype.
It accepts explicit HTTPS github.com package-folder/manifest links, including
slash-containing branch names, resolves the reference once, walks only the
selected regular Git trees and verifies raw blob bytes against their immutable
Git identity. The returned package still needs the existing full SHA-256,
schema, rights and image inspection before any preview or Library write.

Requests are unauthenticated GETs to the fixed GitHub API origin, with credentials
omitted, no referrer, no redirects and no private-repository fallback. Responses
are streamed with actual-byte bounds; tree metadata has a 2 MiB ceiling.
The operation has a 120-second total deadline and at most the package member
count plus six metadata requests. It stops on throttling/denial instead of
retrying automatically or asking for a broad access token. A large valid package
may exceed the user's remaining unauthenticated API allowance; this is not a
claim that API capacity is available.

`files/github-public-reader-mocked.json` records 36 passing synthetic transport
cases. Application/test types and targeted lint pass. GitHub's
[raw Git blob media type](https://docs.github.com/en/rest/git/blobs) was checked
against current public documentation; that is API research, not a live package
integration test. No UI action imports from GitHub yet, no credentials/service
were configured, and no package was published. The live fixture/permission
decision remains a GH-R03 boundary.

## Offline package version comparison

September 30, 2026. This bounded GH-N06 slice works without a GitHub connection
or a published fixture. New successful creator imports add a versioned private
`creatorPackageOrigin` receipt containing original declarations and every
validated member's path, byte count and SHA-256, including the actual manifest
bytes. It contains no local filename, local project ID, access token or inferred
GitHub publisher identity.

The receipt is an optional opaque project field for private persistence.
Ordinary edits and backups retain it; creator-sharing allowlists exclude it.
New blank/template creations do not inherit a parent package's comparison
identity. Provenance/license obligations remain in their existing separate
field. Incoming creator packages cannot provide the receipt themselves: the
inspector creates it only after validating the package.

**Manage > Compare creator package** captures the selected saved receipt and
reads a supplied local ZIP through the existing full inspection path. The
comparison uses the original imported files, never the edited local project.
It identifies added/removed/changed members, changes to declared author,
license/profile/catalog, different package IDs, and unchanged version labels
with changed bytes. Equal file size does not hide a changed hash. An inconsistent
private receipt claiming the same manifest identity for different declarations
or member bytes is rejected.

The comparison is not authentication or a version-ordering service. Package
IDs and author/version labels are declarations; private receipts are editable
and unsigned. Different IDs are explicitly described as a separate map, not
an upstream update. **Import as new project** always creates an independent
copy through the existing storage path. Comparison, cancellation and rejected
input do not write to the original project. Keyboard focus moves to the
comparison heading and returns to its action when the preview is cancelled.

Older creator imports may lack receipts. Do not backfill them from edited
geometry or silently fetch an upstream map. The UI explains how to import an
original creator package separately to establish a baseline. Unknown future
or malformed receipts are retained in private backups and produce an explicit
comparison error; they do not prevent ordinary private persistence.

Local evidence is retained under the current session's
`files/github-version-comparison-*` paths. The existing creator production
journey now compares an identical package after a local rename, reads a
synthetically revised package with three exact member changes, exercises narrow
keyboard focus/scrollport visibility and imports the revision under a fresh
identity while preserving both prior records. It also retains the previous
ZIP/folder, cancellation, malformed-input and source-disclosure checks.
Unit/component coverage exercises receipt boundaries, future data preservation,
source-receipt forgery rejection, export exclusion, same-label changes,
different IDs, explicit import, cancellation and focus return.

This extends the existing three-engine case rather than adding a new CI job
or changing timeouts/retries. The retained earlier comparison screenshots were
element captures clipped by the Library scrollport; the focused viewport
captures show the actual heading and file-list views instead. Source/render
changes and final receipt locations remain distinguished in the handoff.
The existing App chunk-size advisory remains visible, not suppressed.

No GitHub requests, background polling, publisher verification, remote merges,
repository creation or hosted runs are part of this slice. Live upstream
comparison and repository rename/deletion behavior still require the approved
fixture and subsequent qualified integration. The fixture's separate
24-minute ceiling remains unavailable for spending until allowance is confirmed;
this application task has zero approved hosted minutes.
