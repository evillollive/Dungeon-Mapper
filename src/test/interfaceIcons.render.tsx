import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import Icon, { type IconName } from '../components/Icon';
import '../design-tokens.css';
import '../editor-shell.css';

const groups: { title: string; icons: IconName[] }[] = [
  { title: '01 / Find your way', icons: ['library', 'create', 'import', 'image', 'build', 'decorate', 'look', 'levels'] },
  { title: '02 / Set the table', icons: ['tactical', 'notes', 'encounter', 'hidden', 'display', 'play', 'pause', 'info'] },
  { title: '03 / Keep your work', icons: ['save', 'saved', 'warning', 'offline', 'export', 'print', 'copy', 'refresh'] },
  { title: '04 / Everyday controls', icons: ['menu', 'close', 'search', 'settings', 'undo', 'redo', 'help', 'delete'] },
];
const labels: Record<IconName, string> = {
  library: 'Your maps', create: 'Create', import: 'Import', image: 'Image / sample',
  build: 'Build / edit', decorate: 'Decorate / generate', look: 'Look / visibility', levels: 'Levels',
  tactical: 'Fog & sight', notes: 'Notes', encounter: 'Encounter', hidden: 'Private / hidden',
  display: 'Player display', play: 'Start / resume', pause: 'Pause / blank', info: 'Information',
  save: 'Save / backup', saved: 'Saved / confirmed', warning: 'Needs attention', offline: 'Offline',
  export: 'Export / download', print: 'Print', copy: 'Copy / template', refresh: 'Retry / update',
  menu: 'Menu', close: 'Close / cancel', search: 'Search / commands', settings: 'Settings',
  undo: 'Undo', redo: 'Redo', help: 'Help', delete: 'Delete',
};

export function showIconReview() {
  document.title = 'Dungeon Mapper / interface icon review';
  const style = document.createElement('style');
  style.textContent = `
    *{box-sizing:border-box}body{margin:0;background:#efeadf;color:#292821;font:16px/1.5 "Avenir Next",Avenir,sans-serif}
    .icon-review{max-width:1180px;margin:auto;padding:48px}
    .review-kicker{font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#76552e}
    .review-heading{display:flex;align-items:end;justify-content:space-between;gap:24px;border-bottom:1px solid #b7ac97;padding-bottom:24px}
    h1{font:normal 52px/1.05 Georgia,serif;letter-spacing:-.03em;margin:12px 0}h2{font-size:14px;letter-spacing:.08em;margin:32px 0 14px}
    p{margin:8px 0}.review-note{max-width:540px;color:#595348}.review-count{font:64px/1 Georgia,serif;color:#91623f}
    .review-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:#c9bfad;border:1px solid #c9bfad}
    .review-card{padding:20px;background:#faf7ee}.review-card h3{font-size:13px;margin:16px 0 0;font-weight:600}
    .review-sizes{display:flex;flex-wrap:wrap;align-items:end;gap:24px;min-height:56px;font-size:16px}
    .review-size{display:grid;justify-items:center;gap:8px}.review-size small{font-size:10px;color:#6d6558}
    .review-footer{margin-top:28px;border-top:1px solid #b7ac97;padding-top:14px;font-size:12px;color:#595348}
    .review-states{margin-top:40px;background:var(--surface-base);color:var(--text-primary);padding:24px;border-radius:8px}
    .review-states h2{margin-top:0}.review-state-row{display:grid;grid-template-columns:1fr repeat(4,minmax(0,1fr));align-items:center;gap:12px;margin:12px 0}
    .review-state-row>span{font-size:13px}.review-state-row button{font-size:16px;min-height:44px;justify-content:center}
    .review-state-row .is-focus{outline:3px solid var(--focus);outline-offset:2px}
    .review-state-row button:disabled{color:var(--text-secondary);opacity:.65}
    .review-state-head{font-size:11px;color:var(--text-secondary)}
    @media(max-width:700px){.icon-review{padding:20px}.review-grid{grid-template-columns:repeat(2,minmax(0,1fr))}h1{font-size:38px}
    .review-sizes{gap:16px}.review-state-row{grid-template-columns:1fr 1fr}.review-state-head{display:none}}
    @media(forced-colors:active){.review-card,.review-grid,.review-states{border:1px solid CanvasText}.review-state-row button:disabled{opacity:1;color:GrayText}
    .review-state-row .is-focus{outline-color:Highlight}.review-state-row button[aria-pressed=true]{outline:2px solid Highlight}}
  `;
  document.head.append(style);
  const container = document.createElement('div');
  document.body.replaceChildren(container);
  flushSync(() => createRoot(container).render(<main className="icon-review">
    <section id="catalog">
      <header className="review-heading">
        <div><p className="review-kicker">Dungeon Mapper / ART-01 / Original vector artwork</p>
          <h1>Small marks.<br />Clear intentions.</h1>
          <p className="review-note">One rounded line family for making maps, running sessions and keeping work safe. Always paired with a control name.</p>
        </div>
        <div><div className="review-count">32</div><p className="review-kicker">Interface icons</p></div>
      </header>
      {groups.map(group => <section key={group.title}>
        <h2>{group.title}</h2>
        <div className="review-grid">{group.icons.map(name => <article className="review-card" key={name} id={`icon-${name}`} data-name={name}>
          <div className="review-sizes">{([16, 20, 24] as const).map(size => <div className="review-size" key={size}>
            <Icon name={name} size={size} /><small>{size} px</small>
          </div>)}</div>
          <h3>{labels[name]}</h3>
        </article>)}</div>
      </section>)}
      <p className="review-footer">24-unit viewBox / 1.6-unit stroke / currentColor / no fonts, image requests or animation.
        <br />Original Dungeon Mapper artwork, AGPL-3.0-or-later. Family approved; requested player-display P revision shown for review.</p>
    </section>
    <section id="states" className="review-states" aria-label="Icon control states">
      <h2>Same artwork. Every state.</h2>
      <p>Icons inherit the control color and text scale. Selection and focus keep independent outlines.</p>
      <div className="review-state-row review-state-head"><span>Control</span><span>Default</span><span>Selected</span><span>Disabled</span><span>Focus treatment</span></div>
      {groups.flatMap(group => group.icons).map(name => <div className="review-state-row" key={name}>
        <span>{labels[name]}</span>
        <button className="action-button" aria-label={`${labels[name]} default`}><Icon name={name} /></button>
        <button className="action-button" aria-pressed="true" aria-label={`${labels[name]} selected`}><Icon name={name} /></button>
        <button className="action-button" disabled aria-label={`${labels[name]} disabled`}><Icon name={name} /></button>
        <button className="action-button is-focus" aria-label={`${labels[name]} focus treatment`}><Icon name={name} /></button>
      </div>)}
    </section>
  </main>));
}
