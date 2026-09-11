/** Canvas PNGs default to 96 DPI. Write physical resolution for actual-size printing. */
export async function withPNGResolution(blob: Blob, dpi: number): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  if (bytes.length < 33 || view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a) {
    throw new Error('The browser returned an invalid PNG.');
  }
  const chunk = new Uint8Array(21);
  const chunkView = new DataView(chunk.buffer);
  chunkView.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  chunkView.setUint32(8, Math.round(dpi / 0.0254));
  chunkView.setUint32(12, Math.round(dpi / 0.0254));
  chunk[16] = 1;
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, 17)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  chunkView.setUint32(17, (crc ^ 0xffffffff) >>> 0);
  const parts: BlobPart[] = [bytes.slice(0, 33), chunk];
  for (let offset = 33; offset < bytes.length;) {
    if (offset + 12 > bytes.length) throw new Error('The browser returned a truncated PNG.');
    const length = view.getUint32(offset) + 12;
    if (offset + length > bytes.length) throw new Error('The browser returned a truncated PNG chunk.');
    if (view.getUint32(offset + 4) !== 0x70485973) parts.push(bytes.slice(offset, offset + length));
    offset += length;
  }
  return new Blob(parts, { type: 'image/png' });
}
