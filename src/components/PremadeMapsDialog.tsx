import React, { useEffect, useMemo, useState } from 'react';
import type { DungeonProject } from '../types/map';
import {
  PREMADE_MAP_SUMMARIES,
  buildPremadeProject,
  type PremadeMapSummary,
} from '../utils/premadeMaps';

interface PremadeMapsDialogProps {
  currentHasContent: boolean;
  onCancel: () => void;
  onLoadProject: (project: DungeonProject) => void;
}

const ALL_THEMES = 'all';

const PremadeMapsDialog: React.FC<PremadeMapsDialogProps> = ({
  currentHasContent,
  onCancel,
  onLoadProject,
}) => {
  const themes = useMemo(() => {
    const seen = new Map<string, string>();
    for (const summary of PREMADE_MAP_SUMMARIES) {
      seen.set(summary.themeId, summary.themeLabel);
    }
    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const [themeFilter, setThemeFilter] = useState<string>(ALL_THEMES);
  const [confirmLoadId, setConfirmLoadId] = useState<string | null>(null);
  const filtered = useMemo(
    () => PREMADE_MAP_SUMMARIES.filter(summary =>
      themeFilter === ALL_THEMES || summary.themeId === themeFilter
    ),
    [themeFilter]
  );
  const [selectedId, setSelectedId] = useState<string>(filtered[0]?.id ?? '');
  const currentSelectedId = useMemo(
    () => filtered.some(summary => summary.id === selectedId)
      ? selectedId
      : filtered[0]?.id ?? '',
    [filtered, selectedId]
  );

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

  const selected = useMemo(
    () => PREMADE_MAP_SUMMARIES.find(summary => summary.id === currentSelectedId) ?? filtered[0],
    [currentSelectedId, filtered]
  );

  const handleLoad = () => {
    if (!selected) return;
    if (currentHasContent && confirmLoadId !== selected.id) {
      setConfirmLoadId(selected.id);
      return;
    }
    onLoadProject(buildPremadeProject(selected.id));
    setConfirmLoadId(null);
  };

  return (
    <div
      className="generate-dialog-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="premade-dialog-title"
    >
      <div className="generate-dialog premade-dialog">
        <div className="generate-dialog-title-row">
          <h2 id="premade-dialog-title" className="generate-dialog-title">
            🗺 Sample Maps
          </h2>
        </div>
        <p className="generate-dialog-help">
          Load an original, generator-directed map that ships with themed
          names, tokens, light sources, linked stairs where appropriate, and
          fog-of-war ready for play.
        </p>

        <label className="generate-dialog-row">
          <span>Theme</span>
          <select
            value={themeFilter}
            onChange={e => {
              setThemeFilter(e.target.value);
              setConfirmLoadId(null);
            }}
          >
            <option value={ALL_THEMES}>All themes</option>
            {themes.map(theme => (
              <option key={theme.id} value={theme.id}>{theme.label}</option>
            ))}
          </select>
        </label>

        <div className="premade-dialog-layout">
          <div className="premade-list" role="listbox" aria-label="Sample maps">
            {filtered.map(summary => (
              <PremadeListItem
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

        {currentHasContent && (
          <div className="generate-dialog-warning" role="alert" aria-live="polite">
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
      </div>
    </div>
  );
};

interface PremadeListItemProps {
  summary: PremadeMapSummary;
  selected: boolean;
  onSelect: () => void;
}

const PremadeListItem: React.FC<PremadeListItemProps> = ({ summary, selected, onSelect }) => (
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

export default PremadeMapsDialog;
