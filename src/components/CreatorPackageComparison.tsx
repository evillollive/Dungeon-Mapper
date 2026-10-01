import { useEffect, useRef } from 'react';
import type { CreatorPackageComparison as Comparison } from '../utils/creatorPackageOrigin';

export default function CreatorPackageComparison({ comparison, name }: { comparison: Comparison; name: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, []);
  const changed = comparison.files.filter(file => file.change !== 'unchanged');
  const declaration = (before: string, after: string) => before === after ? before : `${before} to ${after}`;
  return <section className="library-package-comparison" aria-label="Creator package comparison">
    <h3 ref={heading} tabIndex={-1}>Compare with {name}</h3>
    <p>Compared with the original imported package, not your current edits. Your saved map will not be overwritten.</p>
    <dl>
      <dt>Original package</dt><dd>{comparison.original.packageId} / declared version {comparison.original.contentVersion}</dd>
      <dt>Selected package</dt><dd>{comparison.incoming.packageId} / declared version {comparison.incoming.contentVersion}</dd>
      <dt>Declared title</dt><dd>{declaration(comparison.original.title, comparison.incoming.title)}</dd>
      <dt>Declared creator</dt><dd>{declaration(comparison.original.author, comparison.incoming.author)}</dd>
      <dt>Contribution license</dt><dd>{declaration(comparison.original.license, comparison.incoming.license)}</dd>
    </dl>
    {!comparison.samePackageId ? <p className="library-package-warning"><strong>Different package ID.</strong> Treat this as a separate map, not an upstream update.</p>
      : <p>Package IDs match. IDs, author names and version labels are declarations, not verified publisher identity or proof that a file is newer.</p>}
    {comparison.sameBytes ? <p role="status">All imported package file bytes match the original receipt. Local edits were not compared or changed.</p>
      : <p role="status">{changed.length} package {changed.length === 1 ? 'file differs' : 'files differ'} from the original import.</p>}
    {!comparison.sameBytes && comparison.sameVersionLabel && <p className="library-package-warning">The version label is unchanged, but package bytes differ. Review this as a changed package.</p>}
    {(comparison.authorChanged || comparison.licenseChanged || comparison.profileChanged || comparison.catalogChanged) &&
      <p className="library-package-warning">Declared {[
        comparison.authorChanged && 'creator', comparison.licenseChanged && 'license',
        comparison.profileChanged && 'audience profile', comparison.catalogChanged && 'artwork catalog',
      ].filter(Boolean).join(', ')} changed. Review source notices and included content before importing.</p>}
    <details open={changed.length > 0}>
      <summary>File changes ({changed.length})</summary>
      {changed.length ? <ul>{changed.map(file => <li key={file.path}>
        <strong>{file.change}: {file.path}</strong>
        <span>{file.before && file.after && file.before.bytes === file.after.bytes
          ? `${file.after.bytes.toLocaleString()} bytes; SHA-256 changed`
          : `${file.before ? `${file.before.bytes.toLocaleString()} bytes` : 'Not present'} to ${file.after ? `${file.after.bytes.toLocaleString()} bytes` : 'not present'}`}</span>
      </li>)}</ul> : <p>No file changes.</p>}
    </details>
    <p>Importing keeps both projects as independent local copies. No GitHub request, background update check or automatic merge occurs.</p>
  </section>;
}
