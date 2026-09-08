import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommandPalette, { type CommandItem } from '../CommandPalette';
import ExportDialog from '../ExportDialog';
import GenerateHub from '../GenerateHub';
import NavigationRail from '../NavigationRail';
import SelectionInspector from '../SelectionInspector';
import { createDefaultMap } from '../../hooks/mapStateUtils';
import { EditorFixture } from '../../test/editorActionFixture';

const { exportHighResPNG } = vi.hoisted(() => ({
  exportHighResPNG: vi.fn(),
}));

vi.mock('../../utils/export', async importOriginal => {
  const actual = await importOriginal<typeof import('../../utils/export')>();
  return {
    ...actual,
    exportHighResPNG: (...args: unknown[]) => exportHighResPNG(...args),
  };
});

vi.mock('../DrawToolsTab', () => ({ default: () => <div>Draw panel</div> }));
vi.mock('../TacticalToolsTab', () => ({ default: () => <div>Tactical panel</div> }));
vi.mock('../AdvancedToolsTab', () => ({ default: () => <div>Advanced panel</div> }));

type NavigationRailPropsForTest = React.ComponentProps<typeof NavigationRail>;

function railProps(overrides: Partial<NavigationRailPropsForTest> = {}): NavigationRailPropsForTest {
  const noop = () => {};
  return {
    activePanel: 'build',
    activeTool: 'paint',
    activeTile: 'floor',
    themeId: 'dungeon',
    onSetTool: noop,
    onSetTile: noop,
    onSetTheme: noop,
    preserveOnThemeSwitch: false,
    onTogglePreserveOnThemeSwitch: noop,
    onOpenCustomThemeBuilder: noop,
    fogEnabled: true,
    gmShowFog: false,
    onToggleGmShowFog: noop,
    onOpenGenerateMap: noop,
    markerShape: 'circle',
    markerColor: '#f00',
    markerSize: 1,
    onSetMarkerShape: noop,
    onSetMarkerColor: noop,
    onSetMarkerSize: noop,
    onClearMarkers: noop,
    onImportBackgroundImage: noop,
    onUpdateBackgroundImage: noop,
    onClearBackgroundImage: noop,
    measureShape: 'ruler',
    measureFeetPerCell: 5,
    onSetMeasureShape: noop,
    onSetMeasureFeetPerCell: noop,
    lightPreset: 'torch',
    lightRadius: 6,
    lightColor: '#fff',
    onSetLightPreset: noop,
    onSetLightRadius: noop,
    onSetLightColor: noop,
    onClearLightSources: noop,
    stairLinkSource: null,
    stairLinkCount: 0,
    onClearStairLinks: noop,
    gmDrawColor: '#fff',
    gmDrawWidth: 1,
    onSetGmDrawColor: noop,
    onSetGmDrawWidth: noop,
    onClearGmDrawings: noop,
    selectedStampId: null,
    onSelectStamp: noop,
    onClearStamps: noop,
    wallColor: '#000',
    wallThickness: 0.15,
    onSetWallColor: noop,
    onSetWallThickness: noop,
    pathColor: '#000',
    pathWidth: 0.2,
    onSetPathColor: noop,
    onSetPathWidth: noop,
    onClearWalls: noop,
    onClearPaths: noop,
    riverColor: '#00f', riverWidth: 1, riverType: 'water',
    onSetRiverColor: noop, onSetRiverWidth: noop, onSetRiverType: noop, onClearRivers: noop,
    onOpenSceneTemplates: noop,
    ...overrides,
  };
}

describe('CommandPalette behavior', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('filters commands and runs the selected action', async () => {
    const action = vi.fn();
    const onClose = vi.fn();
    const commands: CommandItem[] = [
      { id: 'paint', label: 'Paint tool', category: 'Tool', action: vi.fn() },
      { id: 'export', label: 'Export PNG', category: 'File', action },
    ];

    render(<CommandPalette open commands={commands} onClose={onClose} />);

    fireEvent.change(screen.getByRole('combobox', { name: /search commands/i }), {
      target: { value: 'exp' },
    });
    expect(screen.getByText('Export PNG')).toBeInTheDocument();
    expect(screen.queryByText('Paint tool')).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => expect(action).toHaveBeenCalled());
  });
});

describe('GenerateHub behavior', () => {
  it('generates into a usable selection target', () => {
    const image = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,preview');
    const onGenerate = vi.fn();
    render(
      <GenerateHub
        themeId="dungeon"
        initialWidth={16}
        initialHeight={16}
        hasExistingContent={false}
        selection={{ x: 2, y: 3, w: 8, h: 8 }}
        onCancel={vi.fn()}
        onGenerate={onGenerate}
        onLoadProject={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText(/Generate into selection/i));
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(onGenerate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Use this map' }));
    expect(onGenerate).toHaveBeenCalled();
    expect(onGenerate.mock.calls[0][2]).toEqual({ x: 2, y: 3, w: 8, h: 8 });
    image.mockRestore();
  });
});

describe('NavigationRail behavior', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('dispatches destinations through the shared registry and renders the controlled panel', () => {
    const onAction = vi.fn();
    const { rerender } = render(<EditorFixture onAction={onAction}><NavigationRail {...railProps()} /></EditorFixture>);

    expect(screen.getByText('Draw panel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fog & sight' }));
    expect(onAction).toHaveBeenCalledWith('panel.tactical');
    rerender(<EditorFixture onAction={onAction}><NavigationRail {...railProps({ activePanel: 'tactical' })} /></EditorFixture>);
    expect(screen.getByText('Tactical panel')).toBeInTheDocument();
    expect(screen.queryByText('Draw panel')).not.toBeInTheDocument();
    rerender(<EditorFixture onAction={onAction}><NavigationRail {...railProps()} /></EditorFixture>);
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(onAction).toHaveBeenCalledWith('file.generate');
  });
});

describe('SelectionInspector behavior', () => {
  it('summarizes tile counts and can remove listed light sources', () => {
    const map = createDefaultMap('Summary', 2, 2);
    map.tiles[0][0] = { type: 'floor' };
    map.tiles[0][1] = { type: 'wall' };
    const onRemoveLightSource = vi.fn();

    render(
      <SelectionInspector
        map={map}
        themeId="dungeon"
        themeName="Dungeon"
        selectedPlacedStampId={null}
        selectedTokenId={null}
        selectedNoteId={null}
        stamps={[]}
        tokens={[]}
        notes={[]}
        lightSources={[{ id: 7, x: 1, y: 1, radius: 4, color: '#fff', label: 'Torch' }]}
        onUpdateStamp={vi.fn()}
        onRemoveStamp={vi.fn()}
        onBringStampToFront={vi.fn()}
        onSendStampToBack={vi.fn()}
        onSelectPlacedStamp={vi.fn()}
        onUpdateToken={vi.fn()}
        onRemoveToken={vi.fn()}
        onSelectToken={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onSelectNote={vi.fn()}
        onRemoveLightSource={onRemoveLightSource}
      />,
    );

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Floor').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Wall').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Empty').nextElementSibling).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('button', { name: /Remove Torch/i }));
    expect(onRemoveLightSource).toHaveBeenCalledWith(7);
  });
});

describe('ExportDialog behavior', () => {
  beforeEach(() => {
    exportHighResPNG.mockReset();
    exportHighResPNG.mockResolvedValue(undefined);
  });

  it('passes selected print/export options to high-res export', async () => {
    const map = createDefaultMap('Export', 8, 8);
    render(
      <ExportDialog
        map={map}
        themeId="dungeon"
        printMode={false}
        viewMode="gm"
        feetPerCell={5}
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Resolution/i), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText(/View Mode/i), { target: { value: 'player' } });
    fireEvent.click(screen.getByLabelText(/Black & White/i));
    fireEvent.click(screen.getByRole('button', { name: /Export PNG/i }));

    await waitFor(() => expect(exportHighResPNG).toHaveBeenCalled());
    expect(exportHighResPNG.mock.calls[0][1]).toMatchObject({
      dpi: 150,
      themeId: 'dungeon',
      printMode: true,
      viewMode: 'player',
      feetPerCell: 5,
    });
  });
});
