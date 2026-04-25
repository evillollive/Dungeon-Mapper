import React from 'react';
import type { ToolType } from '../types/map';
import { TOKEN_KIND_COLORS } from '../types/map';

/**
 * Shared "TOKENS" toolbar section used by both the GM and Player toolbars.
 * Exposes the five token-placement tools (Player / NPC / Monster S/M/L)
 * plus the shared Move and Remove tools so token management behaves
 * identically across views.
 */

interface TokenToolsSectionProps {
  activeTool: ToolType;
  onSetTool: (tool: ToolType) => void;
}

const TOKEN_TOOLS: { id: ToolType; label: string; icon: string; kind: keyof typeof TOKEN_KIND_COLORS; title?: string }[] = [
  { id: 'token-player',      label: 'Player',     icon: '🧝', kind: 'player' },
  { id: 'token-npc',         label: 'NPC',        icon: '🧙', kind: 'npc' },
  { id: 'token-monster',     label: 'Monster S',  icon: '👹', kind: 'monster',
    title: 'Place a small (1×1) Monster token — click on a cell to drop it.' },
  { id: 'token-monster-md',  label: 'Monster M',  icon: '👹', kind: 'monster',
    title: 'Place a medium (2×2) Monster token — click on a cell to drop it.' },
  { id: 'token-monster-lg',  label: 'Monster L',  icon: '👹', kind: 'monster',
    title: 'Place a large (3×3) Monster token — click on a cell to drop it.' },
];

const TokenToolsSection: React.FC<TokenToolsSectionProps> = ({ activeTool, onSetTool }) => {
  return (
    <div className="toolbar-section">
      <div className="toolbar-label">TOKENS</div>
      {TOKEN_TOOLS.map(tool => (
        <button
          key={tool.id}
          className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
          onClick={() => onSetTool(tool.id)}
          title={tool.title ?? `Place a ${tool.label} token — click on a cell to drop it.`}
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
  );
};

export default TokenToolsSection;
