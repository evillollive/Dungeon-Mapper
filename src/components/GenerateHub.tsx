import React, { useEffect, useMemo, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { DungeonProject } from '../types/map';
import {
  GENERATOR_LIST,
  getGenerator,
  parseSeed,
  pickGeneratorForTheme,
  randomSeed,
  seedToString,
  type GeneratedMap,
} from '../utils/generators';
import { MAX_DENSITY, MIN_DENSITY } from '../utils/generators/common';
import {
  CORRIDOR_STRATEGY_LIST,
  DEFAULT_CORRIDOR_STRATEGY_ID,
  getCorridorStrategy,
} from '../utils/generators/corridorEngine';
import {
  getDefaultTileMix,
  getTileMixSliders,
  type TileMixSliderSpec,
} from '../utils/generators/tileMix';
import {
  DEFAULT_DUNGEON_SHAPE,
  DUNGEON_SHAPE_LIST,
  getDungeonShape,
} from '../utils/generators/shapeMask';
import { themeSupportsRoomLabels } from '../utils/generators/roomKinds';
import {
  PREMADE_MAP_SUMMARIES,
  buildPremadeProject,
  type PremadeMapSummary,
} from '../utils/premadeMaps';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

type HubTab = 'generate' | 'samples';

interface GenerateHubProps {
  themeId: string;
  initialWidth: number;
  initialHeight: number;
  hasExistingContent: boolean;
  selection?: { x: number; y: number; w: number; h: number } | null;
  onCancel: () => void;
  onGenerate: (
    result: GeneratedMap,
    suggestedName: string,
    target?: { x: number; y: number; w: number; h: number }
  ) => void;
  onLoadProject: (project: DungeonProject) => void;
}

const MIN_DIM = 8;
const MAX_DIM = 128;
const DIM_STEP = 8;

const DIALOG_SCALE_OPTIONS = [0.85, 1, 1.15, 1.3, 1.5] as const;
const DEFAULT_DIALOG_SCALE = 1;
const DIALOG_SCALE_STORAGE_KEY = 'dungeon-mapper:generate-hub-scale';

const loadInitialDialogScale = (): number => {
  if (typeof window === 'undefined') return DEFAULT_DIALOG_SCALE;
  try {
    const raw = window.localStorage.getItem(DIALOG_SCALE_STORAGE_KEY);
    if (!raw) return DEFAULT_DIALOG_SCALE;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_DIALOG_SCALE;
    let best = DIALOG_SCALE_OPTIONS[0] as number;
    let bestDelta = Math.abs(n - best);
    for (const opt of DIALOG_SCALE_OPTIONS) {
      const d = Math.abs(n - opt);
      if (d < bestDelta) { best = opt; bestDelta = d; }
    }
    return best;
  } catch {
    return DEFAULT_DIALOG_SCALE;
  }
};

const MIN_SELECTION_DIM = 6;
const ALL_FILTER = 'all';

const HUB_TAB_STORAGE_KEY = 'dungeon-mapper:generate-hub-tab';

const loadInitialTab = (): HubTab => {
  if (typeof window === 'undefined') return 'generate';
  try {
    const stored = window.localStorage.getItem(HUB_TAB_STORAGE_KEY);
    if (stored === 'generate' || stored === 'samples') return stored;
  } catch { /* ignore */ }
  return 'generate';
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const GenerateHub: React.FC<GenerateHubProps> = ({
  themeId, initialWidth, initialHeight, hasExistingContent, selection,
  onCancel, onGenerate, onLoadProject,
}) => {
  const focusTrapRef = useFocusTrap();
  const [activeTab, setActiveTab] = useState<HubTab>(loadInitialTab);

  // Persist active tab
  useEffect(() => {
    try { window.localStorage.setItem(HUB_TAB_STORAGE_KEY, activeTab); } catch { /* */ }
  }, [activeTab]);

  // Dialog scale
  const [dialogScale, setDialogScale] = useState<number>(loadInitialDialogScale);
  useEffect(() => {
    try { window.localStorage.setItem(DIALOG_SCALE_STORAGE_KEY, String(dialogScale)); } catch { /* */ }
  }, [dialogScale]);
  const scaleIndex = DIALOG_SCALE_OPTIONS.indexOf(dialogScale as typeof DIALOG_SCALE_OPTIONS[number]);
  const safeScaleIndex = scaleIndex < 0
    ? DIALOG_SCALE_OPTIONS.indexOf(DEFAULT_DIALOG_SCALE as typeof DIALOG_SCALE_OPTIONS[number])
    : scaleIndex;
  const canShrink = safeScaleIndex > 0;
  const canGrow = safeScaleIndex < DIALOG_SCALE_OPTIONS.length - 1;
  const scaleDown = () => { if (canShrink) setDialogScale(DIALOG_SCALE_OPTIONS[safeScaleIndex - 1]); };
  const scaleUp = () => { if (canGrow) setDialogScale(DIALOG_SCALE_OPTIONS[safeScaleIndex + 1]); };

  // Esc closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      ref={focusTrapRef}
      className="generate-dialog-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-hub-title"
    >
      <div
        className="generate-dialog generate-hub"
        style={{ ['--gen-dialog-scale' as string]: String(dialogScale) }}
      >
        {/* Title row */}
        <div className="generate-dialog-title-row">
          <h2 id="generate-hub-title" className="generate-dialog-title">
            🗺️ Generate Hub
          </h2>
          <div className="generate-dialog-scale" role="group" aria-label="Dialog text size">
            <button type="button" onClick={scaleDown} disabled={!canShrink} title="Shrink dialog text" aria-label="Shrink dialog text">A−</button>
            <span className="generate-dialog-scale-label" aria-hidden="true">{Math.round(dialogScale * 100)}%</span>
            <button type="button" onClick={scaleUp} disabled={!canGrow} title="Enlarge dialog text" aria-label="Enlarge dialog text">A+</button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="generate-hub-tabs" role="tablist" aria-label="Generate hub sections">
          <button
            type="button"
            role="tab"
            className={`generate-hub-tab ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
            aria-selected={activeTab === 'generate'}
            aria-controls="generate-hub-panel-generate"
          >
            🎲 Generate
          </button>
          <button
            type="button"
            role="tab"
            className={`generate-hub-tab ${activeTab === 'samples' ? 'active' : ''}`}
            onClick={() => setActiveTab('samples')}
            aria-selected={activeTab === 'samples'}
            aria-controls="generate-hub-panel-samples"
          >
            📦 Sample Maps
          </button>
        </div>

        {/* Tab panels */}
        {activeTab === 'generate' && (
          <div role="tabpanel" id="generate-hub-panel-generate" aria-label="Procedural generation">
            <GeneratePanel
              themeId={themeId}
              initialWidth={initialWidth}
              initialHeight={initialHeight}
              hasExistingContent={hasExistingContent}
              selection={selection}
              onCancel={onCancel}
              onGenerate={onGenerate}
            />
          </div>
        )}
        {activeTab === 'samples' && (
          <div role="tabpanel" id="generate-hub-panel-samples" aria-label="Sample maps gallery">
            <SamplesPanel
              hasExistingContent={hasExistingContent}
              onCancel={onCancel}
              onLoadProject={onLoadProject}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Generate Panel (procedural generation controls)                    */
/* ------------------------------------------------------------------ */

interface GeneratePanelProps {
  themeId: string;
  initialWidth: number;
  initialHeight: number;
  hasExistingContent: boolean;
  selection?: { x: number; y: number; w: number; h: number } | null;
  onCancel: () => void;
  onGenerate: (
    result: GeneratedMap,
    suggestedName: string,
    target?: { x: number; y: number; w: number; h: number }
  ) => void;
}

const GeneratePanel: React.FC<GeneratePanelProps> = ({
  themeId, initialWidth, initialHeight, hasExistingContent, selection,
  onCancel, onGenerate,
}) => {
  const defaultGen = useMemo(() => pickGeneratorForTheme(themeId), [themeId]);
  const [generatorId, setGeneratorId] = useState<string>(defaultGen.id);
  const [width, setWidth] = useState<number>(initialWidth);
  const [height, setHeight] = useState<number>(initialHeight);
  const [density, setDensity] = useState<number>(1);
  const [seedText, setSeedText] = useState<string>(() => seedToString(randomSeed()));
  const [error, setError] = useState<string | null>(null);

  // Tile mix state
  const [mixOverrides, setMixOverrides] = useState<Record<string, number>>({});
  const sliderSpecs: TileMixSliderSpec[] = useMemo(
    () => getTileMixSliders(generatorId, themeId),
    [generatorId, themeId]
  );
  const tileMixDefaults = useMemo(
    () => getDefaultTileMix(generatorId, themeId),
    [generatorId, themeId]
  );
  const tileMixValue = (key: string): number =>
    mixOverrides[`${generatorId}.${key}`] ?? tileMixDefaults[key] ?? 0;
  const setTileMixValue = (key: string, v: number) =>
    setMixOverrides(prev => ({ ...prev, [`${generatorId}.${key}`]: v }));
  const resetMixToDefaults = () => {
    setMixOverrides(prev => {
      const next: Record<string, number> = {};
      for (const k of Object.keys(prev)) {
        if (!k.startsWith(`${generatorId}.`)) next[k] = prev[k];
      }
      return next;
    });
  };

  // Room labeling
  const [labelRooms, setLabelRooms] = useState<boolean>(() => themeSupportsRoomLabels(themeId));
  const showLabelRoomsToggle =
    generatorId === 'rooms-and-corridors' && themeSupportsRoomLabels(themeId);

  // Corridor strategy
  const [corridorStrategyId, setCorridorStrategyId] = useState<string>(DEFAULT_CORRIDOR_STRATEGY_ID);
  const showCorridorStrategy = generatorId === 'rooms-and-corridors';
  const corridorStrategy = getCorridorStrategy(corridorStrategyId);

  const [corridorContinuity, setCorridorContinuity] = useState<number>(0.5);

  // Dungeon shape
  const [dungeonShapeId, setDungeonShapeId] = useState<string>(DEFAULT_DUNGEON_SHAPE);
  const showDungeonShape = generatorId === 'rooms-and-corridors';
  const dungeonShape = getDungeonShape(dungeonShapeId);

  // Dead-end removal
  const [deadEndRemoval, setDeadEndRemoval] = useState<number>(0);
  const showDeadEndRemoval = generatorId === 'rooms-and-corridors';

  // Name rooms
  const [nameRooms, setNameRooms] = useState<boolean>(false);
  const showNameRooms = showLabelRoomsToggle && labelRooms;

  // Fill background
  const [fillBackground, setFillBackground] = useState<boolean>(true);

  // Selection handling
  const selectionUsable = !!selection &&
    selection.w >= MIN_SELECTION_DIM &&
    selection.h >= MIN_SELECTION_DIM;
  const [intoSelectionRaw, setIntoSelection] = useState<boolean>(false);
  const intoSelection = intoSelectionRaw && selectionUsable;

  const generator = getGenerator(generatorId);
  const clampDim = (n: number) => Math.min(MAX_DIM, Math.max(MIN_DIM, Math.floor(n)));

  const handleReroll = () => setSeedText(seedToString(randomSeed()));

  const handleGenerate = () => {
    const w = intoSelection && selection ? selection.w : clampDim(Number(width));
    const h = intoSelection && selection ? selection.h : clampDim(Number(height));
    if (!Number.isFinite(w) || !Number.isFinite(h)) {
      setError('Width and height must be numbers.');
      return;
    }
    if (hasExistingContent && !intoSelection) {
      const ok = window.confirm(
        'This will replace the current map. Notes and tokens will be cleared. Continue?'
      );
      if (!ok) return;
    }
    const seed = parseSeed(seedText);
    try {
      const tileMix: Record<string, number> = {};
      for (const spec of sliderSpecs) {
        const k = `${generatorId}.${spec.key}`;
        if (k in mixOverrides) tileMix[spec.key] = mixOverrides[k];
      }
      const result = generator.generate({
        width: w,
        height: h,
        seed,
        density,
        themeId,
        tileMix,
        labelRooms: showLabelRoomsToggle ? labelRooms : false,
        nameRooms: showNameRooms ? nameRooms : false,
        corridorStrategy: showCorridorStrategy ? corridorStrategyId : undefined,
        corridorContinuity: showCorridorStrategy ? corridorContinuity : undefined,
        dungeonShape: showDungeonShape ? dungeonShapeId : undefined,
        deadEndRemoval: showDeadEndRemoval ? deadEndRemoval : undefined,
      });
      if (fillBackground) {
        for (const row of result.tiles) {
          for (let i = 0; i < row.length; i++) {
            if (row[i].type === 'empty') {
              row[i] = { type: 'background' };
            }
          }
        }
      }
      const suggestedName = `Generated ${generator.name}`;
      if (intoSelection && selection) {
        onGenerate(result, suggestedName, selection);
      } else {
        onGenerate(result, suggestedName);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.');
    }
  };

  return (
    <>
      <p className="generate-dialog-help">
        Procedurally creates a map in the current theme ({themeId}). The
        generator only emits the standard tile types — every theme renders
        them in its own style.
      </p>

      <label className="generate-dialog-row">
        <span>Algorithm</span>
        <select value={generatorId} onChange={e => setGeneratorId(e.target.value)}>
          {GENERATOR_LIST.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </label>
      <p className="generate-dialog-description">{generator.description}</p>

      {showCorridorStrategy && (
        <>
          <label className="generate-dialog-row">
            <span>Corridor style</span>
            <select value={corridorStrategyId} onChange={e => setCorridorStrategyId(e.target.value)}>
              {CORRIDOR_STRATEGY_LIST.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <p className="generate-dialog-description">{corridorStrategy.description}</p>
          <label className="generate-dialog-row">
            <span>
              Corridor bend ({corridorContinuity < 0.35 ? 'winding' : corridorContinuity > 0.65 ? 'straight' : 'default'})
            </span>
            <input type="range" min={0} max={1} step={0.05} value={corridorContinuity} onChange={e => setCorridorContinuity(Number(e.target.value))} />
          </label>
        </>
      )}

      {showDungeonShape && (
        <>
          <label className="generate-dialog-row">
            <span>Dungeon shape</span>
            <select value={dungeonShapeId} onChange={e => setDungeonShapeId(e.target.value)}>
              {DUNGEON_SHAPE_LIST.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <p className="generate-dialog-description">{dungeonShape.description}</p>
        </>
      )}

      {showDeadEndRemoval && (
        <label className="generate-dialog-row">
          <span>
            Dead-end pruning ({deadEndRemoval === 0 ? 'off' : deadEndRemoval >= 1 ? 'max' : `${Math.round(deadEndRemoval * 100)}%`})
          </span>
          <input type="range" min={0} max={1} step={0.05} value={deadEndRemoval} onChange={e => setDeadEndRemoval(Number(e.target.value))} />
        </label>
      )}

      <div className="generate-dialog-row generate-dialog-grid-2">
        <label>
          <span>Width</span>
          <input type="number" min={MIN_DIM} max={MAX_DIM} step={DIM_STEP} value={intoSelection && selection ? selection.w : width} disabled={intoSelection} onChange={e => setWidth(Number(e.target.value))} />
        </label>
        <label>
          <span>Height</span>
          <input type="number" min={MIN_DIM} max={MAX_DIM} step={DIM_STEP} value={intoSelection && selection ? selection.h : height} disabled={intoSelection} onChange={e => setHeight(Number(e.target.value))} />
        </label>
      </div>

      {selection && (
        <label className="generate-dialog-row generate-dialog-checkbox">
          <input type="checkbox" checked={intoSelection} disabled={!selectionUsable} onChange={e => setIntoSelection(e.target.checked)} />
          <span>
            Generate into selection
            {selectionUsable
              ? ` (${selection.w} × ${selection.h} at ${selection.x}, ${selection.y})`
              : ` (selection too small — needs at least ${MIN_SELECTION_DIM} × ${MIN_SELECTION_DIM})`}
          </span>
        </label>
      )}

      <label className="generate-dialog-row">
        <span>Density ({density.toFixed(2)})</span>
        <input type="range" min={MIN_DENSITY} max={MAX_DENSITY} step={0.05} value={density} onChange={e => setDensity(Number(e.target.value))} />
      </label>

      {sliderSpecs.length > 0 && (
        <details className="generate-dialog-mix" open>
          <summary>
            Tile mix
            <button
              type="button"
              className="generate-dialog-mix-reset"
              onClick={e => { e.stopPropagation(); resetMixToDefaults(); }}
              title="Reset all tile-mix sliders to the theme defaults"
            >
              Reset
            </button>
          </summary>
          {sliderSpecs.map(spec => {
            const v = tileMixValue(spec.key);
            return (
              <label className="generate-dialog-row" key={spec.key}>
                <span>{spec.label} ({spec.format(v)})</span>
                <input type="range" min={spec.min} max={spec.max} step={spec.step} value={v} onChange={e => setTileMixValue(spec.key, Number(e.target.value))} />
                {spec.hint && <span className="generate-dialog-mix-hint">{spec.hint}</span>}
              </label>
            );
          })}
        </details>
      )}

      {showLabelRoomsToggle && (
        <label className="generate-dialog-row generate-dialog-checkbox">
          <input type="checkbox" checked={labelRooms} onChange={e => setLabelRooms(e.target.checked)} />
          <span>Label rooms with theme archetypes (e.g. Bridge, Great Hall)</span>
        </label>
      )}

      {showNameRooms && (
        <label className="generate-dialog-row generate-dialog-checkbox">
          <input type="checkbox" checked={nameRooms} onChange={e => setNameRooms(e.target.checked)} />
          <span>Add procedural names (e.g. Crypt of the Crimson Veil)</span>
        </label>
      )}

      <label className="generate-dialog-row generate-dialog-checkbox">
        <input type="checkbox" checked={fillBackground} onChange={e => setFillBackground(e.target.checked)} />
        <span>Fill empty space with background tile</span>
      </label>

      <label className="generate-dialog-row">
        <span>Seed</span>
        <div className="generate-dialog-seed-row">
          <input type="text" value={seedText} onChange={e => setSeedText(e.target.value)} placeholder="random" spellCheck={false} />
          <button type="button" onClick={handleReroll} title="Generate a new random seed">🎲</button>
        </div>
      </label>

      {hasExistingContent && !intoSelection && (
        <div className="generate-dialog-warning" role="alert">
          ⚠️ This will replace the current map. Notes and tokens will be
          cleared. (Tile / fog changes can be reverted with Undo.)
        </div>
      )}
      {intoSelection && selection && (
        <div className="generate-dialog-info" role="note">
          Only cells inside the selection will be overwritten. Existing
          notes, tokens, and fog elsewhere on the map are preserved
          (tile changes can be reverted with Undo).
        </div>
      )}
      {error && (
        <div className="generate-dialog-warning" role="alert">{error}</div>
      )}

      <div className="generate-dialog-buttons">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" className="primary" onClick={handleGenerate}>Generate</button>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Samples Panel (premade map gallery)                                */
/* ------------------------------------------------------------------ */

interface SamplesPanelProps {
  hasExistingContent: boolean;
  onCancel: () => void;
  onLoadProject: (project: DungeonProject) => void;
}

const SamplesPanel: React.FC<SamplesPanelProps> = ({
  hasExistingContent, onCancel, onLoadProject,
}) => {
  const themes = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of PREMADE_MAP_SUMMARIES) seen.set(s.themeId, s.themeLabel);
    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Collect unique archetype categories for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of PREMADE_MAP_SUMMARIES) set.add(s.category);
    return Array.from(set).sort();
  }, []);

  const [themeFilter, setThemeFilter] = useState<string>(ALL_FILTER);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_FILTER);
  const [confirmLoadId, setConfirmLoadId] = useState<string | null>(null);

  const filtered = useMemo(
    () => PREMADE_MAP_SUMMARIES.filter(s =>
      (themeFilter === ALL_FILTER || s.themeId === themeFilter) &&
      (categoryFilter === ALL_FILTER || s.category === categoryFilter)
    ),
    [themeFilter, categoryFilter]
  );

  const [selectedId, setSelectedId] = useState<string>(filtered[0]?.id ?? '');
  const currentSelectedId = useMemo(
    () => filtered.some(s => s.id === selectedId) ? selectedId : filtered[0]?.id ?? '',
    [filtered, selectedId]
  );

  const selected = useMemo(
    () => PREMADE_MAP_SUMMARIES.find(s => s.id === currentSelectedId) ?? filtered[0],
    [currentSelectedId, filtered]
  );

  const handleLoad = () => {
    if (!selected) return;
    if (hasExistingContent && confirmLoadId !== selected.id) {
      setConfirmLoadId(selected.id);
      return;
    }
    onLoadProject(buildPremadeProject(selected.id));
    setConfirmLoadId(null);
  };

  return (
    <>
      <p className="generate-dialog-help">
        Load an original, generator-directed map that ships with themed
        names, tokens, light sources, linked stairs where appropriate, and
        fog-of-war ready for play.
      </p>

      <div className="generate-hub-filters">
        <label className="generate-dialog-row">
          <span>Theme</span>
          <select
            value={themeFilter}
            onChange={e => {
              setThemeFilter(e.target.value);
              setConfirmLoadId(null);
            }}
          >
            <option value={ALL_FILTER}>All themes</option>
            {themes.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="generate-dialog-row">
          <span>Archetype</span>
          <select
            value={categoryFilter}
            onChange={e => {
              setCategoryFilter(e.target.value);
              setConfirmLoadId(null);
            }}
          >
            <option value={ALL_FILTER}>All archetypes</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="premade-dialog-layout">
        <div className="premade-list" role="listbox" aria-label="Sample maps">
          {filtered.length === 0 && (
            <div className="premade-list-empty">No maps match the current filters.</div>
          )}
          {filtered.map(summary => (
            <SampleListItem
              key={summary.id}
              summary={summary}
              selected={summary.id === selected?.id}
              onSelect={() => {
                setSelectedId(summary.id);
                setConfirmLoadId(null);
              }}
            />
          ))}
        </div>

        {selected && (
          <section className="premade-details" aria-live="polite">
            <div className="premade-details-theme">{selected.themeLabel}</div>
            <h3>{selected.name}</h3>
            <p>{selected.description}</p>
            <dl>
              <div>
                <dt>Type</dt>
                <dd>{selected.category}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{selected.sizeLabel}</dd>
              </div>
              <div>
                <dt>Levels</dt>
                <dd>{selected.levelCount}</dd>
              </div>
            </dl>
          </section>
        )}
      </div>

      {hasExistingContent && (
        <div className="generate-dialog-warning" role="alert">
          {confirmLoadId === selected?.id
            ? '⚠️ Click Confirm Load to replace the current project with this sample map.'
            : '⚠️ Loading a sample map replaces the current project.'}
        </div>
      )}

      <div className="generate-dialog-buttons">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className="primary"
          onClick={handleLoad}
          disabled={!selected}
        >
          {confirmLoadId === selected?.id ? 'Confirm Load' : 'Load Sample'}
        </button>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Sample list item                                                   */
/* ------------------------------------------------------------------ */

interface SampleListItemProps {
  summary: PremadeMapSummary;
  selected: boolean;
  onSelect: () => void;
}

const SampleListItem: React.FC<SampleListItemProps> = ({ summary, selected, onSelect }) => (
  <button
    type="button"
    className={`premade-list-item ${selected ? 'active' : ''}`}
    onClick={onSelect}
    role="option"
    aria-selected={selected}
  >
    <span className="premade-list-title">{summary.name}</span>
    <span className="premade-list-meta">
      {summary.themeLabel} · {summary.category} · {summary.sizeLabel}
      {summary.levelCount > 1 ? ` · ${summary.levelCount} levels` : ''}
    </span>
  </button>
);

export default GenerateHub;
