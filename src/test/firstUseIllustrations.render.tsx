import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import FirstUseIllustration from '../components/FirstUseIllustration';
import type { FirstUseScene } from '../assets/firstUseIllustrations';

const scenes: { id: FirstUseScene; title: string; subtitle: string; placement: string }[] = [
  { id: 'create', title: 'A place to begin', subtitle: 'A folded map, a path, and room for your next idea.', placement: 'Empty map collection' },
  { id: 'backup', title: 'A copy to keep', subtitle: 'Your map on this device. A separate file to keep elsewhere.', placement: 'Private project backup' },
  { id: 'display', title: 'A seat at the table', subtitle: 'The DM prepares the scene. The player screen starts blank.', placement: 'Session preparation and waiting display' },
];

export function showFirstUseReview() {
  document.title = 'Dungeon Mapper / first-use illustrations';
  const style = document.createElement('style');
  style.textContent = `
    *{box-sizing:border-box}body{margin:0;background:#f2ede3;color:#413b35;font:16px/1.5 "Avenir Next",Avenir,sans-serif}
    .art-review{max-width:1140px;margin:auto;padding:48px}.eyebrow{font-size:11px;letter-spacing:.17em;font-weight:800;text-transform:uppercase;color:#7d5839}
    h1{font:normal 54px/1.05 Georgia,serif;letter-spacing:-.035em;margin:12px 0 20px}
    .intro{max-width:610px;color:#6b6154}.review-head{border-bottom:1px solid #c8bdab;padding-bottom:24px;margin-bottom:32px}
    .art-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
    figure{margin:0;min-width:0}.art-stage{display:grid;place-items:center;background:#e8e0d1;border:1px solid #c8bdab;border-radius:10px;padding:24px 12px;min-height:210px}
    .art-stage .first-use-illustration{width:280px}h2{font:normal 25px/1.25 Georgia,serif;margin:18px 0 8px}
    figcaption p{font-size:14px;margin:6px 0}.placement{font-size:11px!important;font-weight:700;letter-spacing:.06em;color:#766955}
    .section-label{margin:36px 0 14px;font-size:13px;font-weight:700}.dark .art-stage{background:#1e1930;color:#f6f3ff;border-color:#817696}
    .compact .art-stage{min-height:120px;padding:14px}.compact .first-use-illustration{width:120px}
    .mono .first-use-illustration{--illustration-paper:white;--illustration-wash:#eee;--illustration-accent:#ddd;--illustration-ink:black;color:black}
    .review-footer{margin-top:32px;border-top:1px solid #c8bdab;padding-top:16px;font-size:12px;color:#6b6154}
    @media(max-width:700px){.art-review{padding:20px}h1{font-size:40px}.art-cards{grid-template-columns:1fr;gap:28px}}
    @media(forced-colors:active){.art-stage{border-color:CanvasText}.first-use-illustration{--illustration-paper:Canvas!important;--illustration-wash:Canvas!important;--illustration-accent:Canvas!important;--illustration-ink:CanvasText!important;color:CanvasText!important}}
  `;
  document.head.append(style);
  const container = document.createElement('div');
  document.body.replaceChildren(container);
  flushSync(() => createRoot(container).render(<main className="art-review">
    <section id="collection">
      <header className="review-head">
        <p className="eyebrow">Dungeon Mapper / ART-07 / Original Folio illustrations</p>
        <h1>A little guidance.<br />A little adventure.</h1>
        <p className="intro">Three small companions for the quiet moments between maps. Warm paper, restrained color, and the same rounded linework as the interface.</p>
      </header>
      <div className="art-cards">{scenes.map(scene => <figure key={scene.id} id={`scene-${scene.id}`}>
        <div className="art-stage"><FirstUseIllustration scene={scene.id} /></div>
        <figcaption><p className="placement">{scene.placement}</p><h2>{scene.title}</h2><p>{scene.subtitle}</p></figcaption>
      </figure>)}</div>
    </section>
    <section id="dark">
      <h2 className="section-label">On the dark interface / full-size artwork</h2>
      <div className="art-cards dark">{scenes.map(scene => <div className="art-stage" key={scene.id}><FirstUseIllustration scene={scene.id} /></div>)}</div>
    </section>
    <section id="compact">
      <h2 className="section-label">At guidance size / 120 pixels</h2>
      <div className="art-cards compact dark">{scenes.map(scene => <div className="art-stage" key={scene.id}><FirstUseIllustration scene={scene.id} /></div>)}</div>
    </section>
    <section id="monochrome">
      <h2 className="section-label">Without color / print fallback</h2>
      <div className="art-cards mono">{scenes.map(scene => <div className="art-stage" key={scene.id}><FirstUseIllustration scene={scene.id} /></div>)}</div>
    </section>
    <p className="review-footer">Original path-only SVG / no project data, external assets or animation / AGPL-3.0-or-later.
      <br />Illustrations are decorative. Guidance, actions and warnings remain real text. Owner visual approval: September 15, 2026.</p>
  </main>));
}
