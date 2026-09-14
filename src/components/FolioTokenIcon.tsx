import type { Token } from '../types/map';
import { folioTokenPaths } from '../utils/folioTokenRender';

export default function FolioTokenIcon({ token, size = 32 }: {
  token: Pick<Token, 'icon' | 'kind' | 'color'>;
  size?: number;
}) {
  const paths = folioTokenPaths(token);
  if (!paths) return null;
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden="true" style={{ flexShrink: 0 }}>
      {paths.map((path, index) => (
        <path key={index} d={path.path} fill={path.fill} fillRule="evenodd"
          stroke={path.stroke} strokeWidth={path.strokeWidth} strokeLinejoin="round"
          transform={path.transform ? `translate(${path.transform.x} ${path.transform.y}) scale(${path.transform.scale})` : undefined} />
      ))}
    </svg>
  );
}
