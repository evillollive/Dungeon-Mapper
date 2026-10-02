import { Inflate } from 'fflate';
import { CREATOR_PACKAGE_LIMITS } from './creatorProject';
import { assertCreatorMemberPath, assertCreatorMembers, assertCreatorPackageId, type CreatorPackageFile } from './creatorPackageFormat';

interface Entry {
  path: string;
  compressed: number;
  expanded: number;
  method: number;
  crc: number;
  start: number;
  localOffset: number;
  end: number;
}
export interface CreatorZipContents { packageId: string; files: CreatorPackageFile[] }
const decoder = new TextDecoder('utf-8', { fatal: true });

function invalid(detail: string): never {
  throw new Error(`Cannot import this creator ZIP: ${detail}. Keep the original file; no project was changed.`);
}
function crc32(bytes: Uint8Array, current = 0xffffffff): number {
  let crc = current;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return crc;
}

function directory(bytes: Uint8Array): { entries: Entry[]; packageId: string } {
  if (bytes.byteLength > CREATOR_PACKAGE_LIMITS.zipBytes) invalid('download exceeds 32 MiB');
  if (bytes.length < 22) invalid('missing archive directory');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50 &&
        offset + 22 + view.getUint16(offset + 20, true) === bytes.length) { eocd = offset; break; }
  }
  if (eocd < 0) invalid('missing or truncated end record');
  if (view.getUint16(eocd + 4, true) || view.getUint16(eocd + 6, true)) invalid('multi-disk archives are unsupported');
  const count = view.getUint16(eocd + 10, true), size = view.getUint32(eocd + 12, true), centralStart = view.getUint32(eocd + 16, true);
  if (!count || count > CREATOR_PACKAGE_LIMITS.members || count !== view.getUint16(eocd + 8, true) ||
      size === 0xffffffff || centralStart === 0xffffffff || centralStart + size !== eocd) invalid('unsupported directory size or entry count');
  let offset = centralStart, total = 0;
  let packageId: string | undefined;
  const entries: Entry[] = [], paths = new Set<string>();
  function extra(start: number, length: number): void {
    const end = start + length;
    for (let position = start; position < end;) {
      if (position + 4 > end) invalid('truncated extra metadata');
      const id = view.getUint16(position, true), size = view.getUint16(position + 2, true);
      if ([0x0001, 0x000d, 0x756e, 0x7075, 0x9901].includes(id)) invalid('ZIP64, links, alternative paths or encryption are unsupported');
      position += 4 + size;
      if (position > end) invalid('truncated extra metadata');
    }
  }
  for (let index = 0; index < count; index++) {
    if (offset + 46 > eocd || view.getUint32(offset, true) !== 0x02014b50) invalid('inconsistent directory entry');
    const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true), expanded = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true), extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true), attrs = view.getUint32(offset + 38, true);
    const localOffset = view.getUint32(offset + 42, true), entryEnd = offset + 46 + nameLength + extraLength + commentLength;
    if (entryEnd > eocd || view.getUint16(offset + 34, true)) invalid('truncated or split entry');
    if ((flags & ~0x080e) || ![0, 8].includes(method) || (method === 0 && (flags & 6))) invalid('unsupported encryption or compression flags');
    if ((attrs & 0x10) || ![0, 0x8000].includes((attrs >>> 16) & 0xf000)) invalid('links or non-file entries are unsupported');
    if (!expanded || expanded > CREATOR_PACKAGE_LIMITS.expandedBytes - total || compressed > bytes.length ||
        localOffset >= centralStart || (method === 0 && compressed !== expanded)) invalid('invalid member size');
    total += expanded;
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength);
    let fullPath: string;
    try { fullPath = decoder.decode(nameBytes); }
    catch (error) { if (!(error instanceof TypeError)) throw error; invalid('member names are not UTF-8'); }
    const match = /^maps\/([^/]+)\/(.+)$/.exec(fullPath);
    if (!match) invalid('members must live under one maps/<package-id> directory');
    assertCreatorPackageId(match[1]);
    assertCreatorMemberPath(match[2]);
    packageId ??= match[1];
    if (match[1] !== packageId || paths.has(fullPath.toLowerCase())) invalid('duplicate or mixed package paths');
    paths.add(fullPath.toLowerCase());
    if (match[2] === 'map.json' && expanded > CREATOR_PACKAGE_LIMITS.mapBytes) invalid('map JSON exceeds 16 MiB');
    extra(offset + 46 + nameLength, extraLength);
    if (localOffset + 30 > centralStart || view.getUint32(localOffset, true) !== 0x04034b50 ||
        view.getUint16(localOffset + 6, true) !== flags || view.getUint16(localOffset + 8, true) !== method) invalid('local header disagrees with directory');
    const localNameLength = view.getUint16(localOffset + 26, true), localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    if (start > centralStart || localNameLength !== nameLength ||
        nameBytes.some((byte, i) => bytes[localOffset + 30 + i] !== byte)) invalid('local header has a different path');
    extra(localOffset + 30 + localNameLength, localExtraLength);
    const crc = view.getUint32(offset + 16, true);
    let end = start + compressed;
    if (end > centralStart) invalid('overlapping compressed data');
    if (flags & 8) {
      if (end + 12 > centralStart) invalid('missing data descriptor');
      if (view.getUint32(end, true) === 0x08074b50) end += 4;
      if (end + 12 > centralStart || view.getUint32(end, true) !== crc ||
          view.getUint32(end + 4, true) !== compressed || view.getUint32(end + 8, true) !== expanded) invalid('inconsistent data descriptor');
      end += 12;
      for (const [delta, value] of [[14, crc], [18, compressed], [22, expanded]]) {
        const local = view.getUint32(localOffset + delta, true);
        if (local !== 0 && local !== value) invalid('inconsistent streamed local header');
      }
    } else if (view.getUint32(localOffset + 14, true) !== crc ||
        view.getUint32(localOffset + 18, true) !== compressed ||
        view.getUint32(localOffset + 22, true) !== expanded) invalid('inconsistent local sizes');
    entries.push({ path: match[2], compressed, expanded, method, crc, localOffset, start, end });
    offset = entryEnd;
  }
  if (offset !== eocd || !packageId) invalid('unexpected directory data');
  const ranges = entries.map(entry => ({ start: entry.localOffset, end: entry.end })).sort((a, b) => a.start - b.start);
  let next = 0;
  for (const range of ranges) {
    if (range.start !== next) invalid('overlapping or unlisted local data');
    next = range.end;
  }
  if (next !== centralStart) invalid('unlisted data before the directory');
  return { entries, packageId };
}

/** Envelope validation only. No file is rendered or persisted by this function. */
export async function decodeCreatorZip(input: Uint8Array, signal: AbortSignal): Promise<CreatorZipContents> {
  signal.throwIfAborted();
  if (input.byteLength > CREATOR_PACKAGE_LIMITS.zipBytes) invalid('download exceeds 32 MiB');
  const bytes = new Uint8Array(input);
  const { entries, packageId } = directory(bytes);
  const files: CreatorPackageFile[] = [];
  for (const entry of entries) {
    signal.throwIfAborted();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let length = 0, crc = 0xffffffff, finished = false;
    const output = (chunk: Uint8Array, final: boolean) => {
      if (chunk.byteLength > entry.expanded - length) invalid('actual expanded bytes exceed the declared bound');
      length += chunk.byteLength;
      crc = crc32(chunk, crc);
      chunks.push(new Uint8Array(chunk));
      finished = final;
    };
    if (entry.method === 0) {
      output(bytes.subarray(entry.start, entry.start + entry.compressed), true);
    } else {
      const stream = new Inflate(output);
      for (let offset = 0; offset < entry.compressed; offset += 1024) {
        signal.throwIfAborted();
        const end = Math.min(entry.compressed, offset + 1024);
        stream.push(bytes.subarray(entry.start + offset, entry.start + end), end === entry.compressed);
        if (offset % (64 * 1024) === 0) await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
    }
    if (!finished || length !== entry.expanded || ((crc ^ 0xffffffff) >>> 0) !== entry.crc) invalid('expanded length or CRC mismatch');
    const content = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { content.set(chunk, offset); offset += chunk.length; }
    files.push({ path: entry.path, bytes: content });
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  signal.throwIfAborted();
  assertCreatorMembers(files);
  return { packageId, files };
}
