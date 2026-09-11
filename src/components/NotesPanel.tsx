import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { MapNote } from '../types/map';

interface NotesPanelProps {
  readOnly?: boolean;
  notes: MapNote[];
  selectedNoteId: number | null;
  onSelectNote: (id: number | null) => void;
  onUpdateNote: (id: number, label: string, description: string) => void;
  onDeleteNote: (id: number) => void;
  onActivateNoteTool: () => void;
}

const NotesPanel: React.FC<NotesPanelProps> = ({
  readOnly = false,
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
  const editButtons = useRef(new Map<number, HTMLButtonElement>());

  const startEdit = (note: MapNote) => {
    setEditingId(note.id);
    setEditLabel(note.label);
    setEditDesc(note.description);
  };

  const finishEdit = (id: number) => {
    flushSync(() => setEditingId(null));
    const button = editButtons.current.get(id);
    button?.focus();
    button?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const saveEdit = (id: number) => {
    onUpdateNote(id, editLabel, editDesc);
    finishEdit(id);
  };

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <span className="toolbar-label">ROOM NOTES</span>
        {!readOnly && <button
          type="button"
          className="add-note-btn"
          onClick={onActivateNoteTool}
          title="Select Note tool then click on map"
        >
          + Add Note
        </button>}
      </div>

      {notes.length === 0 && (
        <div className="notes-empty">
          No notes yet.<br />
          {!readOnly && <>Click "+ Add Note" then<br />click on the map.</>}
        </div>
      )}

      <div className="notes-list">
        {notes.map(note => (
          <div
            key={note.id}
            className={`note-item ${selectedNoteId === note.id ? 'selected' : ''}`}
            role="group"
            aria-label={`Note ${note.id}: ${note.label}`}
          >
            {!readOnly && editingId === note.id ? (
              <form className="note-edit" onSubmit={event => { event.preventDefault(); saveEdit(note.id); }}
                onKeyDown={event => {
                  if (event.key === 'Escape') { event.stopPropagation(); finishEdit(note.id); }
                }}>
                <input
                  className="note-input"
                  autoFocus
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  placeholder="Room name"
                  aria-label="Room name"
                />
                <textarea
                  className="note-textarea"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Description..."
                  aria-label="Room description"
                  rows={3}
                />
                <div className="note-edit-actions">
                  <button type="submit" className="note-save-btn">Save</button>
                  <button type="button" className="note-cancel-btn" onClick={() => finishEdit(note.id)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="note-view">
                <button type="button" className="note-select-btn"
                  aria-pressed={selectedNoteId === note.id}
                  aria-label={`Select note ${note.id}: ${note.label}`}
                  onClick={() => onSelectNote(selectedNoteId === note.id ? null : note.id)}>
                  <span className="note-header-row">
                    <span className="note-badge">{note.id}</span>
                    <span className="note-label">{note.label}</span>
                  </span>
                  <span className="note-coords">({note.x}, {note.y})</span>
                </button>
                  {!readOnly && <div className="note-actions">
                    <button
                      className="note-edit-btn"
                      ref={node => { if (node) editButtons.current.set(note.id, node); else editButtons.current.delete(note.id); }}
                      onClick={() => startEdit(note)}
                      title="Edit note"
                      aria-label={`Edit note ${note.id}: ${note.label}`}
                    >✎</button>
                    <button
                      className="note-delete-btn"
                      onClick={e => { e.stopPropagation(); onDeleteNote(note.id); }}
                      title="Delete note"
                      aria-label={`Delete note ${note.id}: ${note.label}`}
                    >✕</button>
                  </div>}
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
