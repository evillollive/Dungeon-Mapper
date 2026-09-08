import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DungeonProject } from '../types/map';
import { buildThemeList } from '../utils/customThemes';
import { GENERATOR_LIST } from '../utils/generators';
import { PREMADE_MAP_SUMMARIES } from '../utils/premadeMaps';
import { CREATION_LIMITS, createProjectCandidate, readTraceImage, renderCreationPreviews } from '../utils/projectCreation';
import type { ProjectCreationOptions, TraceImage } from '../utils/projectCreation';
import './CreateProjectDialog.css';

export interface CreateProjectDialogProps {
  onCancel: () => void;
  /** Return true when accepted; false keeps the preview available for retry. */
  onCreate: (project: DungeonProject) => boolean;
  /** Reusable libraries for blank, generated, and traced projects. Never mutated. */
  sourceProject?: DungeonProject;
  /** Starting selection on mount. Defaults to the ready-to-play sample flow. */
  initialPath?: ProjectCreationOptions['path'];
}

type CreationPath = ProjectCreationOptions['path'];
const PATHS: { id: CreationPath; title: string; detail: string }[] = [
  { id: 'sample', title: 'Ready to play', detail: 'A complete encounter, ready to explore.' },
  { id: 'generator', title: 'Generate a map', detail: 'Shape a new place from a repeatable seed.' },
  { id: 'blank', title: 'Start blank', detail: 'Your idea. A clean grid. Room to build.' },
  { id: 'trace', title: 'Trace an image', detail: 'Bring a local reference and draw over it.' },
];

function failure(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function CandidatePreview({ project, onBack, onCreate }: {
  project: DungeonProject;
  onBack: () => void;
  onCreate: CreateProjectDialogProps['onCreate'];
}) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [createError, setCreateError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const accepting = useRef(false);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    void renderCreationPreviews(project, controller.signal).then(
      images => { if (!controller.signal.aborted) setPreviews(images); },
      reason => { if (!controller.signal.aborted) setError(failure(reason)); },
    );
    return () => controller.abort();
  }, [project, attempt]);
  const level = project.levels[levelIndex];
  const retry = () => { setError(''); setPreviews([]); setAttempt(value => value + 1); };
  const useMap = () => {
    if (accepting.current || previews.length !== project.levels.length || error) return;
    accepting.current = true;
    setCreateError('');
    try {
      // A failed parent attempt must not mutate the preview or its next retry.
      if (onCreate(structuredClone(project))) { setAccepted(true); return; }
      setCreateError('Your map was not opened. The preview is still here. Resolve any editor warning, then try again.');
    } catch {
      setCreateError('Your map could not be opened. The preview is still here. Please try again.');
    }
    accepting.current = false;
  };
  return (
    <section className="creation-preview" aria-label="Map preview">
      <div className="creation-preview-heading">
        <div>
          <p className="creation-eyebrow">02 / Preview your map</p>
          <h3 ref={heading} tabIndex={-1}>{project.name}</h3>
          <p>{level.meta.width} × {level.meta.height} tiles · {project.levels.length} {project.levels.length === 1 ? 'level' : 'levels'} · Full map, GM view</p>
        </div>
        <button type="button" onClick={onBack} disabled={accepted}>Back to options</button>
      </div>
      {project.levels.length > 1 && <label>Preview level
        <select value={levelIndex} onChange={event => setLevelIndex(Number(event.target.value))}>
          {project.levels.map((map, index) => <option key={index} value={index}>{index + 1}. {map.meta.name}</option>)}
        </select>
      </label>}
      {level.backgroundImage && <p className="creation-notice">Reference alignment preview: the full image fits inside the grid, centered without stretching. You can adjust alignment in the editor.</p>}
      <div className="creation-preview-stage" aria-busy={!error && !previews.length}>
        {error ? <div role="alert"><p>Preview unavailable. {error}</p><button type="button" onClick={retry}>Retry preview</button></div>
          : previews[levelIndex] ? <img src={previews[levelIndex]} alt={`Full map preview of ${level.meta.name}, ${level.meta.width} by ${level.meta.height} tiles`} onError={() => setError('The preview image could not be displayed.')} />
            : <p role="status">Rendering your map preview...</p>}
      </div>
      {createError && <p className="creation-error" role="alert">{createError}</p>}
      {accepted && <p role="status">Map accepted. Opening your new project...</p>}
      <div className="creation-preview-footer">
        <p>A new project, not a replacement. Your current map stays unchanged.</p>
        <button type="button" className="creation-primary" onClick={useMap} disabled={accepted || !!error || previews.length !== project.levels.length}>Use this map</button>
      </div>
    </section>
  );
}

export default function CreateProjectDialog({ onCancel, onCreate, sourceProject, initialPath = 'sample' }: CreateProjectDialogProps) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(onCancel);
  const uploadController = useRef<AbortController | null>(null);
  const [path, setPath] = useState<CreationPath>(initialPath);
  const [sampleId, setSampleId] = useState(PREMADE_MAP_SUMMARIES[0].id);
  const [name, setName] = useState('My next adventure');
  const [width, setWidth] = useState('40');
  const [height, setHeight] = useState('30');
  const [themeId, setThemeId] = useState('dungeon');
  const [density, setDensity] = useState('1');
  const [seed, setSeed] = useState('first-adventure');
  const [algorithm, setAlgorithm] = useState('');
  const [image, setImage] = useState<TraceImage | null>(null);
  const [opacity, setOpacity] = useState('0.5');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [candidate, setCandidate] = useState<DungeonProject | null>(null);
  const optionsHeading = useRef<HTMLHeadingElement>(null);
  const themes = buildThemeList(sourceProject?.customThemes);

  useEffect(() => { cancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => {
    const root = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () => Array.from(root.querySelectorAll<HTMLElement>('button, input, select, summary, [tabindex="0"]'))
      .filter(node => !node.matches(':disabled') && !node.closest('[hidden]') && !Array.from(root.querySelectorAll('details:not([open])')).some(details => details.contains(node) && node !== details.querySelector('summary')));
    controls()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        uploadController.current?.abort();
        cancelRef.current();
      }
      if (event.key === 'Tab') {
        const nodes = controls();
        const current = nodes.indexOf(document.activeElement as HTMLElement);
        const next = current < 0 ? (event.shiftKey ? nodes.length - 1 : 0)
          : (current + (event.shiftKey ? -1 : 1) + nodes.length) % nodes.length;
        event.preventDefault();
        nodes[next]?.focus();
      }
    };
    const focusin = (event: FocusEvent) => { if (!root.contains(event.target as Node)) controls()[0]?.focus(); };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focusin);
    return () => {
      uploadController.current?.abort();
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', focusin);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const cancel = () => { uploadController.current?.abort(); onCancel(); };
  const changePath = (next: CreationPath) => {
    uploadController.current?.abort();
    setUploading(false);
    setError('');
    setPath(next);
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    uploadController.current?.abort();
    const controller = new AbortController();
    uploadController.current = controller;
    setImage(null);
    setError('');
    setUploading(true);
    try {
      const loaded = await readTraceImage(file, controller.signal);
      if (!controller.signal.aborted) setImage(loaded);
    } catch (reason) {
      if (!controller.signal.aborted) setError(failure(reason));
    } finally {
      if (!controller.signal.aborted) setUploading(false);
    }
  };
  const preview = () => {
    setError('');
    try {
      const common = { name, width: Number(width), height: Number(height), themeId };
      let options: ProjectCreationOptions;
      if (path === 'sample') options = { path, sampleId };
      else if (path === 'generator') options = { ...common, path, density: Number(density), seed, algorithm: algorithm || undefined };
      else if (path === 'trace') {
        if (!image || uploading) throw new Error('Choose an image and wait for it to finish loading.');
        options = { ...common, path, image, opacity: Number(opacity) };
      } else options = { ...common, path };
      setCandidate(createProjectCandidate(options, sourceProject));
    } catch (reason) { setError(failure(reason)); }
  };
  const selectedSample = PREMADE_MAP_SUMMARIES.find(sample => sample.id === sampleId)!;
  return createPortal(
    <div className="creation-overlay">
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} className="creation-dialog">
        <header className="creation-header">
          <div><p className="creation-eyebrow">Dungeon Mapper / New project</p><h2 id={`${id}-title`}>Make room for adventure.</h2>
            <p id={`${id}-description`}>Choose a starting point. Preview it here before opening a new project.</p></div>
          <button type="button" onClick={cancel}>Cancel</button>
        </header>
        {candidate ? <CandidatePreview project={candidate} onCreate={onCreate} onBack={() => {
          setCandidate(null);
          requestAnimationFrame(() => optionsHeading.current?.focus());
        }} /> : <>
          <h3 className="creation-step" tabIndex={-1} ref={optionsHeading}>01 / Choose your starting point</h3>
          <div className="creation-paths" role="group" aria-label="Starting point">
            {PATHS.map((item, index) => <button type="button" key={item.id} aria-label={item.title} aria-describedby={`${id}-${item.id}-detail`} aria-pressed={path === item.id} onClick={() => changePath(item.id)}>
              <span className="creation-path-number" aria-hidden="true">0{index + 1}</span><strong>{item.title}</strong><span id={`${id}-${item.id}-detail`}>{item.detail}</span>
            </button>)}
          </div>
          <form className="creation-options" onSubmit={event => { event.preventDefault(); preview(); }}>
            {path === 'sample' ? <div className="creation-sample">
              <label>Ready-to-play sample<select value={sampleId} onChange={event => setSampleId(event.target.value)}>
                {PREMADE_MAP_SUMMARIES.map(sample => <option key={sample.id} value={sample.id}>{sample.name}</option>)}
              </select></label>
              <div><p className="creation-eyebrow">{selectedSample.themeLabel} / {selectedSample.archetype}</p><h3>{selectedSample.name}</h3>
                <p>{selectedSample.description}</p><p className="creation-muted">{selectedSample.sizeLabel} tiles · {selectedSample.levelCount} {selectedSample.levelCount === 1 ? 'level' : 'levels'} · Includes encounter content</p></div>
            </div> : <>
              <div className="creation-field-grid">
                <label>Project name<input value={name} onChange={event => setName(event.target.value)} maxLength={100} required /></label>
                <label>Environment / theme<select value={themeId} onChange={event => setThemeId(event.target.value)}>
                  {themes.map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
                </select></label>
                {path === 'generator' ? <>
                  <label>Map size<select value={`${width}x${height}`} onChange={event => { const [w, h] = event.target.value.split('x'); setWidth(w); setHeight(h); }}>
                    {!['24x18', '40x30', '64x48'].includes(`${width}x${height}`) && <option value={`${width}x${height}`}>Custom: {width} × {height}</option>}
                    <option value="24x18">Small: 24 × 18</option><option value="40x30">Medium: 40 × 30</option><option value="64x48">Large: 64 × 48</option>
                  </select></label>
                  <label>Complexity<select value={density} onChange={event => setDensity(event.target.value)}>
                    <option value="0.65">Simple: room to breathe</option><option value="1">Balanced: a little of everything</option><option value="1.4">Dense: more to explore</option>
                  </select></label>
                </> : <>
                  <label>Width (tiles)<input type="number" min={CREATION_LIMITS.minDimension} max={CREATION_LIMITS.maxDimension} step={1} required value={width} onChange={event => setWidth(event.target.value)} /></label>
                  <label>Height (tiles)<input type="number" min={CREATION_LIMITS.minDimension} max={CREATION_LIMITS.maxDimension} step={1} required value={height} onChange={event => setHeight(event.target.value)} /></label>
                </>}
              </div>
              {path === 'generator' && <details className="creation-advanced"><summary>Advanced: seed and algorithm</summary>
                <div className="creation-field-grid"><label>Seed<input value={seed} onChange={event => setSeed(event.target.value)} maxLength={200} aria-describedby={`${id}-seed-help`} /></label>
                  <label>Algorithm<select value={algorithm} onChange={event => setAlgorithm(event.target.value)}><option value="">Recommended for environment</option>
                    {GENERATOR_LIST.map(generator => <option key={generator.id} value={generator.id}>{generator.name}</option>)}
                  </select></label></div>
                <p id={`${id}-seed-help`}>The same seed and settings produce the same map. An empty seed uses “first-adventure”. More generation controls remain available in the editor.</p>
              </details>}
              {path === 'trace' && <div className="creation-trace">
                <label>Background image<input type="file" accept="image/png,image/jpeg,image/webp" aria-describedby={`${id}-image-help`} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} /></label>
                <p id={`${id}-image-help`}>Local PNG, JPEG, or WebP. Up to 10 MB and 24 megapixels. The image stays in your project, with no upload to a server.</p>
                {uploading && <p role="status">Reading your image...</p>}
                {image && <p role="status">Image ready: {image.width} × {image.height} pixels. Centered to fit the entire grid.</p>}
                <label>Image opacity: {Math.round(Number(opacity) * 100)}%<input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={event => setOpacity(event.target.value)} /></label>
              </div>}
            </>}
            {error && <p role="alert" className="creation-error">{error}</p>}
            <footer className="creation-options-footer"><p>No changes to your editor until you choose Use this map.</p>
              <button type="submit" className="creation-primary" disabled={uploading || (path === 'trace' && !image)}>Preview map</button></footer>
          </form>
        </>}
      </div>
    </div>, document.body,
  );
}
