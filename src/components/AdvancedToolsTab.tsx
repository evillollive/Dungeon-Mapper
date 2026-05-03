import React from 'react';
import type { ToolType, BackgroundImage } from '../types/map';

interface AdvancedToolsTabProps {
  activeTool: ToolType;
  onSetTool: (tool: ToolType) => void;
  // Background image
  backgroundImage?: BackgroundImage;
  onImportBackgroundImage: (bg: BackgroundImage) => void;
  onUpdateBackgroundImage: (patch: Partial<BackgroundImage>) => void;
  onClearBackgroundImage: () => void;
  // Stair links
  stairLinkSource: { level: number; x: number; y: number } | null;
  stairLinkCount: number;
  onClearStairLinks: () => void;
  // GM drawing
  gmDrawColor: string;
  gmDrawWidth: number;
  onSetGmDrawColor: (c: string) => void;
  onSetGmDrawWidth: (w: number) => void;
  onClearGmDrawings: () => void;
  // Scene templates
  onOpenSceneTemplates: () => void;
}

const GM_DRAW_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#74c0fc', '#b197fc', '#f783ac', '#ffffff'];
const GM_BRUSH_WIDTHS: { value: number; label: string }[] = [
  { value: 0.12, label: 'Thin' },
  { value: 0.25, label: 'Medium' },
  { value: 0.5,  label: 'Thick' },
];

const AdvancedToolsTab: React.FC<AdvancedToolsTabProps> = ({
  activeTool, onSetTool,
  backgroundImage, onImportBackgroundImage, onUpdateBackgroundImage, onClearBackgroundImage,
  stairLinkSource, stairLinkCount, onClearStairLinks,
  gmDrawColor, gmDrawWidth, onSetGmDrawColor, onSetGmDrawWidth, onClearGmDrawings,
  onOpenSceneTemplates,
}) => {
  const bgFileRef = React.useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="toolbar-section">
        <div className="toolbar-label">BACKGROUND</div>
        <input
          ref={bgFileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              onImportBackgroundImage({
                dataUrl,
                offsetX: 0,
                offsetY: 0,
                scale: 1,
                opacity: 0.5,
              });
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="tool-btn"
          onClick={() => bgFileRef.current?.click()}
          title="Import a PNG/JPG image as a background layer behind the tile grid. Useful for tracing existing battlemaps."
          aria-label="Import background image"
        >
          <span className="tool-icon" aria-hidden="true">🖼</span>
          <span className="tool-name">Import</span>
        </button>
        {backgroundImage && (
          <>
            <button
              type="button"
              className="tool-btn"
              onClick={onClearBackgroundImage}
              title="Remove the background image."
              aria-label="Remove background image"
            >
              <span className="tool-icon" aria-hidden="true">✕</span>
              <span className="tool-name">Remove</span>
            </button>
            <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Opacity</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(backgroundImage.opacity * 100)}
                onChange={e => onUpdateBackgroundImage({ opacity: Number(e.target.value) / 100 })}
                title={`Background opacity: ${Math.round(backgroundImage.opacity * 100)}%`}
                aria-label="Background image opacity"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.7rem', minWidth: 24, textAlign: 'center' }}>
                {Math.round(backgroundImage.opacity * 100)}%
              </span>
            </div>
            <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Scale</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="range"
                min={10}
                max={500}
                value={Math.round(backgroundImage.scale * 100)}
                onChange={e => onUpdateBackgroundImage({ scale: Number(e.target.value) / 100 })}
                title={`Background scale: ${Math.round(backgroundImage.scale * 100)}%`}
                aria-label="Background image scale"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.7rem', minWidth: 28, textAlign: 'center' }}>
                {Math.round(backgroundImage.scale * 100)}%
              </span>
            </div>
            <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Offset X</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="range"
                min={-50}
                max={50}
                step={0.5}
                value={backgroundImage.offsetX}
                onChange={e => onUpdateBackgroundImage({ offsetX: Number(e.target.value) })}
                title={`Background X offset: ${backgroundImage.offsetX} tiles`}
                aria-label="Background image X offset"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.7rem', minWidth: 24, textAlign: 'center' }}>
                {backgroundImage.offsetX}
              </span>
            </div>
            <div className="toolbar-sub-label" style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, marginBottom: 2 }}>Offset Y</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="range"
                min={-50}
                max={50}
                step={0.5}
                value={backgroundImage.offsetY}
                onChange={e => onUpdateBackgroundImage({ offsetY: Number(e.target.value) })}
                title={`Background Y offset: ${backgroundImage.offsetY} tiles`}
                aria-label="Background image Y offset"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.7rem', minWidth: 24, textAlign: 'center' }}>
                {backgroundImage.offsetY}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── STAIR LINKS ── */}
      <div className="toolbar-section">
        <div className="toolbar-label">STAIR LINKS</div>
        <button
          type="button"
          className={`tool-btn ${activeTool === 'link-stair' ? 'active' : ''}`}
          onClick={() => onSetTool('link-stair')}
          title="Link Stairs — click a stairs tile, switch levels, click the destination stairs tile to connect them. [K]"
          aria-label="Link Stairs tool"
          aria-pressed={activeTool === 'link-stair'}
        >
          <span className="tool-icon" aria-hidden="true">🔗</span>
          <span className="tool-name">Link</span>
          <span className="tool-shortcut" aria-hidden="true">[K]</span>
        </button>
        {activeTool === 'link-stair' && (
          <div className="toolbar-sub-label" style={{ fontSize: '0.6rem', opacity: 0.8, marginTop: 4, lineHeight: 1.3 }}>
            {stairLinkSource
              ? `Source: (${stairLinkSource.x},${stairLinkSource.y}) on L${stairLinkSource.level + 1}. Switch levels and click destination stairs.`
              : 'Click a stairs tile to start linking.'}
          </div>
        )}
        <button
          type="button"
          className="tool-btn"
          onClick={onClearStairLinks}
          title="Remove all stair links involving this level."
          aria-label="Clear stair links for this level"
          disabled={stairLinkCount === 0}
        >
          <span className="tool-icon" aria-hidden="true">🗑</span>
          <span className="tool-name">Clear Links</span>
        </button>
        <div className="toolbar-sub-label" style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: 2 }}>
          {stairLinkCount} link{stairLinkCount !== 1 ? 's' : ''} total
        </div>
      </div>

      {/* ── GM DRAW ── */}
      <div className="toolbar-section">
        <div className="toolbar-label">GM DRAW</div>
        <button
          type="button"
          className={`tool-btn ${activeTool === 'gmdraw' ? 'active' : ''}`}
          onClick={() => onSetTool('gmdraw')}
          title="GM Draw — freehand annotations visible only in Edit mode. [D]"
          aria-label="GM Draw tool"
          aria-pressed={activeTool === 'gmdraw'}
        >
          <span className="tool-icon" aria-hidden="true">🖊️</span>
          <span className="tool-name">Draw</span>
          <span className="tool-shortcut" aria-hidden="true">[D]</span>
        </button>
        <button
          type="button"
          className={`tool-btn ${activeTool === 'gmerase' ? 'active' : ''}`}
          onClick={() => onSetTool('gmerase')}
          title="GM Erase — click a GM drawing to remove it."
          aria-label="GM Erase tool"
          aria-pressed={activeTool === 'gmerase'}
        >
          <span className="tool-icon" aria-hidden="true">🧽</span>
          <span className="tool-name">Erase</span>
        </button>
        <button
          type="button"
          className="tool-btn"
          onClick={onClearGmDrawings}
          title="Remove all GM drawings from the map."
          aria-label="Clear all GM drawings"
        >
          <span className="tool-icon" aria-hidden="true">🗑</span>
          <span className="tool-name">Clear All</span>
        </button>

        {/* Color swatches */}
        <div className="toolbar-sub-label" style={{ fontSize: '0.6rem', opacity: 0.7, marginTop: 6 }}>Color</div>
        <div
          className="tile-palette"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 4,
          }}
        >
          {GM_DRAW_COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={`tile-btn ${gmDrawColor === c ? 'active' : ''}`}
              onClick={() => onSetGmDrawColor(c)}
              title={`Color: ${c}`}
              aria-label={`GM pen color ${c}`}
              aria-pressed={gmDrawColor === c}
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

        {/* Brush widths */}
        <div
          style={{
            marginTop: 6,
            display: 'grid',
            gridTemplateColumns: `repeat(${GM_BRUSH_WIDTHS.length}, 1fr)`,
            gap: 4,
          }}
        >
          {GM_BRUSH_WIDTHS.map(b => (
            <button
              key={b.value}
              type="button"
              className={`tool-btn ${Math.abs(gmDrawWidth - b.value) < 1e-6 ? 'active' : ''}`}
              onClick={() => onSetGmDrawWidth(b.value)}
              title={`${b.label} brush`}
              aria-label={`${b.label} GM brush width`}
              aria-pressed={Math.abs(gmDrawWidth - b.value) < 1e-6}
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
                  background: gmDrawColor,
                  borderRadius: '50%',
                }}
              />
              <span className="tool-name" style={{ flex: 'none' }}>{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── SCENE TEMPLATES ── */}
      <div className="toolbar-section">
        <div className="toolbar-label">TEMPLATES</div>
        <button
          type="button"
          className="tool-btn"
          onClick={onOpenSceneTemplates}
          title="Open Scene Templates — save and reuse rectangular regions as room/scene templates"
          aria-label="Open scene templates"
        >
          <span className="tool-icon" aria-hidden="true">📋</span>
          <span className="tool-name">Templates</span>
        </button>
      </div>
    </>
  );
};

export default AdvancedToolsTab;
