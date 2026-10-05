import { useRef, useState } from 'react';
import lanternCrypt from '../../docs/media/launch-art/launch-lantern-crypt-outlined.png';

const STORAGE_KEY = 'dungeon-mapper:overview-collapsed';

export default function LibraryOverview({ disabled, onCreate }: {
  disabled: boolean;
  onCreate: (sampleFirst?: boolean) => void;
}) {
  const [preference] = useState(() => {
    try {
      return { collapsed: window.localStorage.getItem(STORAGE_KEY) === 'true', error: '' };
    } catch {
      return { collapsed: false, error: 'Your overview preference could not be read. You can still explore and use your maps.' };
    }
  });
  const [collapsed, setCollapsed] = useState(preference.collapsed);
  const [error, setError] = useState(preference.error);
  const toggle = useRef<HTMLButtonElement>(null);
  const change = (next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
      setError('');
    } catch {
      setError('This browser could not remember your overview preference. It will only apply to this visit.');
    }
    toggle.current?.focus();
  };
  return <section className="library-overview" aria-label="Dungeon Mapper overview">
    <div className="overview-heading">
      <p className="library-eyebrow">DUNGEON MAPPER / PREP AND PLAY</p>
      <button ref={toggle} aria-expanded={!collapsed} aria-controls="library-overview-content"
        onClick={() => change(!collapsed)}>{collapsed ? 'Overview' : 'Collapse overview'}</button>
    </div>
    {error && <p role="status" className="library-muted">{error}</p>}
    <div id="library-overview-content" hidden={collapsed}>
      <div className="overview-hero">
        <div>
          <h2>Make battle maps that look great fast.</h2>
          <p className="overview-tagline">Then keep polishing until they feel like your table.</p>
          <p>A local-first grid map editor for tabletop RPG prep and play. Start from a sample,
            a blank grid or a generator, then build an encounter and bring it to the table.</p>
          <div className="library-actions">
            <button className="library-primary" disabled={disabled} onClick={() => onCreate(true)}>Explore a sample</button>
            <button disabled={disabled} onClick={() => onCreate()}>Create a map</button>
            <a href="#your-maps">Go to your maps</a>
          </div>
          <p className="library-muted">No account needed. Projects stay in this browser. Export a backup to keep another copy.</p>
        </div>
        <figure className="overview-art">
          <img src={lanternCrypt} width="1224" height="813"
            alt="The Lantern Crypt sample: a furnished dungeon in color beside its monochrome print companion" />
          <figcaption>One map, two looks. The Lantern Crypt, an included sample.</figcaption>
        </figure>
      </div>
      <ol className="overview-workflow" aria-label="From first draft to the table">
        <li><span className="library-eyebrow">01 / CREATE</span><h3>Fast first draft, deep polish later.</h3>
          <p>Draw or generate your map, then refine it with terrain, themes, stamps and notes.</p></li>
        <li><span className="library-eyebrow">02 / PREPARE</span><h3>Separate prep from play.</h3>
          <p>Review what players can see. Keep private encounter notes and hidden content on the DM side.</p></li>
        <li><span className="library-eyebrow">03 / RUN OR EXPORT</span><h3>Bring it to your table.</h3>
          <p>Run a separately saved session with a local player display, or export player images and print pages.</p></li>
      </ol>
      <p className="library-muted">The player display opens in the same browser, not through a remote share link.
        {' '}Offline use needs the app and built-in art cached first. Physical print scale still needs checking.</p>
    </div>
  </section>;
}
