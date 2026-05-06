import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

/** A single entry in the command palette. */
export interface CommandItem {
  id: string;
  /** Human-readable label shown in the list. */
  label: string;
  /** Category tag rendered as a subtle badge (e.g. "Tool", "Theme", "File"). */
  category: string;
  /** Optional keyboard shortcut hint shown at the right edge. */
  shortcut?: string;
  /** Callback executed when the user selects this command. */
  action: () => void;
}

interface CommandPaletteProps {
  /** Whether the palette overlay is visible. */
  open: boolean;
  /** Called when the palette should close (Escape, backdrop click, or after selection). */
  onClose: () => void;
  /** Full list of available commands. */
  commands: CommandItem[];
}

/**
 * Simple fuzzy match: every character of the query must appear in the target
 * string in order (case-insensitive). Returns a numeric score (lower = better
 * match) or `null` if there is no match. Adjacent character runs boost the
 * score, and earlier matches are preferred.
 */
function fuzzyMatch(query: string, target: string): number | null {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let score = 0;
  let lastMatchIdx = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Bonus for consecutive chars (lower score = better).
      score += (ti === lastMatchIdx + 1) ? 0 : ti + 1;
      lastMatchIdx = ti;
      qi++;
    }
  }
  return qi === q.length ? score : null;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state whenever the palette opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // Small delay so the dialog transition can finish before we steal focus.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Filter & sort commands by fuzzy match.
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const scored: { item: CommandItem; score: number }[] = [];
    for (const item of commands) {
      const labelScore = fuzzyMatch(query, item.label);
      const catScore = fuzzyMatch(query, item.category);
      const best = labelScore !== null && catScore !== null
        ? Math.min(labelScore, catScore)
        : labelScore ?? catScore;
      if (best !== null) scored.push({ item, score: best });
    }
    scored.sort((a, b) => a.score - b.score);
    return scored.map(s => s.item);
  }, [query, commands]);

  // Clamp selected index when the list shrinks.
  useEffect(() => {
    setSelectedIndex(idx => Math.min(idx, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Scroll the selected item into view.
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const el = container.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const runCommand = useCallback((item: CommandItem) => {
    onClose();
    // Execute after the palette unmounts so any focus management in the
    // action callback doesn't race with the palette's own cleanup.
    requestAnimationFrame(() => item.action());
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % Math.max(1, filtered.length));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filtered.length) % Math.max(1, filtered.length));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[selectedIndex]) runCommand(filtered[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filtered, selectedIndex, runCommand, onClose]);

  if (!open) return null;

  return (
    <div
      className="command-palette-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="command-palette-input"
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
          onKeyDown={handleKeyDown}
          placeholder="Type a command…"
          aria-label="Search commands"
          aria-activedescendant={filtered[selectedIndex] ? `cmd-${filtered[selectedIndex].id}` : undefined}
          aria-controls="command-palette-list"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
        />
        <div
          id="command-palette-list"
          ref={listRef}
          className="command-palette-list"
          role="listbox"
        >
          {filtered.length === 0 && (
            <div className="command-palette-empty" role="option" aria-selected={false}>
              No matching commands
            </div>
          )}
          {filtered.map((item, i) => (
            <div
              key={item.id}
              id={`cmd-${item.id}`}
              className={`command-palette-item${i === selectedIndex ? ' selected' : ''}`}
              role="option"
              aria-selected={i === selectedIndex}
              onPointerDown={e => e.preventDefault()}
              onClick={() => runCommand(item)}
              onPointerEnter={() => setSelectedIndex(i)}
            >
              <span className="command-palette-category">{item.category}</span>
              <span className="command-palette-label">{item.label}</span>
              {item.shortcut && (
                <kbd className="command-palette-shortcut">{item.shortcut}</kbd>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
