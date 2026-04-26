import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { ALL_TILE_TYPES, TILE_LABELS } from '../types/map';
import { getTheme, THEME_LIST } from '../themes/index';
import { drawTileOverlay } from '../themes/tileOverlays';
import TokenToolsSection from './TokenToolsSection';
const TOOLS = [
    { id: 'paint', label: 'Paint', shortcut: 'P', icon: '✏️' },
    { id: 'erase', label: 'Erase', shortcut: 'E', icon: '🧹' },
    { id: 'fill', label: 'Fill', shortcut: 'F', icon: '🪣' },
    { id: 'note', label: 'Add Note', shortcut: 'N', icon: '📍' },
    { id: 'line', label: 'Line', shortcut: 'L', icon: '📏' },
    { id: 'rect', label: 'Rectangle', shortcut: 'R', icon: '⬛' },
    { id: 'select', label: 'Select', shortcut: 'S', icon: '⬜' },
];
function TilePreview({ type, size = 28, themeId }) {
    const canvasRef = React.useRef(null);
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const theme = getTheme(themeId);
        canvas.width = size;
        canvas.height = size;
        // Draw themed tile at position (0,0).
        theme.drawTile(ctx, type, 0, 0, size);
        // Add print-mode-inspired glyph overlay.
        drawTileOverlay(ctx, type, 0, 0, size, theme.tileColors[type]);
    }, [type, size, themeId]);
    return (_jsx("canvas", { ref: canvasRef, className: "tile-preview", style: {
            display: 'inline-block',
            width: size,
            height: size,
            border: '1px solid #2d3561',
            flexShrink: 0,
            verticalAlign: 'middle',
        } }));
}
const Toolbar = ({ activeTool, activeTile, themeId, onSetTool, onSetTile, onSetTheme, preserveOnThemeSwitch, onTogglePreserveOnThemeSwitch, fogEnabled, gmShowFog, onToggleGmShowFog, onOpenGenerateMap, }) => {
    const theme = getTheme(themeId);
    const tileLabels = React.useMemo(() => {
        const map = new Map();
        for (const t of theme.tiles)
            map.set(t.id, t.label);
        return map;
    }, [theme]);
    const tileLabel = (tileType) => tileLabels.get(tileType) ?? TILE_LABELS[tileType];
    return (_jsxs("div", { className: "toolbar", children: [_jsxs("div", { className: "toolbar-section", children: [_jsx("div", { className: "toolbar-label", children: "TOOLS" }), TOOLS.map(tool => (_jsxs("button", { className: `tool-btn ${activeTool === tool.id ? 'active' : ''}`, onClick: () => onSetTool(tool.id), title: `${tool.label} [${tool.shortcut}]`, children: [_jsx("span", { className: "tool-icon", children: tool.icon }), _jsx("span", { className: "tool-name", children: tool.label }), _jsxs("span", { className: "tool-shortcut", children: ["[", tool.shortcut, "]"] })] }, tool.id)))] }), _jsxs("div", { className: "toolbar-section", children: [_jsx("div", { className: "toolbar-label", children: "THEME" }), _jsxs("label", { className: "tool-btn", style: { cursor: 'pointer' }, title: "Map theme \u2014 choose the visual style used to render tiles", children: [_jsx("span", { className: "tool-icon", children: "\uD83D\uDDFA" }), _jsx("span", { className: "tool-name", children: "Theme" }), _jsx("select", { className: "grid-select", value: themeId, onChange: e => onSetTheme(e.target.value, preserveOnThemeSwitch), onClick: e => e.stopPropagation(), title: "Map theme", children: THEME_LIST.map(t => _jsx("option", { value: t.id, children: t.name }, t.id)) })] }), _jsxs("label", { className: `tool-btn ${preserveOnThemeSwitch ? 'active' : ''}`, style: { cursor: 'pointer' }, title: "When on, switching themes keeps any tiles you've already painted in their original style instead of restyling them. Lets you combine terrain styles on one map. Off by default \u2014 newly painted tiles always use the currently selected theme.", children: [_jsx("span", { className: "tool-icon", children: "\uD83C\uDFA8" }), _jsx("span", { className: "tool-name", children: "Preserve" }), _jsx("input", { type: "checkbox", checked: preserveOnThemeSwitch, onChange: onTogglePreserveOnThemeSwitch, style: { margin: 0 } })] }), _jsxs("button", { type: "button", className: "tool-btn", onClick: onOpenGenerateMap, title: "Procedurally generate a random map (dungeon, terrain, cavern, \u2026) in the current theme. Replaces the current map; tile / fog changes can be undone.", children: [_jsx("span", { className: "tool-icon", children: "\uD83C\uDFB2" }), _jsx("span", { className: "tool-name", children: "Generate" })] })] }), _jsxs("div", { className: "toolbar-section", children: [_jsx("div", { className: "toolbar-label", children: "FOG OF WAR" }), _jsxs("label", { className: `tool-btn ${gmShowFog ? 'active' : ''}`, style: { cursor: 'pointer' }, title: fogEnabled
                            ? 'Show Fog (preview) — overlay a translucent grey wash on cells that are currently hidden from players. The map stays visible to you; this is a GM-only preview. Fog controls live on the Player toolbar.'
                            : 'Show Fog has no effect until fog-of-war is enabled. Switch to the Player view to enable fog and reveal/hide cells.', children: [_jsx("span", { className: "tool-icon", children: "\uD83C\uDF2B" }), _jsx("span", { className: "tool-name", children: "Show Fog" }), _jsx("input", { type: "checkbox", checked: gmShowFog, onChange: onToggleGmShowFog, disabled: !fogEnabled, style: { margin: 0 } })] })] }), _jsxs("div", { className: "toolbar-section", children: [_jsx("div", { className: "toolbar-label", children: "TILES" }), _jsx("div", { className: "tile-palette", children: ALL_TILE_TYPES.map(tileType => (_jsxs("button", { className: `tile-btn ${activeTile === tileType ? 'active' : ''}`, onClick: () => onSetTile(tileType), title: tileLabel(tileType), children: [_jsx(TilePreview, { type: tileType, size: 22, themeId: themeId }), _jsx("span", { className: "tile-btn-label", children: tileLabel(tileType) })] }, tileType))) })] }), _jsx(TokenToolsSection, { activeTool: activeTool, onSetTool: onSetTool })] }));
};
export default Toolbar;
