# Sharing Guide

Describe Dungeon Mapper as a local-first battle-map editor with a separate DM
session workspace and read-only local player display. These are draft sharing
materials, not authorization to announce a release. Outstanding owner,
physical-print, performance and qualification gates remain in the
[roadmap](./USER-EXPERIENCE-ROADMAP.md#release-gate-ledger).

## Positioning

**Short description:** Local-first TTRPG battle-map editor with procedural
generation, fog, tokens, private project backups and a local player display.

**One-liner:** Prepare a battle map, run the encounter and choose what appears
on a second window at your table.

**Longer pitch:** Dungeon Mapper keeps authored maps in a local Library.
Start from a sample, generation, blank map or tracing image, then build and
decorate the encounter. Prepare visibility and public notes before starting
a separately saved session. Reveal geography, move tokens and advance turns
in Run while a read-only local player window shows the published view.
Export private project JSON, player PNG/SVG images or A4/Letter print pages.

## Audience and boundaries

| Audience | Useful angle |
| --- | --- |
| Game masters | Prepare a map, review public content and run a local encounter without overwriting the authored source. |
| TTRPG creators | Generate, decorate and export maps; keep an editable private backup. |
| Front-end contributors | React/TypeScript, Canvas rendering, seeded generation, local persistence, audience projection and production-browser qualification. |

Keep these distinctions in every demo or announcement:

- **Local display is not remote multiplayer.** It uses a second window in the
  same browser, not accounts, authentication or a join link for other devices.
- **The editor is private.** Edit, legacy DM view, Library previews and project
  backups can contain secrets. Use Player preview, the local player display or
  player-audience image export for sharing, and inspect secrets embedded in art.
- **A project backup is not a session backup.** Run saves separately. Its
  private recovery download has no dedicated file-import workflow.
- **Offline-capable is not always offline-ready.** Wait for **App and built-in
  art cached.** while online. Browser storage/caches can be evicted.
- **Implemented is not qualified.** Do not claim physical printing, broad
  mobile/touch/pen support, screen-reader conformance, performance targets or
  participant acceptance that the roadmap has not accepted.

## Demo scripts

### Short map-to-table demo

1. From **Your maps**, choose **Open a sample** and preview **The Lantern
   Crypt**, **Alder Crossing** or **Kestrel Docking Bay**. Select **Use this map**.
2. Show Build, Decorate and Look. Make one edit, Undo it and wait for
   **Saved on this device**.
3. Open **Player preview** and explain that only public note fields are shared.
   Keep the DM browser surface off any player-facing recording.
4. Choose **Prepare session**, review visibility, acknowledge it and **Start
   session**. Choose **Open player display**, then **Show this level**.
5. Reveal a cell or move a token, then use **Pause / blank now**. Explain that
   session progress is stored independently of the authored map.
6. End with **Save session progress**. Back in Edit, show **Export > Share with
   players** and explain **Back up project** without publishing the private file.

### Optional focused demonstrations

- **Creation:** Your maps > Create map > Generate a map. Preview before Use
  this map; advanced editor generation is under Build > Generate, not a
  fresh-Library `G` shortcut.
- **Reuse:** Duplicate a Library project, or generate into a selected region
  after reviewing its scope. Keep the source and show the independent copy.
- **Print planning:** Export > Print for the table, choose audience and paper,
  then show the page preview. Digital output is not proof of actual printer scale.
- **Offline:** Use disposable synthetic data and check cache readiness first.
  Demonstrate a locally rehearsed offline workflow, not untested promises about
  mobile installation or storage durability.

The GIFs in README and `docs/media` show historical interfaces. Retain them as
tool demonstrations, but do not present them as the current first-use flow.
New recordings should follow the steps above.

## Suggested repository metadata

**Description:** Local-first TTRPG battle-map editor with generation, fog,
tokens, private backups, image/print export and a local player display.

**Homepage:** `https://evillollive.github.io/Dungeon-Mapper/`

**Topics:** `ttrpg`, `battlemap`, `map-editor`, `procedural-generation`, `react`,
`typescript`, `vite`, `pwa`, `tabletop-rpg`

These are suggestions only; this document does not change remote metadata.

## Announcement draft

I'm building Dungeon Mapper, a local-first browser tool for TTRPG maps.
Create and organize encounters, prepare public content, then run a separately
saved session with a read-only player window in the same browser. It includes
seeded generation, fog, tokens and project/image/print exports.

The hosted build is available for exploration. Release qualification is still
in progress, and device storage is not a backup.

App: https://evillollive.github.io/Dungeon-Mapper/

Source: https://github.com/evillollive/Dungeon-Mapper

Use the [Feature Reference](./FEATURES.md) for current controls, recovery scope
and limitations. Social images, new recordings and launch-channel publishing
are optional separate work, not prerequisites for closing documentation.
