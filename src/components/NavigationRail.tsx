import React, { useState } from 'react';
import type { CustomThemeDefinition, ToolType, TileType, MarkerShape, MeasureShape, LightSourcePreset } from '../types/map';
import type { BackgroundImage } from '../types/map';
import DrawToolsTab from './DrawToolsTab';
import TacticalToolsTab from './TacticalToolsTab';
import AdvancedToolsTab from './AdvancedToolsTab';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

export type RailMode = 'draw' | 'tactical' | 'advanced';

const RAIL_ITEMS: { id: RailMode; icon: string; label: string; title: string }[] = [
  { id: 'draw',     icon: '✏️', label: 'Draw',     title: 'Drawing tools, tile palette, and theme selection' },
  { id: 'tactical', icon: '⚔️', label: 'Tactical', title: 'Fog, FOV, measurement, tokens, markers, and lighting' },
  { id: 'advanced', icon: '⚙️', label: 'Advanced', title: 'Background image, stair links, and GM annotations' },
];

const RAIL_MODE_STORAGE_KEY = 'dungeon-mapper:rail-mode';

function loadInitialRailMode(): RailMode {
  if (typeof window === 'undefined') return 'draw';
  try {
    const stored = window.localStorage.getItem(RAIL_MODE_STORAGE_KEY);
    if (stored === 'draw' || stored === 'tactical' || stored === 'advanced') return stored;
  } catch { /* ignore */ }
  return 'draw';
}

/* ------------------------------------------------------------------ */
/*  Props — same as Toolbar (re-export for consumers)                  */
/* ------------------------------------------------------------------ */

interface NavigationRailProps {
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
  // Custom stamps
  customStamps?: readonly import('../types/map').StampDef[];
  onSaveCustomStamp?: (stamp: import('../types/map').StampDef) => void;
  onDeleteCustomStamp?: (stampId: string) => void;
  // Wall & Path tools
  wallColor: string;
  wallThickness: number;
  onSetWallColor: (c: string) => void;
  onSetWallThickness: (w: number) => void;
  pathColor: string;
  pathWidth: number;
  onSetPathColor: (c: string) => void;
  onSetPathWidth: (w: number) => void;
  onClearWalls: () => void;
  onClearPaths: () => void;
  // Scene templates
  onOpenSceneTemplates: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const NavigationRail: React.FC<NavigationRailProps> = (props) => {
  const [activeMode, setActiveMode] = useState<RailMode>(loadInitialRailMode);

  const handleSetMode = (mode: RailMode) => {
    setActiveMode(mode);
    try {
      window.localStorage.setItem(RAIL_MODE_STORAGE_KEY, mode);
    } catch { /* ignore */ }
  };

  return (
    <div className="nav-rail-container">
      {/* Icon rail — narrow vertical strip */}
      <div className="nav-rail" role="tablist" aria-label="Tool modes" aria-orientation="vertical">
        {RAIL_ITEMS.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className={`nav-rail-btn ${activeMode === item.id ? 'active' : ''}`}
            onClick={() => handleSetMode(item.id)}
            title={item.title}
            aria-label={`${item.label} mode`}
            aria-selected={activeMode === item.id}
            aria-controls={`rail-panel-${item.id}`}
          >
            <span className="nav-rail-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-rail-label">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Contextual sub-panel — swaps based on selected rail mode */}
      <div
        className="nav-rail-panel"
        role="tabpanel"
        id={`rail-panel-${activeMode}`}
        aria-label={`${RAIL_ITEMS.find(i => i.id === activeMode)?.label ?? ''} tools`}
      >
        {activeMode === 'draw' && (
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
            customStamps={props.customStamps}
            onSaveCustomStamp={props.onSaveCustomStamp}
            onDeleteCustomStamp={props.onDeleteCustomStamp}
            wallColor={props.wallColor}
            wallThickness={props.wallThickness}
            onSetWallColor={props.onSetWallColor}
            onSetWallThickness={props.onSetWallThickness}
            pathColor={props.pathColor}
            pathWidth={props.pathWidth}
            onSetPathColor={props.onSetPathColor}
            onSetPathWidth={props.onSetPathWidth}
            onClearWalls={props.onClearWalls}
            onClearPaths={props.onClearPaths}
          />
        )}
        {activeMode === 'tactical' && (
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
        {activeMode === 'advanced' && (
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
            onOpenSceneTemplates={props.onOpenSceneTemplates}
          />
        )}
      </div>
    </div>
  );
};

export default NavigationRail;
