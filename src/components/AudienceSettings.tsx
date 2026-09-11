import { useMemo, useState } from 'react';
import type { CustomThemeDefinition, DungeonMap } from '../types/map';
import { deriveRenderableTiles } from '../utils/derivedRenderMap';
import { SECRET_APPEARANCE } from '../utils/audienceProjection';
import { getSemanticTileType } from '../utils/customThemes';
import ShellDialog from './ShellDialog';
import { isSecretDiscovered } from '../utils/secretDiscovery';

export default function AudienceSettings({ map, customThemes, onClose, onSetPublicName, onDiscover, onInspect, onPreview }: {
  map: DungeonMap;
  customThemes: readonly CustomThemeDefinition[];
  onClose: () => void;
  onSetPublicName: (name: string) => void;
  onDiscover: (x: number, y: number, discovered: boolean) => void;
  onInspect: (kind: 'note' | 'token' | 'stamp', id: number) => void;
  onPreview: () => void;
}) {
  const [name, setName] = useState(map.meta.publicName ?? '');
  const secrets = useMemo(() => deriveRenderableTiles(map).flatMap((row, y) => row.flatMap((tile, x) =>
    SECRET_APPEARANCE[getSemanticTileType(tile.type, customThemes)] ? [{
      x, y, type: tile.type, discovered: isSecretDiscovered(map.tiles[y][x], tile),
    }] : [])), [map, customThemes]);
  return <ShellDialog title="Audience & secrets" onClose={onClose}>
    <div className="audience-settings settings-fields">
      <p>Fog reveals geography, not permission to share. DM note titles and descriptions are always private.
        Existing notes remain private until you write public fields and publish them.</p>
      <form onSubmit={e => { e.preventDefault(); onSetPublicName(name); }}>
        <label>Public level title<input value={name} onChange={e => setName(e.target.value)} placeholder="Player map" /></label>
        <p>Private project and level names never appear in player output. Other levels and stair destinations are omitted.</p>
        <button type="submit">Apply public title</button>
      </form>
      <h3>Notes</h3>
      {map.notes.length === 0 && <p>No notes on this level.</p>}
      {map.notes.map(note => <button key={note.id} type="button" onClick={() => onInspect('note', note.id)}>
        {note.label} / {note.published ? 'Published public fields' : 'Private'}
      </button>)}
      <h3>Tokens and objects</h3>
      <p>Visible tokens share their label and icon. Hide an object independently of fog in its inspector.</p>
      {(map.tokens ?? []).map(token => <button key={token.id} type="button" onClick={() => onInspect('token', token.id)}>
        {token.label} / {token.hidden ? 'Hidden' : 'Follows fog'}{token.hideFromInitiative ? ' / Private initiative' : ''}
      </button>)}
      {(map.stamps ?? []).map(stamp => <button key={stamp.id} type="button" onClick={() => onInspect('stamp', stamp.id)}>
        Stamp {stamp.id} / {stamp.hidden ? 'Hidden' : 'Follows fog'}
      </button>)}
      <h3>Secret discovery</h3>
      <p>Undiscovered secret doors look like walls, traps like floors, and trapped doors like ordinary doors.
        Discovery does not reveal fog. Each change can be undone. Editing room geometry resets location-bound discovery.</p>
      {secrets.length === 0 && <p>No secret doors or traps on this level.</p>}
      {secrets.map(secret => <label key={`${secret.x},${secret.y}`}>
        <input type="checkbox" checked={secret.discovered} onChange={e => onDiscover(secret.x, secret.y, e.target.checked)} />
        Discovered {secret.type} at ({secret.x}, {secret.y})
      </label>)}
      <p>Partially hidden vector decorations are omitted conservatively. Raw background images are omitted while any
        geography is unknown. Review imported artwork for embedded secrets before sharing.</p>
      <button type="button" onClick={onPreview}>Preview as player</button>
    </div>
  </ShellDialog>;
}
