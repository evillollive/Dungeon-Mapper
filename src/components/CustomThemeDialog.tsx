import React, { useMemo, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { BuiltInTileType, CustomThemeDefinition, CustomTileDefinition } from '../types/map';
import { ALL_TILE_TYPES, TILE_LABELS } from '../types/map';
import { THEME_LIST } from '../themes';
import { getThemeWithCustom } from '../utils/customThemes';

interface CustomThemeDialogProps {
  customThemes: readonly CustomThemeDefinition[];
  activeThemeId: string;
  onSave: (theme: CustomThemeDefinition) => void;
  onDelete: (themeId: string) => void;
  onSetTheme: (themeId: string) => void;
  onClose: () => void;
}

const editableBuiltInTiles: BuiltInTileType[] = ALL_TILE_TYPES;

function uniqueSuffix(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  const randomA = Math.random().toString(36).slice(2).padEnd(8, '0').slice(0, 8);
  const randomB = Math.random().toString(36).slice(2).padEnd(8, '0').slice(0, 8);
  return `${Date.now().toString(36)}-${randomA}${randomB}`;
}

function newThemeFromBase(baseThemeId: string): CustomThemeDefinition {
  const base = getThemeWithCustom(baseThemeId);
  const id = `custom-theme:${uniqueSuffix()}` as const;
  return {
    id,
    name: 'Custom Theme',
    baseThemeId,
    gridColor: base.gridColor,
    tileColors: {},
    tileLabels: {},
    customTiles: [],
  };
}

const CustomThemeDialog: React.FC<CustomThemeDialogProps> = ({
  customThemes,
  activeThemeId,
  onSave,
  onDelete,
  onSetTheme,
  onClose,
}) => {
  const initial = customThemes.find(t => t.id === activeThemeId) ?? customThemes[0] ?? newThemeFromBase('dungeon');
  const focusTrapRef = useFocusTrap();
  const [draft, setDraft] = useState<CustomThemeDefinition>(initial);
  const [selectedId, setSelectedId] = useState<string>(initial.id);
  const baseTheme = useMemo(() => getThemeWithCustom(draft.baseThemeId), [draft.baseThemeId]);

  const selectTheme = (id: string) => {
    if (id === '__new__') {
      const next = newThemeFromBase('dungeon');
      setSelectedId(next.id);
      setDraft(next);
      return;
    }
    const existing = customThemes.find(t => t.id === id);
    if (existing) {
      setSelectedId(existing.id);
      setDraft(existing);
    }
  };

  const updateTileColor = (tile: BuiltInTileType, color: string) => {
    setDraft(prev => ({ ...prev, tileColors: { ...prev.tileColors, [tile]: color } }));
  };

  const updateTileLabel = (tile: BuiltInTileType, label: string) => {
    setDraft(prev => ({ ...prev, tileLabels: { ...prev.tileLabels, [tile]: label } }));
  };

  const addCustomTile = () => {
    const usedNumbers = new Set(
      draft.customTiles
        .map(tile => /^Custom Tile (\d+)$/.exec(tile.label.trim())?.[1])
        .filter((n): n is string => n !== undefined)
        .map(Number),
    );
    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) nextNumber++;
    const label = `Custom Tile ${nextNumber}`;
    const id = `custom:${uniqueSuffix()}` as const;
    const tile: CustomTileDefinition = {
      id,
      label,
      color: baseTheme.tileColors.floor,
      baseType: 'floor',
    };
    setDraft(prev => ({ ...prev, customTiles: [...prev.customTiles, tile] }));
  };

  const updateCustomTile = (
    id: string,
    patch: Partial<Omit<CustomTileDefinition, 'id'>>,
  ) => {
    setDraft(prev => ({
      ...prev,
      customTiles: prev.customTiles.map(tile => tile.id === id ? { ...tile, ...patch } : tile),
    }));
  };

  const removeCustomTile = (id: string) => {
    setDraft(prev => ({ ...prev, customTiles: prev.customTiles.filter(tile => tile.id !== id) }));
  };

  const importCustomTileImage = (id: string, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : undefined;
      if (dataUrl) updateCustomTile(id, { imageDataUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    const clean: CustomThemeDefinition = {
      ...draft,
      name: draft.name.trim() || 'Custom Theme',
      customTiles: draft.customTiles.map(tile => ({
        ...tile,
        label: tile.label.trim() || 'Custom Tile',
      })),
    };
    onSave(clean);
    onSetTheme(clean.id);
    setSelectedId(clean.id);
    setDraft(clean);
  };

  return (
    <div
      ref={focusTrapRef}
      className="generate-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Custom Theme Builder"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="generate-dialog custom-theme-dialog">
        <div className="generate-dialog-title-row">
          <h2 className="generate-dialog-title">🧩 Custom Theme Builder</h2>
          <button type="button" className="header-btn" onClick={onClose} aria-label="Close custom theme builder">✕</button>
        </div>

        <p className="generate-dialog-help">
          Create project-scoped themes by editing colors and labels, then add custom tile palette entries with optional uploaded art.
        </p>

        <label className="generate-dialog-row">
          <span>Theme</span>
          <select value={selectedId} onChange={e => selectTheme(e.target.value)}>
            {customThemes.map(theme => (
              <option key={theme.id} value={theme.id}>{theme.name}</option>
            ))}
            <option value="__new__">+ New custom theme</option>
          </select>
        </label>

        <label className="generate-dialog-row">
          <span>Name</span>
          <input value={draft.name} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))} />
        </label>

        <label className="generate-dialog-row">
          <span>Base Theme</span>
          <select
            value={draft.baseThemeId}
            onChange={e => setDraft(prev => ({
              ...prev,
              baseThemeId: e.target.value,
              gridColor: getThemeWithCustom(e.target.value).gridColor,
            }))}
          >
            {THEME_LIST.map(theme => (
              <option key={theme.id} value={theme.id}>{theme.name}</option>
            ))}
          </select>
        </label>

        <label className="generate-dialog-row">
          <span>Grid Color</span>
          <input type="color" value={draft.gridColor} onChange={e => setDraft(prev => ({ ...prev, gridColor: e.target.value }))} />
        </label>

        <div className="custom-theme-grid">
          <div className="custom-theme-column">
            <h3>Built-in Tile Styling</h3>
            <div className="custom-theme-tile-list">
              {editableBuiltInTiles.map(tile => (
                <div key={tile} className="custom-theme-tile-row">
                  <span>{TILE_LABELS[tile]}</span>
                  <input
                    aria-label={`${TILE_LABELS[tile]} label`}
                    value={draft.tileLabels[tile] ?? baseTheme.tiles.find(t => t.id === tile)?.label ?? TILE_LABELS[tile]}
                    onChange={e => updateTileLabel(tile, e.target.value)}
                  />
                  <input
                    type="color"
                    aria-label={`${TILE_LABELS[tile]} color`}
                    value={draft.tileColors[tile] ?? baseTheme.tileColors[tile]}
                    onChange={e => updateTileColor(tile, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="custom-theme-column">
            <div className="custom-theme-section-title">
              <h3>Custom Tiles</h3>
              <button type="button" className="header-btn" onClick={addCustomTile}>+ Tile</button>
            </div>
            <div className="custom-theme-custom-list">
              {draft.customTiles.length === 0 && (
                <p className="generate-dialog-help">No custom tiles yet. Add one to extend the paint palette.</p>
              )}
              {draft.customTiles.map(tile => (
                <div key={tile.id} className="custom-theme-custom-tile">
                  <label>
                    Label
                    <input value={tile.label} onChange={e => updateCustomTile(tile.id, { label: e.target.value })} />
                  </label>
                  <label>
                    Behavior
                    <select
                      value={tile.baseType}
                      onChange={e => updateCustomTile(tile.id, { baseType: e.target.value as BuiltInTileType })}
                    >
                      {editableBuiltInTiles.map(base => (
                        <option key={base} value={base}>{TILE_LABELS[base]}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Color
                    <input type="color" value={tile.color} onChange={e => updateCustomTile(tile.id, { color: e.target.value })} />
                  </label>
                  <label>
                    Graphic
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={e => {
                        importCustomTileImage(tile.id, e.target.files?.[0]);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                  {tile.imageDataUrl && (
                    <button type="button" className="header-btn" onClick={() => updateCustomTile(tile.id, { imageDataUrl: undefined })}>
                      Remove Graphic
                    </button>
                  )}
                  <button type="button" className="header-btn danger" onClick={() => removeCustomTile(tile.id)}>
                    Delete Tile
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="generate-dialog-actions">
          {customThemes.some(t => t.id === draft.id) && (
            <button
              type="button"
              className="generate-dialog-btn secondary"
              onClick={() => {
                if (window.confirm(`Delete custom theme "${draft.name}"?`)) {
                  onDelete(draft.id);
                  selectTheme('__new__');
                }
              }}
            >
              Delete Theme
            </button>
          )}
          <button type="button" className="generate-dialog-btn secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="generate-dialog-btn primary" onClick={save}>Save & Use Theme</button>
        </div>
      </div>
    </div>
  );
};

export default CustomThemeDialog;
