import { useState } from 'react';
import type { DungeonMap } from '../types/map';
import type { EditorSelection, ObjectKind } from '../hooks/useEditorSelection';

export type PlacementKind = 'token' | 'note' | 'stamp' | 'room' | 'polygon' | 'river' | 'region';

export default function EditingObjects({ map, selection, onSelect, onPlace, hasStamp }: {
  map: DungeonMap; selection: EditorSelection; onSelect: (selection: EditorSelection) => void;
  onPlace: (kind: PlacementKind, x: number, y: number, width: number, height: number) => void; hasStamp: boolean;
}) {
  const [kind, setKind] = useState<PlacementKind>('room');
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [width, setWidth] = useState(3);
  const [height, setHeight] = useState(3);
  const groups: { kind: ObjectKind; name: string; items: { id: number; label?: string }[] }[] = [
    { kind: 'token', name: 'Tokens', items: map.tokens ?? [] },
    { kind: 'note', name: 'Notes', items: map.notes },
    { kind: 'stamp', name: 'Stamps', items: map.stamps ?? [] },
    { kind: 'room', name: 'Rooms', items: map.roomShapes ?? [] },
    { kind: 'river', name: 'Rivers', items: map.rivers ?? [] },
  ];
  const options = groups.flatMap(group => group.items.map(item => ({ value: `${group.kind}:${item.id}`, kind: group.kind, item })));
  const sized = ['room', 'polygon', 'river', 'region'].includes(kind);
  return <div className="editing-objects">
    <label>Inspect object<select aria-label="Inspect object" value={selection && selection.kind !== 'region' ? `${selection.kind}:${selection.id}` : ''}
      onChange={e => {
        const option = options.find(option => option.value === e.target.value);
        onSelect(option ? { kind: option.kind, id: option.item.id } : null);
      }}>
      <option value="">Choose an object</option>
      {groups.map(group => <optgroup key={group.kind} label={group.name}>
        {group.items.map(item => <option key={item.id} value={`${group.kind}:${item.id}`}>{item.label || `${group.kind} ${item.id}`}</option>)}
      </optgroup>)}
    </select></label>
    <details><summary>Add or select by coordinates</summary>
      <form className="object-form" onSubmit={e => {
        e.preventDefault();
        onPlace(kind, x, y, width, height);
        const details = e.currentTarget.closest('details');
        if (details) details.open = false;
      }}>
        <label>Object type<select aria-label="Object type" value={kind} onChange={e => setKind(e.target.value as PlacementKind)}>
          <option value="room">Rectangle room</option><option value="polygon">Polygon room</option>
          <option value="river">River</option><option value="region">Tile region selection</option>
          <option value="token">Party token</option><option value="note">Note</option><option value="stamp">Selected stamp</option>
        </select></label>
        <div className="inspector-fields">
          <label>X<input type="number" required min={0} max={map.meta.width - 1} value={Number.isFinite(x) ? x : ''} onChange={e => setX(e.target.valueAsNumber)} /></label>
          <label>Y<input type="number" required min={0} max={map.meta.height - 1} value={Number.isFinite(y) ? y : ''} onChange={e => setY(e.target.valueAsNumber)} /></label>
        </div>
        {sized && <div className="inspector-fields">
          <label>Width<input type="number" required min={1} max={map.meta.width - x} value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.valueAsNumber)} /></label>
          <label>Height<input type="number" required min={1} max={map.meta.height - y} value={Number.isFinite(height) ? height : ''} onChange={e => setHeight(e.target.valueAsNumber)} /></label>
        </div>}
        {kind === 'river' && <p>A diagonal river from X/Y to the opposite corner. Edit individual points in the inspector.</p>}
        {kind === 'stamp' && !hasStamp && <p>Choose a stamp in Decorate first.</p>}
        <button type="submit" disabled={kind === 'stamp' && !hasStamp}>{kind === 'region' ? 'Select region' : 'Place object'}</button>
      </form>
    </details>
  </div>;
}
