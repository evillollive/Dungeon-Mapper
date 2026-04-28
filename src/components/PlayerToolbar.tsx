import React from 'react';
import type { ToolType } from '../types/map';
import TokenToolsSection from './TokenToolsSection';

/**
 * The Player toolbar is intentionally a separate component (not a filtered
 * Toolbar) so it can evolve independently. It exposes only the player-safe
 * tools: a freehand drawing pen, a drawing eraser, three "place token"
 * buttons (player / NPC / monster), a move-token tool, and a remove-token
 * tool. It also surfaces the pen's color and brush width.
 */

interface PlayerToolbarProps {
  activeTool: ToolType;
  onSetTool: (tool: ToolType) => void;
  drawColor: string;
  onSetDrawColor: (color: string) => void;
  drawWidth: number;
  onSetDrawWidth: (w: number) => void;
  onClearPlayerDrawings: () => void;
  /**
   * Fog-of-war controls. The GM is still in charge of the map even on the
   * player side, so these controls live in the player toolbar (where the
   * fog actually shows up) instead of in the GM toolbar.
   */
  fogEnabled: boolean;
  onToggleFogEnabled: () => void;
  onResetFog: () => void;
  onClearFog: () => void;
  /** Whether dynamic (token-driven) fog of war is active. */
  dynamicFogEnabled: boolean;
  onToggleDynamicFog: () => void;
  onResetExplored: () => void;
}

const DRAW_TOOLS: { id: ToolType; label: string; icon: string; title: string }[] = [
  { id: 'pdraw',  label: 'Draw',  icon: '✒️', title: 'Freehand draw — annotate the visible map.' },
  { id: 'perase', label: 'Erase', icon: '🧽', title: 'Erase player drawings — click a stroke to remove it.' },
];

// Fog tools are drag-rectangles of cells; they only appear when fog is
// enabled for the current map. Reveal exposes cells; Hide re-covers them.
const FOG_TOOLS: { id: ToolType; label: string; shortcut: string; icon: string }[] = [
  { id: 'reveal', label: 'Reveal', shortcut: 'V', icon: '👁' },
  { id: 'hide',   label: 'Hide',   shortcut: 'H', icon: '🌫' },
];

const COLOR_SWATCHES = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#1f2937', '#ffffff'];
const BRUSH_WIDTHS: { value: number; label: string }[] = [
  { value: 0.12, label: 'Thin' },
  { value: 0.25, label: 'Medium' },
  { value: 0.5,  label: 'Thick' },
];

const PlayerToolbar: React.FC<PlayerToolbarProps> = ({
  activeTool, onSetTool,
  drawColor, onSetDrawColor,
  drawWidth, onSetDrawWidth,
  onClearPlayerDrawings,
  fogEnabled, onToggleFogEnabled, onResetFog, onClearFog,
  dynamicFogEnabled, onToggleDynamicFog, onResetExplored,
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <div className="toolbar-label">FOG OF WAR</div>
        <label
          className={`tool-btn ${fogEnabled ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
          title="Toggle fog-of-war for this map. When on, fogged cells are hidden under an opaque grey overlay in the player view."
        >
          <span className="tool-icon" aria-hidden="true">🌫</span>
          <span className="tool-name">Enabled</span>
          <input
            type="checkbox"
            checked={fogEnabled}
            onChange={onToggleFogEnabled}
            aria-label="Enable fog of war"
            style={{ margin: 0 }}
          />
        </label>
        {fogEnabled && (
          <>
            <button
              type="button"
              className={`tool-btn ${activeTool === 'defog' ? 'active' : ''}`}
              onClick={() => onSetTool('defog')}
              title="Defog brush — drag across the map to wipe fog away cell-by-cell."
              aria-label="Defog brush tool"
              aria-pressed={activeTool === 'defog'}
            >
              <span className="tool-icon" aria-hidden="true">🧹</span>
              <span className="tool-name">Defog</span>
            </button>
            {FOG_TOOLS.map(tool => (
              <button
                key={tool.id}
                type="button"
                className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
                onClick={() => onSetTool(tool.id)}
                title={`${tool.label} — drag a rectangle of cells to ${tool.id === 'reveal' ? 'reveal' : 'hide'} [${tool.shortcut}]`}
                aria-label={`${tool.label} fog tool`}
                aria-pressed={activeTool === tool.id}
                aria-keyshortcuts={tool.shortcut}
              >
                <span className="tool-icon" aria-hidden="true">{tool.icon}</span>
                <span className="tool-name">{tool.label}</span>
                <span className="tool-shortcut" aria-hidden="true">[{tool.shortcut}]</span>
              </button>
            ))}
            <button
              type="button"
              className="tool-btn"
              onClick={onResetFog}
              title="Re-fog the entire map (hide every cell)."
              aria-label="Reset fog (hide entire map)"
            >
              <span className="tool-icon" aria-hidden="true">⟲</span>
              <span className="tool-name">Reset Fog</span>
            </button>
            <button
              type="button"
              className="tool-btn"
              onClick={onClearFog}
              title="Reveal the entire map (clear all fog)."
              aria-label="Clear fog (reveal entire map)"
            >
              <span className="tool-icon" aria-hidden="true">☀</span>
              <span className="tool-name">Clear Fog</span>
            </button>
            <label
              className={`tool-btn ${dynamicFogEnabled ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
              title="Dynamic fog — auto-reveal cells visible from player tokens. Explored areas stay dimmed."
            >
              <span className="tool-icon" aria-hidden="true">👁</span>
              <span className="tool-name">Dynamic</span>
              <input
                type="checkbox"
                checked={dynamicFogEnabled}
                onChange={onToggleDynamicFog}
                aria-label="Enable dynamic fog of war"
                style={{ margin: 0 }}
              />
            </label>
            {dynamicFogEnabled && (
              <button
                type="button"
                className="tool-btn"
                onClick={onResetExplored}
                title="Clear explored memory — all explored cells return to fully fogged."
                aria-label="Reset explored cells"
              >
                <span className="tool-icon" aria-hidden="true">🔄</span>
                <span className="tool-name">Reset Explored</span>
              </button>
            )}
          </>
        )}
      </div>

      <div className="toolbar-section">
        <div className="toolbar-label">DRAW</div>
        {DRAW_TOOLS.map(tool => (
          <button
            key={tool.id}
            type="button"
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => onSetTool(tool.id)}
            title={tool.title}
            aria-label={`${tool.label} tool`}
            aria-pressed={activeTool === tool.id}
          >
            <span className="tool-icon" aria-hidden="true">{tool.icon}</span>
            <span className="tool-name">{tool.label}</span>
          </button>
        ))}
        <button
          type="button"
          className="tool-btn"
          onClick={onClearPlayerDrawings}
          title="Remove all player drawings from the map."
          aria-label="Clear all player drawings"
        >
          <span className="tool-icon" aria-hidden="true">🗑</span>
          <span className="tool-name">Clear All</span>
        </button>
      </div>

      <div className="toolbar-section">
        <div className="toolbar-label">PEN</div>
        <div
          className="tile-palette"
          // Override .tile-palette's default flex-direction:column so the
          // swatches tile into a compact grid instead of stacking one per row.
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 4,
          }}
        >
          {COLOR_SWATCHES.map(c => (
            <button
              key={c}
              type="button"
              className={`tile-btn ${drawColor === c ? 'active' : ''}`}
              onClick={() => onSetDrawColor(c)}
              title={`Color: ${c}`}
              aria-label={`Pen color ${c}`}
              aria-pressed={drawColor === c}
              // Override the default .tile-btn width:100% so the swatches
              // size to the grid cell instead of forcing one per row.
              style={{ padding: 2, width: 'auto', justifyContent: 'center' }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 22,
                  height: 22,
                  background: c,
                  border: '1px solid #2d3561',
                }}
              />
            </button>
          ))}
        </div>
        <div
          // Lay the brush-size buttons out in a horizontal grid so they
          // share a row instead of each occupying a full line.
          style={{
            marginTop: 6,
            display: 'grid',
            gridTemplateColumns: `repeat(${BRUSH_WIDTHS.length}, 1fr)`,
            gap: 4,
          }}
        >
          {BRUSH_WIDTHS.map(b => (
            <button
              key={b.value}
              type="button"
              className={`tool-btn ${Math.abs(drawWidth - b.value) < 1e-6 ? 'active' : ''}`}
              onClick={() => onSetDrawWidth(b.value)}
              title={`${b.label} brush`}
              aria-label={`${b.label} brush width`}
              aria-pressed={Math.abs(drawWidth - b.value) < 1e-6}
              // Override .tool-btn's width:100% so the buttons fit in the
              // grid columns rather than forcing one button per row.
              style={{
                width: 'auto',
                flexDirection: 'column',
                gap: 2,
                padding: '4px 4px',
                textAlign: 'center',
              }}
            >
              <span
                className="tool-icon"
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: Math.max(6, b.value * 32),
                  height: Math.max(6, b.value * 32),
                  background: drawColor,
                  borderRadius: '50%',
                }}
              />
              <span className="tool-name" style={{ flex: 'none' }}>{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      <TokenToolsSection activeTool={activeTool} onSetTool={onSetTool} />
    </div>
  );
};

export default PlayerToolbar;
