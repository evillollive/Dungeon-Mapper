import { useEffect, useRef, type ReactNode } from 'react';
import hero from '../assets/welcome/welcome-hero.webp';
import createShot from '../assets/welcome/welcome-create.webp';
import prepareShot from '../assets/welcome/welcome-prepare.webp';
import runShot from '../assets/welcome/welcome-run.webp';
import { EXPLAINER_YOUTUBE_ID, GITHUB_URL, TRAILER_YOUTUBE_ID } from '../welcomeMedia';
import './WelcomePage.css';

const youtube = (id: string) => `https://www.youtube.com/watch?v=${id}`;

function StartButtons({ disabled, onCreate }: { disabled: boolean; onCreate: (sampleFirst?: boolean) => void }) {
  return <div className="welcome-actions">
    <button className="welcome-primary" disabled={disabled} onClick={() => onCreate(true)}>Explore a sample map</button>
    <button disabled={disabled} onClick={() => onCreate()}>Create a map</button>
  </div>;
}

/** First screen for someone with no maps yet. Your maps stays one click away. */
export default function WelcomePage({ disabled, onCreate, onShowLibrary, offlineStatus }: {
  disabled: boolean;
  onCreate: (sampleFirst?: boolean) => void;
  onShowLibrary: () => void;
  /** The offline and update control. It also registers offline support, so it must stay mounted. */
  offlineStatus: ReactNode;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, []);
  const getStarted = <a className="welcome-cta" href="#welcome-start">Get started</a>;
  return <main className="welcome" aria-label="Welcome to Dungeon Mapper">
    <div className="welcome-inner">
      <header className="welcome-bar">
        <p className="welcome-strong">Dungeon Mapper</p>
        <nav aria-label="Welcome">
          <a href="#welcome-how">See how it works</a>
          <button className="welcome-link" onClick={onShowLibrary}>Your maps</button>
          {getStarted}
        </nav>
      </header>

      <section className="welcome-hero">
        <div className="welcome-hero-copy">
          <h1 ref={title} tabIndex={-1}>Make the map tonight, and run it tomorrow.</h1>
          <p className="welcome-muted">Dungeon Mapper is a free map builder for tabletop RPGs that runs in your browser, no account
            needed and nothing to install. Draw or generate a map, hide what your players shouldn't see, and bring it to your table.</p>
          <StartButtons disabled={disabled} onCreate={onCreate} />
        </div>
        <div className="welcome-hero-media">
          {TRAILER_YOUTUBE_ID ? <>
            <div className="welcome-frame">
              <iframe title="Dungeon Mapper trailer" loading="lazy" allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                src={`https://www.youtube.com/embed/${TRAILER_YOUTUBE_ID}?autoplay=1&mute=1&playsinline=1&rel=0`} />
            </div>
            <a className="welcome-media-link" href={youtube(TRAILER_YOUTUBE_ID)} target="_blank" rel="noreferrer">Watch the trailer on YouTube</a>
          </> : <div className="welcome-frame">
            <img src={hero} width="1600" height="900"
              alt="The Crooked Company, an inn map included as a sample, with beds, tables and a courtyard camp" />
          </div>}
        </div>
      </section>

      <ul className="welcome-facts" aria-label="At a glance">
        <li><strong className="welcome-heading">35</strong><span>Sample maps to open and change</span></li>
        <li><strong className="welcome-heading">4</strong><span>Generators: rooms, caverns, open terrain, and villages</span></li>
        <li><strong className="welcome-heading">Offline</strong><span>Works without a connection once it's loaded</span></li>
        <li><strong className="welcome-heading">Print</strong><span>Export player-safe images and print pages</span></li>
      </ul>

      <section className="welcome-start" id="welcome-start" aria-labelledby="welcome-start-title">
        <h2 id="welcome-start-title">Get started</h2>
        <p className="welcome-muted">Every sample opens as your own copy, so nothing you change touches the original.</p>
        <StartButtons disabled={disabled} onCreate={onCreate} />
      </section>

      <section className="welcome-how" id="welcome-how" aria-labelledby="welcome-how-title">
        <div className="welcome-section-head">
          <h2 id="welcome-how-title">From blank grid to game night in three steps.</h2>
          {EXPLAINER_YOUTUBE_ID && <p className="welcome-muted">Watch the walkthrough, or read the short version below it.</p>}
        </div>
        {EXPLAINER_YOUTUBE_ID && <div className="welcome-frame">
          <iframe title="How Dungeon Mapper works" loading="lazy" allowFullScreen
            allow="encrypted-media; picture-in-picture; fullscreen"
            src={`https://www.youtube.com/embed/${EXPLAINER_YOUTUBE_ID}?rel=0`} />
        </div>}
        <ol className="welcome-steps">
          <li><img src={createShot} width="1600" height="1000" loading="lazy"
            alt="The editor with The Crooked Company open beside the Build tools" />
            <h3>Build the map</h3>
            <p className="welcome-muted">Start from a sample, a generator, or a blank grid, then paint rooms, place furniture and tokens, and add notes only you can see.</p></li>
          <li><img src={prepareShot} width="1600" height="1000" loading="lazy"
            alt="Alder Crossing in the editor with the east bank shaded as hidden from players" />
            <h3>Decide what players see</h3>
            <p className="welcome-muted">Turn on fog and pick the starting area: hidden tokens and private notes stay on your side.</p></li>
          <li><img src={runShot} width="1600" height="1000" loading="lazy"
            alt="The player display showing Kestrel Docking Bay, its public notes and initiative" />
            <h3>Show it at the table</h3>
            <p className="welcome-muted">Open the player display on a second screen, and reveal rooms as the party explores.</p></li>
        </ol>
      </section>

      <section className="welcome-catch" aria-labelledby="welcome-catch-title">
        <h2 id="welcome-catch-title">What's the catch? There isn't one.</h2>
        <ul>
          <li><h3>No paid tier</h3><p className="welcome-muted">Every tool is in the free version, because it's the only version.</p></li>
          <li><h3>Your maps stay with you</h3><p className="welcome-muted">Maps are saved in this browser on this device, and you can export a backup file whenever you want another copy.</p></li>
          <li><h3>Open source</h3><p className="welcome-muted">The code is public on GitHub, which is also where to report a problem or suggest a tool.</p></li>
        </ul>
      </section>

      <footer className="welcome-bar welcome-footer">
        <p>Dungeon Mapper</p>
        <nav aria-label="Footer">
          {offlineStatus}
          <button className="welcome-link" onClick={onShowLibrary}>Your maps</button>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
          {TRAILER_YOUTUBE_ID && <a href={youtube(TRAILER_YOUTUBE_ID)} target="_blank" rel="noreferrer">YouTube</a>}
          {getStarted}
        </nav>
      </footer>
    </div>
  </main>;
}
