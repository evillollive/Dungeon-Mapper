# Optional GitHub publishing and map reuse roadmap

**Date:** September 30, 2026.
**Status:** GH-N01 through GH-N04 implemented/covered locally with the selected
GH-N10 checks. GitHub-specific network features and hosted qualification remain
unimplemented/unassessed.
**Parent:** [UX-11 in the primary execution roadmap](./USER-EXPERIENCE-ROADMAP.md#ux-11-optional-github-publishing-and-map-reuse).

The owner requested a substantial GitHub integration plan, with non-Actions
and Actions tasks separated. This approves roadmap work, not implementation,
app registration, hosting, repository creation, publication or spending.
The application/integration hosted budget remains **zero**. A separate
fixture-repository task has an approved 24-minute ceiling but no currently
spendable allowance; see the deferred fixture plan below.

**Execution update, September 30:** The owner subsequently authorized starting
the local tasks, selected both Map layout and DM encounter profiles, and chose
an explicit CC BY 4.0 / CC BY-SA 4.0 choice for creator-owned contributions.
The owner also approved the measured first-version sharing limits.
See the [field-level contract, input envelope and local core evidence](./CREATOR-PACKAGE-CONTRACT.md).
GitHub registration, connection,
publication, hosting and Actions remain unauthorized.

**Local slice completed:** The Library/editor now offers reviewed creator-copy
export and independent ZIP/folder import, including the inherited-license path
and source preservation. The owner selected restricted SVG support and the
lower 24-million-pixel aggregate image budget per level. Necessary provenance
preservation from GH-N06 was brought forward; upstream GitHub version comparison
is not implemented. [Actual local evidence and remaining limits](./CREATOR-PACKAGE-CONTRACT.md#complete-local-package-workflow)
include production journeys and a stopped-origin offline exercise, not hosted
or legal certification.

**GH-N05 preparation:** A credential-free public GitHub reader exists as an
unwired transport prototype in `src/utils/creatorGitHub.ts`. Thirty-six mocked
tests cover explicit links, one resolved commit, tree/blob identities,
regular-file admission, response/resource limits, rate-limit failures and
cancellation/deadline behavior. No live GitHub API read was used to qualify it,
and the UI does not offer GitHub import yet. An approved public package fixture
is needed for GH-R03; the local archive has not been uploaded.

**GH-N06 local comparison:** New creator imports retain bounded private package
receipts. Your maps now offers **Manage > Compare creator package** to compare
another local ZIP against original imported file identities, independently of
local edits. Version labels, changed declarations and file changes are explicit;
confirmation still imports a separate project. No GitHub identity is inferred
from matching package IDs. [Scope and retained evidence](./CREATOR-PACKAGE-CONTRACT.md#offline-package-version-comparison)
remain separate from future live upstream checks and repository rename/deletion
handling.

## 1. Product outcome and boundaries

Let a creator publish an intentionally shareable, editable map in a repository
they control. Another DM can inspect its preview and license, make an independent
local copy, remix it and credit the original. GitHub supplies durable repository
identity, version history, forks and optional contribution review. Dungeon Mapper
remains useful offline and without a GitHub account.

The useful scope is **publishing and reuse**, not continuous synchronization or
a new virtual tabletop. Start with ordinary files and GitHub's existing UI.
Add an optional connected publisher only after the portable workflow works.

| Included direction | Explicitly outside this expansion |
| --- | --- |
| Portable creator packages, local preview/import and attribution | Replacing private project backups or local recovery |
| User-selected repository, reviewed snapshots and immutable source references | Automatic autosave to GitHub, two-way live sync or silent conflict merging |
| Optional GitHub authorization, publish/update receipts and disconnect | Mandatory accounts, GitHub credentials pasted into the editor, account-based editing |
| Public map links, independent remixes and optional upstream contributions | Live player state, invitations or multiplayer; those remain UX-10 |
| Optional repository validation and map release packaging | A marketplace, payments, proprietary asset hosting or an app-wide social network |
| Separate operational release-evidence storage | Treating private test archives as publicly shareable map content |

UX-11 is P2 and does not block desktop-first early access. Local planning and
bounded implementation may be selected independently of UX-10. No GitHub feature
closes A-PRINT, A-PERF, A-UPDATE, hosted qualification or human acceptance.
Shipping any selected slice still needs its applicable qualification and owner
approval; an unpublished local prototype is not a supported feature.

## 2. Three different kinds of content

| Content | Contract |
| --- | --- |
| Existing private project backup | Preserve the current lossless project envelope, unknown fields and all levels/libraries. It is not public-safe, does not contain separate sessions, and remains unchanged by this work. |
| New creator-sharing package | A separately versioned, explicitly reviewed subset intended for other map authors. Editable layout and encounter material can contain spoilers. Never label it player-safe. |
| Existing player-facing display/images | Continue using the current audience projection and explicit display/export paths. A public repository or an attractive thumbnail does not make creator data safe for players. |

The sharing builder must construct a new allowlisted document. Do not serialize
a backup and remove a few known secrets: `decodeProject` deliberately preserves
unknown fields. Do not change that preservation behavior to implement sharing.
The current player projection is current-level and intentionally removes
authoring geometry, so it is not a drop-in editable creator-package format.

Proposed creator choices, to resolve at GH-N01:

- **Map layout:** selected authored levels and reusable geometry. Private notes,
  player/campaign identity, live initiative and hidden encounter entities are
  excluded by default. Explain that the full layout, including secret passages,
  is still an author-facing spoiler.
- **DM encounter:** optionally include specifically reviewed DM notes, encounter
  tokens and hidden encounter content. Show those inclusions before export and
  again before a remote write. No real session/recovery state is included.

Always exclude local record IDs/revisions, recovery history, separate sessions,
credentials, diagnostic logs and unrelated project assets. Report every
excluded field/category, unresolved reference and unsupported extension; never
silently present a lossy publication as a complete backup. Retain the source
project unchanged. A new field is not publishable until its policy is defined.

Resolve stair links, asset references and selected-level dependencies before
building the package. Offer explicit choices for missing dependencies rather
than silently dropping geometry or substituting artwork. Thumbnails, filenames,
README text, attribution and image metadata need the same disclosure review as
the map payload. Human review remains necessary for secrets drawn into artwork.

## 3. Proposed portable format and licensing

Keep a Git-friendly directory as the canonical representation, with an optional
ZIP transport containing the same files. Do not make an opaque ZIP the only
editable artifact in Git. One user-owned repository may contain several maps;
one repository per map must not be mandatory.

Illustrative layout, not an implemented schema:

```text
maps/<stable-map-id>/
  manifest.json
  map.json
  preview.png
  README.md
  LICENSE.txt
  ATTRIBUTION.json
  assets/                 # only referenced, permitted custom assets
```

The manifest should identify the package format version, package/map identity,
content version, compatible app/schema scope, author-chosen title/description,
audience profile, selected levels, file sizes and SHA-256 hashes. Record upstream
repository identity, commit and package path for a remix. Keep provenance
separate from local project identity and never infer legal authorship from a
GitHub username or a matching checksum.

Specify deterministic ordering and canonical serialization. Repeated generation
from the same reviewed snapshot/options should produce the same payload hashes;
timestamps or transport metadata must not create spurious map changes. Commit
the complete package in one change, not a succession of partly usable files.
Large immutable downloadable bundles may later use Release assets, with explicit
size handling rather than automatic Git LFS enrollment.

**Open reuse requires a license, not just public visibility.** Preserve the
application's AGPL-3.0-or-later license; it does not automatically license every
map, note, imported background or third-party asset produced with the editor.
Present appropriate content-license choices for owner review, for example
CC BY 4.0 and CC BY-SA 4.0, without silently choosing or relicensing a creator's
work. Label restricted/no-derivatives/noncommercial material accurately rather
than advertising it as freely remixable.

Require asset-level author/source/license/notice information when applicable.
Retain upstream notices and license obligations through import and remix.
Do not claim that a license picker proves ownership or compatibility. Unknown
redistribution rights block including that asset in a public package until the
author supplies rights information or explicitly removes/replaces it. Preserve
the private original. Do not relicense bundled art or fetch external art to
complete a package. Review the actual built-in asset notices before deciding
whether to embed an asset or reference a compatible built-in catalog version.

## 4. User journeys and integration shape

### First slice: no connection required

From a trusted Library/editor surface: **Share a copy -> review content and
rights -> preview the exact package -> download**. Keep **Back up project** and
player export visibly distinct. GitHub-ready instructions can explain manual
upload to a user-selected repository without handling credentials.

Receiving a package goes through **preview -> license/source information ->
confirm -> new local project**. Allocate a fresh local identity and reuse
existing storage conflict/recovery protections. A failed import must leave
existing records untouched. Keep an ordinary download/import fallback when
GitHub or an integration service is unavailable.

### Next slice: public links and remix provenance

Accept an explicit github.com repository/package link, resolve its branch/tag
to a commit once, and fetch all members at that commit. Pin the preview,
manifest and import to the same bytes. Display source, revision, license,
audience and compatibility before import. A moving branch or tag is not itself
an immutable version.

Start with explicit links, not unauthenticated account-wide search or a public
catalog crawler. Use API pagination and supported media types, byte limits,
conditional requests and bounded retry/backoff. Do not assume Contents API
directory listings are unlimited or that download URLs never expire.

Track upstream provenance locally without polling or modifying the original.
An explicit **Check for a newer version** can offer another independent import.
Do not overwrite local edits or automatically merge two maps. Open GitHub's
native fork/PR UI first; integrated fork creation or PR submission is a later,
separately authorized write capability.

### Connected publishing: recommended architecture, not selected hosting

Prefer a GitHub App with selected-repository installation and narrowly scoped
user authorization over a broad OAuth `repo` grant. Begin with an existing,
user-selected map repository. Ask for Contents write only when publication is
requested. Pull-request write is needed only if integrated PR creation is
subsequently approved. Do not request Actions administration, workflow editing,
organization administration or access to every repository.

Logging into github.com does not authorize Dungeon Mapper. Installation,
user authorization and repository write access are separate checks. Verify the
authenticated user, app installation and repository identity server-side;
repository names can change. Client UI restrictions are not authorization.

For the recommended web flow, GitHub documents a client secret for token
exchange even with PKCE. A static Pages bundle must not contain that secret.
Plan a minimal, separately approved authentication/API service, or retain the
manual package workflow if no service is accepted. Decide the hosting provider,
operational owner, cost, data residency and retention before implementation.
Do not implement token exchange in Actions or turn CI runners into a web API.

The service design must cover state/PKCE validation, fixed callback/origin
allowlists, secure session cookies and CSRF protection, token expiry/revocation,
least-privilege repository access and strict operation/path validation. Keep
access/refresh tokens and app secrets out of IndexedDB, localStorage, service
worker caches, URLs, maps, exports and logs. Do not persist refresh tokens unless
there is an approved need and secure retention design. No analytics or map
content logging is required to deliver this feature.

The existing service worker must not cache authentication responses or private
repository requests. Disconnect clears integration credentials/state and stops
future queued operations, without deleting local maps or remote repositories.
Offline editing and existing private backups must still work after revocation,
service failure or the user declining every GitHub permission.

### Publication and conflict semantics

Before writing, show the exact account, repository, branch, path, current
visibility, contents/rights summary and intended change. Default to a private
destination when a new repository is separately authorized. A public destination
requires explicit acknowledgement. Never change visibility or create a repo
merely because authentication succeeded.

Protect unrelated paths, including `.github/`, repository settings and other
maps. Respect branch protection and required checks. Prefer a reviewed branch/PR
for protected destinations; never force-push or bypass protection to publish.
New repository creation needs its own permission and protection/CI decision
consistent with the owner's repository defaults.

Build all blobs/tree/commit from a reviewed base and use a non-forced,
fast-forward-only ref update. A moved remote head requires a fresh comparison
and user decision, not an automatic overwrite. Independent Contents API writes
must not expose a half-published multi-file package. Test the actual selected
API's conflict semantics before claiming atomic publication.

After a write, read back the resulting commit and package hashes. Distinguish
**draft local**, **uploading**, **remote outcome unknown**, **committed**,
**awaiting required checks**, **publicly available** and **failed**.
For a timed-out response, reconcile remote identity/content before offering a
retry; do not create duplicate commits, releases or PRs automatically. Local
cancel prevents future work but cannot undo a write already accepted by GitHub.
Removing a public map does not revoke downloaded copies, forks or prior history.

## 5. Non-Actions tasks

These tasks do not inherently require hosted runners. **Local** means synthetic
data, local tools and mocked APIs only. **Remote** means separate account,
infrastructure or publication permission, and potentially non-Actions costs.
A remote write can still trigger Actions in its target repository: GH-A00 then
applies before the write. Non-Actions does not mean free, safe to publish, or
authorized under the current zero budget.

GH-N01 through GH-N04 and their scoped local GH-N10 work are complete locally.
GH-N06 provenance preservation and explicit local package comparison are
implemented; GitHub-linked upstream checks remain planned. Other feature tasks remain planned, with the
existing evidence archive noted in GH-N11. Dependencies describe technical
prerequisites, not spending approval. Local completion never authorizes a remote
trigger or marks hosted qualification as passed.
Owner decisions in section 8 gate the corresponding implementation.

GH-N05 is now in progress as the mocked transport prototype above; this does
not mark public-link integration or real-GitHub acceptance complete.

| ID | Work / execution | Prerequisites | Completion evidence and stop condition |
| --- | --- | --- | --- |
| GH-N01 | Define creator package schema, content profiles, reference closure, license/asset policy and resource limits. Local design. | Existing backup/audience contracts | Reviewed field-by-field policy and synthetic fixtures, with unknown fields and cross-level references covered. Stop before code if audience or rights decisions are unresolved. |
| GH-N02 | Implement deterministic package builder, rights inventory and preview generation. Local. | GH-N01 | Repeated-input hash equality, unchanged originals, secret sentinels absent from every unauthorized output surface, explicit unsupported-content errors. No GitHub requests. |
| GH-N03 | Implement safe package inspection/import into an independent Library project. Local. | GH-N01 | ZIP/directory equivalence, compatibility/size failures, complete validation before persistence, fresh IDs and no changes to existing projects/sessions on failure. No remote reads. |
| GH-N04 | Wire creator review/download and receiver preview/import into existing Library/editor UX; add manual GitHub instructions. Local. | GH-N02, GH-N03 | Complete keyboard-accessible roundtrip with explicit audience/license/visibility wording. Offline and existing backup/player export flows preserved. Stop at a usable account-free slice. |
| GH-N05 | Implement explicit public repository-link resolution and commit-pinned fetching against mocked GitHub endpoints. Local. | GH-N03 | Mixed-ref, malicious URL, redirect, expiry, throttling, cancellation and partial-download cases fail safely; manual file fallback works. Real GitHub access waits for GH-R03. |
| GH-N06 | Add upstream attribution and deliberate version comparison/remix metadata. Local. | GH-N03 | License/credit persistence, independent edits, renamed/deleted upstream handling and no background polling or overwrite. GitHub-native contribution links before integrated writes. |
| GH-N07 | Decide authentication/service architecture and produce permission, data-flow, threat and operations contracts. Local design plus owner decisions. | Section 2 boundaries | Explicit hosting/cost decision, secret lifecycle, endpoint authority, disconnect behavior and review scope. Stop if the project should remain manual-only. |
| GH-N08 | Implement optional connection UI and approved auth/service boundary using local fakes. Local. | GH-N04, GH-N07 | Login denial, wrong account, expiry/revocation, CSRF/state failures, cache isolation and offline fallback. No live credentials, registration or deployment. |
| GH-N09 | Implement reviewed publish/update and recovery receipts against mocked APIs. Local. | GH-N02, GH-N06, GH-N08 | Multi-file publication, concurrent edits, protected branches, unknown outcomes, readback verification and duplicate-prevention cases. No remote writes or silent repo creation. |
| GH-N10 | Integrate each selected slice's focused regression coverage and documentation into the existing qualification approach. Local. | The selected GH-N02 through GH-N09 slice, not every optional feature | Fixture/source-bound results, accurate implemented/support claims and measured package limits. Keep existing required checks; do not invent a parallel full application pipeline. |
| GH-N11 | Prepare a separately reviewed release-evidence transfer selection and destination proposal. Local operational work. | [Existing staged archive](./UX-09-HANDOFF.md#portable-local-evidence-archive) | Archive already exists; this task adds destination/access/retention decisions and publication review, not another archive campaign. Missing historical evidence remains listed. No upload. |
| GH-N12 | Design and locally exercise an optional map-repository validator/template. Local. | GH-N01, GH-N03 | Validate schema, references, hashes, licenses and resources without executing repository content. Template contains no tokens or implicit deployment. Enabling its workflow belongs to GH-A03. |
| GH-R01 | Register the approved GitHub App and provision the approved service/callback domain. Remote. | GH-N07; owner approval of provider, permissions, cost and operations | Minimal permissions, explicit selected test repositories and verified configuration. No broad installation, production data or unapproved billing. CI-triggering deployment also needs GH-A00/GH-A02. |
| GH-R02 | Exercise real login, installation scope, expiry, revocation and disconnect using disposable accounts/repositories approved by the owner. Remote. | GH-N08, GH-R01; applicable service qualification | Real permission-denied and lifecycle evidence without personal map data. Record limitations for organizations/SSO rather than assuming they work. Stop on unexpected access or cost. |
| GH-R03 | Exercise public-link fetch/import against an approved small fixture repository. Remote read-only. | GH-N05; explicit fixture selection | All bytes resolve to one commit and local import preserves provenance and records. No crawling, repository mutation, private credentials or test-data upload. |
| GH-R04 | Exercise publish, conflict recovery and readback in an approved disposable destination. Remote writes. | GH-N09, GH-R02; applicable app/service qualification; GH-A00 for possible triggers | Exact remote receipt, no unrelated path changes, no protection bypass, denied/revoked access and timeout reconciliation covered. Stop if workflow impact cannot be bounded. |
| GH-R05 | Transfer approved release evidence, verify the received copy and record retention/access ownership. Remote operational work. | GH-N11; chosen destination and explicit upload permission; GH-A00 if triggered | Verified remote bytes, independent digest receipt and recovery instructions. For GitHub Releases, record repository/tag/asset identity and deletion/retention policy; never treat an upload as app release approval. |

The first useful local milestone is GH-N01 through GH-N04, followed by that
slice's GH-N10. Public-link import and provenance are the next independent
improvements. Connected publishing is conditional, not a reason to hold the
portable workflow until an authentication service exists.

## 6. Actions and hosted qualification tasks

No Actions task may start now. Application/service work is unbudgeted; the
separate fixture-task ceiling cannot be used until available allowance is
confirmed. Writing a proposed
workflow locally belongs to preparation; pushing, opening/updating a PR,
creating a release/tag, merging, dispatching or rerunning may be the trigger.
Do not infer permission from a task being present in this roadmap.

| ID | Work | Prerequisites | Completion evidence and cost boundary |
| --- | --- | --- | --- |
| GH-A00 | Inspect live trigger definitions and recent representative job durations, then obtain a numeric per-task runner-minute ceiling. | A concrete intended remote operation and target repositories | Estimate every expected job/matrix leg/run, rounded/billing-adjusted consumption, setup/build duplication and retries; reserve required post-merge/deployment work. Record approval, known use, reservations and remaining allowance before each later trigger. No measuring run. |
| GH-A01 | Publish and qualify the selected application slice through the existing required pipeline. | Relevant GH-N10; GH-A00 | Exact-revision Build and test plus Browser qualification, followed by applicable canonical-artifact deployment evidence. Local topology is implemented but not yet hosted-proven; refresh its live state first. No new parallel full-suite workflow. |
| GH-A02 | Qualify/deploy the optional service and verify its production auth boundary. | GH-N07 through GH-N09 as applicable, GH-R01 and explicit service/workflow scope approval; GH-A00 | Minimal source-bound service checks and controlled credentialed smoke tests on the approved environment. No credentials in fork/untrusted jobs; rotation, rollback and revocation evidence. Runtime/storage/egress cost is separate from runner minutes. |
| GH-A03 | Enable the optional map-repository validation workflow in an approved pilot. | GH-N12, pilot owner/protection decision; GH-A00 | One scoped required validator if approved, changed-package selection with a fail-closed aggregate, bounded inputs/timeouts and superseded-run concurrency. Preserve default-branch validation; skipped/cancelled is not passing. Do not run the entire editor suite for every map edit. |
| GH-A04 | Add optional automated map Release packaging only if manual packaging is insufficient. | GH-A03 plus explicit demand, release policy and permission review; GH-A00 | Release bytes come from the exact validated commit, with hashes and source receipt. Reuse validated outputs rather than re-rendering/rebuilding blindly. Reconcile partial upload failures and avoid event recursion. |
| GH-A05 | Authorize supported rollout of the selected connected slice. | Applicable GH-A01/GH-A02 and GH-R02 through GH-R04; owner acceptance | Exact deployed source/configuration, permission/privacy review, supported-browser and limit evidence, runbook and operating owner. Budget any post-merge checks and controlled rollout jobs; do not turn rollout into an unbounded monitoring campaign. |

GitHub App writes can start workflows; they are not covered by assumptions
about the repository's automatic `GITHUB_TOKEN`. Inspect `push`, PR, tag,
`release`, dispatch, merge-queue and downstream workflow triggers in every
affected repository. Do not disable existing checks or use skip directives to
make publication appear to cost zero.

Track aggregate runner consumption, not wall-clock completion. Share one
approved allocation across any delegated work or coordinated repositories.
Stop before an unbounded trigger or a potential ceiling overrun. On quota or
billing rejection, stop rather than retrying. Account balance, provider runtime
cost, storage/egress and future job duration are **unknown until inspected**;
no allowance or host is selected by this document.

Prefer batching coherent changes, exact-artifact reuse, appropriate scoped
validation and cancellation of superseded qualification work. Do not alter the
existing required-check policy without explicit approval. New repositories must
follow the owner's branch-protection defaults where supported; unavailable
server-side enforcement must be disclosed, not represented as protected.
Any hook fallback is local tooling, not server-side enforcement of web/API writes.

## 7. Required safety and acceptance coverage

| Area | Required cases |
| --- | --- |
| Disclosure | Private/unknown fields at every level; unpublished notes; hidden tokens; campaign identifiers; image text/metadata; filenames, thumbnails, README and error logs. Verify every actual package member, not only the visible preview. |
| Import boundary | Path traversal, absolute/duplicate/case-colliding entries, symlinks, archive bombs, truncated files, hash mismatch, excessive counts/depth/bytes/pixels, malformed JSON and incompatible versions. Numeric limits must be justified and tested below/at/above the boundary before accepting untrusted packages. |
| Remote input | Commit consistency, pagination, expired download URLs, truncated tree responses, submodules/symlinks/LFS pointers, unexpected media types/redirects and unavailable assets. Do not follow arbitrary remote artwork URLs or forward credentials to a redirected host. |
| Rendering | Treat README/metadata as text or safely rendered markup, never arbitrary HTML. Validate image/SVG inputs through an explicitly reviewed path; no script, external resource or repository-code execution. Existing raster/export bounds remain in force. |
| Identity/storage | Fresh import IDs, unchanged source and separate sessions, interrupted import, stale-tab saves, duplicate package IDs and safe independent update import. Integration metadata must not become credential-bearing project data. |
| Publication | Wrong repository/path/account, moved refs, insufficient rights, ruleset/required-check rejection, lost responses, cancellation after acceptance, disconnect, readback mismatch and explicit public-visibility consent. No force-push, invisible partial package or success-shaped error fallback. |
| Licensing | Unknown/mixed asset rights, retained notices, remix attribution, incompatible redistribution terms and changed upstream license. Public visibility is not permission to republish. |
| UX/offline | Keyboard/focus/reflow, clear private/creator/player distinctions, bounded progress/cancellation, GitHub outage/rate limit, no-network editing and unchanged save-aware PWA updates. Automated checks do not substitute for screen-reader or participant acceptance. |
| Map CI | Package content is data, never executable workflow instructions. No running downloaded npm scripts/actions, no secrets in untrusted PR jobs and no privileged checkout/execution of PR content via `pull_request_target`. Validation does not prove authorship, asset rights or human approval. |

Reuse `src/utils/projectSchema.ts`, `projectRepository.ts`, `audienceProjection.ts`,
`export.ts`, `exportAssets.ts`, `exportPlan.ts`, the Library import preview and
existing preservation/export/browser fixtures where their contracts fit.
Extract shared validation only when needed; do not fork the renderer or replace
the storage schema merely to add a provider. New package validation and
publication allowlists are necessary because the private decoder's lossless
contract is intentionally different.

## 8. Owner decisions, rollout and handoff

Resolve these at the milestone that needs them, one short question at a time.
Do not ask for an entire architecture decision bundle before useful local work.

| Decision | Recommended starting point | Must be settled before |
| --- | --- | --- |
| Creator content profiles | Explicit layout sharing first; DM encounter material only after a separate inclusion review | GH-N01 contract approval |
| License and asset policy | Offer content-appropriate reuse choices; preserve existing notices and require rights confirmation | GH-N02 implementation |
| Package/resource limits | Measure representative existing and rich custom-asset fixtures; do not transplant guided-creation limits onto all imports | GH-N03 untrusted parsing |
| Connection/service scope | Ship manual packages first; selected-repository GitHub App only if approved hosting/operations are worthwhile | GH-N08 implementation / GH-R01 provisioning |
| Destination/write mode | Existing user-selected map repository; private default for separately approved new repos; respect PR-only branches | GH-R04 or any repository creation |
| Optional workflow policy | No automatic workflow installation in user repositories; explicit pilot with necessary protection and budget | GH-A03 |
| Evidence retention | Separately reviewed private evidence location, named owner/retention and verified retrieval | GH-R05 |
| Publication/runtime budget | Explicit runner ceiling plus separate provider/storage/egress agreement; never an assumed free tier | Any triggering write, deployment or paid service |

Every implementation handoff records selected task IDs, scope decisions, source
and package-format versions, local evidence, real versus mocked requests,
remaining limitations, remote identities, exact receipt state and budget use.
No task changes to done merely because its code exists. Record failure,
deferral or unassessed behavior honestly.

If connected publishing is delayed or discontinued, users retain local editing,
ordinary packages, private backups and their repositories. A service incident
must permit revocation/disablement without corrupting local work. Public-map
discovery can later begin with GitHub topics and curated links; integrated
search/catalog moderation or automatic upstream contribution stays deferred
until actual use demonstrates a need. Do not add a database-backed community
platform speculatively.

## 9. Primary references and current evidence

### Public synthetic fixture repository plan

The owner selected planning a small public fixture repository on September 30,
with **creation/publication and CI-budget approval requested separately**.
The owner subsequently approved the public scope and the 24-minute task ceiling,
but explicitly reported **zero available minutes until tomorrow**. Creation,
publication and runs remain paused until actual allowance is confirmed.
No automatic schedule or provider reset date is assumed.

Approved destination/scope: **`evillollive/Dungeon-Mapper-Fixtures`**, public,
but not yet created. It is a test-data repository, not a
community catalog, Pages deployment or destination for the private release
evidence archive. Check name availability read-only before creation; do not
substitute another owner/name without a decision.

Initial scope:

- One small synthetic, single-level creator package under `maps/public-vault/`,
  with an explicitly selected DM note/hidden test token and one original static
  image. Include all normal package files and notices so the public reader
  exercises real Git trees, blob media types, hashes and native import.
- No real campaigns, private notes, recovery files, browser profiles, source
  checkout archives, logs or the 330 MiB release-evidence bundle. Review every
  outgoing member and keep an independently recorded manifest/digest.
- AGPL-3.0-or-later repository/validator licensing, consistent with the owner's
  default. Preserve an explicit inherited AGPL declaration/source for the
  synthetic map, rather than labeling bundled material CC. Keep source
  data/generation instructions sufficient to understand/reproduce the fixture.
  Actual bytes and public notices need review before any upload.
- A dependency-free Node structural/integrity validator and focused negative
  tests. Validate expected members, identities, schema/profile metadata,
  referenced assets and required source notices without executing map content.
  Full browser image/behavior qualification stays in Dungeon Mapper; this
  small repository must not install/build the entire application.
- One standard Ubuntu job named **Validate creator fixtures**, Node 20,
  five-minute job timeout, read-only token, superseded-run concurrency. Trigger
  on PRs targeting `main` and pushes to `main`, not on both feature pushes and
  their PRs. No matrix, scheduled crawling, dispatch/release automation, Pages,
  deployment secrets, hosted agents, artifact uploads, caches or Git LFS.
- After bootstrap qualification, apply a default-branch ruleset requiring a
  PR and strict/up-to-date **Validate creator fixtures**, blocking deletion and
  non-fast-forward changes. Public visibility supports server-side protection;
  verify actual availability and success, not just the requested settings.

Sequence after confirming available allowance:

1. Create an empty public repository, then make one initial bootstrap commit/push
   containing the license, README, validator/workflow and synthetic unit fixtures.
   Do not auto-create a separate README commit: the workflow's bootstrap-only
   branch applies only to GitHub's first push to the empty default branch.
   It reports zero qualified public packages. All PRs and later main pushes
   require the actual fixture. No production map path is present initially.
   Confirm bootstrap self-tests before enabling the required-check ruleset.
2. Prepare and locally validate the single public map package, batch it into
   one branch/PR, and wait for its required validation. Inspect automatic
   review/other integrations before creating the PR; do not trigger an unknown
   hosted job or silently disable one.
3. Merge only if separately authorized and qualified; retain the post-merge
   validator receipt. Run the first approved live read against its pinned
   package commit, then exercise those downloaded bytes locally. Record
   repository ID, commit, paths, raw member hashes, API outcome and remaining
   limits. Read-only requests consume API quota even without Actions minutes;
   do not assume allowance is available or bypass throttling with credentials.

The repository's absence of prior timing history is a real uncertainty.
Read-only inspection of the application repository on September 30 found
`CI` on PR-to-main, main pushes and manual dispatch, plus an independent
main-push/manual Pages workflow and available hosted Copilot workflows.
The existing ruleset requires strict **Build and test** and **Browser
qualification**, with no hosted-review requirement observed in that ruleset.
None of those app settings were changed and the app branch remains unpublished.

Reference timings, not estimates for the new validator:

| Existing app receipt | Build and test | Aggregate CI jobs | Rounded-per-job planning equivalent |
| --- | --- | --- | --- |
| [Successful main run 35034579302](https://github.com/evillollive/Dungeon-Mapper/actions/runs/35034579302) | 1m 41s | 24m 22s | 27 minutes |
| [Failed PR run 35037146541](https://github.com/evillollive/Dungeon-Mapper/actions/runs/35037146541) | 1m 37s | 32m 30s | 35 minutes |

These five-job totals exclude the independent Pages workflow and any hosted
agent/review jobs. They explain why the fixture repository should use one small
validator, not copy the app's browser matrix. Its actual hosted duration and
account billing/quota remain unknown; do not run CI simply to measure them.

**Approved ceiling, execution deferred:** three expected workflow
triggers, one job each: bootstrap, fixture PR and required post-merge validation.
Estimate **3 to 9 aggregate runner minutes** (1 to 3 per run), with substantial
uncertainty because the new validator has never run on a hosted runner.
The owner approved a **24 runner-minute task ceiling**, with planning room for
up to six minutes per
expected run for the five-minute timeout plus rounding/setup uncertainty and
one additional full-workflow retry reservation. Diagnose before any retry and
refresh actual use/reservations before each trigger. A timeout is not a billing
cap, and this accounting is not a provider-enforced spending limit.

This proposal does not cover publishing the application branch, its existing
CI/Pages jobs, hosted reviews/agents, additional fixture PRs, service hosting or
deployments. If target integrations could add jobs or usage cannot be bounded,
stop and obtain revised approval before triggering them. No storage/cache
add-ons are proposed: repository data uses ordinary Git storage, and the plan
does not enable LFS, Actions artifact storage or paid runners. Provider-side
usage, retention and billing still need confirmation; no account balance or
zero-cost guarantee is claimed.

**Current accounting:** 24 minutes approved as the task ceiling, zero currently
spendable until allowance is confirmed, zero hosted use/triggers and zero
reservations. No repository has been created, no PR opened, no data uploaded
and no automatic future run scheduled. The owner's reported availability is
not a verified provider balance or an exclusive reservation.

#### Prepared local fixture draft

Session `20233d90-7a79-4423-a564-f75af5b08662` retains the ready local draft under
`files/github-public-fixture-draft/`:

| Path | Purpose |
| --- | --- |
| `bootstrap/` | Intended initial repository files: license, README, one workflow, dependency-free validator, negative tests and their synthetic reference data |
| `fixture-overlay/` | Intended protected PR payload: the public package and its synthetic source/regeneration guidance |
| `generation-receipt.json` | Current application producer identity, original geometric image, actual local package roundtrip and member hashes |
| `final-draft-receipt.json` | Final 24-file intended-public inventory, SHA-256 values, local check observations and conditional budget ledger |
| `PUBLISHING-NOTES.txt` | Exact resume order, private/public boundary, required quota/integration checks and later PR/merge permission gates |
| `ruleset-request.json` | Staged API request, not an applied or verified ruleset |

The package has seven members totaling **37,937 bytes**. Its image is a new
32x32 two-color Canvas drawing, not an imported photograph or campaign asset.
The exact package roundtripped through the application locally. Fourteen local
Node checks pass, including missing/changed data, duplicate keys, unsafe paths,
links/executable files, copyright notices and bounded PNG CRC/raster structure.
The staged workflow passed retained actionlint 1.7.12. These are local Node
24 observations, not a Node 20 hosted receipt or a hosted-duration benchmark.

Only `bootstrap/` and `fixture-overlay/` are intended for publication. The parent
directory contains local generation scripts, machine paths, receipts and
operation notes and must not be pushed. The release-evidence archive is not
part of this draft. The rendered synthetic preview and outgoing text were
reviewed; a supplementary path/token-pattern scan is not a general secret-free
guarantee. Originals and earlier local receipts are retained.

Fixture PR creation also needs a correctly scoped repository context or a
user-driven PR. This application session's PR tool targets Dungeon Mapper;
do not create the fixture PR against that repository. Any new project session
requires separate approval, and merge remains separately authorized.

Reviewed September 30, 2026. Recheck live API limits and authorization behavior
before implementation; pin the supported API version deliberately.

- [GitHub App user access tokens and web flow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app):
  user/app permission intersection, authorization, state/PKCE, client-secret
  token exchange and expiry.
- [Repository Contents API](https://docs.github.com/en/rest/repos/contents):
  directory/file limits, ref selection, media types and expiring download URLs.
- [Git references API](https://docs.github.com/en/rest/git/refs):
  reference identity and non-forced updates; branches/tags are movable.
- [Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository):
  public visibility is not a general reuse license; prior forks/copies can persist.
- [Triggering workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow):
  app-token events, workflow recursion and trigger-specific behavior.
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases):
  repository-scoped release assets, distinct from expiring Actions artifacts.
  Hosting there is a destination option, not a guarantee against deletion or
  an approval to publish the current archive.
- [Current archive receipt and limits](./UX-09-HANDOFF.md#portable-local-evidence-archive)
  and [local deployment design](./RELEASE-DEPLOYMENT-DESIGN.md).

**Planning accounting:** zero hosted triggers, reservations or runner minutes.
Only local documentation/source inspection and public documentation reads were
performed. No feature, workflow, secret, repository, service or remote state
was changed by writing this plan.
