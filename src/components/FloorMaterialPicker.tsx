import { useEffect, useRef } from 'react';
import { FLOOR_MATERIAL_IDS, type FloorMaterialId } from '../types/map';
import { folioTheme } from '../themes/folio-v1/theme';
import { FLOOR_MATERIAL_LABELS } from '../themes/folio-v1/materials';
import '../themes/folio-v1/preview.css';

function FinishPreview({ material }: { material?: FloorMaterialId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 2; y++) {
        folioTheme.drawTile(ctx, 'floor', x, y, 16, {
          getTileBaseType: () => 'floor',
          getFloorMaterial: () => material,
        });
      }
    }
  }, [material]);
  return <canvas ref={ref} width={64} height={32} aria-hidden="true" />;
}

export default function FloorMaterialPicker({ value, onChange }: {
  value?: FloorMaterialId;
  onChange: (material: FloorMaterialId | undefined) => void;
}) {
  return <fieldset className="floor-material-picker">
    <legend>Floor finish</legend>
    <div className="floor-material-options">
      {[undefined, ...FLOOR_MATERIAL_IDS].map(material => {
        const label = material ? FLOOR_MATERIAL_LABELS[material] : 'Flagstone';
        return <button type="button" key={material ?? 'flagstone'}
          className={`tile-btn ${value === material ? 'active' : ''}`}
          aria-label={`${label} floor`} aria-pressed={value === material}
          onClick={() => onChange(material)}>
          <FinishPreview material={material} />
          <span>{label}</span>
        </button>;
      })}
    </div>
    <p>Paint, fill or fill a selected region. All finishes keep the same floor movement and sight rules.</p>
  </fieldset>;
}
