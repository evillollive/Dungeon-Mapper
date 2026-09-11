import { useState, type ReactNode } from 'react';
import type { PlacedStamp, Token, MapNote, NoteEditFields, LightSource, DungeonMap, StampDef, RoomShape, River, TileType } from '../types/map';
import { ALL_TILE_TYPES, RIVER_TYPES } from '../types/map';
import { getStampDef } from '../utils/stampCatalog';
import { getThemeWithCustom } from '../utils/customThemes';
import type { RegionSelection } from '../hooks/useEditorSelection';
import { polygonBoundingBox } from '../utils/roomRasterizer';

export interface SelectionInspectorProps {
  map: DungeonMap;
  themeId: string;
  themeName: string;
  selectedPlacedStampId: number | null;
  selectedTokenId: number | null;
  selectedNoteId: number | null;
  selectedRoomShapeId?: number | null;
  selectedRiverId?: number | null;
  region?: RegionSelection | null;
  stamps: PlacedStamp[];
  tokens: Token[];
  notes: MapNote[];
  lightSources: LightSource[];
  customStamps?: readonly StampDef[];
  materials?: { id: TileType; label: string }[];
  onUpdateStamp: (id: number, patch: Partial<Omit<PlacedStamp, 'id' | 'stampId'>>) => void;
  onRemoveStamp: (id: number) => void;
  onBringStampToFront: (id: number) => void;
  onSendStampToBack: (id: number) => void;
  onSelectPlacedStamp: (id: number | null) => void;
  onUpdateToken: (id: number, patch: Partial<Omit<Token, 'id'>>) => void;
  onRemoveToken: (id: number) => void;
  onSelectToken: (id: number | null) => void;
  onUpdateNote: (id: number, label: string, description: string, position?: NoteEditFields) => void;
  onDeleteNote: (id: number) => void;
  onSelectNote: (id: number | null) => void;
  onRemoveLightSource: (id: number) => void;
  onUpdateRoomShape?: (id: number, patch: Partial<Omit<RoomShape, 'id'>>) => void;
  onRemoveRoomShape?: (id: number) => void;
  onUpdateRiver?: (id: number, patch: Partial<Omit<River, 'id'>>) => void;
  onRemoveRiver?: (id: number) => void;
  onDeselect?: () => void;
  onSetRegion?: (region: RegionSelection) => void;
  onFillRegion?: (region: RegionSelection, tile: TileType) => void;
  onMoveRegion?: (region: RegionSelection, dx: number, dy: number) => void;
}

function EditForm<T>({ value, label, onApply, children }: {
  value: T; label: string; onApply: (draft: T) => void;
  children: (draft: T, set: (draft: T) => void) => ReactNode;
}) {
  const [draft, setDraft] = useState(value);
  const [base, setBase] = useState(value);
  if (base !== value) { setBase(value); setDraft(value); }
  const dirty = JSON.stringify(draft) !== JSON.stringify(value);
  return <form className="object-form" aria-label={`${label} properties`} onSubmit={event => {
    event.preventDefault();
    if (dirty) onApply(draft);
  }} onKeyDown={event => {
    if (event.key === 'Escape' && dirty) { event.stopPropagation(); setDraft(value); }
  }}>
    {children(draft, setDraft)}
    <div className="inspector-form-actions">
      <button type="submit" aria-disabled={!dirty}>Apply changes</button>
      <button type="button" aria-disabled={!dirty} onClick={() => setDraft(value)}>Cancel changes</button>
    </div>
    <small>Apply is one undo step. Escape cancels uncommitted fields.</small>
  </form>;
}

function NumberField({ label, value, onChange, min, max, step = 1 }: {
  label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number | 'any';
}) {
  return <label>{label}<input required type="number" min={min} max={max} step={step} value={Number.isFinite(value) ? value : ''}
    onChange={event => onChange(event.target.valueAsNumber)} /></label>;
}

export default function SelectionInspector(p: SelectionInspectorProps) {
  const { map } = p;
  const stamp = p.stamps.find(item => item.id === p.selectedPlacedStampId);
  const token = p.tokens.find(item => item.id === p.selectedTokenId);
  const note = p.notes.find(item => item.id === p.selectedNoteId);
  const room = map.roomShapes?.find(item => item.id === p.selectedRoomShapeId);
  const river = map.rivers?.find(item => item.id === p.selectedRiverId);
  const region = p.region;
  const materials = p.materials ?? getThemeWithCustom(p.themeId).tiles;
  const material = (label: string, value: TileType, set: (value: TileType) => void) =>
    <label>{label}<select aria-label={label} value={value} onChange={e => set(e.target.value as TileType)}>
      {[...new Set([...ALL_TILE_TYPES, ...materials.map(m => m.id), value])].map(id =>
        <option key={id} value={id}>{materials.find(m => m.id === id)?.label ?? id}</option>)}
    </select></label>;
  const position = (x: number, y: number, set: (x: number, y: number) => void, size = 1) =>
    <div className="inspector-fields">
      <NumberField label="X" value={x} min={size === 0 ? undefined : 0} max={size === 0 ? undefined : map.meta.width - size} step={size === 0 ? 'any' : 1} onChange={v => set(v, y)} />
      <NumberField label="Y" value={y} min={size === 0 ? undefined : 0} max={size === 0 ? undefined : map.meta.height - size} step={size === 0 ? 'any' : 1} onChange={v => set(x, v)} />
    </div>;
  let content: ReactNode;
  let label: string;
  let remove: (() => void) | undefined;
  let deselect = p.onDeselect;
  if (stamp) {
    label = 'Stamp';
    remove = () => p.onRemoveStamp(stamp.id);
    deselect ??= () => p.onSelectPlacedStamp(null);
    content = <>
      <h3>{getStampDef(stamp.stampId, p.customStamps)?.name ?? stamp.stampId}</h3>
      <EditForm key={`stamp-${stamp.id}`} label={label} value={stamp} onApply={d => p.onUpdateStamp(stamp.id, d)}>
        {(d, set) => <>
          <fieldset disabled={stamp.locked}><legend>Transform</legend>
            <NumberField label="X" value={d.x} step="any" onChange={x => set({ ...d, x })} />
            <NumberField label="Y" value={d.y} step="any" onChange={y => set({ ...d, y })} />
            <NumberField label="Rotation" value={d.rotation} step="any" onChange={rotation => set({ ...d, rotation })} />
            <NumberField label="Stamp scale" value={d.scale} min={Math.min(0.01, stamp.scale)} step="any" onChange={scale => set({ ...d, scale })} />
            <NumberField label="Stamp opacity" value={d.opacity} min={0} max={1} step="any" onChange={opacity => set({ ...d, opacity })} />
            <label><input type="checkbox" checked={d.flipX} onChange={e => set({ ...d, flipX: e.target.checked })} />Flip horizontally</label>
            <label><input type="checkbox" checked={d.flipY} onChange={e => set({ ...d, flipY: e.target.checked })} />Flip vertically</label>
          </fieldset>
          <label><input type="checkbox" checked={d.locked ?? false} onChange={e => set({ ...d, locked: e.target.checked })} />Lock stamp</label>
          <label><input type="checkbox" checked={d.hidden ?? false} onChange={e => set({ ...d, hidden: e.target.checked })} />Hide stamp from players</label>
        </>}
      </EditForm>
      <div className="inspector-fields">
        <button type="button" disabled={stamp.locked} aria-label="Rotate counter-clockwise" onClick={() => p.onUpdateStamp(stamp.id, { rotation: (stamp.rotation + 270) % 360 })}>Rotate left</button>
        <button type="button" disabled={stamp.locked} aria-label="Rotate clockwise" onClick={() => p.onUpdateStamp(stamp.id, { rotation: (stamp.rotation + 90) % 360 })}>Rotate right</button>
        <button type="button" onClick={() => p.onBringStampToFront(stamp.id)}>Bring stamp to front</button>
        <button type="button" onClick={() => p.onSendStampToBack(stamp.id)}>Send stamp to back</button>
      </div>
    </>;
  } else if (token) {
    label = 'Token';
    remove = () => p.onRemoveToken(token.id);
    deselect ??= () => p.onSelectToken(null);
    content = <EditForm key={`token-${token.id}`} label={label} value={token} onApply={d => p.onUpdateToken(token.id, d)}>
      {(d, set) => <>
        <p>{d.kind} token</p>
        <label>Token label<input value={d.label} onChange={e => set({ ...d, label: e.target.value })} /></label>
        {position(d.x, d.y, (x, y) => set({ ...d, x, y }), d.size ?? 1)}
        <label>Token icon<input value={d.icon ?? ''} onChange={e => set({ ...d, icon: e.target.value })} /></label>
        <label><input type="checkbox" checked={d.hidden ?? false} onChange={e => set({ ...d, hidden: e.target.checked })} />Hide token from players</label>
        <label><input type="checkbox" checked={d.hideFromInitiative ?? false} onChange={e => set({ ...d, hideFromInitiative: e.target.checked })} />Hide from player initiative</label>
        <small>Visible tokens share their label and icon. Fog still applies to the complete footprint.</small>
      </>}
    </EditForm>;
  } else if (note) {
    label = 'Note';
    remove = () => p.onDeleteNote(note.id);
    deselect ??= () => p.onSelectNote(null);
    content = <EditForm key={`note-${note.id}`} label={label} value={note} onApply={d => p.onUpdateNote(note.id, d.label, d.description, {
      x: d.x, y: d.y, published: d.published, publicLabel: d.publicLabel, publicDescription: d.publicDescription,
    })}>
      {(d, set) => <>
        <label>Note label<input value={d.label} onChange={e => set({ ...d, label: e.target.value })} /></label>
        <label>Note description<textarea rows={4} value={d.description} onChange={e => set({ ...d, description: e.target.value })} /></label>
        {position(d.x, d.y, (x, y) => set({ ...d, x, y }))}
        <small>The label and description above are DM-private. Legacy notes stay private until explicitly published.</small>
        <fieldset><legend>Player publication</legend>
          <label>Public note title<input value={d.publicLabel ?? ''} onChange={e => set({ ...d, publicLabel: e.target.value })} /></label>
          <label>Public note text<textarea rows={3} value={d.publicDescription ?? ''} onChange={e => set({ ...d, publicDescription: e.target.value })} /></label>
          <label><input type="checkbox" checked={d.published ?? false} onChange={e => set({ ...d, published: e.target.checked })} />Publish note to players</label>
          <small>Only public fields are shared, and only where the map is visible or explored.</small>
        </fieldset>
      </>}
    </EditForm>;
  } else if (room) {
    label = 'Room';
    remove = () => p.onRemoveRoomShape?.(room.id);
    content = <EditForm key={`room-${room.id}`} label={label} value={room} onApply={d => p.onUpdateRoomShape?.(room.id, d)}>
      {(d, set) => <>
        <label>Room shape<select aria-label="Room shape" value={d.shapeType ?? 'rect'} onChange={e => set({ ...d, shapeType: e.target.value as RoomShape['shapeType'] })}>
          <option value="rect">Rectangle</option><option value="circle">Ellipse</option>
          {d.vertices && <option value="polygon">Polygon</option>}
        </select></label>
        {d.shapeType !== 'polygon' && <>
          <NumberField label="X" value={d.x} onChange={x => set({ ...d, x })} />
          <NumberField label="Y" value={d.y} onChange={y => set({ ...d, y })} />
          <NumberField label="Width" value={d.width} min={1} onChange={width => set({ ...d, width })} />
          <NumberField label="Height" value={d.height} min={1} onChange={height => set({ ...d, height })} />
        </>}
        {material('Room material', d.fillTile ?? 'floor', fillTile => set({ ...d, fillTile }))}
        {material('Room wall material', d.wallTile ?? 'wall', wallTile => set({ ...d, wallTile }))}
        <label>Operation<select aria-label="Operation" value={d.mode ?? 'additive'} onChange={e => set({ ...d, mode: e.target.value as RoomShape['mode'] })}>
          <option value="additive">Add room</option><option value="subtractive">Cut out</option>
        </select></label>
        {(['n', 'e', 's', 'w'] as const).map(edge => <label key={edge}>{({ n: 'North', e: 'East', s: 'South', w: 'West' })[edge]} edge
          <select value={d.edgeMergeOverrides?.find(o => o.edge === edge)?.mode ?? 'auto'} onChange={e => set({
            ...d, edgeMergeOverrides: [...(d.edgeMergeOverrides ?? []).filter(o => o.edge !== edge), { edge, mode: e.target.value as 'auto' | 'wall' | 'door' | 'arch' }],
          })}><option value="auto">Auto</option><option value="wall">Wall</option><option value="door">Door</option><option value="arch">Archway</option></select>
        </label>)}
        {d.shapeType === 'polygon' && d.vertices?.map((point, index) => <fieldset key={index}><legend>Vertex {index + 1}</legend>
          {position(point.x, point.y, (x, y) => {
            const vertices = d.vertices!.map((v, i) => i === index ? { x, y } : v);
            const bounds = polygonBoundingBox(vertices);
            set({ ...d, vertices, ...bounds, width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) });
          }, 0)}
          <button type="button" disabled={d.vertices!.length <= 3} onClick={() => {
            const vertices = d.vertices!.filter((_, i) => i !== index);
            const bounds = polygonBoundingBox(vertices);
            set({ ...d, vertices, ...bounds, width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) });
          }}>Remove vertex {index + 1}</button>
        </fieldset>)}
      </>}
    </EditForm>;
  } else if (river) {
    label = 'River';
    remove = () => p.onRemoveRiver?.(river.id);
    content = <EditForm key={`river-${river.id}`} label={label} value={river} onApply={d => p.onUpdateRiver?.(river.id, d)}>
      {(d, set) => <>
        <label>River type<select aria-label="River type" value={d.type} onChange={e => set({ ...d, type: e.target.value as River['type'] })}>
          {RIVER_TYPES.map(type => <option key={type}>{type}</option>)}
        </select></label>
        <NumberField label="River width" value={d.width} min={Math.min(0.01, river.width)} step="any" onChange={width => set({ ...d, width })} />
        <label>River color<input type="color" value={d.color ?? '#2563eb'} onChange={e => set({ ...d, color: e.target.value })} /></label>
        {d.controlPoints.map((point, index) => <fieldset key={index}><legend>Point {index + 1}</legend>
          <NumberField label={`Point ${index + 1} X`} value={point.x} step="any" onChange={x => set({ ...d, controlPoints: d.controlPoints.map((v, i) => i === index ? { ...v, x } : v) })} />
          <NumberField label={`Point ${index + 1} Y`} value={point.y} step="any" onChange={y => set({ ...d, controlPoints: d.controlPoints.map((v, i) => i === index ? { ...v, y } : v) })} />
          <button type="button" disabled={d.controlPoints.length <= 1} onClick={() => set({ ...d, controlPoints: d.controlPoints.filter((_, i) => i !== index) })}>Remove point {index + 1}</button>
        </fieldset>)}
      </>}
    </EditForm>;
  } else if (region) {
    label = 'Tile region';
    content = <>
      <p>Tile content, notes and stamps. Room and river geometry and tokens are separate objects.</p>
      <EditForm label={label} value={region} onApply={d => p.onSetRegion?.(d)}>
        {(d, set) => <>
          {position(d.x, d.y, (x, y) => set({ ...d, x, y }))}
          <NumberField label="Width" value={d.w} min={1} max={map.meta.width - d.x} onChange={w => set({ ...d, w })} />
          <NumberField label="Height" value={d.h} min={1} max={map.meta.height - d.y} onChange={h => set({ ...d, h })} />
        </>}
      </EditForm>
      <div className="inspector-fields">
        {([['Left', -1, 0], ['Right', 1, 0], ['Up', 0, -1], ['Down', 0, 1]] as const).map(([name, dx, dy]) =>
          <button key={name} type="button" disabled={region.x + dx < 0 || region.y + dy < 0 || region.x + region.w + dx > map.meta.width || region.y + region.h + dy > map.meta.height}
            onClick={() => p.onMoveRegion?.(region, dx, dy)}>Move region {name.toLowerCase()}</button>)}
      </div>
      {material('Fill region with', 'empty', tile => p.onFillRegion?.(region, tile))}
      <button type="button" onClick={() => p.onFillRegion?.(region, 'empty')}>Erase region tiles</button>
    </>;
  } else {
    const counts = map.tiles.flat().reduce<Record<string, number>>((result, tile) => {
      result[tile.type] = (result[tile.type] ?? 0) + 1; return result;
    }, {});
    return <section className="selection-inspector" aria-label="Map information">
      <h3>{map.meta.name}</h3><p>{map.meta.width} x {map.meta.height} tiles / {p.themeName}</p>
      {['floor', 'wall', 'empty'].map(type => <div className="inspector-row" key={type}><span>{type[0].toUpperCase() + type.slice(1)}</span><span>{counts[type] ?? 0}</span></div>)}
      {p.lightSources.map(light => <button key={light.id} type="button" onClick={() => p.onRemoveLightSource(light.id)}>Remove {light.label}</button>)}
    </section>;
  }
  return <section className="selection-inspector" aria-label="Selection inspector">
    <header className="inspector-header"><h2>{label}</h2><button type="button" onClick={deselect} aria-label={`Deselect ${label.toLowerCase()}`}>Deselect</button></header>
    {content}
    {remove && <button type="button" className="danger" onClick={() => { remove(); deselect?.(); }}>Delete {label.toLowerCase()}</button>}
  </section>;
}
