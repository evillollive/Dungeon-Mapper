# UX-00: baseline, prototype, and decision record

**Date:** 2026-09-07, America/Los_Angeles. Browser captures cross into 2026-09-08 UTC.

**Status:** Prototype work accepted; participant research deferred by the owner. No participants recruited or observed, and UX-00 usability acceptance has not passed. On 2026-09-07 the owner explicitly authorized proceeding to UX-01 despite this open research gate.

**Baseline:** `01da138`, the main commit containing roadmap PR #156. The previous review used `4633065`. The walkthrough below was reproduced against the actual checkout, not inferred from that review.

## Owner decisions

The owner answered the five policy questions separately, then gave a visual revision while approving the workflow direction for a pilot, in the UX baseline and prototypes session on September 7:

| Gate | Approved decision | Consequence for later work |
| --- | --- | --- |
| Release scope | Local-first projects and local display; defer accounts, cloud storage, and remote multiplayer. | UX-01/02 use device-local storage. UX-10 remains deferred. |
| Legacy notes | Preserve existing descriptions as DM-private until explicitly reviewed and published. | UX-05 must explain migration without deleting or rewriting notes. No migration implemented here. |
| Player interaction | Read-only local display first, on the DM's trusted device. | Zoom and public information are allowed; editing, fog controls, remote joining, and token ownership are not player features in this release. |
| Art exploration | Initially approved illustrated-atlas exploration; after seeing the prototype, accepted its workflow direction for a pilot with a more fun purple/blue/red-orange/black palette and one sans-serif family. | Initial ivory/serif treatment is superseded. Updated prototype uses Avenir Next throughout UI with sans-serif fallbacks, bold and italics, and high-contrast light text. Final production visual acceptance still requires readability research. Minimal and print remain required. |
| Project/session semantics | Keep authored projects separate from mutable session progress. | Later play starts from a checkpoint, saves separately, and copies back only through an explicit reviewed action. No session storage implemented here. |

Approval of a decision is not evidence that its implementation exists.

**Closeout decision, 2026-09-07:** After the palette/type revision, the owner accepted the prototype and selected "Defer research and proceed to UX-01." This is an explicit dependency exception for UX-01, not a fabricated usability result or a waiver of UX-09 release qualification. The research plan remains available below; recruitment is deferred, not completed.

## Open the prototype

From this worktree:

```sh
npm run dev -- --host 127.0.0.1 --port 5187 --strictPort
```

Open `http://127.0.0.1:5187/Dungeon-Mapper/docs/prototypes/ux-00/`.

The Screen selector exposes Library, Edit, Run, and Player display. Scenario exposes Normal, Empty, and Error for each. Append `?study=1#library` or `?study=1#player` to hide facilitator selectors while keeping the honesty banner. Use browser Back or the facilitator selector to return from the player surface; no DM navigation is embedded inside that surface.

Entry: [prototype HTML](./prototypes/ux-00/index.html). UI: `src/prototypes/ux-00/Prototype.tsx` and `prototype.css`. No production entry, router, dependency, storage schema, or service-worker configuration was changed. The normal production build does not include this entry. Do not deploy it as a real player display.

### Interactive scope

| Surface | Working prototype interactions | Explicit limits |
| --- | --- | --- |
| Library | Search/clear, sample choice/cancel, open sample, illustrative duplicate, resume retained in-memory session. | One bundled sample, not a project catalog. Generate/Blank/Trace choices are disabled and labeled. Import explains its intended destination instead of reading a file. |
| Edit | Build/Decorate/Look/Levels navigation, illustrative selection/inspector, existing Classic/Minimal/Print rendering, zoom/fit, preparation, export explanation. | Geometry, note editing, stamp placement, and settings are destination previews, not editors. Selecting the entrance is an illustrative selection, not canvas hit-testing. |
| Prepare | Migration explanation, role separation, preview, start demo session, cancel. | No migration, checkpoint, visibility review, or readiness validator. |
| Run | Next/previous illustrative turn, pause/resume, preview, end/cancel, keep/discard demo progress. | Fog/token/measure/ping and publication controls explain their destinations. No geometry changes, transport, ownership, real encounter state, or persisted progress. |
| Player | Read-only sample layout, zoom/fit, authored public-information example, blank waiting/paused/disconnected states. | Same-window preview only. No real popup or connection. Existing renderer and bundled FOV are reused, not a safe audience projection. |
| Failure | Simulated library/save error and blocked display; retry clears simulation; bundled-sample backup download. | Backup is named `UX-00-bundled-sample-NOT-your-project.json`, includes DM content, and never reads production autosave. This is not recovery of actual user data. |

Prototype state lives in React memory. Reload resets it. No personal project is read or written. Mode links use the URL hash only. The sample download is the only file-producing interaction. Existing production shortcuts, legacy projects, offline behavior, and exports are untouched.

## Reproduced baseline

Fresh browser context, Chromium `152.0.7977.76`, macOS, DPR 1, desktop 1440 x 900; mobile viewport 390 x 844. This is viewport emulation, not physical-device certification. Browser automation waited for `networkidle` before acting. Fonts were local system fonts, with no font downloads; screenshots are environment-specific, not portable pixel goldens.

| Step | Observation at `01da138` | Evidence |
| --- | --- | --- |
| Fresh editor | Empty 32 x 32 grid. Header uses two rows. Long Draw panel has truncated Room labels and material choices below the fold. | [Fresh desktop](./media/ux-00/before-desktop.png) |
| Empty inspector | Right column displays map statistics and empty initiative/notes, rather than a next action. It is not literally devoid of content. | Same fresh screenshot |
| Generate Hub | Sample Maps is a second tab; selected sample is The Sunken Crypt. No sample thumbnail appears in this baseline gallery. | [Sample gallery](./media/ux-00/before-generate.png) |
| Load sample | Map is 40 x 40, with 6 tokens and 60 notes. Both header dimension selects display 8. Map opens at 100%, clipped vertically. | [Loaded sample](./media/ux-00/before-sample.png) |
| Present | Fog, drawing, token, and project actions coexist with player-looking output. Note Add/Edit/Delete affordances remain. | [Desktop Present](./media/ux-00/before-present.png) |
| Mobile Present | Map is clipped at 100%; Draw/Erase/Defog/Token/More remain. Zoom controls sit against bottom chrome. | [Mobile Present](./media/ux-00/before-mobile-present.png) |

These observations support the roadmap's starting concerns. They are not authorization for unrelated fixes. The dimension correction remains UX-01; real role separation remains UX-05/06.

The development browser reproduced a manifest parse error at `/Dungeon-Mapper/Dungeon-Mapper/manifest.webmanifest`, plus a deprecated Apple capability meta warning. Production deployment impact remains unclassified; this session does not claim a Pages outage or offline readiness. UX-08 must reproduce under the production base path before fixing deployment behavior.

### Fixtures and rendering controls

| Fixture | Exact source | Use and limitations |
| --- | --- | --- |
| F01 | Production fresh browser context, default Level 1, 32 x 32. | Baseline empty editor. Prototype Empty scenarios are illustrative, not persisted F01 documents. |
| F02 | `buildPremadeProject('sunken-crypt')` in `src/utils/premadeMaps.ts`; seed `premade:sunken-crypt`; theme `dungeon`; first level; 40 x 40; 20 source pixels/cell. | Same seeded geometry for baseline and prototype. No replacement generator or art assets. Runtime IDs/timestamps are not pixel-comparison inputs. |
| Prototype failures | Scenario selector, memory-only. | Not F06 quota/import/migration fixtures. No storage-failure coverage is claimed. |
| F03/F04/F05/F06/F07 | Not produced by this work package. | Remain required in their storage, visibility, performance, and export milestones. |

The prototype reuses `renderMapToCanvas`, existing art presets, and existing `computePlayerFOV`/`computeLightVisible` on F02. DM plates turn off the fog overlay. Player plates use the fixed union of that sample's token/light FOV as static fog, remove note markers, and show separate authored example public text. **This is not private-content sanitization:** no claim is made about secret geometry, token privacy, exports, or metadata. Only bundled fiction is accepted. Do not connect real projects to these components.

The baseline uses `MapCanvas` at 100%; prototype plates use the existing export renderer fitted into the new layout, with Classic selected initially. Different framing, renderer behavior, and preset settings are confounds. These are matched-fixture workflow screenshots, not an isolated art A/B comparison. UX-07 still owns continuous walls, restrained water/materials, and asset work.

Original references remain untouched in [ux-review](./media/ux-review/). For future readability trials, match crop, zoom, DPR, art preset, fog, and overlays before comparing accuracy.

### Before/after timings

Reproducible capture function: [capture.js](./prototypes/ux-00/capture.js). Execute through Playwright MCP `browser_run_code_unsafe` with its absolute filename while the server runs on 5187; the browser server's working directory must be this worktree because screenshot paths are relative. The function creates and closes its own context, never clears a user's storage, and returns timings and layout results.

The webapp-testing skill's Python helper was unavailable at its advertised path and Python Playwright was not installed. Existing Playwright MCP was used instead; no testing dependency was added.

| Automated journey | Actions | Runs in milliseconds |
| --- | --- | --- |
| Current editor to F02 | Open Generate Hub, Sample Maps tab, Load Sample, wait for map name and two animation frames. | 190, 177, 173 |
| Prototype Library to F02 Edit | Open a sample, Use The Sunken Crypt sample, wait for Edit heading and two animation frames. | 96, 74, 81 |

Measured September 7, one browser context per capture function, first baseline launch fresh then reloads. Timers start immediately before the first automated click and include Playwright dispatch/waits. Prototype navigation also starts after each page's `networkidle`. Neither number measures human decision time, p95 input-to-paint, first usable canvas, persistence, or production load. The prototype does less work and has fewer actions, so **do not report a speedup or release-gate pass**.

## Annotated layouts and state evidence

| Layout | Intent and visible difference | Screenshots |
| --- | --- | --- |
| Library | Explicit starting paths, device-storage caveat, sample card. Search and primary entry visible without generator terminology. | [Normal](./media/ux-00/after-library.png), [empty](./media/ux-00/after-library-empty.png), [error](./media/ux-00/after-library-error.png) |
| Edit | Focused 64 px masthead at 1440 px; dimensions are read-only context/settings instead of misleading selects. Build/Decorate/Look/Levels replace the category mismatch. No permanent empty inspector. | [Normal](./media/ux-00/after-edit.png), [empty](./media/ux-00/after-edit-empty.png), [error](./media/ux-00/after-edit-error.png) |
| Run | Persistent DM label, authored/project distinction, separate published-level wording, encounter beside the map, pause in masthead. | [Normal](./media/ux-00/after-run.png), [empty encounter](./media/ux-00/after-run-empty.png), [blocked display](./media/ux-00/after-run-error.png) |
| Player | No product DM navigation, only map/view controls and public-information example. Facilitator controls are visibly outside the product surface and hide with `?study=1`. | [Normal](./media/ux-00/after-player.png), [waiting](./media/ux-00/after-player-empty.png), [disconnected](./media/ux-00/after-player-error.png), [paused](./media/ux-00/after-player-paused.png), [mobile](./media/ux-00/after-mobile-player.png) |

Remaining layout questions: mobile authoring currently stacks the map and panels rather than implementing a bottom sheet; tablet inspector stacks below the editor rather than replacing one side panel; live player preview is a link/status card rather than a simultaneous second rendered map; only one level exists so inspect-versus-publish cannot yet be observed across floors. These are prototype fidelity limits, not approved omissions from UX-04/06.

## Developer evidence, not usability results

The prototype's four component cases cover sample/preparation/session navigation, all four surfaces' empty/error scenarios, paused player blanking with no DM controls, and creation cancellation/search recovery. Browser capture exercised actual canvas rendering, all twelve normal/empty/error layouts, paused blanking, and twenty screen/viewport combinations. No document-level horizontal overflow was observed at 390 x 844, 844 x 390, 768 x 1024, 1024 x 768, or 1440 x 900. This does not prove all controls are always above the fold, touch usability, or 200% zoom conformance.

Commands used:

```sh
npm test -- src/prototypes/ux-00/Prototype.test.tsx
npx eslint src/prototypes/ux-00
npm run build
```

Prototype cases passed and the production build succeeded. No production source was changed, so broader storage/generator suites were not rerun as evidence for new behavior. Build still reports the existing large-chunk warning. Dependency restoration reported audit findings; no dependency upgrades were made in UX-00.

Keyboard controls are native buttons/selects, with visible focus, route-heading focus, and a skip link. Screen-reader journeys, 200% text/zoom, forced-colors visual review, and real mobile devices remain unreviewed. A single sans-serif family is used across interface headings, body copy, controls, and branding, with platform fallbacks and no font download. Existing canvas artwork and its embedded labels are unchanged. Production font selection and license bundling remain UX-07.

After the owner's palette revision, WCAG relative-luminance calculations produced the following sampled ratios. They cover solid UI colors, not every rendered state or map artwork, and do not establish conformance:

| Pair | Contrast |
| --- | --- |
| Primary text `#F6F3FF` on panel `#1E1930` | 15.51:1 |
| Secondary text `#C4BDD7` on raised panel `#272344` | 8.23:1 |
| Lavender heading `#B9A0FF` on panel | 7.71:1 |
| Dark action text `#201018` on orange `#FF9569` | 8.49:1 |
| Private label `#FFADAD` on panel | 9.57:1 |
| Secondary error copy on `#42232C` | 7.70:1 |
| Border `#817696` on active control `#34294F` | 3.15:1 |
| Blue focus outline `#8DBBFF` on panel | 8.64:1 |

## Participant study: ready to recruit, not conducted

Target **five DMs and five players**. Recruit adult tabletop participants with consent, not project contributors acting as proxies. DM mix should include at least two new to map-authoring tools and two who regularly prepare/run encounters. Player mix should include at least two without DM experience and varied map familiarity. Include keyboard/assistive-technology users and a phone user where possible; record access needs without collecting unnecessary personal data. If recruitment is constrained, ask the owner to approve and document a smaller pilot before collecting results. No smaller sample is approved here.

Use 30-minute individual sessions. Say: "We are evaluating the interface, not your ability. Some actions are labeled simulations. Tell us what you expect; do not use real campaign material." Obtain separate recording consent. Use participant codes, not names, in repository artifacts; retain consent/contact/recordings outside git under an agreed retention policy. Recruitment owner, dates, incentives, and retention period must be assigned before invitations.

Present the old and proposed interfaces in alternating order across participants. First-use tasks must start before the participant has seen the other version. Use identical F02 geometry; for readability tasks, normalize the rendering confounds noted above. Do not coach, explain mode names beforehand, or count completing a narrated walkthrough as success.

| Task | Neutral participant prompt | Record |
| --- | --- | --- |
| DM first use | "You have a game tonight. Find a starting map and get ready to run it." | First action, sample-discovery path, time, wrong destinations, assistance, stopping point. Cap observation at 5 minutes without implying simulated persistence works. |
| DM mode model | "Show where you would change the room layout, and where you would reveal an area during play. What would a player see?" | Participant's own explanation of Edit/Run/Player; navigation errors. Destination-only controls cannot prove task execution. |
| DM continuity | "You moved the party during tonight's game. Finish now but keep a fresh prepared map for another group." | Interpretation of keep/discard, expectation on reload, whether authored map and progress are understood. |
| DM privacy | "An old project has descriptions you have not reviewed. What will players learn from those notes?" | Migration explanation comprehension, expectation versus actual prototype capability. Do not use real secret text. |
| Player comprehension | "Describe the visible scene. Find any public information and tell us whose turn the example says it is." | Time up to 60 seconds, misnavigation, expected interaction; no ownership inference. |
| Player interruption | "The display now looks like this. What do you think happened, and what would you do?" | Waiting/paused/disconnected interpretation, distinguish DM pause from failure. |
| Readability | "Point to the doorway and trace a traversable route in these matched map views." | Recognition accuracy and time, independent of visual preference. Fixture answer key must be verified before the study. |
| Aesthetic preference | "Which hierarchy is easier to scan, and why?" | Preference and explanation, recorded separately from route accuracy. |

Record one row per participant/task: participant code, role, experience bracket, interface order, browser/viewport/input, fixture settings, start/end, unaided completion, navigation errors, assistance, expectation mismatch, readability accuracy, preference, and consented quote. Leave all result cells empty until observed. Prototype-only navigation success cannot satisfy future functional release gates.

Recruitment and observation status: **0 DMs, 0 players, no success rate, no preference result**.

## Handoff and remaining gates

The [command inventory](./UX-00-COMMAND-INVENTORY.md) maps current actions to proposed homes. This is a migration checklist, not an implemented shared action registry.

Prototype work is closed out with owner acceptance. Research remains deferred: before claiming UX-00 usability acceptance, recruit and run the agreed cohort or explicitly approved smaller pilot; collect uncoached mode-comprehension findings, navigation errors, and separate readability/preference data; revise prototypes and milestone scope based on actual evidence. Final production art acceptance remains open. Do not treat owner approval as participant acceptance.

Later work remains unchanged in scope: UX-01 storage/schema/recovery and 40 x 40 regression; UX-02 local catalog; UX-03 unified action registry; UX-04 responsive editing parity; UX-05 real audience projection; UX-06 session lifecycle/display; UX-07 map-art slice; UX-08 export/offline; UX-09 qualification. UX-10 remains deferred. UX-01 is authorized next in a separate session; no production implementation is included in this PR.

Rollback is removal of the isolated prototype, its evidence, and associated documentation. There is no data migration to reverse. Do not remove legacy production capabilities based on this prototype.
