# Local publisher review prototype

This is a **loopback-only simulation**, not a GitHub login or deployment.
It does not read the editor's Library, upload map packages, create repositories,
publish branches or contact GitHub. After simulated sign-in, it can inspect an
explicitly selected creator ZIP in the browser and send metadata-only destination
plans to the local server. Never provide real credentials.

## Run locally

Use Node **24.16 or newer**. The prototype uses native TypeScript execution,
Node HTTP/crypto/test APIs and the existing root development tools. It adds no
dependencies and does not require Docker, a database or an external account.

From the repository root:

```sh
npm run publisher:dev
```

Open the loopback URL printed by the command, normally
`http://127.0.0.1:5390/publisher/`. An explicit port can be supplied with
`npm run publisher:dev -- 5391`. Stop with Ctrl+C.

The separate page offers clearly labeled simulated authorization, denial,
repository-access display, local package review, destination recheck and disconnect.
Publishing is visibly unavailable.
There is no production startup entry or environment flag enabling a fake
identity in a live service.

The dev and test commands first run `npm run build:publisher`. That separate Vite
build produces `publisher/dist`, without the editor's service worker or public
directory. It shares the existing creator ZIP inspector in a browser bundle;
the Node server shares only the portable scalar contract, not a DOM emulation.
`npm run build` still builds the editor separately.

## Local checks

```sh
npm run check:publisher
npm run test:publisher
QA_OUTPUT=/absolute/new/publisher-evidence npm run test:publisher:browser
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
  image and size validation as the editor. No Library import or file-body upload.
- Explicit metadata-only plans bound to the session, ZIP SHA-256, package ID/version,
  selected repository/installation, visibility, write permission and base commit.
- Rechecking unchanged destinations, invalidating changed/expired plans, and
  preventing late requests from replacing a newer review.
- Clearing package references, preview URLs and displayed content on replacement,
  inspection cancellation, navigation, disconnect, detected revocation or expiry.

Test-profile limits are 128 sessions, 4 KiB empty JSON auth requests, ten-minute
preauthorization/transaction state, a maximum session no longer than eight
hours or provider token validity, and a ten-second response wait. The fake
provider currently issues one-hour synthetic grants. These are prototype
limits, not approved production retention or capacity targets.

## Metadata-only plan boundary

Selecting a ZIP makes no server request. Only **Review simulated destination**
sends `repositoryId` and `packageId`, `contentVersion`, `packageSha256`,
`zipBytes`, `expandedBytes`, `memberCount`. ZIP contents, project JSON, notes,
images, title, author and local filename are not sent. These are client claims,
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
No raw ZIP is retained on the server and no proposed branch is created.

## What is not qualified or implemented

HTTP loopback uses a test-only HttpOnly, SameSite=Lax cookie scoped to
`/publisher/`, without Secure. Cookies are not isolated by port, so do not use
this composition for real accounts. Production requires an isolated HTTPS
origin and Secure host-only cookies.

Sessions and provider records live only in memory and are cleared on shutdown.
There is no durable/encrypted state store, refresh-token retention, webhook
receiver, real GitHub adapter, private repository integration, package
upload/server-validation API, publication operation store or branch writer.

Revocation is exercised through the synthetic provider and enforced when
provider access is attempted. The local session-status display is not a
live GitHub permission attestation.

The prototype has not sized a service for 32 MiB ZIP / 64 MiB expanded package
processing. Its small authentication bodies are not evidence for a hosting
memory tier. Provider, storage, region, retention, operating owner, costs and
live deployment approval remain separate decisions.

See [the publisher design](../docs/GITHUB-PUBLISHER-DESIGN.md) and
[the integration roadmap](../docs/GITHUB-INTEGRATION-ROADMAP.md).
