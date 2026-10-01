# Local publisher authentication prototype

This is a **loopback-only simulation**, not a GitHub login or deployment.
It does not read the editor's Library, accept map packages, create repositories,
publish branches or contact GitHub. Never provide real credentials.

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
repository-access display and disconnect. Publishing is visibly unavailable.
There is no production startup entry or environment flag enabling a fake
identity in a live service.

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
authentication latency.

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

Test-profile limits are 128 sessions, 4 KiB empty JSON auth requests, ten-minute
preauthorization/transaction state, a maximum session no longer than eight
hours or provider token validity, and a ten-second response wait. The fake
provider currently issues one-hour synthetic grants. These are prototype
limits, not approved production retention or capacity targets.

## What is not qualified or implemented

HTTP loopback uses a test-only HttpOnly, SameSite=Lax cookie scoped to
`/publisher/`, without Secure. Cookies are not isolated by port, so do not use
this composition for real accounts. Production requires an isolated HTTPS
origin and Secure host-only cookies.

Sessions and provider records live only in memory and are cleared on shutdown.
There is no durable/encrypted state store, refresh-token retention, webhook
receiver, real GitHub adapter, private repository integration, package
upload/validation API, publication operation store or branch writer.

Revocation is exercised through the synthetic provider and enforced when
provider access is attempted. The local session-status display is not a
live GitHub permission attestation.

The prototype has not sized a service for 32 MiB ZIP / 64 MiB expanded package
processing. Its small authentication bodies are not evidence for a hosting
memory tier. Provider, storage, region, retention, operating owner, costs and
live deployment approval remain separate decisions.

See [the publisher design](../docs/GITHUB-PUBLISHER-DESIGN.md) and
[the integration roadmap](../docs/GITHUB-INTEGRATION-ROADMAP.md).
