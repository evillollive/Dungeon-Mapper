import { useEffect, useRef, useState } from 'react';
import type { PlayerProjection } from '../utils/audienceProjection';
import { renderPlayerProjection } from '../utils/renderMap';

/** No authoring props or mutation callbacks cross this component boundary. */
export default function PlayerPreview({ projection }: { projection: PlayerProjection }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const minimap = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const { map } = projection;
  const tokens = map.tokens ?? [];
  useEffect(() => {
    const viewport = canvas.current?.parentElement;
    if (!viewport) return;
    let frame = 0;
    let lastDisplayWidth = -1;
    let lastTileSize = -1;
    const draw = () => {
      frame = 0;
      const aspect = map.meta.width / map.meta.height;
      const displayWidth = Math.min(viewport.clientWidth, window.innerHeight * 0.6 * aspect) * zoom;
      // Bound the backing surface while rendering at display resolution rather
      // than enlarging a low-resolution source canvas for small maps.
      const tileSize = Math.max(1, Math.min(Math.ceil(displayWidth * Math.min(2, window.devicePixelRatio || 1) / map.meta.width),
        Math.floor(4096 / Math.max(map.meta.width, map.meta.height))));
      if (displayWidth === lastDisplayWidth && tileSize === lastTileSize) return;
      lastDisplayWidth = displayWidth;
      lastTileSize = tileSize;
      const rendered = renderPlayerProjection(projection, { tileSize });
      for (const [target, thumbnail] of [[canvas.current, false], [minimap.current, true]] as const) {
        if (!target) continue;
        target.width = thumbnail ? 160 : rendered.width;
        target.height = thumbnail ? Math.max(1, Math.round(160 / aspect)) : rendered.height;
        if (!thumbnail) { target.style.width = `${displayWidth}px`; target.style.height = `${displayWidth / aspect}px`; }
        target.getContext('2d')?.drawImage(rendered, 0, 0, target.width, target.height);
      }
    };
    // Canvas sizing can resize its parent. Paint outside observer delivery and
    // ignore unchanged dimensions rather than feeding that resize back into it.
    const scheduleDraw = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    draw();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleDraw);
    observer?.observe(viewport);
    window.addEventListener('resize', scheduleDraw);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', scheduleDraw);
      cancelAnimationFrame(frame);
    };
  }, [projection, map.meta.width, map.meta.height, zoom]);
  return <main className="player-preview" aria-label="Player content">
    <header className="player-preview-heading">
      <div><p className="player-eyebrow">PLAYER PREVIEW / READ ONLY</p><h1>{map.meta.name}</h1></div>
      <div className="player-zoom" role="group" aria-label="Player viewport">
        <button type="button" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>Zoom out</button>
        <button type="button" onClick={() => setZoom(1)}>Fit map</button>
        <button type="button" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>Zoom in</button>
      </div>
    </header>
    <div className="player-preview-layout">
      <div className="player-map-scroll" tabIndex={0} role="region" aria-label="Map viewport. Scroll or use arrow keys to pan.">
        <canvas ref={canvas} role="img"
          aria-label={`${map.meta.name}. ${tokens.length} visible tokens. ${map.notes.length} published notes.`} />
      </div>
      <aside className="player-legend" aria-label="Public legend">
        <canvas ref={minimap} className="player-minimap" role="img" aria-label={`Minimap: ${map.meta.name}`} />
        <section aria-labelledby="public-notes"><h2 id="public-notes">Public notes</h2>
          {map.notes.length === 0 && <p>No published notes in the known area.</p>}
          {map.notes.map(note => <article key={note.id}>
            <h3>{note.id}. {note.label}</h3><p>{note.description}</p>
          </article>)}
        </section>
        <section aria-labelledby="public-initiative"><h2 id="public-initiative">Initiative</h2>
          {(map.initiative ?? []).length === 0 && <p>No public initiative entries.</p>}
          <ol>{(map.initiative ?? []).map(id => <li key={id}>{tokens.find(t => t.id === id)?.label}</li>)}</ol>
        </section>
        <section aria-labelledby="public-tokens"><h2 id="public-tokens">Visible tokens</h2>
          {tokens.length === 0 && <p>No visible tokens.</p>}
          <ul>{tokens.map(token => <li key={token.id}>{token.label} ({token.x}, {token.y})</li>)}</ul>
        </section>
      </aside>
    </div>
  </main>;
}
