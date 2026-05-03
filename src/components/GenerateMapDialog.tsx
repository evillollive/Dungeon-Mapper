import React, { useEffect, useMemo, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
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

interface GenerateMapDialogProps {
  /** Theme id of the current map — used to pick the default algorithm. */
  themeId: string;
  /** Initial width / height prefilled from the current map's meta. */
  initialWidth: number;
  initialHeight: number;
  /**
   * True if the current map already contains user-painted tiles. When set,
   * the dialog shows a stronger "this will replace the current map" warning
   * and asks for explicit confirmation before generating.
   */
  hasExistingContent: boolean;
  /**
   * Optional active selection rectangle (in tile coordinates). When
   * present, the dialog offers a "Generate into selection" toggle that
   * confines generation to the selected region — only those cells are
   * overwritten and the rest of the map is preserved. When absent (or
   * too small to host a useful map), the toggle is hidden.
   */
  selection?: { x: number; y: number; w: number; h: number } | null;
  onCancel: () => void;
  /**
   * Called with the generator's output and a suggested map name. When the
   * user opted in to "Generate into selection", `target` carries the
   * selection rectangle so the caller can stamp the result into the
   * existing map at that offset instead of replacing the whole canvas.
   */
  onGenerate: (
    result: GeneratedMap,
    suggestedName: string,
    target?: { x: number; y: number; w: number; h: number }
  ) => void;
}

const MIN_DIM = 8;
const MAX_DIM = 128;
/**
 * Spinner step for the Width / Height number inputs. Aligned to the
 * "standard" map sizes (8, 16, 24, 32, …) so clicking the up/down
 * arrows jumps between common sizes. Users can still type any integer
 * — `clampDim` only constrains it to `[MIN_DIM, MAX_DIM]`.
 */
const DIM_STEP = 8;

/** Allowed values for the dialog-local size scaler (small → large). */
const DIALOG_SCALE_OPTIONS = [0.85, 1, 1.15, 1.3, 1.5] as const;
const DEFAULT_DIALOG_SCALE = 1;
const DIALOG_SCALE_STORAGE_KEY = 'dungeon-mapper:generate-dialog-scale';

const loadInitialDialogScale = (): number => {
  if (typeof window === 'undefined') return DEFAULT_DIALOG_SCALE;
  try {
    const raw = window.localStorage.getItem(DIALOG_SCALE_STORAGE_KEY);
    if (!raw) return DEFAULT_DIALOG_SCALE;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_DIALOG_SCALE;
    // Snap to the nearest allowed option so we never end up with a
    // size the +/- buttons can't navigate away from.
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

/**
 * Smallest selection rectangle the "Generate into selection" toggle
 * accepts. The generators need a bit of room (rooms-and-corridors needs
 * at least ~6 cells per side to fit any room plus a wall outline), so we
 * gate the toggle on this minimum to avoid producing degenerate output
 * — the user can still generate a full map at that size from the
 * regular Width/Height fields.
 */
const MIN_SELECTION_DIM = 6;

const GenerateMapDialog: React.FC<GenerateMapDialogProps> = ({
  themeId, initialWidth, initialHeight, hasExistingContent, selection, onCancel, onGenerate,
}) => {
  const defaultGen = useMemo(() => pickGeneratorForTheme(themeId), [themeId]);
  const [generatorId, setGeneratorId] = useState<string>(defaultGen.id);
  const [width, setWidth] = useState<number>(initialWidth);
  const [height, setHeight] = useState<number>(initialHeight);
  const [density, setDensity] = useState<number>(1);
  const [seedText, setSeedText] = useState<string>(() => seedToString(randomSeed()));
  const [error, setError] = useState<string | null>(null);

  const focusTrapRef = useFocusTrap();

  // Dialog-local size scaler — independent of the global --ui-scale so
  // tweaking it here doesn't double-scale with the app-wide setting.
  // Persisted to localStorage so the user's preferred dialog size
  // sticks across opens.
  const [dialogScale, setDialogScale] = useState<number>(loadInitialDialogScale);
  useEffect(() => {
    try {
      window.localStorage.setItem(DIALOG_SCALE_STORAGE_KEY, String(dialogScale));
    } catch {
      // Storage may be unavailable (private mode); fall back to in-memory only.
    }
  }, [dialogScale]);
  const scaleIndex = DIALOG_SCALE_OPTIONS.indexOf(
    dialogScale as typeof DIALOG_SCALE_OPTIONS[number]
  );
  const safeScaleIndex = scaleIndex < 0
    ? DIALOG_SCALE_OPTIONS.indexOf(DEFAULT_DIALOG_SCALE as typeof DIALOG_SCALE_OPTIONS[number])
    : scaleIndex;
  const canShrink = safeScaleIndex > 0;
  const canGrow = safeScaleIndex < DIALOG_SCALE_OPTIONS.length - 1;
  const scaleDown = () => {
    if (canShrink) setDialogScale(DIALOG_SCALE_OPTIONS[safeScaleIndex - 1]);
  };
  const scaleUp = () => {
    if (canGrow) setDialogScale(DIALOG_SCALE_OPTIONS[safeScaleIndex + 1]);
  };

  // Slider values for the per-tile-type "Tile mix" section. The map is
  // keyed by `${generatorId}.${sliderKey}` so each generator keeps its
  // own values when the user flips between algorithms in the dropdown
  // without losing what they had dialed in. Missing entries fall back
  // to the generator's theme-aware defaults at read time, so the UI
  // always opens in a non-surprising state.
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
    // Drop only the entries belonging to the current generator so the
    // user's tweaks for other generators are preserved.
    setMixOverrides(prev => {
      const next: Record<string, number> = {};
      for (const k of Object.keys(prev)) {
        if (!k.startsWith(`${generatorId}.`)) next[k] = prev[k];
      }
      return next;
    });
  };

  // Per-room labeling — defaults to ON when the active theme has a room
  // archetype palette (built spaces like castle / starship / city) and
  // OFF for themes that don't, matching their lack of room kinds.
  const [labelRooms, setLabelRooms] = useState<boolean>(() => themeSupportsRoomLabels(themeId));
  const showLabelRoomsToggle =
    generatorId === 'rooms-and-corridors' && themeSupportsRoomLabels(themeId);

  // Corridor-shaping algorithm. Only the rooms-and-corridors generator
  // honors this; for other generators the value is ignored. The default
  // (`'straight-l'`) reproduces the legacy in-line behavior so existing
  // seeds keep producing identical maps until the user picks otherwise.
  const [corridorStrategyId, setCorridorStrategyId] = useState<string>(
    DEFAULT_CORRIDOR_STRATEGY_ID
  );
  const showCorridorStrategy = generatorId === 'rooms-and-corridors';
  const corridorStrategy = getCorridorStrategy(corridorStrategyId);

  // Corridor continuity — 0 = maximum bends, 0.5 = default, 1 = straightest.
  const [corridorContinuity, setCorridorContinuity] = useState<number>(0.5);

  // Dungeon shape — only rooms-and-corridors supports non-rectangular
  // shapes. The default 'rectangle' reproduces the legacy behavior.
  const [dungeonShapeId, setDungeonShapeId] = useState<string>(DEFAULT_DUNGEON_SHAPE);
  const showDungeonShape = generatorId === 'rooms-and-corridors';
  const dungeonShape = getDungeonShape(dungeonShapeId);

  // Dead-end removal — 0 = no removal (legacy), 1 = remove all.
  const [deadEndRemoval, setDeadEndRemoval] = useState<number>(0);
  const showDeadEndRemoval = generatorId === 'rooms-and-corridors';

  // Procedural room naming — appends flavor text to room kind labels.
  const [nameRooms, setNameRooms] = useState<boolean>(false);
  const showNameRooms = showLabelRoomsToggle && labelRooms;

  // Fill empty cells with the theme background tile after generation.
  const [fillBackground, setFillBackground] = useState<boolean>(true);

  // True when the current selection is large enough to host a generator
  // run. Falls back to false (and disables the toggle) when no selection
  // is active or the rectangle is too small to be useful.
  const selectionUsable = !!selection &&
    selection.w >= MIN_SELECTION_DIM &&
    selection.h >= MIN_SELECTION_DIM;
  const [intoSelectionRaw, setIntoSelection] = useState<boolean>(false);
  // If the selection becomes unavailable (cleared, or shrunk below the
  // minimum) the stored toggle is ignored — we never act on it without a
  // usable selection. Deriving here (rather than syncing via an effect)
  // keeps the state model simple and avoids cascading renders.
  const intoSelection = intoSelectionRaw && selectionUsable;

  // Esc cancels the dialog so it behaves like a native modal.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const generator = getGenerator(generatorId);

  const clampDim = (n: number) => Math.min(MAX_DIM, Math.max(MIN_DIM, Math.floor(n)));

  const handleReroll = () => setSeedText(seedToString(randomSeed()));

  const handleGenerate = () => {
    // When generating into a selection, the dimensions come from the
    // selection rectangle and the W/H inputs are ignored. Otherwise we
    // clamp the user-entered values to the supported map size range.
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
      // Build the slider payload from the user's overrides so generators
      // that don't see any change reproduce the legacy behavior exactly.
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
      // Post-processing: fill remaining empty cells with background tile.
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
    <div
      ref={focusTrapRef}
      className="generate-dialog-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-dialog-title"
    >
      <div
        className="generate-dialog"
        style={{ ['--gen-dialog-scale' as string]: String(dialogScale) }}
      >
        <div className="generate-dialog-title-row">
          <h2 id="generate-dialog-title" className="generate-dialog-title">
            🎲 Generate Map
          </h2>
          <div
            className="generate-dialog-scale"
            role="group"
            aria-label="Dialog text size"
          >
            <button
              type="button"
              onClick={scaleDown}
              disabled={!canShrink}
              title="Shrink dialog text"
              aria-label="Shrink dialog text"
            >
              A−
            </button>
            <span className="generate-dialog-scale-label" aria-hidden="true">
              {Math.round(dialogScale * 100)}%
            </span>
            <button
              type="button"
              onClick={scaleUp}
              disabled={!canGrow}
              title="Enlarge dialog text"
              aria-label="Enlarge dialog text"
            >
              A+
            </button>
          </div>
        </div>
        <p className="generate-dialog-help">
          Procedurally creates a map in the current theme ({themeId}). The
          generator only emits the standard tile types — every theme renders
          them in its own style.
        </p>

        <label className="generate-dialog-row">
          <span>Algorithm</span>
          <select
            value={generatorId}
            onChange={e => setGeneratorId(e.target.value)}
          >
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
              <select
                value={corridorStrategyId}
                onChange={e => setCorridorStrategyId(e.target.value)}
              >
                {CORRIDOR_STRATEGY_LIST.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <p className="generate-dialog-description">
              {corridorStrategy.description}
            </p>
            <label className="generate-dialog-row">
              <span>
                Corridor bend ({corridorContinuity < 0.35 ? 'winding' : corridorContinuity > 0.65 ? 'straight' : 'default'})
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={corridorContinuity}
                onChange={e => setCorridorContinuity(Number(e.target.value))}
              />
            </label>
          </>
        )}

        {showDungeonShape && (
          <>
            <label className="generate-dialog-row">
              <span>Dungeon shape</span>
              <select
                value={dungeonShapeId}
                onChange={e => setDungeonShapeId(e.target.value)}
              >
                {DUNGEON_SHAPE_LIST.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <p className="generate-dialog-description">
              {dungeonShape.description}
            </p>
          </>
        )}

        {showDeadEndRemoval && (
          <label className="generate-dialog-row">
            <span>
              Dead-end pruning ({deadEndRemoval === 0 ? 'off' : deadEndRemoval >= 1 ? 'max' : `${Math.round(deadEndRemoval * 100)}%`})
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={deadEndRemoval}
              onChange={e => setDeadEndRemoval(Number(e.target.value))}
            />
          </label>
        )}

        <div className="generate-dialog-row generate-dialog-grid-2">
          <label>
            <span>Width</span>
            <input
              type="number"
              min={MIN_DIM}
              max={MAX_DIM}
              step={DIM_STEP}
              value={intoSelection && selection ? selection.w : width}
              disabled={intoSelection}
              onChange={e => setWidth(Number(e.target.value))}
            />
          </label>
          <label>
            <span>Height</span>
            <input
              type="number"
              min={MIN_DIM}
              max={MAX_DIM}
              step={DIM_STEP}
              value={intoSelection && selection ? selection.h : height}
              disabled={intoSelection}
              onChange={e => setHeight(Number(e.target.value))}
            />
          </label>
        </div>

        {selection && (
          <label className="generate-dialog-row generate-dialog-checkbox">
            <input
              type="checkbox"
              checked={intoSelection}
              disabled={!selectionUsable}
              onChange={e => setIntoSelection(e.target.checked)}
            />
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
          <input
            type="range"
            min={MIN_DENSITY}
            max={MAX_DENSITY}
            step={0.05}
            value={density}
            onChange={e => setDensity(Number(e.target.value))}
          />
        </label>

        {sliderSpecs.length > 0 && (
          <details className="generate-dialog-mix" open>
            <summary>
              Tile mix
              <button
                type="button"
                className="generate-dialog-mix-reset"
                onClick={e => {
                  // Don't toggle the <details> when the user clicks Reset.
                  e.stopPropagation();
                  resetMixToDefaults();
                }}
                title="Reset all tile-mix sliders to the theme defaults"
              >
                Reset
              </button>
            </summary>
            {sliderSpecs.map(spec => {
              const v = tileMixValue(spec.key);
              return (
                <label className="generate-dialog-row" key={spec.key}>
                  <span>
                    {spec.label} ({spec.format(v)})
                  </span>
                  <input
                    type="range"
                    min={spec.min}
                    max={spec.max}
                    step={spec.step}
                    value={v}
                    onChange={e => setTileMixValue(spec.key, Number(e.target.value))}
                  />
                  {spec.hint && (
                    <span className="generate-dialog-mix-hint">{spec.hint}</span>
                  )}
                </label>
              );
            })}
          </details>
        )}

        {showLabelRoomsToggle && (
          <label className="generate-dialog-row generate-dialog-checkbox">
            <input
              type="checkbox"
              checked={labelRooms}
              onChange={e => setLabelRooms(e.target.checked)}
            />
            <span>
              Label rooms with theme archetypes (e.g. Bridge, Great Hall)
            </span>
          </label>
        )}

        {showNameRooms && (
          <label className="generate-dialog-row generate-dialog-checkbox">
            <input
              type="checkbox"
              checked={nameRooms}
              onChange={e => setNameRooms(e.target.checked)}
            />
            <span>
              Add procedural names (e.g. Crypt of the Crimson Veil)
            </span>
          </label>
        )}

        <label className="generate-dialog-row generate-dialog-checkbox">
          <input
            type="checkbox"
            checked={fillBackground}
            onChange={e => setFillBackground(e.target.checked)}
          />
          <span>
            Fill empty space with background tile
          </span>
        </label>

        <label className="generate-dialog-row">
          <span>Seed</span>
          <div className="generate-dialog-seed-row">
            <input
              type="text"
              value={seedText}
              onChange={e => setSeedText(e.target.value)}
              placeholder="random"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={handleReroll}
              title="Generate a new random seed"
            >
              🎲
            </button>
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
          <button
            type="button"
            className="primary"
            onClick={handleGenerate}
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateMapDialog;
