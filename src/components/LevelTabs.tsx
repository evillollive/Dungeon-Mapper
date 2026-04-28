import { useCallback, useState, useRef, useEffect } from 'react';
import type { DungeonMap } from '../types/map';

interface LevelTabsProps {
  levels: DungeonMap[];
  activeIndex: number;
  onSwitch: (index: number) => void;
  onAdd: (name?: string) => void;
  onRename: (index: number, name: string) => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export default function LevelTabs({
  levels,
  activeIndex,
  onSwitch,
  onAdd,
  onRename,
  onDelete,
  onDuplicate,
  onReorder,
}: LevelTabsProps) {
  // ── Context menu state ──
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Inline rename state ──
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // ── Drag-reorder state ──
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  // Close context menu on outside click.
  useEffect(() => {
    if (menuIndex === null) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuIndex(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuIndex]);

  // Focus the rename input when editing starts.
  useEffect(() => {
    if (editingIndex !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingIndex]);

  const handleContextMenu = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuIndex(idx);
  }, []);

  const handleRenameStart = useCallback((idx: number) => {
    setEditingIndex(idx);
    setEditValue(levels[idx].meta.name);
    setMenuIndex(null);
  }, [levels]);

  const handleRenameCommit = useCallback(() => {
    if (editingIndex !== null && editValue.trim()) {
      onRename(editingIndex, editValue.trim());
    }
    setEditingIndex(null);
  }, [editingIndex, editValue, onRename]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameCommit();
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
    }
  }, [handleRenameCommit]);

  const handleDelete = useCallback((idx: number) => {
    setMenuIndex(null);
    if (levels.length <= 1) return;
    if (window.confirm(`Delete level "${levels[idx].meta.name}"? This cannot be undone.`)) {
      onDelete(idx);
    }
  }, [levels, onDelete]);

  const handleDuplicate = useCallback((idx: number) => {
    setMenuIndex(null);
    onDuplicate(idx);
  }, [onDuplicate]);

  // ── Drag handlers ──
  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    // Set a minimal drag image placeholder.
    e.dataTransfer.setData('text/plain', String(idx));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(idx);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== idx) {
      onReorder(dragIndex, idx);
    }
    setDragIndex(null);
    setDropTarget(null);
  }, [dragIndex, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropTarget(null);
  }, []);

  return (
    <div className="level-tabs" role="tablist" aria-label="Dungeon levels">
      {levels.map((level, idx) => {
        const isActive = idx === activeIndex;
        const isDragging = idx === dragIndex;
        const isDropTarget = idx === dropTarget && dragIndex !== null && dragIndex !== idx;

        return (
          <div
            key={idx}
            role="tab"
            aria-selected={isActive}
            className={
              'level-tab' +
              (isActive ? ' level-tab--active' : '') +
              (isDragging ? ' level-tab--dragging' : '') +
              (isDropTarget ? ' level-tab--drop-target' : '')
            }
            draggable={editingIndex !== idx}
            onClick={() => { if (editingIndex === null) onSwitch(idx); }}
            onContextMenu={(e) => handleContextMenu(e, idx)}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            onDoubleClick={() => handleRenameStart(idx)}
            title={`Level ${idx + 1}: ${level.meta.name} (${level.meta.width}×${level.meta.height})`}
          >
            {editingIndex === idx ? (
              <input
                ref={editInputRef}
                className="level-tab__rename-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleRenameCommit}
                onKeyDown={handleRenameKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="level-tab__label">{level.meta.name}</span>
            )}
          </div>
        );
      })}

      <button
        className="level-tab level-tab--add"
        onClick={() => onAdd()}
        title="Add a new level"
        aria-label="Add a new level"
      >
        +
      </button>

      {/* Context menu */}
      {menuIndex !== null && (
        <div
          ref={menuRef}
          className="level-tab__menu"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <button onClick={() => handleRenameStart(menuIndex)}>Rename</button>
          <button onClick={() => handleDuplicate(menuIndex)}>Duplicate</button>
          {levels.length > 1 && (
            <button onClick={() => handleDelete(menuIndex)}>Delete</button>
          )}
        </div>
      )}
    </div>
  );
}
