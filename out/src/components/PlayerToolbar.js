import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import TokenToolsSection from './TokenToolsSection';
const DRAW_TOOLS = [
    { id: 'pdraw', label: 'Draw', icon: '✒️', title: 'Freehand draw — annotate the visible map.' },
    { id: 'perase', label: 'Erase', icon: '🧽', title: 'Erase player drawings — click a stroke to remove it.' },
];
// Fog tools are drag-rectangles of cells; they only appear when fog is
// enabled for the current map. Reveal exposes cells; Hide re-covers them.
const FOG_TOOLS = [
    { id: 'reveal', label: 'Reveal', shortcut: 'V', icon: '👁' },
    { id: 'hide', label: 'Hide', shortcut: 'H', icon: '🌫' },
];
const COLOR_SWATCHES = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#1f2937', '#ffffff'];
const BRUSH_WIDTHS = [
    { value: 0.12, label: 'Thin' },
    { value: 0.25, label: 'Medium' },
    { value: 0.5, label: 'Thick' },
];
const PlayerToolbar = ({ activeTool, onSetTool, drawColor, onSetDrawColor, drawWidth, onSetDrawWidth, onClearPlayerDrawings, fogEnabled, onToggleFogEnabled, onResetFog, onClearFog, }) => {
    return (_jsxs("div", { className: "toolbar", children: [_jsxs("div", { className: "toolbar-section", children: [_jsx("div", { className: "toolbar-label", children: "FOG OF WAR" }), _jsxs("label", { className: `tool-btn ${fogEnabled ? 'active' : ''}`, style: { cursor: 'pointer' }, title: "Toggle fog-of-war for this map. When on, fogged cells are hidden under an opaque grey overlay in the player view.", children: [_jsx("span", { className: "tool-icon", children: "\uD83C\uDF2B" }), _jsx("span", { className: "tool-name", children: "Enabled" }), _jsx("input", { type: "checkbox", checked: fogEnabled, onChange: onToggleFogEnabled, style: { margin: 0 } })] }), fogEnabled && (_jsxs(_Fragment, { children: [_jsxs("button", { className: `tool-btn ${activeTool === 'defog' ? 'active' : ''}`, onClick: () => onSetTool('defog'), title: "Defog brush \u2014 drag across the map to wipe fog away cell-by-cell.", children: [_jsx("span", { className: "tool-icon", children: "\uD83E\uDDF9" }), _jsx("span", { className: "tool-name", children: "Defog" })] }), FOG_TOOLS.map(tool => (_jsxs("button", { className: `tool-btn ${activeTool === tool.id ? 'active' : ''}`, onClick: () => onSetTool(tool.id), title: `${tool.label} — drag a rectangle of cells to ${tool.id === 'reveal' ? 'reveal' : 'hide'} [${tool.shortcut}]`, children: [_jsx("span", { className: "tool-icon", children: tool.icon }), _jsx("span", { className: "tool-name", children: tool.label }), _jsxs("span", { className: "tool-shortcut", children: ["[", tool.shortcut, "]"] })] }, tool.id))), _jsxs("button", { className: "tool-btn", onClick: onResetFog, title: "Re-fog the entire map (hide every cell).", children: [_jsx("span", { className: "tool-icon", children: "\u27F2" }), _jsx("span", { className: "tool-name", children: "Reset Fog" })] }), _jsxs("button", { className: "tool-btn", onClick: onClearFog, title: "Reveal the entire map (clear all fog).", children: [_jsx("span", { className: "tool-icon", children: "\u2600" }), _jsx("span", { className: "tool-name", children: "Clear Fog" })] })] }))] }), _jsxs("div", { className: "toolbar-section", children: [_jsx("div", { className: "toolbar-label", children: "DRAW" }), DRAW_TOOLS.map(tool => (_jsxs("button", { className: `tool-btn ${activeTool === tool.id ? 'active' : ''}`, onClick: () => onSetTool(tool.id), title: tool.title, children: [_jsx("span", { className: "tool-icon", children: tool.icon }), _jsx("span", { className: "tool-name", children: tool.label })] }, tool.id))), _jsxs("button", { className: "tool-btn", onClick: onClearPlayerDrawings, title: "Remove all player drawings from the map.", children: [_jsx("span", { className: "tool-icon", children: "\uD83D\uDDD1" }), _jsx("span", { className: "tool-name", children: "Clear All" })] })] }), _jsxs("div", { className: "toolbar-section", children: [_jsx("div", { className: "toolbar-label", children: "PEN" }), _jsx("div", { className: "tile-palette", 
                        // Override .tile-palette's default flex-direction:column so the
                        // swatches tile into a compact grid instead of stacking one per row.
                        style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 4,
                        }, children: COLOR_SWATCHES.map(c => (_jsx("button", { className: `tile-btn ${drawColor === c ? 'active' : ''}`, onClick: () => onSetDrawColor(c), title: `Color: ${c}`, 
                            // Override the default .tile-btn width:100% so the swatches
                            // size to the grid cell instead of forcing one per row.
                            style: { padding: 2, width: 'auto', justifyContent: 'center' }, children: _jsx("span", { style: {
                                    display: 'inline-block',
                                    width: 22,
                                    height: 22,
                                    background: c,
                                    border: '1px solid #2d3561',
                                } }) }, c))) }), _jsx("div", { 
                        // Lay the brush-size buttons out in a horizontal grid so they
                        // share a row instead of each occupying a full line.
                        style: {
                            marginTop: 6,
                            display: 'grid',
                            gridTemplateColumns: `repeat(${BRUSH_WIDTHS.length}, 1fr)`,
                            gap: 4,
                        }, children: BRUSH_WIDTHS.map(b => (_jsxs("button", { className: `tool-btn ${Math.abs(drawWidth - b.value) < 1e-6 ? 'active' : ''}`, onClick: () => onSetDrawWidth(b.value), title: `${b.label} brush`, 
                            // Override .tool-btn's width:100% so the buttons fit in the
                            // grid columns rather than forcing one button per row.
                            style: {
                                width: 'auto',
                                flexDirection: 'column',
                                gap: 2,
                                padding: '4px 4px',
                                textAlign: 'center',
                            }, children: [_jsx("span", { className: "tool-icon", "aria-hidden": "true", style: {
                                        display: 'inline-block',
                                        width: Math.max(6, b.value * 32),
                                        height: Math.max(6, b.value * 32),
                                        background: drawColor,
                                        borderRadius: '50%',
                                    } }), _jsx("span", { className: "tool-name", style: { flex: 'none' }, children: b.label })] }, b.value))) })] }), _jsx(TokenToolsSection, { activeTool: activeTool, onSetTool: onSetTool })] }));
};
export default PlayerToolbar;
