# UX-06: DM session workspace and local player display

**Foundation:** `f67ec19`, merged UX-05 #165 on September 11, 2026 UTC.

**Implementation:** September 10, 2026 Pacific time.

**Status:** Implemented and production-qualified in Chromium. PR review and exact-head CI remain landing gates. This is not a merge record or UX-09 release certification.

## Workflow

Open a saved project and choose **Prepare session** in the header or command palette. Preparation reads the saved project revision and lists its local sessions. The readiness summary covers known geography, party sight, fog policy, public notes/tokens and the local display boundary. Acknowledge the review to start. Missing sight sources or starting visibility are warnings, not prohibitions on intentional manual-fog play. Party setup and publication editing remain in Edit.

**Run** is a separate route, not the old trusted DM view with a new name. It provides cell reveal/hide, token selection and destination movement, rules-neutral measurement in cells, player pings, private notes, player preview and encounter controls. Canvas clicking and labeled numeric cell controls execute the same actions. Geometry-authoring controls are absent. The map backing canvas follows viewport resolution with a 4096-pixel per-side limit.

The encounter retains its own level, current turn and round. Next/previous follows that level's authored initiative order, including DM-private entries. Changing the inspected level does not change the encounter. Starting an encounter on another level is an explicit confirmed reset.

**Inspect DM level**, **Show this level**, and the encounter level are independent. Inspecting a different floor does not publish it. Player preview shows the inspected floor without changing the live display. The Run page's inspection selection resets to the source's active level on reload; the saved publication target and encounter remain intact, but transmission always restarts blank.

**Open player display** opens or navigates a named second window in the same browser. Allow popups for the site if blocked, then retry; same-window player preview remains available. **Pause / blank now** stays in the sticky Run header, remains enabled during saves/errors, stops further automatic snapshots and requests an acknowledged blank. Pings are temporary projected markers, omitted when their footprint intersects unknown geography. Clear ping or a subsequent normal snapshot removes them.

**Leave and resume later** retains the autosaved session. **End session** offers two explicit choices:

| Choice | Result |
| --- | --- |
| Save session progress | Retain the working session independently; resume later from that progress |
| Discard changes since session start | Restore the original source checkpoint in the session, not the authored project |

Both retain the immediately pre-end progress as the last recovery checkpoint. Neither writes authored geometry back into the project. Copying changes into the authored project is not implicit and is not implemented by this package.

## Persistence and recovery

`sessionRepository.ts` stores `session:<UUID>` records in the existing `maps` object store. IndexedDB and project schema versions remain **1**. There is no migration or rewrite of existing projects.

| Field | Contract |
| --- | --- |
| `version`, `id`, `storageRevision` | Validated session format and CAS identity |
| `sourceProjectId`, `sourceRevision` | Exact authored source reference |
| `sourceCheckpoint` | Immutable, independently decoded source project |
| `progress.project` | Mutable session map/project content, including fog, exploration and token movement |
| `progress.publishedLevel` | Persisted target, not permission to automatically resume transmission |
| `progress.encounterLevel`, `round`, `turn` | Rules-neutral encounter state; zero-based turn internally |
| `status` | `active`, `saved` or `discarded` |
| `checkpoints` | Named durable session progress snapshots |
| `endCheckpoint` | Last progress retained before a restore or end |

Creation validates the source revision and checkpoint content within the transaction that creates the session. Later writes compare the session revision and prohibit changing the source checkpoint. No session write targets a `project:` key.

Mutations are serialized by pausing additional edits while a transaction is pending. Success is reported only on transaction completion. Failure retains the optimistic in-memory record, blanks the display, exposes an error, disables further mutations and offers a recovery download. Retry uses the original expected revision; conflicts require downloading local work and reloading instead of silently rebasing. Leaving with a pending or failed save triggers the existing style of unload warning.

The source checkpoint is always retained. Named checkpoints reuse the existing **20-checkpoint** policy: explicitly download/delete a checkpoint when full; ordinary session actions continue saving. Restoring a checkpoint retains current progress in `endCheckpoint`, blanks the display and clears incompatible undo history. The UI explains that another restore/end replaces this last recovery slot.

`SessionHistory` is an isolated per-level stack, bounded to 50 map states. It is never the editor's stack and is never serialized. Reload, resume after ending, and checkpoint restoration reset it.

Downloads preserve the full session, named checkpoint or last recovery data. Unreadable records retain original bytes for download. These are DM-private recovery JSON files, not player exports. A dedicated session-recovery file importer is not included; do not present these files as directly compatible with the authored-project import dialog.

## Player route and transport

`WorkspaceRouter.tsx` selects lazy-loaded Edit, Prepare/Run or Player content before mounting a workspace. The Player route does not import/mount `App`, load a project, or open an IndexedDB autosave writer. It hosts the UX-05 `PlayerPreview` content inside its scrolling/styled container, without the trusted host close button, editor switching, private exports or fog tools.

Transport is local `BroadcastChannel`, scoped by session and display IDs. A display mount creates a new client ID; a Run mount creates a new display ID. The protocol envelope contains version **1**, session/display/client identities, message type, and where relevant a monotonic revision and blanking epoch.

| Message | Purpose |
| --- | --- |
| `hello` | New client requests a blank handshake |
| `blank` | Rotate epoch, advance revision and remove the projected canvas |
| `snapshot` | Publish only a UX-05 `PlayerProjection` for the current epoch |
| `ack` | Confirm the exact applied revision |
| `heartbeat` | Maintain the local connection lease without retransmitting content |

Only `projectForAudience` output crosses the content boundary. Session records, other floors, source project names, private notes and private encounter metadata are not transmitted. Pings also pass through the projection. Existing UX-05 unknown-geometry removal, hidden-token policy and imported-art limitations remain unchanged.

The receiver starts neutral and requires a blank handshake before accepting a snapshot. It rejects wrong identities, stale revisions and snapshots from another epoch. Blank application synchronously removes the prior content before another queued message is handled. Pausing rotates the epoch, so a queued earlier snapshot cannot repopulate the display, even if delivered with a later revision.

Heartbeat and acknowledgement monitoring use a **5-second lease**, checked every second. A silent connection blanks the receiver and requires reconnection; message handling also checks elapsed time so a throttled timer cannot accept an old snapshot first. Browser suspension can delay JavaScript itself, so this is not a hardware-level instantaneous blanking guarantee.

After a display reload or reconnect, the DM must choose Show this level again. After a Run reload, use Open player display to navigate the named player window to the new connection. An old display remains neutral after its lease expires. Missing transport and popup-blocked guidance are actionable and do not disappear when a blank acknowledgement arrives.

This is a trusted local-device workflow, not authentication, ownership enforcement, accounts or remote multiplayer.

## Qualification evidence

The final integrated regression run passed **608 tests across 48 files**, including **27 lifecycle/protocol/storage tests**, followed by TypeScript/Vite production build and existing ESLint error checks. Existing lint warnings remain. A narrow synchronous read-only review found no significant lifecycle/boundary issues.

The callable `src/test/ux06Session.browser.mjs` creates an isolated browser context, imports a new fixture through the native UI, uses real IndexedDB, and opens a real second window. Run it with an existing Playwright Page navigated to the production `/Dungeon-Mapper/` base path, including through MCP `browser_run_code_unsafe` with `filename`. It adds no SDK dependency to the project. Successful runs close their test context.

Final production journey: **Chromium 152.0.7977.83**, September 11, 2026 UTC, production entry chunk `index-4LzGGxMw.js`. Fixture session ID: `44d2a9c4-807f-4ff4-964f-369254961fbb`; this belongs to a disposable test context, not a retained user session.

The journey passed:

- Preparation acknowledgement, start, reveal, token movement, next/previous turn, round rollover, measurement and ping.
- Named checkpoint creation/restore and undo isolation across restore/reload.
- DM inspection versus explicit publication, independent encounter level, pause and injected stale-epoch rejection.
- Player reload, transport loss, neutral reconnection, Run reload and named-window reopening.
- Simulated popup blocking and same-window preview fallback.
- Private-sentinel exclusion from captured transport, player DOM and accessibility; unknown cells serialized as empty; no player IndexedDB opens.
- Injected quota failure, retained recovery download, explicit retry, native concurrent-session CAS conflict.
- End/save, resume, discard to original source and retained pre-end recovery, with byte-for-byte unchanged authored source records.
- Run and Player at 1440x900, 768x1024 and 390x844; player buttons meet 44-pixel height and the public legend scrolls into view.

Qualification caught and fixed acknowledgement overwriting popup guidance, plus the missing standalone-player scroll/control-style host. Image review also prompted viewport-resolution rendering of the DM map instead of enlarging a low-resolution canvas.

Visually inspected fixture evidence:

- [DM Run desktop](./media/ux06/dm-run-desktop.png)
- [DM Run phone](./media/ux06/dm-run-phone.png)
- [Local player display](./media/ux06/local-player-display.png)

The conspicuous private sentinel is intentional synthetic fixture text on the DM side. It is absent from the player surface.

## Remaining gates and boundaries

Firefox/WebKit were **not run in this session**. Physical second-monitor use, touch/pen hardware, screen readers, long-duration tab suspension, participant research and UX-09 release acceptance remain open. Chromium viewport checks are not physical-device certification.

Production testing used the Pages base path and native storage, but does not certify a new offline/update matrix. An already-open older build retained its service-worker-controlled shell while a newer worker waited; final qualification and screenshots used fresh contexts on the final build. The comprehensive update/offline/export redesign remains UX-08, not silently folded into UX-06.

Run uses focused cell actions rather than adding a new brush/drag engine. Party composition, publication metadata and authored geometry are prepared in Edit. This package does not redesign artwork, imported assets, comprehensive exports, remote synchronization or the project Library.
