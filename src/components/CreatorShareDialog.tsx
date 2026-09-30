import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DungeonProject } from '../types/map';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { prepareCreatorProject, type CreatorLevelSelection } from '../utils/creatorProject';
import { prepareCreatorPackage, type CreatorPackageOptions, type PreparedCreatorPackage } from '../utils/creatorPackage';
import {
  creatorLicenseChoices, readCreatorProvenance, type CreatorAssetCredit, type CreatorCredit,
  type CreatorLicense,
} from '../utils/creatorProvenance';
import { encodeCreatorZip } from '../utils/creatorZip';
import { creatorSHA256, type CreatorPackageFile } from '../utils/creatorPackageFormat';
import './CreatorShareDialog.css';

function failure(error: unknown): string {
  return error instanceof Error ? error.message : 'Creator sharing failed. Your original project is unchanged.';
}
export function CreatorPreviewImages({ files, onError }: { files: readonly CreatorPackageFile[]; onError?: (message: string) => void }) {
  const [error, setError] = useState('');
  return <div className="creator-previews">
    {error && <p role="alert">{error}</p>}
    {files.filter(file => /^preview(?:-\d+)?\.png$/.test(file.path)).map((file, index) => <figure key={file.path}>
      <CreatorPreviewImage file={file} index={index} onError={() => {
          const message = 'A creator preview could not be displayed. Inspect the package before sharing.';
          setError(message); onError?.(message);
        }} />
      <figcaption>Level {index + 1} / author-facing preview</figcaption>
    </figure>)}
  </div>;
}

function CreatorPreviewImage({ file, index, onError }: { file: CreatorPackageFile; index: number; onError: () => void }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([file.bytes], { type: 'image/png' }));
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <img ref={ref} alt={`Creator copy, level ${index + 1}. Full layout and selected spoilers.`} onError={onError} />;
}

function CreditFields({ value, onChange, inherited = false }: {
  value: CreatorCredit; onChange: (value: CreatorCredit) => void; inherited?: boolean;
}) {
  return <fieldset disabled={inherited} className="creator-credit"><legend>{inherited ? 'Retained source notice' : 'Source attribution'}</legend>
    <label>Source title<input value={value.title} onChange={event => onChange({ ...value, title: event.target.value })} required maxLength={200} /></label>
    <label>Original creator<input value={value.author} onChange={event => onChange({ ...value, author: event.target.value })} required maxLength={200} /></label>
    <label>Source license<input value={value.license} onChange={event => onChange({ ...value, license: event.target.value })} required placeholder="CC-BY-4.0, CC-BY-SA-4.0, AGPL-3.0-or-later..." maxLength={200} /></label>
    <label>Source URL (optional)<input type="url" value={value.url ?? ''} onChange={event => onChange({ ...value, url: event.target.value })} placeholder="https://..." /></label>
    <label>Required notice (optional)<textarea value={value.notice ?? ''} onChange={event => onChange({ ...value, notice: event.target.value })} maxLength={16_384} /></label>
  </fieldset>;
}
type Selectable = 'notes' | 'tokens' | 'hiddenStamps' | 'annotations' | 'markers' | 'lightLabels';
const emptyCredit = (): CreatorCredit => ({ title: '', author: '', license: '' });

export default function CreatorShareDialog({ project, onClose }: { project: DungeonProject; onClose: () => void }) {
  const [source] = useState(() => structuredClone(project));
  const [options, setOptions] = useState<Omit<CreatorPackageOptions, 'license'>>({
    profile: 'layout', title: '', author: '', description: '', packageId: 'shared-map', contentVersion: '1.0.0',
    levels: source.levels.map((_, index) => ({ index, name: `Level ${index + 1}` })),
    assetCredits: [], rightsConfirmed: false, sources: [],
  });
  const [license, setLicense] = useState<CreatorLicense | ''>('');
  const [step, setStep] = useState<'selection' | 'rights' | 'review'>('selection');
  const [assets, setAssets] = useState<CreatorAssetCredit[]>([]);
  const [lockedAssets, setLockedAssets] = useState<Set<string>>(new Set());
  const [prepared, setPrepared] = useState<PreparedCreatorPackage | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [omissionPage, setOmissionPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const downloadURLs = useRef(new Set<string>());
  const downloads = useRef(new Set<ReturnType<typeof setTimeout>>());
  const id = useId();
  const close = () => { controller.current?.abort(); onClose(); };
  const trap = useFocusTrap<HTMLDivElement>({ onEscape: close });
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    const urls = downloadURLs.current, timers = downloads.current;
    return () => {
      controller.current?.abort();
      timers.forEach(timer => clearTimeout(timer));
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);
  const provenance = useMemo(() => {
    try {
      const inherited = readCreatorProvenance(source.creatorProvenance);
      for (const level of options.levels) {
        const current = readCreatorProvenance(source.levels[level.index].creatorProvenance);
        inherited.mapSources.push(...current.mapSources);
        inherited.assetCredits.push(...current.assetCredits);
      }
      return { inherited, choices: creatorLicenseChoices([...inherited.mapSources, ...(options.sources ?? [])]), error: '' };
    } catch (error) { return { inherited: null, choices: [], error: failure(error) }; }
  }, [source, options]);
  const update = <Key extends keyof typeof options>(key: Key, value: typeof options[Key]) => {
    setOptions(previous => ({ ...previous, [key]: value }));
    setError(''); setMessage(''); setPrepared(null); setAccepted(false);
  };
  const levelChange = (index: number, patch: Partial<CreatorLevelSelection>) => {
    update('levels', options.levels.map(level => level.index === index ? { ...level, ...patch } : level));
  };
  const choose = (index: number, key: Selectable, entity: number, checked: boolean) => {
    const current = options.levels.find(level => level.index === index)?.[key] ?? [];
    levelChange(index, { [key]: checked ? [...current, entity] : current.filter(id => id !== entity) });
  };
  const settings = (): CreatorPackageOptions => {
    if (!license) throw new Error('Choose a license explicitly; none is preselected.');
    return { ...options, license, assetCredits: assets };
  };
  const reviewRights = () => {
    try {
      const draft = prepareCreatorProject(source, settings());
      const inherited = draft.provenance.assetCredits;
      const locked = new Set<string>();
      setAssets(draft.assetsRequiringReview.map(asset => {
        const known = inherited.filter(credit => credit.key === asset.key);
        if (known.length && known.some(credit => JSON.stringify(credit) !== JSON.stringify(known[0]))) throw new Error('Conflicting inherited asset notices need review before sharing.');
        if (known.length) { locked.add(asset.key); return { ...known[0] }; }
        return assets.find(credit => credit.key === asset.key) ?? { ...emptyCredit(), key: asset.key };
      }));
      setLockedAssets(locked);
      setError(''); setStep('rights'); update('rightsConfirmed', false);
    } catch (error) { setError(failure(error)); }
  };
  const run = async (action: (signal: AbortSignal) => Promise<void>) => {
    if (controller.current) return;
    const job = new AbortController();
    controller.current = job;
    setBusy(true); setCancelling(false); setError(''); setMessage('');
    try { await action(job.signal); }
    catch (error) {
      if (job.signal.aborted) setMessage('Sharing preparation cancelled. Your original project is unchanged.');
      else setError(failure(error));
    } finally {
      controller.current = null; setBusy(false); setCancelling(false);
    }
  };
  const build = () => run(async signal => {
    const result = await prepareCreatorPackage(source, settings(), signal);
    signal.throwIfAborted();
    setPrepared(result); setAccepted(false); setOmissionPage(0); setStep('review');
  });
  const download = () => run(async signal => {
    if (!prepared || !accepted) throw new Error('Review and acknowledge the exact package first.');
    const bytes = await encodeCreatorZip(prepared.manifest.packageId, prepared.files, signal);
    const hash = await creatorSHA256(bytes);
    signal.throwIfAborted();
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
    downloadURLs.current.add(url);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${prepared.manifest.packageId}-${prepared.manifest.contentVersion}.zip`;
    anchor.click();
    const timer = setTimeout(() => { URL.revokeObjectURL(url); downloadURLs.current.delete(url); downloads.current.delete(timer); }, 1000);
    downloads.current.add(timer);
    setMessage(`Download requested. Nothing was uploaded. ZIP SHA-256: ${hash}`);
  });
  return createPortal(<div className="creator-backdrop">
    <div className="creator-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} ref={trap}>
      <header className="creator-heading">
        <div><p className="creator-eyebrow">CREATOR EDITION / LOCAL COPY</p><h2 id={`${id}-title`} ref={heading} tabIndex={-1}>Share a creator copy</h2></div>
        <button onClick={close} aria-label="Close creator sharing">Close</button>
      </header>
      <p className="creator-warning"><strong>For map authors, not players.</strong> Full geometry can reveal secret passages and hazards.
        DM encounter copies can also include private notes and hidden entities. This is not a private backup.</p>
      <p>Working from the copy captured when this dialog opened. Your original project stays unchanged. No account connection or automatic upload.</p>
      {error && <p role="alert" className="creator-error">{error}</p>}
      {message && <p role="status" className="creator-message">{message}</p>}
      {busy && <p role="status">{cancelling ? 'Cancellation requested. Waiting for the current operation to finish.' : 'Preparing the reviewed copy. Settings are locked until cleanup finishes.'}</p>}
      {step === 'selection' && <form onSubmit={event => { event.preventDefault(); reviewRights(); }}>
        <fieldset disabled={busy}><legend>01 / Choose exactly what leaves the project</legend>
          <div className="creator-two-column">
            <label>Publication title<input value={options.title} onChange={event => update('title', event.target.value)} required maxLength={200} /></label>
            <label>Your creator credit<input value={options.author} onChange={event => update('author', event.target.value)} required maxLength={200} /></label>
            <label>Package ID<input value={options.packageId} onChange={event => update('packageId', event.target.value)} required pattern="[a-z0-9][a-z0-9-]{0,63}" /></label>
            <label>Content version<input value={options.contentVersion} onChange={event => update('contentVersion', event.target.value)} required /></label>
          </div>
          <label>Public description<textarea value={options.description} onChange={event => update('description', event.target.value)} maxLength={16_384} /></label>
          <label>Sharing profile<select value={options.profile} onChange={event => {
            const profile = event.target.value === 'encounter' ? 'encounter' : 'layout';
            setOptions(previous => ({ ...previous, profile,
              levels: previous.levels.map(({ index, name, background }) => ({ index, name, background })) }));
            setError('');
          }}><option value="layout">Map layout</option><option value="encounter">DM encounter</option></select></label>
          {source.levels.map((map, index) => {
            const level = options.levels.find(level => level.index === index);
            const group = (key: Selectable, title: string, items: { id: number; text: string }[]) => items.length > 0 && <details>
              <summary>{title}: {level?.[key]?.length ?? 0} of {items.length} included</summary>
              {items.map(item => <label className="creator-check" key={item.id}>
                <input type="checkbox" checked={level?.[key]?.includes(item.id) ?? false} onChange={event => choose(index, key, item.id, event.target.checked)} />
                <span>{item.text}</span></label>)}
            </details>;
            return <fieldset key={index} className="creator-level"><legend>Source level {index + 1}: {map.meta.name}</legend>
              <label className="creator-check"><input type="checkbox" checked={!!level} onChange={event => update('levels',
                event.target.checked ? [...options.levels, { index, name: `Level ${index + 1}` }] : options.levels.filter(level => level.index !== index))} />Include this level</label>
              {level && <>
                <label>Shared level name<input value={level.name} onChange={event => levelChange(index, { name: event.target.value })} required maxLength={200} /></label>
                <p>{map.meta.width} x {map.meta.height} cells. Visible furnishings, authored geometry and visual settings are included.</p>
                {map.backgroundImage && <label className="creator-check"><input type="checkbox" checked={level.background ?? false}
                  onChange={event => levelChange(index, { background: event.target.checked })} />Include the background image, subject to rights and metadata review</label>}
                {options.profile === 'layout' ? <p>No notes, tokens, hidden furnishings, annotations or encounter markers are included.</p> : <>
                  {group('notes', 'DM notes', map.notes.map(note => ({ id: note.id, text: `${note.label}: ${note.description}\nPublic label/text: ${note.publicLabel ?? ''} ${note.publicDescription ?? ''}` })))}
                  {group('tokens', 'Tokens', (map.tokens ?? []).map(token => ({ id: token.id, text: `${token.kind}: ${token.label}${token.hidden ? ' (hidden)' : ''}` })))}
                  {group('hiddenStamps', 'Hidden furnishings', (map.stamps ?? []).filter(stamp => stamp.hidden).map(stamp => ({ id: stamp.id, text: `${stamp.stampId} at ${stamp.x}, ${stamp.y}` })))}
                  {group('annotations', 'Freehand annotations', (map.annotations ?? []).map(stroke => ({ id: stroke.id, text: `${stroke.kind} annotation ${stroke.id}, ${stroke.points.length} points` })))}
                  {group('markers', 'Area markers', (map.markers ?? []).map(marker => ({ id: marker.id, text: `${marker.shape} at ${marker.x}, ${marker.y}` })))}
                  {group('lightLabels', 'Original light labels', (map.lightSources ?? []).map(light => ({ id: light.id, text: light.label })))}
                </>}
              </>}
            </fieldset>;
          })}
          <label className="creator-check"><input type="checkbox" checked={options.omitCrossLevelLinks ?? false}
            onChange={event => update('omitCrossLevelLinks', event.target.checked)} />Explicitly omit stair links to levels I did not select</label>
          <h3>Inherited map sources</h3>
          <p>Existing source notices stay attached. Add sources for older imported or adapted maps that do not yet carry provenance. Missing metadata is not proof of ownership.</p>
          {provenance.inherited?.mapSources.map((credit, index) => <CreditFields key={`inherited-${index}`} value={credit} onChange={() => {}} inherited />)}
          {(options.sources ?? []).map((credit, index) => <div key={index}><CreditFields value={credit} onChange={value => update('sources',
            options.sources?.map((credit, i) => i === index ? value : credit))} />
            <button type="button" onClick={() => update('sources', options.sources?.filter((_, i) => i !== index))}>Remove added source {index + 1}</button></div>)}
          <button type="button" onClick={() => update('sources', [...(options.sources ?? []), emptyCredit()])}>Add inherited map source</button>
          {provenance.error && <p role="alert" className="creator-error">{provenance.error}</p>}
          <label>Contribution license<select value={license} onChange={event => setLicense(event.target.value as CreatorLicense | '')} required>
            <option value="">Choose explicitly</option>
            {provenance.choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}
          </select></label>
          <p>CC BY requires credit; CC BY-SA also keeps shared adaptations under share-alike terms. Both allow commercial reuse.
            Inherited AGPL content keeps AGPL. Existing asset licenses do not change.</p>
          <button className="creator-primary" disabled={!!provenance.error || !options.levels.length}>Review rights and assets</button>
        </fieldset>
      </form>}
      {step === 'rights' && <form onSubmit={event => { event.preventDefault(); void build(); }}>
        <fieldset disabled={busy}><legend>02 / Credit the work and inspect the source</legend>
          <p>Every included custom asset needs a source record. Existing notices are retained. Keep mandatory source offers and notices in the notice field.
            If rights are unknown or incompatible, go back and remove or replace that content in a separate copy.</p>
          {assets.length === 0 && <p>No custom assets need additional declarations. Built-in notices will be included.</p>}
          {assets.map((asset, index) => <section key={asset.key}><h3>{asset.key}</h3><CreditFields value={asset} inherited={lockedAssets.has(asset.key)}
            onChange={value => setAssets(previous => previous.map((item, i) => i === index ? { ...value, key: asset.key } : item))} /></section>)}
          <label className="creator-check"><input type="checkbox" checked={options.rightsConfirmed}
            onChange={event => update('rightsConfirmed', event.target.checked)} required />
            <span>I have declared inherited sources, confirmed redistribution rights and reviewed image metadata and embedded text.
              I understand the contribution license does not replace component licenses.</span></label>
          <div className="creator-actions"><button type="button" onClick={() => { setStep('selection'); setError(''); }}>Back to content</button>
            <button className="creator-primary" disabled={!options.rightsConfirmed}>Build exact review copy</button></div>
        </fieldset>
      </form>}
      {step === 'review' && prepared && <section>
        <p className="creator-eyebrow">03 / REVIEW THE ACTUAL FILES</p>
        <h3>{prepared.manifest.title}</h3>
        <p>{prepared.manifest.levelNames.length} levels / {prepared.manifest.profile === 'encounter' ? 'DM encounter' : 'map layout'} / {prepared.manifest.license}</p>
        <CreatorPreviewImages files={prepared.files} onError={setError} />
        <details><summary>Content omitted from the sharing copy ({prepared.omissions.length})</summary>
          <ul>{prepared.omissions.slice(omissionPage * 100, (omissionPage + 1) * 100).map((item, index) => <li key={index}>{item.path}: {item.reason}</li>)}</ul>
          {prepared.omissions.length > 100 && <div className="creator-actions">
            <button disabled={omissionPage === 0} onClick={() => setOmissionPage(page => page - 1)}>Previous omissions</button>
            <span>Page {omissionPage + 1} of {Math.ceil(prepared.omissions.length / 100)}</span>
            <button disabled={(omissionPage + 1) * 100 >= prepared.omissions.length} onClick={() => setOmissionPage(page => page + 1)}>Next omissions</button>
          </div>}
        </details>
        <details><summary>Exact package files and checksums</summary><ul>{prepared.manifest.members.map(file =>
          <li key={file.path}>{file.path}: {file.bytes.toLocaleString()} bytes <code>{file.sha256}</code></li>)}</ul></details>
        <details><summary>Asset metadata and notices</summary>
          <p>Raster images can contain private EXIF or other metadata that this preview does not display. Original image bytes are preserved.</p>
          {prepared.imageMetadata.map(image => <div key={image.path}><strong>{image.path}</strong><pre>{image.text.join('\n') || 'No SVG title, description or comment text recorded.'}</pre></div>)}
          <pre>{new TextDecoder().decode(prepared.files.find(file => file.path === 'ATTRIBUTION.json')!.bytes)}</pre>
        </details>
        <label className="creator-check"><input type="checkbox" checked={accepted} disabled={busy} onChange={event => setAccepted(event.target.checked)} />
          <span>I reviewed this exact creator copy, including spoilers, images and source notices. I will choose repository visibility deliberately before any manual upload.</span></label>
        <div className="creator-actions"><button disabled={busy} onClick={() => { setPrepared(null); setAccepted(false); setStep('selection'); }}>Change sharing copy</button>
          <button className="creator-primary" disabled={busy || !accepted || !!error} onClick={() => void download()}>Download creator ZIP</button></div>
        <p>Extract the ZIP to get ordinary editable files under maps/{prepared.manifest.packageId}/.
          Uploading to GitHub is a separate action and can trigger repository workflows. This app does not connect or upload.</p>
      </section>}
      {busy && <button disabled={cancelling} onClick={() => { controller.current?.abort(); setCancelling(true); }}>
        {cancelling ? 'Cancellation requested' : 'Cancel preparation'}</button>}
    </div>
  </div>, document.body);
}
