# Local publisher review prototype

This is a **loopback-only simulation**, not a GitHub login or deployment.
It does not read the editor's Library, create real repositories, publish real branches or
contact GitHub. After simulated sign-in, it can inspect an explicitly selected
creator ZIP in the browser, plan a simulated destination, then independently
validate that ZIP on this machine after separate consent. With an explicit
local receipt path, the browser can also confirm fake branch publication,
inspect saved outcomes and reconcile them through reads only. Never provide real
credentials.

## Run locally

Use Node **24.16 or newer**. The prototype uses native TypeScript execution,
Node HTTP/crypto/test APIs and the existing root development tools. The isolated
validator adds publisher-only `sharp` 0.35.4 (Apache-2.0) and `jsdom` 29.1.1 (MIT),
locked under `publisher/`. It does not require Docker, an external database, a browser
installation for server decoding, or an external account. Native image
dependencies and their notices also need review before any production distribution.

From the repository root:

```sh
npm ci --prefix publisher
npm run publisher:dev
```

Open the loopback URL printed by the command, normally
`http://127.0.0.1:5390/publisher/`. An explicit port can be supplied with
`npm run publisher:dev -- 5391`. Stop with Ctrl+C.

The separate page offers clearly labeled simulated authorization, denial,
repository-access display, local package review, destination recheck, explicit
local server validation and disconnect. Real GitHub publishing is visibly unavailable.
There is no production startup entry or environment flag enabling a fake
identity in a live service.

To enable the **local simulation only**, choose an absolute SQLite filename
inside an existing private local directory:

```sh
PUBLISHER_RECEIPTS=/absolute/private/directory/operations.sqlite npm run publisher:dev
```

The directory must already exist; the journal and lock file are created with
private file permissions. The selected journal survives server restarts and is
not automatically deleted. Do not use an editor database, a shared directory,
a credential store or a journal already open in another process. Without
`PUBLISHER_RECEIPTS`, simulation controls remain unavailable and no database
is created. This setting selects only the concrete in-memory test provider,
not a production mode.

The dev and test commands first run `npm run build:publisher`. That separate Vite
build produces `publisher/dist`, without the editor's service worker or public
directory. It also builds the shared inspector into
`publisher/validator/dist/inspect.js` for a separate Node child. That child uses
jsdom for the existing restricted-SVG admission rules and Sharp for full native
image decoding. Scripts and resource loading are not enabled in jsdom.
`npm run build` still builds the editor separately; neither new dependency is
added to the editor bundle or root dependency manifest.

## Local checks

```sh
npm run check:publisher
npm run test:publisher
npm run test:publisher:validation
QA_OUTPUT=/absolute/new/publication-evidence npm run test:publisher:publication
QA_OUTPUT=/absolute/new/publisher-evidence npm run test:publisher:browser
QA_OUTPUT=/absolute/new/simulation-evidence npm run test:publisher:simulation
```

The HTTP checks use real loopback requests and synthetic provider state.
The browser check starts/stops its own server for each isolated engine.
It checks native cookie/session behavior in Chromium, Firefox and WebKit,
records screenshots and source hashes, and aborts unexpected external requests.
Its fetch-response recorder waits for a clone before client navigation so
response bodies are not lost by the browser protocol. It does not measure
authentication latency. A test-only bundle creates synthetic package members
and actual map previews with the existing browser builder; Node compresses the
small fixture. The publisher CSP is not relaxed to allow compression workers.
Each engine has a 90-second deadline that closes its owned browser on expiry.
The separate simulation browser campaign uses a 120-second per-engine deadline
for confirmation, progress, conflict/cancellation and restart/sign-in flows.

These commands are **not wired into a hosted publisher qualification pipeline**.
The existing editor tests and required checks are unchanged. A future service
pipeline needs separate scope and runner-budget approval.

## What is implemented

- One-time state and PKCE validation using a local test provider.
- Opaque server-side sessions, CSRF/origin/Host checks and cookie rotation.
- Fixed expiry, superseded/late callback rejection and bounded session count.
- Session-bound repository reads, revocation and explicit partial disconnect
  failures rather than success-shaped fallbacks.
- Bounded JSON auth bodies and response deadlines even if a test provider does
  not settle. A late returned grant is discarded/revoked rather than installed.
- No-store responses, no-referrer policy, framing restrictions and inert UI text.
- No access tokens in browser responses, URLs, localStorage, sessionStorage,
  IndexedDB or logs.
- Browser-local ZIP inspection using the same member, CRC, hash, profile, rights,
  image and size validation as the editor. No Library import or automatic upload.
- Explicit metadata-only plans bound to the session, ZIP SHA-256, package ID/version,
  selected repository/installation, visibility, write permission and base commit.
- Rechecking unchanged destinations, invalidating changed/expired plans, and
  preventing late requests from replacing a newer review.
- Clearing package references, preview URLs and displayed content on replacement,
  inspection cancellation, navigation, disconnect, detected revocation or expiry.
- Separate consent to send the exact reviewed ZIP to a plan-bound local endpoint,
  followed by independent server archive/content/rights-declaration and native
  image validation. No browser validity flag or receipt substitutes for inspection.

Test-profile limits are 128 sessions, 4 KiB empty JSON auth requests, ten-minute
preauthorization/transaction state, a maximum session no longer than eight
hours or provider token validity, and a ten-second response wait. The fake
provider currently issues one-hour synthetic grants. These are prototype
limits, not approved production retention or capacity targets.

## Metadata-only plan boundary

Selecting a ZIP makes no server request. Only **Review simulated destination**
sends `repositoryId` and `packageId`, `contentVersion`, `packageSha256`,
`zipBytes`, `expandedBytes`, `memberCount`. ZIP contents, project JSON, notes,
images, title, author and local filename are not sent by that planning action. These are client claims,
not server validation of a package. Responses explicitly say `metadata-only`,
`packageReceived: false` and `writesPerformed: false`.

`POST /publisher/api/plans` replaces the current plan. Its opaque ID permits
session-bound `GET /publisher/api/plans/<id>` and an explicit
`POST /publisher/api/plans/<id>/recheck`. A plan lasts at most ten minutes,
never beyond session expiry, and recheck does not extend it. GET returns a
captured snapshot, not a fresh permission attestation. Failed or stale rechecks
cannot approve publication or remove a newer plan.

Clearing a package removes its browser review; already submitted plan metadata
can remain in server memory until replacement, request-driven expiry cleanup,
disconnect or shutdown. Expiry immediately prevents use, but memory reclamation
is request-driven rather than a guaranteed timed deletion.
Cancelling a request does not prove its metadata never reached the server.
The UI stays locked until a current native file read settles before cleanup.
No raw ZIP is retained for later use on the server and no proposed branch is created.

## Explicit local ZIP validation

The consent checkbox and **Validate ZIP on local server** send
`application/zip` to `POST /publisher/api/plans/<id>/validate`.
This transfers the package contents, including selected DM material, to the
loopback Node process only. The local filename is not part of the request.
Origin, Host, session and CSRF checks apply. Actual streamed bytes are bounded
by the reviewed size, itself capped at 32 MiB; content encoding is rejected.
The exact length and SHA-256 must match before a decoder is launched.

One upload/validation slot per server instance remains occupied until cleanup
and child exit. Concurrent attempts return 503 rather than queueing buffers.
The child receives ZIP bytes through stdin and no session, provider token or
inherited environment credentials. It reparses the archive and checks expanded
bytes, member hashes, profiles, references, attribution consistency, restricted
SVG and complete PNG/JPEG/WebP/SVG decoding. Both successful and failed responses
omit package contents and untrusted decoder diagnostics.

Success produces `status: "server-validated"`, `packageReceived: true`,
`packageRetained: false`, `writesPerformed: false`, plus a bounded validation
receipt. Repository identity, permission, visibility and base are checked
before and after validation. Expiry or replacement during the operation cannot
create a receipt. This does not verify copyright ownership or legal permission.

The request deadline is ten seconds, the parent-enforced child deadline eight
seconds and the native image-operation timeout six seconds. Child cancellation
uses process termination and waits for exit before releasing the slot.
The child has a 256 MiB V8 heap ceiling, one native decode thread and disabled
Sharp caching. **The heap ceiling is not an RSS/native-memory cap.** A child
process is not an OS filesystem/network sandbox. This is a local prototype,
not an approved public untrusted-upload service.

No package files are extracted or written to disk. Uploaded bytes are scoped
to request/child memory, then references are released and the child exits.
This is not a secure-memory-erasure or OS swap guarantee. The browser keeps
its reviewed bytes until its normal selection cleanup. Session-bound receipts
remain metadata only; they are not stored package bodies or a durable publish
operation. Cancelling a request cannot guarantee the server never received it.

## What is not qualified or implemented

HTTP loopback uses a test-only HttpOnly, SameSite=Lax cookie scoped to
`/publisher/`, without Secure. Cookies are not isolated by port, so do not use
this composition for real accounts. Production requires an isolated HTTPS
origin and Secure host-only cookies.

The web prototype's sessions and provider records live only in memory and are cleared on shutdown.
There is no production durable/encrypted session store, refresh-token retention, webhook
receiver, real GitHub adapter, private repository integration, remote upload
service or real branch writer. The connected engine below writes only to an
in-memory test repository, never GitHub.

Revocation is exercised through the synthetic provider and enforced when
provider access is attempted. The local session-status display is not a
live GitHub permission attestation.

The prototype has not sized a service for 32 MiB ZIP / 64 MiB expanded package
processing. Boundary tests and isolated native decoding do not qualify a hosting
memory tier or decoder equivalence on every platform. Provider, storage,
region, retention, operating owner, costs and
live deployment approval remain separate decisions.

## Fake publication engine and restart receipts

`LocalPublicationEngine` is a local test-provider engine, wired only when an
explicit local journal and the same concrete fake authentication/Git provider
are configured. Its focused
command runs synthetic fixtures through independent native validation, fake
Git object creation, create-only branch publication and exact readback.
It never calls GitHub or runs workflows, merges, force updates or repository
creation. Tests use `git hash-object` without `-w` only as an independent
read-only encoding oracle, not to publish fixture content.

The owner approved Node's built-in SQLite for **local metadata-only receipts**.
Each test creates private `operations.sqlite` and `operations.sqlite.lock`
files under the explicit `QA_OUTPUT` directory, without an external database
or package dependency. These files contain owner/repository identity, package
digest and member identities, reviewed base, expected Git tree/commit, intended
branch, phase and bounded failure codes. They contain no archive, note/image
bytes, provider tokens or session credentials. SQLite metadata is not encrypted.

The intent is committed before the first fake write. A separate SQLite
exclusive-lock file prevents two processes from owning one journal and is
released by the OS after a crash. On reopen, interrupted claims become
`outcome-unknown`, never successful or automatically replayed.
One package admission per journal bounds native validation, and any unresolved
operation in a repository blocks a different publication until reconciliation.
Multiple historical receipts may become unresolved if fake objects disappear;
they are all preserved. Transactional admission checks, not deletion of old
receipts, prevent overlapping new writes.
The journal permits 64 receipts, each at most 1 MiB; the reviewed repository
tree is capped at 4,096 entries and 1 MiB of serialized metadata. Capacity
failure never evicts an old receipt. No retention/deletion schedule is enabled.

A complete replacement of `maps/<package-id>/` is assembled over the pinned
base while preserving unrelated files, other maps, modes and Git links. File
collisions at `maps` or the package root fail before writes. Exact members are
written as blobs, followed by one tree and commit, then one create-only branch
ref. Default branches are unchanged. The engine checks the destination before
each mutation, but cannot promise an atomic permission/visibility lock across
provider calls.

Success requires ref/commit/tree and every package blob to match readback.
The fake provider keeps its objects in memory as a remote stand-in; the SQLite
receipt never stores those bodies. A repeated submission with the same
owner/repository/installation/package identity and ZIP digest returns its
existing receipt, even if a newer plan proposes another branch. It does not
start another write. This conservative duplicate policy does not provide an
automatic retry or a way to republish the same ZIP intentionally.
Status and duplicate-submission responses describe the last saved observation,
not current repository permissions or a fresh branch check. Use explicit
read-only reconciliation to check the provider again.

Lost responses, timeouts, changed permissions, cancellation and failed readback
remain explicit unresolved outcomes. Cancellation stops future requests where
possible but cannot undo an accepted object/ref or guarantee a delayed request
was rejected. `reconcile` performs **reads only**. A matching ref and exact bytes
can confirm success; an unexpected ref is a conflict; a missing ref remains
unknown rather than permission to retry. Provider failures retain the receipt
and return an explicit error. The enforced operation deadline is 30 seconds;
the existing native-worker deadline remains eight seconds.

The restart test retains the fake provider separately from the stopped engine,
as a stand-in for a remote service surviving the publisher. It also hard-kills
a child journal writer and verifies recovery. This does not qualify GitHub
durability, production SQLite placement/scaling, session recovery, or a
production browser restart/reconnect behavior. The local browser campaign
separately exercises sign-in and recovery across service restart. If the fake provider's memory is lost, missing
objects remain unresolved. Do not discard unresolved receipts to make a retry
possible. Review/export the local evidence before any manual cleanup.

## Authenticated simulation flow

Sign in, inspect the ZIP, review a destination, and complete independent server
validation first. Then review the separate simulation consent and choose
**Simulate publication**. The exact ZIP is sent again, checked again, and used
only in the fake provider. Its in-memory repository objects contain package
bodies until the local composition stops; the SQLite journal contains metadata
only. Normal dev restart starts a new empty fake repository while retaining
the selected receipt database, so previously verified branches can become
unknown on reconciliation. The UI states this rather than recreating them.

`POST /publisher/api/plans/<id>/simulate` requires the active server-validated
plan, CSRF, same origin and a matching `X-Publisher-Confirm` header.
The owner and provider token come only from the current session, never the
request body. ZIP length/digest and every existing package limit still apply.
Server validation, simulation uploads and reconciliation share an admission
gate. The originating session is checked around provider access, and fixed
expiry, plan replacement, disconnect, cancellation or server shutdown stop
future work. Requests accepted by a provider may still finish.

`GET /publisher/api/operations` lists at most the journal's 64 saved receipts
for the current account, with active state. `GET /publisher/api/operations/<id>`
returns one owned receipt. These are saved observations, not current permission
claims. A guessed ID from another account returns 404.
`POST /publisher/api/operations/<id>/reconcile` uses fresh session credentials
for readback, never another ZIP or write.
`POST /publisher/api/operations/cancel` requests cancellation of this session's
work only, not another session sharing the same simulated account. All POSTs
require CSRF and origin checks; receipt operations reject extra body fields.

The browser displays prepared/writing, verified, conflict, blocked and unknown
outcomes as inert text. It refreshes saved progress once per second only during
the requested simulation or server cleanup; read errors stop automatic progress
refresh. There is no background polling after the operation settles.
**Refresh saved receipts** and **Reconcile saved receipt (reads only)** work
without a selected ZIP. Reload/restart requires the same simulated account,
with fresh sign-in after a server restart. Local/session storage and IndexedDB
are not used. Logout/account change clears the visible package and receipts,
not durable metadata or accepted fake objects.

Simulation/reconciliation requests have a 30-second application deadline;
the existing ten-second Node request-body limit and eight-second native worker
deadline are unchanged. Cancellation does not claim rollback, and errors
instruct receipt recovery instead of offering an automatic write retry.
Server restart, native memory and provider behavior are still only locally
qualified, not production authorization or deployment approval.

See [the publisher design](../docs/GITHUB-PUBLISHER-DESIGN.md) and
[the integration roadmap](../docs/GITHUB-INTEGRATION-ROADMAP.md).
