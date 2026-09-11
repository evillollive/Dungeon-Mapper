import { useEffect, useRef, useState } from 'react';
import type { CustomThemeDefinition, DungeonMap, StampDef, ViewMode } from '../types/map';
import { projectForAudience } from '../utils/audienceProjection';
import { renderMapToCanvas } from '../utils/renderMap';
import { buildMapSVG } from '../utils/export';
import { getThemeWithCustom } from '../utils/customThemes';
import { loadExportAssets } from '../utils/exportAssets';
import type { ExportPlan } from '../utils/exportPlan';

export default function ExportPreview({ map, themeId, customThemes, customStamps, viewMode, printMode, format,
  plan, pageIndex, feetPerCell }: { map: DungeonMap; themeId: string; customThemes: readonly CustomThemeDefinition[];
    customStamps: readonly StampDef[]; viewMode: ViewMode; printMode: boolean; format: string;
    plan: ExportPlan | null; pageIndex: number | null; feetPerCell: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    const target = canvas.current;
    if (target) target.width = target.height = 0;
    if (image.current) image.current.removeAttribute('src');
    async function draw() {
      const projection = viewMode === 'player' ? projectForAudience(map, customThemes, customStamps) : null;
      const source = projection?.map ?? map;
      const themes = projection?.customThemes ?? customThemes;
      const stamps = projection?.customStamps ?? customStamps;
      const assets = await loadExportAssets(source, themes, stamps, controller.signal);
      controller.signal.throwIfAborted();
      setWarnings(assets.warnings);
      setError('');
      if (format === 'svg') {
        const svg = buildMapSVG(map, getThemeWithCustom(themeId, customThemes), undefined,
          { viewMode, customThemes, customStamps, images: assets.images });
        url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        if (image.current) image.current.src = url;
        return;
      }
      const scale = plan && pageIndex !== null ? Math.min(1, 640 / Math.max(plan.pageWidth, plan.pageHeight)) : 1;
      const tileSize = plan && pageIndex !== null ? plan.tileSize * scale : Math.max(1, Math.floor(640 / Math.max(map.meta.width, map.meta.height)));
      const region = plan && pageIndex !== null ? {
        x: (pageIndex % plan.columns) * plan.stepX * scale,
        y: Math.floor(pageIndex / plan.columns) * plan.stepY * scale,
        width: Math.max(1, Math.round(plan.contentWidth * scale)),
        height: Math.max(1, Math.round(plan.contentHeight * scale)),
      } : undefined;
      const rendered = renderMapToCanvas(map, { tileSize, themeId, customThemes, customStamps, viewMode,
        printMode, feetPerCell, region, images: assets.images });
      if (target) {
        target.width = plan && pageIndex !== null ? Math.round(plan.pageWidth * scale) : rendered.width;
        target.height = plan && pageIndex !== null ? Math.round(plan.pageHeight * scale) : rendered.height;
        const ctx = target.getContext('2d');
        if (!ctx) throw new Error('Canvas preview is unavailable.');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, target.width, target.height);
        const margin = plan && pageIndex !== null ? plan.margin * scale : 0;
        ctx.drawImage(rendered, margin, margin);
      }
      rendered.width = rendered.height = 0;
    }
    void draw().catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Preview failed.');
    });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [map, themeId, customThemes, customStamps, viewMode, printMode, format, plan, pageIndex, feetPerCell]);
  return <>
    <div className="export-preview-stage">
      {format === 'svg' ? <img ref={image} alt={`${viewMode === 'player' ? 'Player' : 'DM'} SVG export preview`} />
        : <canvas ref={canvas} role="img" aria-label={`${viewMode === 'player' ? 'Player' : 'DM'} PNG export preview`} />}
    </div>
    {error && <p role="alert">{error}</p>}
    {warnings.map(warning => <p className="export-warning" key={warning}>{warning}</p>)}
  </>;
}
