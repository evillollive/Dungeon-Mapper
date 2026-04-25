import React from 'react';
import type { ToolType } from '../types/map';
import { TOKEN_KIND_COLORS } from '../types/map';

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
}

const DRAW_TOOLS: { id: ToolType; label: string; icon: string; title: string }[] = [
  { id: 'pdraw',  label: 'Draw',  icon: '✒️', title: 'Freehand draw — annotate the visible map.' },
  { id: 'perase', label: 'Erase', icon: '🧽', title: 'Erase player drawings — click a stroke to remove it.' },
];

const TOKEN_TOOLS: { id: ToolType; label: string; icon: string; kind: keyof typeof TOKEN_KIND_COLORS }[] = [
  { id: 'token-player',  label: 'Player',  icon: '🧝', kind: 'player' },
  { id: 'token-npc',     label: 'NPC',     icon: '🧙', kind: 'npc' },
  { id: 'token-monster', label: 'Monster', icon: '👹', kind: 'monster' },
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
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <div className="toolbar-label">DRAW</div>
        {DRAW_TOOLS.map(tool => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => onSetTool(tool.id)}
            title={tool.title}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-name">{tool.label}</span>
          </button>
        ))}
        <button
          className="tool-btn"
          onClick={onClearPlayerDrawings}
          title="Remove all player drawings from the map."
        >
          <span className="tool-icon">🗑</span>
          <span className="tool-name">Clear All</span>
        </button>
      </div>

      <div className="toolbar-section">
        <div className="toolbar-label">PEN</div>
        <div
          className="tile-palette"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}
        >
          {COLOR_SWATCHES.map(c => (
            <button
              key={c}
              className={`tile-btn ${drawColor === c ? 'active' : ''}`}
              onClick={() => onSetDrawColor(c)}
              title={`Color: ${c}`}
              style={{ padding: 2 }}
            >
              <span
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
        <div style={{ marginTop: 6 }}>
          {BRUSH_WIDTHS.map(b => (
            <button
              key={b.value}
              className={`tool-btn ${Math.abs(drawWidth - b.value) < 1e-6 ? 'active' : ''}`}
              onClick={() => onSetDrawWidth(b.value)}
              title={`${b.label} brush`}
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
              <span className="tool-name">{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <div className="toolbar-label">TOKENS</div>
        {TOKEN_TOOLS.map(tool => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => onSetTool(tool.id)}
            title={`Place a ${tool.label} token — click on a cell to drop it.`}
          >
            <span
              className="tool-icon"
              style={{
                display: 'inline-block',
                width: 18, height: 18, borderRadius: '50%',
                background: TOKEN_KIND_COLORS[tool.kind],
                border: '1px solid #2d3561',
                textAlign: 'center', lineHeight: '16px',
              }}
            >
              {tool.icon}
            </span>
            <span className="tool-name">{tool.label}</span>
          </button>
        ))}
        <button
          className={`tool-btn ${activeTool === 'move-token' ? 'active' : ''}`}
          onClick={() => onSetTool('move-token')}
          title="Move a token — click and drag a token to relocate it."
        >
          <span className="tool-icon">✋</span>
          <span className="tool-name">Move Token</span>
        </button>
        <button
          className={`tool-btn ${activeTool === 'remove-token' ? 'active' : ''}`}
          onClick={() => onSetTool('remove-token')}
          title="Remove a token — click a token to delete it."
        >
          <span className="tool-icon">✕</span>
          <span className="tool-name">Remove</span>
        </button>
      </div>

      <div className="toolbar-section">
        <div className="toolbar-label">FOG OF WAR</div>
        <label
          className={`tool-btn ${fogEnabled ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
          title="Toggle fog-of-war for this map. When on, fogged cells are hidden under an opaque grey overlay in the player view."
        >
          <span className="tool-icon">🌫</span>
          <span className="tool-name">Enabled</span>
          <input
            type="checkbox"
            checked={fogEnabled}
            onChange={onToggleFogEnabled}
            style={{ margin: 0 }}
          />
        </label>
        {fogEnabled && (
          <>
            <button
              className={`tool-btn ${activeTool === 'defog' ? 'active' : ''}`}
              onClick={() => onSetTool('defog')}
              title="Defog brush — drag across the map to wipe fog away cell-by-cell."
            >
              <span className="tool-icon">🧹</span>
              <span className="tool-name">Defog</span>
            </button>
            {FOG_TOOLS.map(tool => (
              <button
                key={tool.id}
                className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
                onClick={() => onSetTool(tool.id)}
                title={`${tool.label} — drag a rectangle of cells to ${tool.id === 'reveal' ? 'reveal' : 'hide'} [${tool.shortcut}]`}
              >
                <span className="tool-icon">{tool.icon}</span>
                <span className="tool-name">{tool.label}</span>
                <span className="tool-shortcut">[{tool.shortcut}]</span>
              </button>
            ))}
            <button
              className="tool-btn"
              onClick={onResetFog}
              title="Re-fog the entire map (hide every cell)."
            >
              <span className="tool-icon">⟲</span>
              <span className="tool-name">Reset Fog</span>
            </button>
            <button
              className="tool-btn"
              onClick={onClearFog}
              title="Reveal the entire map (clear all fog)."
            >
              <span className="tool-icon">☀</span>
              <span className="tool-name">Clear Fog</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PlayerToolbar;
