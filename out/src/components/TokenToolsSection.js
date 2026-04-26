import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { TOKEN_KIND_COLORS } from '../types/map';
const TOKEN_TOOLS = [
    { id: 'token-player', label: 'Player', icon: '🧝', kind: 'player' },
    { id: 'token-npc', label: 'NPC', icon: '🧙', kind: 'npc' },
    { id: 'token-monster', label: 'Monster S', icon: '👹', kind: 'monster',
        title: 'Place a small (1×1) Monster token — click on a cell to drop it.' },
    { id: 'token-monster-md', label: 'Monster M', icon: '👹', kind: 'monster',
        title: 'Place a medium (2×2) Monster token — click on a cell to drop it.' },
    { id: 'token-monster-lg', label: 'Monster L', icon: '👹', kind: 'monster',
        title: 'Place a large (3×3) Monster token — click on a cell to drop it.' },
];
const TokenToolsSection = ({ activeTool, onSetTool }) => {
    return (_jsxs("div", { className: "toolbar-section", children: [_jsx("div", { className: "toolbar-label", children: "TOKENS" }), TOKEN_TOOLS.map(tool => (_jsxs("button", { className: `tool-btn ${activeTool === tool.id ? 'active' : ''}`, onClick: () => onSetTool(tool.id), title: tool.title ?? `Place a ${tool.label} token — click on a cell to drop it.`, children: [_jsx("span", { className: "tool-icon", style: {
                            display: 'inline-block',
                            width: 18, height: 18, borderRadius: '50%',
                            background: TOKEN_KIND_COLORS[tool.kind],
                            border: '1px solid #2d3561',
                            textAlign: 'center', lineHeight: '16px',
                        }, children: tool.icon }), _jsx("span", { className: "tool-name", children: tool.label })] }, tool.id))), _jsxs("button", { className: `tool-btn ${activeTool === 'move-token' ? 'active' : ''}`, onClick: () => onSetTool('move-token'), title: "Move a token \u2014 click and drag a token to relocate it.", children: [_jsx("span", { className: "tool-icon", children: "\u270B" }), _jsx("span", { className: "tool-name", children: "Move Token" })] }), _jsxs("button", { className: `tool-btn ${activeTool === 'remove-token' ? 'active' : ''}`, onClick: () => onSetTool('remove-token'), title: "Remove a token \u2014 click a token to delete it.", children: [_jsx("span", { className: "tool-icon", children: "\u2715" }), _jsx("span", { className: "tool-name", children: "Remove" })] })] }));
};
export default TokenToolsSection;
