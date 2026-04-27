import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ICONS, ICON_CATEGORIES, type IconDef } from '../utils/iconLibrary';

interface IconPickerProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the user picks an icon. */
  onSelect: (iconId: string) => void;
  /** Called when the dialog is dismissed without selection. */
  onCancel: () => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ open, onSelect, onCancel }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  // Reset state when transitioning from closed → open. Focus the search
  // input when the dialog opens via rAF (an external side-effect that
  // belongs in an effect).
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Focus the search input when the dialog opens.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    wasOpenRef.current = open;
  }, [open]);

  const filtered = useMemo(() => {
    let icons: IconDef[] = ICONS;
    if (selectedCategory) {
      icons = icons.filter(i => i.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      icons = icons.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
      );
    }
    return icons;
  }, [search, selectedCategory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }
  }, [onCancel]);

  const handleSelect = useCallback((iconId: string) => {
    setSearch('');
    setSelectedCategory('');
    onSelect(iconId);
  }, [onSelect]);

  const handleCancel = useCallback(() => {
    setSearch('');
    setSelectedCategory('');
    onCancel();
  }, [onCancel]);

  // Clicking the backdrop dismisses the dialog.
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleCancel();
  }, [handleCancel]);

  if (!open) return null;

  return (
    <div
      className="icon-picker-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Choose an icon for the token"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        className="icon-picker-dialog"
        style={{
          background: '#1a1a2e',
          color: '#e8e8e8',
          border: '1px solid #2d3561',
          borderRadius: 8,
          padding: 16,
          width: 420,
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
          Choose Token Icon
        </div>

        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search icons…"
          aria-label="Search icons"
          style={{
            padding: '6px 10px',
            borderRadius: 4,
            border: '1px solid #2d3561',
            background: '#16213e',
            color: '#e8e8e8',
            fontSize: '0.85rem',
          }}
        />

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`tool-btn ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
            style={{ padding: '2px 8px', fontSize: '0.7rem', width: 'auto' }}
          >
            All
          </button>
          {ICON_CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`tool-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
              style={{ padding: '2px 8px', fontSize: '0.7rem', width: 'auto' }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 6,
            overflowY: 'auto',
            maxHeight: 300,
            padding: 4,
          }}
        >
          {filtered.map(icon => (
            <button
              key={icon.id}
              type="button"
              className="icon-picker-item"
              onClick={() => handleSelect(icon.id)}
              title={`${icon.name} (${icon.category})`}
              aria-label={icon.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: 6,
                background: '#16213e',
                border: '1px solid #2d3561',
                borderRadius: 4,
                cursor: 'pointer',
                color: '#e8e8e8',
              }}
            >
              <svg
                viewBox="0 0 512 512"
                width={32}
                height={32}
                aria-hidden="true"
              >
                <path d={icon.path} fill="currentColor" />
              </svg>
              <span style={{ fontSize: '0.55rem', lineHeight: 1.1, textAlign: 'center', wordBreak: 'break-word' }}>
                {icon.name}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.5, padding: 16 }}>
              No icons match your search.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="tool-btn"
            onClick={() => handleSelect('')}
            style={{ padding: '4px 12px', width: 'auto' }}
            title="Use default letter/emoji instead of a library icon"
          >
            No Icon
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={handleCancel}
            style={{ padding: '4px 12px', width: 'auto' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default IconPicker;
