import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DPI_OPTIONS,
  PAGE_PRESETS,
  exportHighResPNG,
  type HighResExportOptions,
} from '../utils/export';
import type { CustomThemeDefinition, DungeonMap, ViewMode } from '../types/map';

interface ExportDialogProps {
  map: DungeonMap;
  themeId: string;
  printMode: boolean;
  viewMode: ViewMode;
  onClose: () => void;
  /** Feet per tile cell for the scale bar (0 = no scale bar). */
  feetPerCell?: number;
  customThemes?: readonly CustomThemeDefinition[];
}

/** Images above this pixel count trigger a performance warning. */
const LARGE_IMAGE_THRESHOLD = 200_000_000;

const ExportDialog: React.FC<ExportDialogProps> = ({
  map, themeId, printMode, viewMode, onClose, feetPerCell = 0, customThemes = [],
}) => {
  const [dpi, setDpi] = useState<number>(300);
  const [pagePresetId, setPagePresetId] = useState<string>('none');
  const [usePrintMode, setUsePrintMode] = useState<boolean>(printMode);
  const [exportView, setExportView] = useState<ViewMode>(viewMode);
  const [showScaleBar, setShowScaleBar] = useState<boolean>(feetPerCell > 0);
  const [exporting, setExporting] = useState(false);

  // Close on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onClose]);

  // Computed stats shown to the user.
  const stats = useMemo(() => {
    const { width, height } = map.meta;
    const pxW = width * dpi;
    const pxH = height * dpi;
    const inW = width;
    const inH = height;
    const preset = PAGE_PRESETS.find(p => p.id === pagePresetId) ?? PAGE_PRESETS[0];
    let pages = 1;
    if (preset.id !== 'none' && preset.width > 0) {
      const pageW = Math.round(preset.width * dpi);
      const pageH = Math.round(preset.height * dpi);
      pages = Math.ceil(pxW / pageW) * Math.ceil(pxH / pageH);
    }
    return { pxW, pxH, inW, inH, pages };
  }, [map.meta, dpi, pagePresetId]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const opts: HighResExportOptions = {
        dpi,
        pagePresetId,
        themeId,
        printMode: usePrintMode,
        viewMode: exportView,
        feetPerCell: showScaleBar ? feetPerCell : 0,
        customThemes,
      };
      await exportHighResPNG(map, opts);
    } finally {
      setExporting(false);
    }
  }, [dpi, pagePresetId, themeId, usePrintMode, exportView, map, showScaleBar, feetPerCell, customThemes]);

  return (
    <div
      className="generate-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Print-Optimized Export"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="generate-dialog" style={{ maxWidth: 460 }}>
        <div className="generate-dialog-title-row">
          <h2 className="generate-dialog-title">🖨 Print-Optimized Export</h2>
        </div>

        <p className="generate-dialog-help">
          Export a high-resolution PNG suitable for printing at 1 inch per tile.
          Choose a page size to split large maps into printable pages.
        </p>

        {/* DPI */}
        <label className="generate-dialog-row">
          <span>Resolution (DPI)</span>
          <select
            value={dpi}
            onChange={e => setDpi(Number(e.target.value))}
          >
            {DPI_OPTIONS.map(d => (
              <option key={d} value={d}>{d} DPI{d === 300 ? ' (recommended)' : ''}</option>
            ))}
          </select>
        </label>

        {/* Page size */}
        <label className="generate-dialog-row">
          <span>Page Size</span>
          <select
            value={pagePresetId}
            onChange={e => setPagePresetId(e.target.value)}
          >
            {PAGE_PRESETS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>

        {/* View mode */}
        <label className="generate-dialog-row">
          <span>View Mode</span>
          <select
            value={exportView}
            onChange={e => setExportView(e.target.value as ViewMode)}
          >
            <option value="gm">GM (full map)</option>
            <option value="player">Player (fog hides content)</option>
          </select>
        </label>

        {/* Print mode toggle */}
        <label className="generate-dialog-row generate-dialog-checkbox">
          <input
            type="checkbox"
            checked={usePrintMode}
            onChange={e => setUsePrintMode(e.target.checked)}
          />
          <span>Black &amp; White / Print mode</span>
        </label>

        {/* Scale bar toggle */}
        <label className="generate-dialog-row generate-dialog-checkbox">
          <input
            type="checkbox"
            checked={showScaleBar}
            onChange={e => setShowScaleBar(e.target.checked)}
          />
          <span>Scale bar ({feetPerCell > 0 ? `${feetPerCell} ft/cell` : 'set ft/cell in Measure tool'})</span>
        </label>

        {/* Info summary */}
        <div className="generate-dialog-info" role="note">
          Output: <strong>{stats.pxW.toLocaleString()} × {stats.pxH.toLocaleString()} px</strong>
          {' '}({stats.inW}″ × {stats.inH}″ at {dpi} DPI)
          {stats.pages > 1 && (
            <> — <strong>{stats.pages} pages</strong></>
          )}
        </div>

        {stats.pxW * stats.pxH > LARGE_IMAGE_THRESHOLD && (
          <div className="generate-dialog-warning" role="alert">
            ⚠️ Very large image ({Math.round(stats.pxW * stats.pxH / 1_000_000)}MP).
            This may take a moment and use significant memory.
          </div>
        )}

        <div className="generate-dialog-buttons">
          <button type="button" onClick={onClose} disabled={exporting}>Cancel</button>
          <button
            type="button"
            className="primary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting…' : 'Export PNG'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
