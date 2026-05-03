import React, { useState } from 'react';
import type { CustomThemeDefinition, ToolType, TileType, MarkerShape, MeasureShape, LightSourcePreset, PlacedStamp } from '../types/map';
import type { BackgroundImage } from '../types/map';
import DrawToolsTab from './DrawToolsTab';
import TacticalToolsTab from './TacticalToolsTab';
import AdvancedToolsTab from './AdvancedToolsTab';

interface ToolbarProps {
  activeTool: ToolType;
  activeTile: TileType;
  themeId: string;
  customThemes?: readonly CustomThemeDefinition[];
  onSetTool: (tool: ToolType) => void;
  onSetTile: (tile: TileType) => void;
  onSetTheme: (theme: string, preserveExisting?: boolean) => void;
  preserveOnThemeSwitch: boolean;
  onTogglePreserveOnThemeSwitch: () => void;
  onOpenCustomThemeBuilder: () => void;
  fogEnabled: boolean;
  gmShowFog: boolean;
  onToggleGmShowFog: () => void;
  onOpenGenerateMap: () => void;
  onOpenPremadeMaps: () => void;
  // Shape marker tool settings
  markerShape: MarkerShape;
  markerColor: string;
  markerSize: number;
  onSetMarkerShape: (s: MarkerShape) => void;
  onSetMarkerColor: (c: string) => void;
  onSetMarkerSize: (s: number) => void;
  onClearMarkers: () => void;
  // Background image
  backgroundImage?: BackgroundImage;
  onImportBackgroundImage: (bg: BackgroundImage) => void;
  onUpdateBackgroundImage: (patch: Partial<BackgroundImage>) => void;
  onClearBackgroundImage: () => void;
  // Measure tool settings
  measureShape: MeasureShape;
  measureFeetPerCell: number;
  onSetMeasureShape: (s: MeasureShape) => void;
  onSetMeasureFeetPerCell: (n: number) => void;
  // Light source tool settings
  lightPreset: LightSourcePreset;
  lightRadius: number;
  lightColor: string;
  onSetLightPreset: (p: LightSourcePreset) => void;
  onSetLightRadius: (r: number) => void;
  onSetLightColor: (c: string) => void;
  onClearLightSources: () => void;
  // Stair link tool state
  stairLinkSource: { level: number; x: number; y: number } | null;
  stairLinkCount: number;
  onClearStairLinks: () => void;
  // GM drawing tool state
  gmDrawColor: string;
  gmDrawWidth: number;
  onSetGmDrawColor: (c: string) => void;
  onSetGmDrawWidth: (w: number) => void;
  onClearGmDrawings: () => void;
  // Stamp picker state
  selectedStampId: string | null;
  onSelectStamp: (stampId: string) => void;
  onClearStamps: () => void;
  // Stamp transform controls
  stamps: PlacedStamp[];
  selectedPlacedStampId: number | null;
  onSelectPlacedStamp: (id: number | null) => void;
  onUpdateStamp: (id: number, patch: Partial<Omit<PlacedStamp, 'id' | 'stampId'>>) => void;
  onRemoveStamp: (id: number) => void;
  onBringStampToFront: (id: number) => void;
  onSendStampToBack: (id: number) => void;
}

type ToolbarTab = 'draw' | 'tactical' | 'advanced';

const TAB_META: { id: ToolbarTab; label: string; icon: string; title: string }[] = [
  { id: 'draw',     label: 'Draw',     icon: '✏️', title: 'Drawing tools, tile palette, and theme selection' },
  { id: 'tactical', label: 'Tactical', icon: '⚔️', title: 'Fog, FOV, measurement, tokens, markers, and lighting' },
  { id: 'advanced', label: 'Advanced', icon: '⚙️', title: 'Background image, stair links, and GM annotations' },
];

const TOOLBAR_TAB_STORAGE_KEY = 'dungeon-mapper:toolbar-tab';

function loadInitialTab(): ToolbarTab {
  if (typeof window === 'undefined') return 'draw';
  try {
    const stored = window.localStorage.getItem(TOOLBAR_TAB_STORAGE_KEY);
    if (stored === 'draw' || stored === 'tactical' || stored === 'advanced') return stored;
  } catch { /* ignore */ }
  return 'draw';
}

const Toolbar: React.FC<ToolbarProps> = (props) => {
  const [activeTab, setActiveTab] = useState<ToolbarTab>(loadInitialTab);

  const handleSetTab = (tab: ToolbarTab) => {
    setActiveTab(tab);
    try {
      window.localStorage.setItem(TOOLBAR_TAB_STORAGE_KEY, tab);
    } catch { /* ignore */ }
  };

  return (
    <div className="toolbar">
      {/* Tab bar */}
      <div className="toolbar-tabs" role="tablist" aria-label="Toolbar sections">
        {TAB_META.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`toolbar-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleSetTab(tab.id)}
            title={tab.title}
            aria-label={`${tab.label} tab`}
            aria-selected={activeTab === tab.id}
            aria-controls={`toolbar-panel-${tab.id}`}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        className="toolbar-tab-panel"
        role="tabpanel"
        id={`toolbar-panel-${activeTab}`}
        aria-label={`${TAB_META.find(t => t.id === activeTab)?.label ?? ''} tools`}
      >
        {activeTab === 'draw' && (
          <DrawToolsTab
            activeTool={props.activeTool}
            activeTile={props.activeTile}
            themeId={props.themeId}
            customThemes={props.customThemes ?? []}
            onSetTool={props.onSetTool}
            onSetTile={props.onSetTile}
            onSetTheme={props.onSetTheme}
            preserveOnThemeSwitch={props.preserveOnThemeSwitch}
            onTogglePreserveOnThemeSwitch={props.onTogglePreserveOnThemeSwitch}
            onOpenCustomThemeBuilder={props.onOpenCustomThemeBuilder}
            onOpenGenerateMap={props.onOpenGenerateMap}
            onOpenPremadeMaps={props.onOpenPremadeMaps}
            selectedStampId={props.selectedStampId}
            onSelectStamp={props.onSelectStamp}
            onClearStamps={props.onClearStamps}
            stamps={props.stamps}
            selectedPlacedStampId={props.selectedPlacedStampId}
            onSelectPlacedStamp={props.onSelectPlacedStamp}
            onUpdateStamp={props.onUpdateStamp}
            onRemoveStamp={props.onRemoveStamp}
            onBringStampToFront={props.onBringStampToFront}
            onSendStampToBack={props.onSendStampToBack}
          />
        )}
        {activeTab === 'tactical' && (
          <TacticalToolsTab
            activeTool={props.activeTool}
            onSetTool={props.onSetTool}
            fogEnabled={props.fogEnabled}
            gmShowFog={props.gmShowFog}
            onToggleGmShowFog={props.onToggleGmShowFog}
            markerShape={props.markerShape}
            markerColor={props.markerColor}
            markerSize={props.markerSize}
            onSetMarkerShape={props.onSetMarkerShape}
            onSetMarkerColor={props.onSetMarkerColor}
            onSetMarkerSize={props.onSetMarkerSize}
            onClearMarkers={props.onClearMarkers}
            measureShape={props.measureShape}
            measureFeetPerCell={props.measureFeetPerCell}
            onSetMeasureShape={props.onSetMeasureShape}
            onSetMeasureFeetPerCell={props.onSetMeasureFeetPerCell}
            lightPreset={props.lightPreset}
            lightRadius={props.lightRadius}
            lightColor={props.lightColor}
            onSetLightPreset={props.onSetLightPreset}
            onSetLightRadius={props.onSetLightRadius}
            onSetLightColor={props.onSetLightColor}
            onClearLightSources={props.onClearLightSources}
          />
        )}
        {activeTab === 'advanced' && (
          <AdvancedToolsTab
            activeTool={props.activeTool}
            onSetTool={props.onSetTool}
            backgroundImage={props.backgroundImage}
            onImportBackgroundImage={props.onImportBackgroundImage}
            onUpdateBackgroundImage={props.onUpdateBackgroundImage}
            onClearBackgroundImage={props.onClearBackgroundImage}
            stairLinkSource={props.stairLinkSource}
            stairLinkCount={props.stairLinkCount}
            onClearStairLinks={props.onClearStairLinks}
            gmDrawColor={props.gmDrawColor}
            gmDrawWidth={props.gmDrawWidth}
            onSetGmDrawColor={props.onSetGmDrawColor}
            onSetGmDrawWidth={props.onSetGmDrawWidth}
            onClearGmDrawings={props.onClearGmDrawings}
          />
        )}
      </div>
    </div>
  );
};

export default Toolbar;
