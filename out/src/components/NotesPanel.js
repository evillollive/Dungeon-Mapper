import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
const NotesPanel = ({ notes, selectedNoteId, onSelectNote, onUpdateNote, onDeleteNote, onActivateNoteTool, }) => {
    const [editingId, setEditingId] = useState(null);
    const [editLabel, setEditLabel] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const startEdit = (note) => {
        setEditingId(note.id);
        setEditLabel(note.label);
        setEditDesc(note.description);
    };
    const saveEdit = (id) => {
        onUpdateNote(id, editLabel, editDesc);
        setEditingId(null);
    };
    return (_jsxs("div", { className: "notes-panel", children: [_jsxs("div", { className: "notes-header", children: [_jsx("span", { className: "toolbar-label", children: "ROOM NOTES" }), _jsx("button", { className: "add-note-btn", onClick: onActivateNoteTool, title: "Select Note tool then click on map", children: "+ Add Note" })] }), notes.length === 0 && (_jsxs("div", { className: "notes-empty", children: ["No notes yet.", _jsx("br", {}), "Click \"+ Add Note\" then", _jsx("br", {}), "click on the map."] })), _jsx("div", { className: "notes-list", children: notes.map(note => (_jsx("div", { className: `note-item ${selectedNoteId === note.id ? 'selected' : ''}`, onClick: () => onSelectNote(selectedNoteId === note.id ? null : note.id), children: editingId === note.id ? (_jsxs("div", { className: "note-edit", onClick: e => e.stopPropagation(), children: [_jsx("input", { className: "note-input", value: editLabel, onChange: e => setEditLabel(e.target.value), placeholder: "Room name" }), _jsx("textarea", { className: "note-textarea", value: editDesc, onChange: e => setEditDesc(e.target.value), placeholder: "Description...", rows: 3 }), _jsxs("div", { className: "note-edit-actions", children: [_jsx("button", { className: "note-save-btn", onClick: () => saveEdit(note.id), children: "Save" }), _jsx("button", { className: "note-cancel-btn", onClick: () => setEditingId(null), children: "Cancel" })] })] })) : (_jsxs("div", { className: "note-view", children: [_jsxs("div", { className: "note-header-row", children: [_jsx("span", { className: "note-badge", children: note.id }), _jsx("span", { className: "note-label", children: note.label }), _jsxs("div", { className: "note-actions", children: [_jsx("button", { className: "note-edit-btn", onClick: e => { e.stopPropagation(); startEdit(note); }, title: "Edit note", children: "\u270E" }), _jsx("button", { className: "note-delete-btn", onClick: e => { e.stopPropagation(); onDeleteNote(note.id); }, title: "Delete note", children: "\u2715" })] })] }), _jsxs("div", { className: "note-coords", children: ["(", note.x, ", ", note.y, ")"] }), note.description && (_jsx("div", { className: "note-desc", children: note.description }))] })) }, note.id))) })] }));
};
export default NotesPanel;
