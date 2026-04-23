import React, { useState } from 'react';
import type { MapNote } from '../types/map';

interface NotesPanelProps {
  notes: MapNote[];
  selectedNoteId: number | null;
  onSelectNote: (id: number | null) => void;
  onUpdateNote: (id: number, label: string, description: string) => void;
  onDeleteNote: (id: number) => void;
  onActivateNoteTool: () => void;
}

const NotesPanel: React.FC<NotesPanelProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
  onActivateNoteTool,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const startEdit = (note: MapNote) => {
    setEditingId(note.id);
    setEditLabel(note.label);
    setEditDesc(note.description);
  };

  const saveEdit = (id: number) => {
    onUpdateNote(id, editLabel, editDesc);
    setEditingId(null);
  };

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <span className="toolbar-label">ROOM NOTES</span>
        <button
          className="add-note-btn"
          onClick={onActivateNoteTool}
          title="Select Note tool then click on map"
        >
          + Add Note
        </button>
      </div>

      {notes.length === 0 && (
        <div className="notes-empty">
          No notes yet.<br />
          Click "+ Add Note" then<br />
          click on the map.
        </div>
      )}

      <div className="notes-list">
        {notes.map(note => (
          <div
            key={note.id}
            className={`note-item ${selectedNoteId === note.id ? 'selected' : ''}`}
            onClick={() => onSelectNote(selectedNoteId === note.id ? null : note.id)}
          >
            {editingId === note.id ? (
              <div className="note-edit" onClick={e => e.stopPropagation()}>
                <input
                  className="note-input"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  placeholder="Room name"
                />
                <textarea
                  className="note-textarea"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Description..."
                  rows={3}
                />
                <div className="note-edit-actions">
                  <button className="note-save-btn" onClick={() => saveEdit(note.id)}>Save</button>
                  <button className="note-cancel-btn" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="note-view">
                <div className="note-header-row">
                  <span className="note-badge">{note.id}</span>
                  <span className="note-label">{note.label}</span>
                  <div className="note-actions">
                    <button
                      className="note-edit-btn"
                      onClick={e => { e.stopPropagation(); startEdit(note); }}
                      title="Edit note"
                    >✎</button>
                    <button
                      className="note-delete-btn"
                      onClick={e => { e.stopPropagation(); onDeleteNote(note.id); }}
                      title="Delete note"
                    >✕</button>
                  </div>
                </div>
                <div className="note-coords">({note.x}, {note.y})</div>
                {note.description && (
                  <div className="note-desc">{note.description}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesPanel;
