import React, { useEffect, useMemo, useState } from 'react';
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
  onCancel: () => void;
  onGenerate: (result: GeneratedMap, suggestedName: string) => void;
}

const MIN_DIM = 8;
const MAX_DIM = 128;

const GenerateMapDialog: React.FC<GenerateMapDialogProps> = ({
  themeId, initialWidth, initialHeight, hasExistingContent, onCancel, onGenerate,
}) => {
  const defaultGen = useMemo(() => pickGeneratorForTheme(themeId), [themeId]);
  const [generatorId, setGeneratorId] = useState<string>(defaultGen.id);
  const [width, setWidth] = useState<number>(initialWidth);
  const [height, setHeight] = useState<number>(initialHeight);
  const [density, setDensity] = useState<number>(1);
  const [seedText, setSeedText] = useState<string>(() => seedToString(randomSeed()));
  const [error, setError] = useState<string | null>(null);

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
    const w = clampDim(Number(width));
    const h = clampDim(Number(height));
    if (!Number.isFinite(w) || !Number.isFinite(h)) {
      setError('Width and height must be numbers.');
      return;
    }
    if (hasExistingContent) {
      const ok = window.confirm(
        'This will replace the current map. Notes and tokens will be cleared. Continue?'
      );
      if (!ok) return;
    }
    const seed = parseSeed(seedText);
    try {
      const result = generator.generate({ width: w, height: h, seed, density });
      const suggestedName = `Generated ${generator.name}`;
      onGenerate(result, suggestedName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.');
    }
  };

  return (
    <div
      className="generate-dialog-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-dialog-title"
    >
      <div className="generate-dialog">
        <h2 id="generate-dialog-title" className="generate-dialog-title">
          🎲 Generate Map
        </h2>
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

        <div className="generate-dialog-row generate-dialog-grid-2">
          <label>
            <span>Width</span>
            <input
              type="number"
              min={MIN_DIM}
              max={MAX_DIM}
              value={width}
              onChange={e => setWidth(Number(e.target.value))}
            />
          </label>
          <label>
            <span>Height</span>
            <input
              type="number"
              min={MIN_DIM}
              max={MAX_DIM}
              value={height}
              onChange={e => setHeight(Number(e.target.value))}
            />
          </label>
        </div>

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

        {hasExistingContent && (
          <div className="generate-dialog-warning" role="alert">
            ⚠️ This will replace the current map. Notes and tokens will be
            cleared. (Tile / fog changes can be reverted with Undo.)
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
