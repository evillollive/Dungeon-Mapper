import { useMemo, useRef, useState, useEffect } from 'react';
import type { CustomThemeDefinition, DungeonMap, DungeonProject, StampDef, ViewMode } from '../types/map';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { exportHighResPNG, exportMapSVG, exportProjectJSON } from '../utils/export';
import { DPI_OPTIONS, PAGE_PRESETS, planExport } from '../utils/exportPlan';
import { getThemeWithCustom } from '../utils/customThemes';
import { projectForAudience } from '../utils/audienceProjection';
import { loadExportAssets } from '../utils/exportAssets';
import ExportPreview from './ExportPreview';
import './ExportDialog.css';

export type ExportChoice = 'share' | 'share-svg' | 'backup' | 'print' | 'image' | 'image-svg';
type Intent = 'share' | 'backup' | 'print' | 'image';
const INTENTS: { id: Intent; title: string; detail: string }[] = [
  { id: 'share', title: 'Share with players', detail: 'Published content and current fog.' },
  { id: 'backup', title: 'Back up project', detail: 'Every level, editable and private.' },
  { id: 'print', title: 'Print for the table', detail: 'Physical grid scale and page planning.' },
  { id: 'image', title: 'Use in another map tool', detail: 'Grid-aligned image, not a VTT adapter.' },
];
const NO_THEMES: readonly CustomThemeDefinition[] = [];
const NO_STAMPS: readonly StampDef[] = [];

interface ExportDialogProps {
  map: DungeonMap;
  project?: DungeonProject;
  themeId: string;
  printMode: boolean;
  viewMode: ViewMode;
  initialChoice?: ExportChoice;
  onClose: () => void;
  feetPerCell?: number;
  customThemes?: readonly CustomThemeDefinition[];
  customStamps?: readonly StampDef[];
}

export default function ExportDialog({ map, project, themeId, printMode, viewMode,
  initialChoice = 'share', onClose, feetPerCell = 0, customThemes = NO_THEMES, customStamps = NO_STAMPS }: ExportDialogProps) {
  const focusTrap = useFocusTrap<HTMLDivElement>();
  const [intent, setIntent] = useState<Intent>(initialChoice.startsWith('share') ? 'share'
    : initialChoice.startsWith('image') ? 'image' : initialChoice === 'backup' ? 'backup' : 'print');
  const [format, setFormat] = useState(initialChoice.endsWith('svg') ? 'svg' : 'png');
  const [audience, setAudience] = useState<ViewMode>(viewMode);
  const [dpi, setDpi] = useState(150);
  const [pixels, setPixels] = useState(64);
  const [pageSize, setPageSize] = useState('letter');
  const [inches, setInches] = useState(1);
  const [margin, setMargin] = useState(0.5);
  const [overlap, setOverlap] = useState(0.25);
  const [monochrome, setMonochrome] = useState(printMode);
  const [scaleBar, setScaleBar] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const isPrint = intent === 'print';
  const isBackup = intent === 'backup';
  const exportView = intent === 'share' ? 'player' : audience;
  const outputFormat = isPrint ? 'png' : format;
  const options = useMemo(() => ({
    dpi: isPrint ? dpi : outputFormat === 'svg' ? map.meta.tileSize : pixels,
    pagePresetId: isPrint ? pageSize : 'none',
    inchesPerCell: isPrint ? inches : 1,
    marginInches: margin, overlapInches: overlap,
  }), [isPrint, dpi, outputFormat, map.meta.tileSize, pixels, pageSize, inches, margin, overlap]);
  const planning = useMemo(() => {
    try { return { plan: planExport(map.meta.width, map.meta.height, options), error: '' }; }
    catch (error) { return { plan: null, error: error instanceof Error ? error.message : 'Invalid export plan.' }; }
  }, [map.meta.width, map.meta.height, options]);
  const { plan } = planning;
  const selectedPage = Math.min(pageIndex, (plan?.pages ?? 1) - 1);
  const busy = progress !== null;
  const close = () => { controller.current?.abort(); onClose(); };
  useEffect(() => () => controller.current?.abort(), []);

  async function download(allPages: boolean) {
    if (controller.current) return;
    const job = new AbortController();
    controller.current = job;
    setError('');
    setMessage('');
    setProgress({ completed: 0, total: 1 });
    try {
      if (isBackup) {
        if (!project) throw new Error('The full project is unavailable. Open this dialog from the project editor.');
        exportProjectJSON(project);
      } else if (outputFormat === 'svg') {
        const projection = exportView === 'player' ? projectForAudience(map, customThemes, customStamps) : null;
        const assets = await loadExportAssets(projection?.map ?? map, projection?.customThemes ?? customThemes,
          projection?.customStamps ?? customStamps, job.signal);
        job.signal.throwIfAborted();
        exportMapSVG(map, getThemeWithCustom(themeId, customThemes), undefined,
          { viewMode: exportView, customThemes, customStamps, images: assets.images });
      } else {
        await exportHighResPNG(map, { ...options, themeId, viewMode: exportView,
          printMode: monochrome, customThemes, customStamps, feetPerCell: scaleBar && intent !== 'image' ? feetPerCell : 0,
          signal: job.signal, pageIndex: isPrint && !allPages ? selectedPage : undefined,
          onProgress: (completed, total) => setProgress({ completed, total }) });
      }
      setMessage('Download requested. Your project is unchanged. Check your browser downloads.');
    } catch (error) {
      if (job.signal.aborted) setMessage('Export cancelled. Completed downloads are kept; your project is unchanged.');
      else setError(error instanceof Error ? error.message : 'Export failed. Your project is unchanged.');
    } finally {
      controller.current = null;
      setProgress(null);
    }
  }

  return <div className="export-backdrop" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div ref={focusTrap} className="export-dialog" role="dialog" aria-modal="true" aria-label="Export"
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
      <header className="export-heading">
        <div><p className="export-eyebrow">TAKE YOUR MAP TO THE TABLE</p><h2>Export</h2>
          <p>Choose the purpose first. Review exactly what leaves this device.</p></div>
        <button type="button" onClick={close} aria-label="Close Export">Close</button>
      </header>
      <fieldset className="export-intents" disabled={busy}><legend>What would you like to do?</legend>
        {INTENTS.map((item, index) => <button key={item.id} type="button" aria-pressed={intent === item.id}
          onClick={() => { setIntent(item.id); setError(''); setMessage(''); }}>
          <span className="export-eyebrow">0{index + 1}</span><strong>{item.title}</strong><span>{item.detail}</span>
        </button>)}
      </fieldset>
      <div className="export-layout">
        <div>
          <p className={isBackup || exportView === 'gm' ? 'export-warning' : 'export-audience'}>
            <strong>{isBackup || exportView === 'gm' ? 'Private / DM content' : 'Player-facing content'}</strong><br />
            {isBackup ? 'Includes DM-only content, all levels, notes, custom assets and project settings. Never send this backup to players.'
              : exportView === 'gm' ? 'Includes DM-only content. Do not share this output with players.'
                : 'Uses Player preview publication and fog policy. Private note text, hidden objects and undiscovered secrets are excluded.'}
          </p>
          {!isBackup && <p>Review embedded artwork before sharing. Secrets drawn into an image cannot be automatically removed.</p>}
          {isBackup ? <div className="export-backup">
            <h3>Editable project JSON</h3>
            <p><strong>{project?.name ?? 'Project unavailable'}</strong></p>
            <p>{project?.levels.length ?? 0} levels, including reusable assets and stair links.</p>
            <p>Import this file to make an editable copy. Device recovery history and separate play-session records are not included.</p>
            <p>Local autosave is not a backup. Keep this file outside browser storage.</p>
          </div> : <fieldset className="export-fields" disabled={busy}><legend>Output settings</legend>
            {intent !== 'share' && <label>Audience<select aria-label="Audience" value={audience} onChange={e => setAudience(e.target.value === 'gm' ? 'gm' : 'player')}>
              <option value="player">Players (published content)</option><option value="gm">DM (private content)</option>
            </select></label>}
            {!isPrint && <label>Format<select aria-label="Format" value={format} onChange={e => setFormat(e.target.value)}>
              <option value="png">PNG image</option><option value="svg">SVG image</option>
            </select></label>}
            {!isPrint && outputFormat === 'png' && <label>Pixels per cell<select aria-label="Pixels per cell" value={pixels} onChange={e => setPixels(Number(e.target.value))}>
              {[16, 32, 64, 128, 256, 300].map(n => <option key={n} value={n}>{n} px</option>)}
            </select></label>}
            {isPrint && <>
              <label>Resolution (DPI)<select aria-label="Resolution (DPI)" value={dpi} onChange={e => setDpi(Number(e.target.value))}>
                {DPI_OPTIONS.map(n => <option key={n} value={n}>{n} DPI</option>)}
              </select></label>
              <label>Page size<select aria-label="Page size" value={pageSize} onChange={e => setPageSize(e.target.value)}>
                {PAGE_PRESETS.map(page => <option key={page.id} value={page.id}>{page.label}</option>)}
              </select></label>
              <label>Inches per cell<select aria-label="Inches per cell" value={inches} onChange={e => setInches(Number(e.target.value))}>
                {[0.5, 1, 1.5, 2].map(n => <option key={n} value={n}>{n} in</option>)}
              </select></label>
              <label>Page margin (in)<input type="number" min="0" max="2" step="0.125" value={margin} onChange={e => setMargin(e.target.valueAsNumber)} /></label>
              <label>Page overlap (in)<input type="number" min="0" max="2" step="0.125" value={overlap} onChange={e => setOverlap(e.target.valueAsNumber)} /></label>
            </>}
            {outputFormat === 'png' && <>
              <label className="export-check"><input type="checkbox" checked={monochrome} onChange={e => setMonochrome(e.target.checked)} />Ink-friendly map styling</label>
              {intent !== 'image' && feetPerCell > 0 && <label className="export-check"><input type="checkbox" checked={scaleBar}
                onChange={e => setScaleBar(e.target.checked)} />Scale bar ({feetPerCell} ft/cell)</label>}
            </>}
          </fieldset>}
          {!isBackup && <div className="export-summary">
            <h3>Current level only</h3>
            <p>{map.meta.width} x {map.meta.height} cells. Other levels are not included.</p>
            {plan && <>
              <p><strong>{plan.mapWidth.toLocaleString()} x {plan.mapHeight.toLocaleString()} px</strong>
                {' / '}{plan.tileSize} pixels per cell</p>
              <p><strong>{plan.pages} {plan.pages === 1 ? 'image' : 'pages'}</strong>
                {isPrint && ` (${plan.columns} columns x ${plan.rows} rows)`}</p>
              {isPrint && <p>{map.meta.width * inches} x {map.meta.height * inches} in map.
                {' '}Each file is {plan.pageWidth} x {plan.pageHeight} px at {dpi} DPI.
                Print at 100% / actual size, not fit to page. Margins are included; overlap repeats map edges for alignment.</p>}
            </>}
            {planning.error && <p role="alert">{planning.error}</p>}
            {intent === 'image' && <p>Align the image to the cell count above in your map tool. No native VTT metadata or integration is included.</p>}
            {isPrint && <p>Pages render one at a time. Your browser may require permission for multiple downloads; you can download individual pages instead.</p>}
          </div>}
        </div>
        {!isBackup && <section className="export-preview" aria-label="Output preview">
          <h3>{isPrint ? `Page ${selectedPage + 1} preview` : 'Audience preview'}</h3>
          <ExportPreview map={map} themeId={themeId} customThemes={customThemes} customStamps={customStamps}
            viewMode={exportView} printMode={monochrome} format={outputFormat} plan={plan}
            pageIndex={isPrint ? selectedPage : null} feetPerCell={scaleBar && intent !== 'image' ? feetPerCell : 0} />
          {isPrint && plan && <label>Preview / download page<select aria-label="Preview / download page" disabled={busy} value={selectedPage}
            onChange={e => setPageIndex(Number(e.target.value))}>
            {Array.from({ length: plan.pages }, (_, index) => <option key={index} value={index}>
              {index + 1}: row {Math.floor(index / plan.columns) + 1}, column {index % plan.columns + 1}
            </option>)}
          </select></label>}
          <p>Export renderer only. Selection handles, cursors and editor controls are never included.</p>
        </section>}
      </div>
      {error && <p className="export-warning" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <footer className="export-footer">
        {busy ? <><p role="status">Rendering {progress.completed} of {progress.total} images...</p>
          <button type="button" onClick={() => controller.current?.abort()}>Cancel export</button></>
          : <><button type="button" onClick={close}>Cancel</button>
            {isPrint && plan && plan.pages > 1 && <button type="button" onClick={() => void download(true)}>Download all {plan.pages} pages</button>}
            <button type="button" className="export-primary" disabled={isBackup ? !project : !plan} onClick={() => void download(false)}>
              {isBackup ? 'Download private backup' : isPrint ? `Download page ${selectedPage + 1}` : `Export ${outputFormat.toUpperCase()}`}
            </button></>}
      </footer>
    </div>
  </div>;
}
