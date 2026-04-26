import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useRef } from 'react';
import { exportMapJSON, importMapJSON, exportMapPNG } from '../utils/export';
const GRID_SIZES = [8, 16, 24, 32, 48, 64, 96, 128];
const MapHeader = ({ map, onSetName, onResize, onSetTileSize, onClear, onNew, onLoad, onExportSVG, onUndo, onRedo, canUndo, canRedo, printMode, onTogglePrintMode, uiScale, uiScaleOptions, onSetUIScale, getCanvas, viewMode, onToggleViewMode, }) => {
    const fileInputRef = useRef(null);
    const handleClear = () => {
        if (window.confirm('Clear the entire map? This cannot be undone.')) {
            onClear();
        }
    };
    const handleNew = () => {
        if (window.confirm('Create a new map? Unsaved changes will be lost.')) {
            onNew();
        }
    };
    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        try {
            const loaded = await importMapJSON(file);
            onLoad(loaded);
        }
        catch (err) {
            alert('Failed to import map: ' + err.message);
        }
        e.target.value = '';
    };
    const handleExportPNG = () => {
        const canvas = getCanvas();
        if (!canvas)
            return;
        exportMapPNG(canvas, map.meta.name);
    };
    return (_jsxs("header", { className: "map-header", children: [_jsxs("div", { className: "header-left", children: [_jsx("span", { className: "app-title", children: "\u2694 DUNGEON MAPPER" }), _jsx("input", { className: "map-name-input", value: map.meta.name, onChange: e => onSetName(e.target.value), placeholder: "Map name...", title: "Map name" })] }), _jsxs("div", { className: "header-center", children: [_jsx("label", { className: "header-label", children: "SIZE:" }), _jsx("select", { className: "grid-select", value: map.meta.width, onChange: e => {
                            const v = Number(e.target.value);
                            onResize(v, map.meta.height);
                        }, title: "Map width", children: GRID_SIZES.map(s => _jsx("option", { value: s, children: s }, s)) }), _jsx("span", { className: "header-label", children: "\u00D7" }), _jsx("select", { className: "grid-select", value: map.meta.height, onChange: e => {
                            const v = Number(e.target.value);
                            onResize(map.meta.width, v);
                        }, title: "Map height", children: GRID_SIZES.map(s => _jsx("option", { value: s, children: s }, s)) }), _jsx("label", { className: "header-label", style: { marginLeft: 8 }, children: "TILE:" }), _jsx("select", { className: "grid-select", value: map.meta.tileSize, onChange: e => onSetTileSize(Number(e.target.value)), title: "Tile size (px)", children: [12, 16, 20, 24, 32].map(s => _jsxs("option", { value: s, children: [s, "px"] }, s)) }), _jsx("label", { className: "header-label", style: { marginLeft: 8 }, children: "UI:" }), _jsx("select", { className: "grid-select", value: uiScale, onChange: e => onSetUIScale(Number(e.target.value)), title: "UI scale \u2014 make buttons and text larger or smaller", children: uiScaleOptions.map(s => (_jsxs("option", { value: s, children: [Math.round(s * 100), "%"] }, s))) })] }), _jsxs("div", { className: "header-right", children: [_jsx("button", { className: `header-btn ${viewMode === 'player' ? 'active' : ''}`, onClick: onToggleViewMode, title: "Toggle Player View \u2014 switches to a fog-of-war-aware, player-safe UI with limited tools (drawing + tokens). Toggle off to return to the GM view.", children: viewMode === 'player' ? '👁 Player View' : '🛡 GM View' }), _jsx("button", { className: `header-btn ${printMode ? 'active' : ''}`, onClick: onTogglePrintMode, title: "Toggle Print / B&W mode \u2014 renders tiles as high-contrast monochrome glyphs suitable for printing", children: "\uD83D\uDDA8 Print" }), _jsx("button", { className: "header-btn", onClick: onUndo, disabled: !canUndo, title: "Undo [Ctrl+Z]", children: "\u21A9 Undo" }), _jsx("button", { className: "header-btn", onClick: onRedo, disabled: !canRedo, title: "Redo [Ctrl+Y]", children: "\u21AA Redo" }), _jsx("button", { className: "header-btn", onClick: handleNew, title: "New Map", children: "New" }), _jsx("button", { className: "header-btn danger", onClick: handleClear, title: "Clear Map", children: "Clear" }), _jsx("button", { className: "header-btn", onClick: () => exportMapJSON(map), title: "Export JSON", children: "\u2193 JSON" }), _jsx("button", { className: "header-btn", onClick: handleExportPNG, title: "Export PNG", children: "\u2193 PNG" }), _jsx("button", { className: "header-btn", onClick: onExportSVG, title: "Export SVG", children: "\u2193 SVG" }), _jsx("button", { className: "header-btn", onClick: () => fileInputRef.current?.click(), title: "Import JSON", children: "\u2191 Import" }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".json", style: { display: 'none' }, onChange: handleImport })] })] }));
};
export default MapHeader;
