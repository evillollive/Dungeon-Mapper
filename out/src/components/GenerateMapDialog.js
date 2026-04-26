import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from 'react';
import { GENERATOR_LIST, getGenerator, parseSeed, pickGeneratorForTheme, randomSeed, seedToString, } from '../utils/generators';
import { MAX_DENSITY, MIN_DENSITY } from '../utils/generators/common';
import { getDefaultTileMix, getTileMixSliders, } from '../utils/generators/tileMix';
import { themeSupportsRoomLabels } from '../utils/generators/roomKinds';
const MIN_DIM = 8;
const MAX_DIM = 128;
/**
 * Spinner step for the Width / Height number inputs. Aligned to the
 * "standard" map sizes (8, 16, 24, 32, …) so clicking the up/down
 * arrows jumps between common sizes. Users can still type any integer
 * — `clampDim` only constrains it to `[MIN_DIM, MAX_DIM]`.
 */
const DIM_STEP = 8;
/** Allowed values for the dialog-local size scaler (small → large). */
const DIALOG_SCALE_OPTIONS = [0.85, 1, 1.15, 1.3, 1.5];
const DEFAULT_DIALOG_SCALE = 1;
const DIALOG_SCALE_STORAGE_KEY = 'dungeon-mapper:generate-dialog-scale';
const loadInitialDialogScale = () => {
    if (typeof window === 'undefined')
        return DEFAULT_DIALOG_SCALE;
    try {
        const raw = window.localStorage.getItem(DIALOG_SCALE_STORAGE_KEY);
        if (!raw)
            return DEFAULT_DIALOG_SCALE;
        const n = Number(raw);
        if (!Number.isFinite(n))
            return DEFAULT_DIALOG_SCALE;
        // Snap to the nearest allowed option so we never end up with a
        // size the +/- buttons can't navigate away from.
        let best = DIALOG_SCALE_OPTIONS[0];
        let bestDelta = Math.abs(n - best);
        for (const opt of DIALOG_SCALE_OPTIONS) {
            const d = Math.abs(n - opt);
            if (d < bestDelta) {
                best = opt;
                bestDelta = d;
            }
        }
        return best;
    }
    catch {
        return DEFAULT_DIALOG_SCALE;
    }
};
/**
 * Smallest selection rectangle the "Generate into selection" toggle
 * accepts. The generators need a bit of room (rooms-and-corridors needs
 * at least ~6 cells per side to fit any room plus a wall outline), so we
 * gate the toggle on this minimum to avoid producing degenerate output
 * — the user can still generate a full map at that size from the
 * regular Width/Height fields.
 */
const MIN_SELECTION_DIM = 6;
const GenerateMapDialog = ({ themeId, initialWidth, initialHeight, hasExistingContent, selection, onCancel, onGenerate, }) => {
    const defaultGen = useMemo(() => pickGeneratorForTheme(themeId), [themeId]);
    const [generatorId, setGeneratorId] = useState(defaultGen.id);
    const [width, setWidth] = useState(initialWidth);
    const [height, setHeight] = useState(initialHeight);
    const [density, setDensity] = useState(1);
    const [seedText, setSeedText] = useState(() => seedToString(randomSeed()));
    const [error, setError] = useState(null);
    // Dialog-local size scaler — independent of the global --ui-scale so
    // tweaking it here doesn't double-scale with the app-wide setting.
    // Persisted to localStorage so the user's preferred dialog size
    // sticks across opens.
    const [dialogScale, setDialogScale] = useState(loadInitialDialogScale);
    useEffect(() => {
        try {
            window.localStorage.setItem(DIALOG_SCALE_STORAGE_KEY, String(dialogScale));
        }
        catch {
            // Storage may be unavailable (private mode); fall back to in-memory only.
        }
    }, [dialogScale]);
    const scaleIndex = DIALOG_SCALE_OPTIONS.indexOf(dialogScale);
    const safeScaleIndex = scaleIndex < 0
        ? DIALOG_SCALE_OPTIONS.indexOf(DEFAULT_DIALOG_SCALE)
        : scaleIndex;
    const canShrink = safeScaleIndex > 0;
    const canGrow = safeScaleIndex < DIALOG_SCALE_OPTIONS.length - 1;
    const scaleDown = () => {
        if (canShrink)
            setDialogScale(DIALOG_SCALE_OPTIONS[safeScaleIndex - 1]);
    };
    const scaleUp = () => {
        if (canGrow)
            setDialogScale(DIALOG_SCALE_OPTIONS[safeScaleIndex + 1]);
    };
    // Slider values for the per-tile-type "Tile mix" section. The map is
    // keyed by `${generatorId}.${sliderKey}` so each generator keeps its
    // own values when the user flips between algorithms in the dropdown
    // without losing what they had dialed in. Missing entries fall back
    // to the generator's theme-aware defaults at read time, so the UI
    // always opens in a non-surprising state.
    const [mixOverrides, setMixOverrides] = useState({});
    const sliderSpecs = useMemo(() => getTileMixSliders(generatorId, themeId), [generatorId, themeId]);
    const tileMixDefaults = useMemo(() => getDefaultTileMix(generatorId, themeId), [generatorId, themeId]);
    const tileMixValue = (key) => mixOverrides[`${generatorId}.${key}`] ?? tileMixDefaults[key] ?? 0;
    const setTileMixValue = (key, v) => setMixOverrides(prev => ({ ...prev, [`${generatorId}.${key}`]: v }));
    const resetMixToDefaults = () => {
        // Drop only the entries belonging to the current generator so the
        // user's tweaks for other generators are preserved.
        setMixOverrides(prev => {
            const next = {};
            for (const k of Object.keys(prev)) {
                if (!k.startsWith(`${generatorId}.`))
                    next[k] = prev[k];
            }
            return next;
        });
    };
    // Per-room labeling — defaults to ON when the active theme has a room
    // archetype palette (built spaces like castle / starship / city) and
    // OFF for themes that don't, matching their lack of room kinds.
    const [labelRooms, setLabelRooms] = useState(() => themeSupportsRoomLabels(themeId));
    const showLabelRoomsToggle = generatorId === 'rooms-and-corridors' && themeSupportsRoomLabels(themeId);
    // True when the current selection is large enough to host a generator
    // run. Falls back to false (and disables the toggle) when no selection
    // is active or the rectangle is too small to be useful.
    const selectionUsable = !!selection &&
        selection.w >= MIN_SELECTION_DIM &&
        selection.h >= MIN_SELECTION_DIM;
    const [intoSelectionRaw, setIntoSelection] = useState(false);
    // If the selection becomes unavailable (cleared, or shrunk below the
    // minimum) the stored toggle is ignored — we never act on it without a
    // usable selection. Deriving here (rather than syncing via an effect)
    // keeps the state model simple and avoids cascading renders.
    const intoSelection = intoSelectionRaw && selectionUsable;
    // Esc cancels the dialog so it behaves like a native modal.
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onCancel]);
    const generator = getGenerator(generatorId);
    const clampDim = (n) => Math.min(MAX_DIM, Math.max(MIN_DIM, Math.floor(n)));
    const handleReroll = () => setSeedText(seedToString(randomSeed()));
    const handleGenerate = () => {
        // When generating into a selection, the dimensions come from the
        // selection rectangle and the W/H inputs are ignored. Otherwise we
        // clamp the user-entered values to the supported map size range.
        const w = intoSelection && selection ? selection.w : clampDim(Number(width));
        const h = intoSelection && selection ? selection.h : clampDim(Number(height));
        if (!Number.isFinite(w) || !Number.isFinite(h)) {
            setError('Width and height must be numbers.');
            return;
        }
        if (hasExistingContent && !intoSelection) {
            const ok = window.confirm('This will replace the current map. Notes and tokens will be cleared. Continue?');
            if (!ok)
                return;
        }
        const seed = parseSeed(seedText);
        try {
            // Build the slider payload from the user's overrides so generators
            // that don't see any change reproduce the legacy behavior exactly.
            const tileMix = {};
            for (const spec of sliderSpecs) {
                const k = `${generatorId}.${spec.key}`;
                if (k in mixOverrides)
                    tileMix[spec.key] = mixOverrides[k];
            }
            const result = generator.generate({
                width: w,
                height: h,
                seed,
                density,
                themeId,
                tileMix,
                labelRooms: showLabelRoomsToggle ? labelRooms : false,
            });
            const suggestedName = `Generated ${generator.name}`;
            if (intoSelection && selection) {
                onGenerate(result, suggestedName, selection);
            }
            else {
                onGenerate(result, suggestedName);
            }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Generation failed.');
        }
    };
    return (_jsx("div", { className: "generate-dialog-backdrop", onClick: e => { if (e.target === e.currentTarget)
            onCancel(); }, role: "dialog", "aria-modal": "true", "aria-labelledby": "generate-dialog-title", children: _jsxs("div", { className: "generate-dialog", style: { ['--gen-dialog-scale']: String(dialogScale) }, children: [_jsxs("div", { className: "generate-dialog-title-row", children: [_jsx("h2", { id: "generate-dialog-title", className: "generate-dialog-title", children: "\uD83C\uDFB2 Generate Map" }), _jsxs("div", { className: "generate-dialog-scale", role: "group", "aria-label": "Dialog text size", children: [_jsx("button", { type: "button", onClick: scaleDown, disabled: !canShrink, title: "Shrink dialog text", "aria-label": "Shrink dialog text", children: "A\u2212" }), _jsxs("span", { className: "generate-dialog-scale-label", "aria-hidden": "true", children: [Math.round(dialogScale * 100), "%"] }), _jsx("button", { type: "button", onClick: scaleUp, disabled: !canGrow, title: "Enlarge dialog text", "aria-label": "Enlarge dialog text", children: "A+" })] })] }), _jsxs("p", { className: "generate-dialog-help", children: ["Procedurally creates a map in the current theme (", themeId, "). The generator only emits the standard tile types \u2014 every theme renders them in its own style."] }), _jsxs("label", { className: "generate-dialog-row", children: [_jsx("span", { children: "Algorithm" }), _jsx("select", { value: generatorId, onChange: e => setGeneratorId(e.target.value), children: GENERATOR_LIST.map(g => (_jsx("option", { value: g.id, children: g.name }, g.id))) })] }), _jsx("p", { className: "generate-dialog-description", children: generator.description }), _jsxs("div", { className: "generate-dialog-row generate-dialog-grid-2", children: [_jsxs("label", { children: [_jsx("span", { children: "Width" }), _jsx("input", { type: "number", min: MIN_DIM, max: MAX_DIM, step: DIM_STEP, value: intoSelection && selection ? selection.w : width, disabled: intoSelection, onChange: e => setWidth(Number(e.target.value)) })] }), _jsxs("label", { children: [_jsx("span", { children: "Height" }), _jsx("input", { type: "number", min: MIN_DIM, max: MAX_DIM, step: DIM_STEP, value: intoSelection && selection ? selection.h : height, disabled: intoSelection, onChange: e => setHeight(Number(e.target.value)) })] })] }), selection && (_jsxs("label", { className: "generate-dialog-row generate-dialog-checkbox", children: [_jsx("input", { type: "checkbox", checked: intoSelection, disabled: !selectionUsable, onChange: e => setIntoSelection(e.target.checked) }), _jsxs("span", { children: ["Generate into selection", selectionUsable
                                    ? ` (${selection.w} × ${selection.h} at ${selection.x}, ${selection.y})`
                                    : ` (selection too small — needs at least ${MIN_SELECTION_DIM} × ${MIN_SELECTION_DIM})`] })] })), _jsxs("label", { className: "generate-dialog-row", children: [_jsxs("span", { children: ["Density (", density.toFixed(2), ")"] }), _jsx("input", { type: "range", min: MIN_DENSITY, max: MAX_DENSITY, step: 0.05, value: density, onChange: e => setDensity(Number(e.target.value)) })] }), sliderSpecs.length > 0 && (_jsxs("details", { className: "generate-dialog-mix", open: true, children: [_jsxs("summary", { children: ["Tile mix", _jsx("button", { type: "button", className: "generate-dialog-mix-reset", onClick: e => {
                                        // Don't toggle the <details> when the user clicks Reset.
                                        e.stopPropagation();
                                        resetMixToDefaults();
                                    }, title: "Reset all tile-mix sliders to the theme defaults", children: "Reset" })] }), sliderSpecs.map(spec => {
                            const v = tileMixValue(spec.key);
                            return (_jsxs("label", { className: "generate-dialog-row", children: [_jsxs("span", { children: [spec.label, " (", spec.format(v), ")"] }), _jsx("input", { type: "range", min: spec.min, max: spec.max, step: spec.step, value: v, onChange: e => setTileMixValue(spec.key, Number(e.target.value)) }), spec.hint && (_jsx("span", { className: "generate-dialog-mix-hint", children: spec.hint }))] }, spec.key));
                        })] })), showLabelRoomsToggle && (_jsxs("label", { className: "generate-dialog-row generate-dialog-checkbox", children: [_jsx("input", { type: "checkbox", checked: labelRooms, onChange: e => setLabelRooms(e.target.checked) }), _jsx("span", { children: "Label rooms with theme archetypes (e.g. Bridge, Great Hall)" })] })), _jsxs("label", { className: "generate-dialog-row", children: [_jsx("span", { children: "Seed" }), _jsxs("div", { className: "generate-dialog-seed-row", children: [_jsx("input", { type: "text", value: seedText, onChange: e => setSeedText(e.target.value), placeholder: "random", spellCheck: false }), _jsx("button", { type: "button", onClick: handleReroll, title: "Generate a new random seed", children: "\uD83C\uDFB2" })] })] }), hasExistingContent && !intoSelection && (_jsx("div", { className: "generate-dialog-warning", role: "alert", children: "\u26A0\uFE0F This will replace the current map. Notes and tokens will be cleared. (Tile / fog changes can be reverted with Undo.)" })), intoSelection && selection && (_jsx("div", { className: "generate-dialog-info", role: "note", children: "Only cells inside the selection will be overwritten. Existing notes, tokens, and fog elsewhere on the map are preserved (tile changes can be reverted with Undo)." })), error && (_jsx("div", { className: "generate-dialog-warning", role: "alert", children: error })), _jsxs("div", { className: "generate-dialog-buttons", children: [_jsx("button", { type: "button", onClick: onCancel, children: "Cancel" }), _jsx("button", { type: "button", className: "primary", onClick: handleGenerate, children: "Generate" })] })] }) }));
};
export default GenerateMapDialog;
