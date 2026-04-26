import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { TOKEN_KIND_COLORS } from '../types/map';
const InitiativePanel = ({ tokens, initiative, selectedTokenId, onSelectToken, onRenameToken, onReorder, onClear, viewMode, }) => {
    const [editingId, setEditingId] = useState(null);
    const [editLabel, setEditLabel] = useState('');
    const [dragIndex, setDragIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const isGm = viewMode === 'gm';
    // Resolve initiative ids to live token records, dropping any stale ids
    // (defensive — `removeToken` already prunes initiative, but a hand-edited
    // map could leave a dangling id).
    const tokensById = React.useMemo(() => {
        const map = new Map();
        for (const t of tokens)
            map.set(t.id, t);
        return map;
    }, [tokens]);
    const entries = initiative
        .map(id => tokensById.get(id))
        .filter((t) => !!t);
    const startEdit = (token) => {
        setEditingId(token.id);
        setEditLabel(token.label);
    };
    const saveEdit = (id) => {
        const trimmed = editLabel.trim();
        if (trimmed.length > 0)
            onRenameToken(id, trimmed);
        setEditingId(null);
    };
    const handleClear = () => {
        if (entries.length === 0)
            return;
        if (window.confirm('Clear the initiative list? Tokens on the map will be left alone.')) {
            onClear();
        }
    };
    return (_jsxs("div", { className: "initiative-panel", children: [_jsxs("div", { className: "initiative-header", children: [_jsx("span", { className: "toolbar-label", children: "INITIATIVE" }), isGm && entries.length > 0 && (_jsx("button", { type: "button", className: "initiative-clear-btn", onClick: handleClear, title: "Clear the initiative list. Tokens stay on the map.", children: "Clear" }))] }), entries.length === 0 && (_jsxs("div", { className: "initiative-empty", children: ["No tokens yet.", _jsx("br", {}), isGm
                        ? 'Place a token from the Tokens section to add it here.'
                        : 'Drop a token on the map to add it here.'] })), _jsx("div", { className: "initiative-list", children: entries.map((token, idx) => {
                    const isSelected = token.id === selectedTokenId;
                    const isDragOver = isGm && dragOverIndex === idx && dragIndex !== null && dragIndex !== idx;
                    return (_jsxs("div", { className: [
                            'initiative-item',
                            isSelected ? 'selected' : '',
                            isDragOver ? 'drag-over' : '',
                        ].filter(Boolean).join(' '), draggable: isGm && editingId !== token.id, onDragStart: isGm ? (e) => {
                            setDragIndex(idx);
                            // Required for Firefox to actually start the drag.
                            e.dataTransfer.effectAllowed = 'move';
                            try {
                                e.dataTransfer.setData('text/plain', String(idx));
                            }
                            catch { /* ignore */ }
                        } : undefined, onDragOver: isGm ? (e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverIndex !== idx)
                                setDragOverIndex(idx);
                        } : undefined, onDragLeave: isGm ? () => {
                            if (dragOverIndex === idx)
                                setDragOverIndex(null);
                        } : undefined, onDrop: isGm ? (e) => {
                            e.preventDefault();
                            if (dragIndex !== null && dragIndex !== idx)
                                onReorder(dragIndex, idx);
                            setDragIndex(null);
                            setDragOverIndex(null);
                        } : undefined, onDragEnd: isGm ? () => {
                            setDragIndex(null);
                            setDragOverIndex(null);
                        } : undefined, onClick: () => onSelectToken(isSelected ? null : token.id), children: [_jsx("span", { className: "initiative-order", children: idx + 1 }), _jsx("span", { className: "initiative-swatch", style: { background: token.color ?? TOKEN_KIND_COLORS[token.kind] }, title: token.kind }), editingId === token.id ? (_jsx("input", { className: "initiative-input", value: editLabel, autoFocus: true, onChange: e => setEditLabel(e.target.value), onClick: e => e.stopPropagation(), onBlur: () => saveEdit(token.id), onKeyDown: e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        saveEdit(token.id);
                                    }
                                    else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setEditingId(null);
                                    }
                                } })) : (_jsx("span", { className: "initiative-name", title: token.label, children: token.label })), isGm && editingId !== token.id && (_jsx("button", { type: "button", className: "initiative-edit-btn", onClick: e => { e.stopPropagation(); startEdit(token); }, title: "Rename", children: "\u270E" }))] }, token.id));
                }) })] }));
};
export default InitiativePanel;
