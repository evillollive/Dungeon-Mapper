import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { buildPremadeProject } from '../../utils/premadeMaps';
import { renderMapToCanvas } from '../../utils/renderMap';
import { getPresetSettings } from '../../utils/artStylePresets';
import { computePlayerFOV } from '../../utils/dynamicFog';
import { computeLightVisible } from '../../utils/lightSources';

type Screen = 'library' | 'edit' | 'run' | 'player';
type Scenario = 'normal' | 'empty' | 'error';
type Panel = 'Build' | 'Decorate' | 'Look' | 'Levels';
type Treatment = 'classic' | 'minimal' | 'print';
const screens: Screen[] = ['library', 'edit', 'run', 'player'];
const titles: Record<Screen, string> = {
  library: 'Library', edit: 'Edit', run: 'Run', player: 'Player display',
};
const fixture = buildPremadeProject('sunken-crypt');
const level = fixture.levels[0];
const visible = new Set([
  ...computePlayerFOV(level.tiles, level.tokens ?? []) ?? [],
  ...computeLightVisible(level.tiles, level.lightSources) ?? [],
]);
const sampleFog = level.tiles.map((row, y) => row.map((_, x) => !visible.has(`${x},${y}`)));

function initialScreen(): Screen {
  const hash = window.location.hash.slice(1);
  return screens.find(screen => screen === hash) ?? 'library';
}

function Button({ children, onClick, primary = false, ...props }: {
  children: ReactNode; onClick: () => void; primary?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  return <button className={primary ? 'primary' : undefined} onClick={onClick} {...props}>{children}</button>;
}

function MapPlate({ player = false, treatment = 'classic', zoom = 1, size = 500 }: {
  player?: boolean; treatment?: Treatment; zoom?: number; size?: number;
}) {
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Bundled fiction only. Existing player rendering is NOT an audience projection.
    const canvas = renderMapToCanvas({
      ...level,
      ...getPresetSettings(treatment),
      notes: player ? [] : level.notes,
      fogEnabled: player,
      dynamicFogEnabled: false,
      fog: sampleFog,
    }, { tileSize: 20, themeId: 'dungeon', viewMode: player ? 'player' : 'gm', printMode: treatment === 'print' });
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', player
      ? 'Illustrative public sample map. This prototype does not implement private-content filtering.'
      : 'The Sunken Crypt, bundled 40 by 40 sample. Existing map renderer, not new map artwork.');
    mount.current?.replaceChildren(canvas);
    return () => canvas.remove();
  }, [player, treatment]);
  return <div className="map-plate" style={{ width: `${zoom * 100}%`, maxWidth: zoom * size }} ref={mount} />;
}

export function Prototype() {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [scenario, setScenario] = useState<Scenario>('normal');
  const [panel, setPanel] = useState<Panel>('Build');
  const [treatment, setTreatment] = useState<Treatment>('classic');
  const [selected, setSelected] = useState(false);
  const [prepare, setPrepare] = useState(false);
  const [endSession, setEndSession] = useState(false);
  const [paused, setPaused] = useState(false);
  const [turn, setTurn] = useState(0);
  const [progress, setProgress] = useState(false);
  const [query, setQuery] = useState('');
  const [create, setCreate] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [notice, setNotice] = useState('');
  const [info, setInfo] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const study = new URLSearchParams(window.location.search).has('study');

  useEffect(() => {
    const onHash = () => {
      setScreen(initialScreen());
      setPrepare(false);
      setEndSession(false);
      setScenario('normal');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => { heading.current?.focus(); }, [screen, prepare, endSession]);

  function go(next: Screen) {
    setScreen(next);
    window.history.pushState(null, '', `#${next}`);
    setScenario('normal');
    setPrepare(false);
    setEndSession(false);
    setNotice('');
    setZoom(1);
    setCreate(false);
    setInfo(false);
  }

  function resetScenario(next: Scenario) {
    setScenario(next);
    setPrepare(false);
    setEndSession(false);
    setNotice('');
    setCreate(false);
    setSelected(false);
  }

  function downloadMockBackup() {
    // Never read the production autosave. This download always contains the bundled fixture.
    const url = URL.createObjectURL(new Blob([JSON.stringify(fixture, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'UX-00-bundled-sample-NOT-your-project.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Downloaded the bundled sample only. Includes DM content; no personal project was accessed.');
  }

  const empty = scenario === 'empty';
  const error = scenario === 'error';
  const hasMatch = 'the sunken crypt'.includes(query.trim().toLowerCase());
  const participants = ['Vera', 'Nix'];
  const modeTitle = prepare ? 'Prepare session' : endSession ? 'End session' : titles[screen];
  const mainTitle = screen === 'library' ? 'Your maps' : screen === 'player' ? 'The Sunken Crypt' : modeTitle;

  return <div className={`folio ${screen === 'player' ? 'player' : ''}`}>
    <a href="#workspace" className="skip" onClick={event => {
      event.preventDefault();
      document.getElementById('workspace')?.focus();
    }}>Skip to workspace</a>
    <aside className="research" aria-label="Prototype controls">
      <strong>UX-00 / Prototype</strong>
      <span>Bundled fiction. Memory only. Reload resets all changes.</span>
      {!study && <>
        <label>Screen <select value={screen} onChange={event => go(event.target.value as Screen)}>
          {screens.map(value => <option key={value} value={value}>{titles[value]}</option>)}
        </select></label>
        <label>Scenario <select value={scenario} onChange={event => resetScenario(event.target.value as Scenario)}>
          <option value="normal">Normal</option><option value="empty">Empty</option><option value="error">Error</option>
        </select></label>
      </>}
    </aside>

    <header className="masthead">
      <div className="brand"><span className="brand-mark" aria-hidden="true">DM</span><span>Dungeon<br />Mapper</span></div>
      {screen !== 'player' && <nav aria-label="Workspace">
        <Button onClick={() => go('library')} aria-current={screen === 'library' ? 'page' : undefined}>Your maps</Button>
        <Button onClick={() => go('edit')} aria-current={screen === 'edit' ? 'page' : undefined}>Edit</Button>
        <Button onClick={() => go('run')} aria-current={screen === 'run' ? 'page' : undefined}>Run</Button>
      </nav>}
      <span className="save-label">{screen === 'player' ? 'Local read-only display' : 'Demo changes are not saved'}</span>
      {screen === 'run' && <Button primary onClick={() => setPaused(!paused)}>{paused ? 'Resume display' : 'Pause display'}</Button>}
      {screen === 'edit' && <Button onClick={() => { setInfo(!info); setNotice(''); }}>Export</Button>}
    </header>

    <main id="workspace" tabIndex={-1}>
      <div className="page-heading">
        <div><p className="eyebrow">{screen === 'library' ? 'A cartographer\'s folio / 01' : screen === 'player' ? 'For the table' : 'DM view / The Sunken Crypt'}</p>
          <h1 ref={heading} tabIndex={-1}>{mainTitle}</h1></div>
        {screen === 'library' && <Button primary onClick={() => setCreate(!create)}>Create map</Button>}
        {screen === 'edit' && !prepare && <Button primary onClick={() => { setPrepare(true); setInfo(false); }}>Prepare session</Button>}
        {screen === 'run' && !endSession && <Button onClick={() => setEndSession(true)}>End session</Button>}
      </div>

      <div role="status" className={notice ? 'notice' : 'status-empty'}>{notice}</div>

      {error && screen !== 'player' && <section role="alert" className="error-banner">
        <div><strong>{screen === 'library' ? 'Could not open the local library' : screen === 'edit' ? 'Changes could not be saved' : 'Player display could not open'}</strong>
          <p>{screen === 'library' ? 'Your stored projects would be retained. This is a simulated storage failure.' : screen === 'edit' ? 'Keep this page open. Download a backup before leaving. Simulated failure; only the sample exists here.' : 'Allow popups for this site, then try again. A same-window preview is available. No real popup is opened in this prototype.'}</p></div>
        <Button onClick={() => { setScenario('normal'); setNotice('Simulation cleared. No storage or connection was repaired.'); }}>Retry simulation</Button>
        {screen === 'run' ? <Button onClick={() => go('player')}>Use same-window preview</Button> : <Button onClick={downloadMockBackup}>Download sample backup</Button>}
      </section>}

      {screen === 'library' && <section className="library">
        <div className="library-intro">
          <h2>Make a place<br /><em>worth exploring.</em></h2>
          <p>Prepare a map. Keep your secrets. Bring the table together.</p>
          <p className="storage-note">Proposed storage: on this device, without an account. Export backups to keep another copy. This demo stores nothing.</p>
          <Button onClick={() => { setCreate(true); setNotice('Choose a starting point. Only the bundled sample path is interactive.'); }}>Open a sample</Button>
          <Button onClick={() => setNotice('Import preview: choose a project, validate it, then open a separate copy. Import is not implemented in UX-00.')}>Import project</Button>
        </div>
        <div className="collection">
          <label className="search">Find a map <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your maps" /></label>
          {create ? <article className="creation">
            <p className="eyebrow">New project / choose a starting point</p><h2>A head start for tonight</h2>
            <div className="choices">
              <Button primary onClick={() => { go('edit'); setNotice('Opened a demo copy of The Sunken Crypt. No existing project was replaced.'); }}>Use The Sunken Crypt sample</Button>
              {['Generate', 'Blank map', 'Trace an image'].map(label => <button key={label} disabled>{label} (later prototype)</button>)}
            </div>
            <p>The generator, blank-map editor, and image tracing remain available in the unchanged production app.</p>
            <Button onClick={() => setCreate(false)}>Cancel creation</Button>
          </article> : empty || !hasMatch ? <article className="empty-card">
            <span className="folio-number" aria-hidden="true">01</span>
            <h2>{empty ? 'Your first adventure starts here' : 'No matching maps'}</h2>
            <p>{empty ? 'Choose a sample or create a map. Nothing needs to be configured first.' : 'Try another title. Your collection has not changed.'}</p>
            <Button primary onClick={() => empty ? setCreate(true) : setQuery('')}>{empty ? 'Choose a sample' : 'Clear search'}</Button>
          </article> : <article className="project-card">
            <div className="thumbnail"><MapPlate treatment={treatment} /><span className="plate-index">I / DUNGEON</span></div>
            <div className="card-copy"><p className="eyebrow">Bundled sample / 40 x 40 / 1 level</p><h2>The Sunken Crypt</h2>
              <p>Flooded chambers, forgotten passages, and a reason to venture below.</p>
              <div className="actions"><Button primary onClick={() => go('edit')}>Open map</Button>
                {progress && <Button onClick={() => go('run')}>Resume demo session</Button>}
                <Button onClick={() => { go('edit'); setNotice('Demo duplicate opened. The bundled original remains unchanged; no library record was created.'); }}>Duplicate</Button></div>
            </div>
          </article>}
        </div>
      </section>}

      {screen === 'edit' && prepare && <section className="preparation">
        <div className="section-card"><p className="eyebrow">Before the table arrives</p><h2>Keep the surprise on your side.</h2>
          <p>Legacy descriptions stay DM-private until reviewed. Nothing is deleted or automatically published.</p>
          <ul className="checklist"><li>Authored map: The Sunken Crypt</li><li>Party preview: Vera and Nix</li><li>Starting visibility: bundled sample fog</li><li>Private notes: review before publishing</li></ul>
          <p className="note-private">Prototype only: the existing renderer is not a player-safety boundary. Do not use this preview to approve real private content.</p>
          <div className="actions"><Button onClick={() => go('player')}>Preview as player</Button><Button primary onClick={() => { go('run'); setProgress(true); }}>Start demo session</Button>
            <Button onClick={() => setPrepare(false)}>Back to Edit</Button></div>
        </div>
        <div className="section-card"><h2>Your map stays yours.</h2><p>Play progress belongs to a separate session. Saving a session will not silently change your prepared map.</p><p className="storage-note">This prototype models the choice only. It creates no checkpoint or session record.</p></div>
      </section>}

      {screen === 'edit' && !prepare && <div className="editor-workspace">
        <aside className="tool-library" aria-label="Authoring tools">
          <nav aria-label="Edit categories">{(['Build', 'Decorate', 'Look', 'Levels'] as Panel[]).map(value => <Button key={value} onClick={() => setPanel(value)} aria-pressed={panel === value}>{value}</Button>)}</nav>
          <div className="panel-content"><p className="eyebrow">{panel}</p>
            {panel === 'Build' && <><h2>Shape the space</h2><p>Select a detail to inspect it. Drawing tools below are navigation previews.</p>
              <Button primary onClick={() => { setSelected(!selected); setNotice(selected ? 'Selection cleared.' : 'Demo entrance selected. Geometry editing is not implemented.'); }}>{selected ? 'Clear selection' : 'Select entrance'}</Button>
              <div className="tool-previews">{['Room', 'Paint', 'Wall', 'Path', 'River'].map(tool => <Button key={tool} onClick={() => setNotice(`${tool}: future contextual controls beside the material palette. No geometry was changed.`)}>{tool}</Button>)}</div>
              <h3>Material beside the tool</h3><div className="material"><span aria-hidden="true" />Flagstone</div><p>More materials appear with Paint.</p></>}
            {panel === 'Decorate' && <><h2>Give it character</h2><p>Existing stamps, tokens, markers, and scene templates live here.</p><Button onClick={() => { setSelected(true); setNotice('Selected illustrative entrance details. Stamp placement remains in the production editor.'); }}>Inspect entrance details</Button></>}
            {panel === 'Look' && <><h2>Ink, stone & light</h2><p>Existing art presets, not a new art kit.</p>{(['classic', 'minimal', 'print'] as Treatment[]).map(style => <Button key={style} onClick={() => setTreatment(style)} aria-pressed={style === treatment}>{style === 'classic' ? 'Classic' : style === 'minimal' ? 'Minimal' : 'Print'}</Button>)}</>}
            {panel === 'Levels' && <><h2>One place, many floors</h2><p>The Sunken Crypt contains one level. Adding and linking floors remains in the production app.</p><strong>Level 1 / 40 x 40</strong><p>Inspecting a floor as DM will not publish it to players.</p></>}
          </div>
          <details><summary>Project settings</summary><p>40 x 40 cells. Dimensions, grid distance, export resolution, and interface text size will have distinct controls.</p></details>
        </aside>
        <section className="map-workspace" aria-label="Map preview">
          <div className="map-caption"><span>The Sunken Crypt / Level 1</span><span>40 x 40</span></div>
          {empty ? <div className="empty-card"><h2>A blank canvas, not a checklist.</h2><p>Start with a sample or draw a room. No permanent empty inspector.</p><Button onClick={() => setScenario('normal')}>Load demo sample</Button></div> : <MapPlate treatment={treatment} zoom={zoom} />}
          <div className="map-footer"><span>Map art: existing renderer</span><Button onClick={() => setZoom(1)}>Fit map</Button><Button onClick={() => setZoom(Math.min(2, zoom + .25))}>Zoom in</Button></div>
        </section>
        {(selected || info) && <aside className="inspector">
          <Button onClick={() => { setSelected(false); setInfo(false); }}>Close inspector</Button>
          <p className="eyebrow">{info ? 'Export by intent' : 'Selected / example object'}</p><h2>{info ? 'Take it with you' : 'Entrance'}</h2>
          {info ? <><p>Editable project backups include DM-only content.</p><Button primary onClick={downloadMockBackup}>Download sample backup</Button><p>Player image, SVG, and table-print audience previews require UX-05/08. Existing exports are unchanged in production.</p></> : <><p>Flagstone / example entrance</p><p className="note-private">DM-private note</p><p>The stairwell is slippery. This note is authored prototype copy, not migrated data.</p><Button onClick={() => setNotice('Private note editor destination previewed. No notes were changed.')}>Review private note</Button></>}
        </aside>}
      </div>}

      {screen === 'run' && (endSession ? <section className="section-card end-session">
        <p className="eyebrow">Put a bookmark here</p><h2>What should happen to this session?</h2>
        <p>Keep fog, positions, and turn progress separately from your authored map. Reloading this demo still resets everything.</p>
        <div className="choices"><Button primary onClick={() => { setProgress(true); go('library'); setNotice('Demo session retained in memory. Authored sample unchanged.'); }}>Keep demo session progress</Button>
          <Button onClick={() => { setProgress(false); setTurn(0); setPaused(false); go('library'); setNotice('Demo progress discarded. Authored sample unchanged.'); }}>Discard demo progress</Button>
          <Button onClick={() => setEndSession(false)}>Cancel</Button></div>
        <p>Copying session changes back to the authored project would be a separate reviewed action. Not implemented here.</p>
      </section> : <section className="run-workspace">
        <aside className="session-tools"><p className="eyebrow">DM controls</p><h2>At the table</h2>
          <strong>Inspecting: Level 1</strong><p>Published: Level 1</p>
          <Button onClick={() => setNotice('Level 1 publication previewed. No transport message was sent.')}>Show this level</Button>
          <div className="tool-previews">{['Reveal area', 'Move token', 'Measure', 'Ping'].map(tool => <Button key={tool} onClick={() => setNotice(`${tool} belongs in Run. This is a destination preview, not an implemented session action.`)}>{tool}</Button>)}</div>
          <p className="note-private">DM-private notes stay here</p><p>The stairwell is slippery.</p>
        </aside>
        <div className="map-workspace"><div className="map-caption"><strong>DM map</strong><span>Authored project unchanged</span></div><MapPlate treatment={treatment} size={420} />
          <div className="display-card"><span className="eyebrow">Player preview / {paused ? 'Paused' : 'Illustrative'}</span>
            <p>{paused ? 'The player surface is blanked until you resume.' : 'Local, read-only viewing. No remote players or accounts.'}</p>
            <Button primary onClick={() => go('player')}>Open player preview</Button>
            <Button onClick={() => { setScenario('error'); }}>Simulate blocked display</Button>
          </div>
        </div>
        <aside className="encounter"><p className="eyebrow">Encounter</p><h2>{empty ? 'No participants yet' : `Round ${Math.floor(turn / 2) + 1}`}</h2>
          {empty ? <><p>Add your party during preparation. Manual-fog play should not require initiative.</p><Button onClick={() => setScenario('normal')}>Add demo party</Button></> : <>
            <p>Illustrative public turn order</p>{participants.map((name, index) => <div className={`participant ${turn % 2 === index ? 'current' : ''}`} key={name}><span>{index + 1}</span><strong>{name}</strong>{turn % 2 === index && <small>Current</small>}</div>)}
            <Button primary onClick={() => setTurn(turn + 1)}>Next turn</Button><Button disabled={turn === 0} onClick={() => setTurn(Math.max(0, turn - 1))}>Previous turn</Button>
          </>}
          <p className="storage-note">Turn changes are memory-only illustrations.</p>
        </aside>
      </section>)}

      {screen === 'player' && <section className="player-workspace" aria-label="Player display">
        {paused || error || empty ? <div className="display-neutral" role="status">
          <p className="eyebrow">For the table</p><h2>{error ? 'Display disconnected' : paused ? 'A moment at the table' : 'Waiting for your DM'}</h2>
          <p>{error ? 'The map stays blank until a valid view arrives. Ask your DM to reconnect the display.' : paused ? 'Your DM has paused the display.' : 'Nothing has been published yet. The map will appear here when it is ready.'}</p>
          <p className="storage-note">Illustrative state. No live connection exists.</p>
        </div> : <>
          <div className="player-map"><MapPlate player treatment={treatment} zoom={zoom} /></div>
          <div className="player-controls"><Button onClick={() => setZoom(Math.max(.5, zoom - .25))}>Zoom out</Button><Button onClick={() => setZoom(1)}>Fit map</Button><Button onClick={() => setZoom(Math.min(2, zoom + .25))}>Zoom in</Button><Button onClick={() => setInfo(!info)} aria-expanded={info}>Public information</Button></div>
          {info && <aside className="public-info"><h2>At the entrance</h2><p>Water echoes through the stone passage. The stairwell leads into the crypt.</p><p>Illustrative current turn: {participants[turn % 2]}</p><p>No token ownership or movement is offered.</p></aside>}
        </>}
        <p className="prototype-caveat">Layout study only. Bundled sample rendering is not an audience-safety implementation.</p>
      </section>}
    </main>
    <footer className="folio-footer"><span>Dungeon Mapper / Workflow studies</span><span>UX-00 &middot; No production behavior changed</span></footer>
  </div>;
}
