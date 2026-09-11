import { forwardRef, useRef, useImperativeHandle, useState } from 'react';
import type { ReactNode } from 'react';
import type { DungeonMap, DungeonProject } from '../types/map';
import { exportProjectJSON, importProjectJSON, exportMapPNG } from '../utils/export';
import type { ActionId } from '../utils/editorActions';
import { useEditorAction } from '../contexts/EditorActionsContext';
import ActionButton from './ActionButton';
import Icon from './Icon';
import ShellDialog from './ShellDialog';

interface MapHeaderProps {
  map: DungeonMap;
  project: DungeonProject;
  onSetName: (name: string) => void;
  onSetProjectName: (name: string) => void;
  onResize: (w: number, h: number) => void;
  onSetTileSize: (size: number) => void;
  onNew: () => void;
  onLoadProject: (project: DungeonProject) => void;
  uiScale: number;
  uiScaleOptions: readonly number[];
  onSetUIScale: (scale: number) => void;
  getCanvas: () => HTMLCanvasElement | null;
  viewMode: 'gm' | 'player';
  saveLabel: string;
  settingsOpen: boolean;
  onCloseSettings: () => void;
  exportOpen: boolean;
  onCloseExport: () => void;
}

export interface MapHeaderHandle {
  triggerNew: () => void;
  triggerImport: () => void;
  triggerExportJSON: () => void;
  triggerExportPNG: () => void;
}

function MenuAction({ id, onClose }: { id: ActionId; onClose: () => void }) {
  const command = useEditorAction(id);
  return <button type="button" data-action={id} disabled={!command.enabled}
    title={command.unavailableReason} onClick={() => {
      onClose();
      requestAnimationFrame(() => command.action());
    }}><span>{command.label}</span>{command.shortcut && <kbd>{command.shortcut}</kbd>}</button>;
}

export function ActionMenu({ title, ids, onClose, children }: {
  title: string; ids: ActionId[]; onClose: () => void; children?: ReactNode;
}) {
  return <ShellDialog title={title} onClose={onClose}>
    {children}
    <div className="shell-menu-actions">{ids.map(id => <MenuAction key={id} id={id} onClose={onClose} />)}</div>
  </ShellDialog>;
}

const MapHeader = forwardRef<MapHeaderHandle, MapHeaderProps>((props, ref) => {
  const { map, project } = props;
  const fileInput = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');
  useImperativeHandle(ref, () => ({
    triggerNew: props.onNew,
    triggerImport: () => fileInput.current?.click(),
    triggerExportJSON: () => exportProjectJSON(project),
    triggerExportPNG: () => {
      const canvas = props.getCanvas();
      if (!canvas) { setError('Canvas unavailable. Reopen the map before exporting.'); return; }
      exportMapPNG(canvas, map.meta.name);
    },
  }), [props.onNew, props.getCanvas, project, map.meta.name]);
  const sizes = (value: number) => [...new Set([8, 16, 24, 32, 48, 64, 96, 128, value])].sort((a, b) => a - b);
  return <>
    <header className="shell-header">
      <ActionButton id="file.library" icon="library">Your maps</ActionButton>
      <button className="project-identity" onClick={event => { event.currentTarget.focus(); setMenuOpen(true); }} aria-label={`Project menu: ${project.name}`}>
        <strong>{project.name}</strong><small>{map.meta.name}</small>
      </button>
      <ActionButton id="file.recovery"><span role="status">{props.saveLabel}</span></ActionButton>
      <ActionButton id="view.viewMode" icon="look">{props.viewMode === 'gm' ? 'Edit' : 'DM view'}</ActionButton>
      <ActionButton id="view.playerPreview" icon="look">Player preview</ActionButton>
      <ActionButton id="session.prepare">Prepare session</ActionButton>
      <ActionButton id="help.commandPalette" icon="search">Commands</ActionButton>
      <ActionButton id="dialog.export" icon="export">Export</ActionButton>
      <button className="project-menu-button" type="button" onClick={event => { event.currentTarget.focus(); setMenuOpen(true); }} aria-label="Project menu">
        <Icon name="menu" /><span>Menu</span>
      </button>
    </header>
    <input ref={fileInput} type="file" accept=".json" hidden onChange={async event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try { props.onLoadProject(await importProjectJSON(file)); }
      catch (error) { setError(error instanceof Error ? error.message : 'Import failed.'); }
    }} />
    {error && <ShellDialog title="File action failed" onClose={() => setError('')}><p role="alert">{error}</p></ShellDialog>}
    {menuOpen && <ActionMenu title="Project menu" onClose={() => setMenuOpen(false)} ids={[
      'file.library', 'file.new', 'file.samples', 'file.open', 'file.generate',
      'edit.undo', 'edit.redo', 'edit.copy', 'edit.cut', 'edit.paste',
      'panel.notes', 'panel.encounter', 'panel.info', 'dialog.templates', 'dialog.audience', 'view.playerPreview',
      'dialog.settings', 'file.recovery', 'help.shortcuts', 'help.commandPalette',
    ]} />}
    {props.exportOpen && <ActionMenu title="Export" onClose={props.onCloseExport} ids={[
      'file.playerPng', 'file.playerSvg', 'file.exportJson', 'file.exportPng', 'file.exportSvg', 'file.printExport', 'view.printMode',
    ]}>
      <p>Player PNG and SVG use the same publication and fog policy as Player preview.
        Editable backups and DM exports include private content.</p>
      <p>Player artwork can contain secrets embedded in imported images. Review it before sharing.</p>
      <p>Image resolution is separate from map dimensions, canvas zoom, and interface text size.</p>
    </ActionMenu>}
    {props.settingsOpen && <ShellDialog title="Project settings" onClose={props.onCloseSettings}>
      <div className="settings-fields">
        <label>Project name<input value={project.name} onChange={event => props.onSetProjectName(event.target.value)} /></label>
        <label>Level name<input aria-label="Map name" value={map.meta.name} onChange={event => props.onSetName(event.target.value)} /></label>
        <fieldset><legend>Geometry dimensions</legend>
          <p>Resizing changes this level and retains a project recovery checkpoint. This is not canvas zoom.</p>
          <label>Width in tiles<select aria-label="Map width in tiles" value={map.meta.width}
            onChange={event => props.onResize(Number(event.target.value), map.meta.height)}>
            {sizes(map.meta.width).map(size => <option key={size}>{size}</option>)}
          </select></label>
          <label>Height in tiles<select aria-label="Map height in tiles" value={map.meta.height}
            onChange={event => props.onResize(map.meta.width, Number(event.target.value))}>
            {sizes(map.meta.height).map(size => <option key={size}>{size}</option>)}
          </select></label>
        </fieldset>
        <label>Source tile pixels<select aria-label="Tile size in pixels" value={map.meta.tileSize}
          onChange={event => props.onSetTileSize(Number(event.target.value))}>
          {[...new Set([12, 16, 20, 24, 32, map.meta.tileSize])].sort((a, b) => a - b).map(size => <option key={size} value={size}>{size}px</option>)}
        </select></label>
        <p>Source pixels set the base canvas rendering size. Use Export for output resolution.</p>
        <label>Interface text size<select aria-label="Interface text size" value={props.uiScale}
          onChange={event => props.onSetUIScale(Number(event.target.value))}>
          {[...new Set([...props.uiScaleOptions, props.uiScale])].sort((a, b) => a - b).map(scale =>
            <option key={scale} value={scale}>{Math.round(scale * 100)}%</option>)}
        </select></label>
        <p>Text size changes controls, not geometry or export resolution. Rail and Tabs now use one shared navigation.</p>
        <ActionButton id="file.clear" />
      </div>
    </ShellDialog>}
  </>;
});
MapHeader.displayName = 'MapHeader';
export default MapHeader;
