import { readFileSync } from 'node:fs';
import { crc32 } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectCreatorImage } from '../creatorAssets';
import { inspectCreatorSvg, CREATOR_SVG_LIMITS } from '../creatorSvg';
import { creatorImageDimensions } from '../creatorImageDimensions';
import { CREATOR_PACKAGE_LIMITS } from '../creatorProject';
import { loadImage } from '../projectCreation';

vi.mock('../projectCreation', () => ({ loadImage: vi.fn() }));
const svg = (body: string, attributes = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" ${attributes}>${body}</svg>`;
const dataUrl = (text: string) => `data:image/svg+xml;base64,${Buffer.from(text).toString('base64')}`;
const png = Uint8Array.from(readFileSync('public/pwa-192x192.png'));

function paddedPNG(size: number): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(size);
  const view = new DataView(result.buffer);
  const offset = png.length - 12, length = size - png.length - 12;
  result.set(png.subarray(0, offset));
  view.setUint32(offset, length);
  result.set([116, 69, 88, 116], offset + 4);
  result.fill(65, offset + 8, offset + 8 + length);
  result[offset + 8 + 7] = 0;
  view.setUint32(offset + 8 + length, crc32(result.subarray(offset + 4, offset + 8 + length)));
  result.set(png.subarray(-12), size - 12);
  return result;
}

describe('restricted creator SVG admission', () => {
  it('accepts unchanged basic paths/shapes and returns metadata for explicit review', () => {
    const source = svg(`<title>Author title</title><desc>Author description</desc><!--License notice-->
      <g transform="translate(1 2) scale(.5) rotate(20 32 32)" opacity=".8">
        <path d="M0 0L64 0H32V32C1 2 3 4 5 6S7 8 9 10Q1 2 3 4T5 6A2 3 0 1 0 8 9z" fill="#fff" stroke="black"/>
        <rect x="1" y="2" width="8" height="9" rx="1"/>
        <circle cx="12" cy="12" r="3"/><ellipse cx="20" cy="20" rx="4" ry="2"/>
        <line x1="1" y1="1" x2="4" y2="4" stroke-width="1"/>
        <polyline points="0,0 1,2 3,4"/><polygon points="0,0 10,0 5,8"/>
      </g>`);
    const result = inspectCreatorSvg(source);
    expect(result.viewBox).toEqual([0, 0, 64, 64]);
    expect(result.metadata).toEqual(['Author title', 'Author description', 'License notice']);
    expect(result.elements).toBe(11);
    expect(source).toContain('<!--License notice-->');
  });

  it.each([
    '<script>alert(1)</script>',
    '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">HTML</div></foreignObject>',
    '<image href="https://example.invalid/track.png"/>',
    '<use href="#external"/>',
    '<style>path { fill: red }</style>',
    '<defs><linearGradient id="paint"/></defs>',
    '<animate attributeName="opacity" values="0;1"/>',
    '<path d="M0 0L1 1" onload="alert(1)"/>',
    '<path d="M0 0L1 1" style="fill: red"/>',
    '<path d="M0 0L1 1" fill="url(https://example.invalid/paint)"/>',
    '<path d="M0 0L1 1" fill="var(--paint)"/>',
    '<path d="M0 0L1 1" filter="url(#filter)"/>',
    '<g xmlns="https://example.invalid"><path/></g>',
    '<svg viewBox="0 0 1 1"/>',
    '<text x="0" y="1">Unreviewed font</text>',
    '<title><path d="M0 0"/></title>',
  ])('rejects unsupported or active markup: %s', body => {
    expect(() => inspectCreatorSvg(svg(body))).toThrow('cannot be shared unchanged');
  });

  it.each([
    '<!DOCTYPE svg [<!ENTITY payload "data">]>' + svg('<title>&payload;</title>'),
    '<?xml-stylesheet href="https://example.invalid/style.css"?>' + svg(''),
    '<?xml version="1.0" encoding="ISO-8859-1"?>' + svg(''),
    '<svg xmlns="http://www.w3.org/2000/svg"><g></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"/>',
    svg('', 'viewBox="0 0 0 64"'),
  ])('rejects untrusted document structure', text => {
    expect(() => inspectCreatorSvg(text)).toThrow();
  });

  it.each([
    'L0 0', 'M0', 'M0 0L1', 'M0 0R1 1', 'M0 0A1 1 0 2 0 1 1',
    'M0 0A-1 1 0 0 0 1 1', 'M0 0L1e309 1', 'M0 0L1000001 1', 'M0 0Z1',
    'M0 0;alert(1)',
  ])('rejects invalid path grammar: %s', path => {
    expect(() => inspectCreatorSvg(svg(`<path d="${path}"/>`))).toThrow();
  });

  it.each([
    'translate(1) junk', 'matrix(1 2 3)', 'url(1)', 'rotate()', 'scale(1e309)', 'translate(1;2)',
  ])('rejects unsupported transforms: %s', transform => {
    expect(() => inspectCreatorSvg(svg(`<g transform="${transform}"/>`))).toThrow();
  });

  it('bounds elements, metadata and nesting without altering the original SVG', () => {
    expect(() => inspectCreatorSvg(svg('<path d="M0 0"/>'.repeat(CREATOR_SVG_LIMITS.elements)))).toThrow('too many elements');
    expect(() => inspectCreatorSvg(svg(`<desc>${'x'.repeat(CREATOR_SVG_LIMITS.text + 1)}</desc>`))).toThrow('text metadata');
    expect(() => inspectCreatorSvg(svg('<g>'.repeat(32) + '</g>'.repeat(32)))).toThrow('nesting');
    expect(() => inspectCreatorSvg(svg('<polyline points="' + '0 0 '.repeat(CREATOR_SVG_LIMITS.numbers) + '"/>'))).toThrow('vector geometry');
    expect(() => inspectCreatorSvg(svg('', 'width="10000" height="10000"'))).toThrow('image dimensions');
    expect(() => inspectCreatorSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1000000" width="1000"/>')).toThrow('image dimensions');
  });
});

describe('creator image admission before native decoding', () => {
  let image: HTMLImageElement;
  beforeEach(() => {
    image = new Image();
    Object.defineProperties(image, { naturalWidth: { value: 192 }, naturalHeight: { value: 192 } });
    vi.mocked(loadImage).mockResolvedValue(image);
  });
  afterEach(() => vi.resetAllMocks());

  it('retains exact PNG bytes, checks native dimensions and releases the validation image', async () => {
    const source = `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
    const result = await inspectCreatorImage(source, new AbortController().signal);
    expect(result.bytes).toEqual(png);
    expect(result).toMatchObject({ mime: 'image/png', extension: 'png', width: 192, height: 192 });
    expect(loadImage).toHaveBeenCalledWith(source, expect.any(AbortSignal));
    expect(image.getAttribute('src')).toBe('');
  });

  it('retains SVG bytes and reports visible or hidden metadata without rewriting them', async () => {
    const source = svg('<title>Creator title</title><path d="M0 0L64 64" stroke="#333"/>');
    const result = await inspectCreatorImage(dataUrl(source), new AbortController().signal);
    expect(new TextDecoder().decode(result.bytes)).toBe(source);
    expect(result.svg?.metadata).toEqual(['Creator title']);
    expect(result.extension).toBe('svg');
  });

  it.each([
    'https://example.invalid/image.png',
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:image/png;base64,broken',
    'data:image/png;base64,AAAA',
    dataUrl(svg('<script>alert(1)</script>')),
    'data:image/svg+xml;base64,/w==',
  ])('rejects unsafe input before calling the native decoder', async source => {
    await expect(inspectCreatorImage(source, new AbortController().signal)).rejects.toThrow();
    expect(loadImage).not.toHaveBeenCalled();
  });

  it('rejects oversized declared PNG dimensions before decoding', async () => {
    const source = png.slice();
    new DataView(source.buffer).setUint32(16, CREATOR_PACKAGE_LIMITS.imagePixels + 1);
    await expect(inspectCreatorImage(`data:image/png;base64,${Buffer.from(source).toString('base64')}`,
      new AbortController().signal)).rejects.toThrow('24-million-pixel');
    expect(loadImage).not.toHaveBeenCalled();
  });

  it.each([-1, 0, 1])('enforces the actual encoded-source byte boundary at offset %i', async offset => {
    const bytes = paddedPNG(CREATOR_PACKAGE_LIMITS.imageBytes + offset);
    const input = `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
    if (offset <= 0) {
      const result = await inspectCreatorImage(input, new AbortController().signal);
      expect(result.bytes.byteLength).toBe(bytes.byteLength);
      expect(loadImage).toHaveBeenCalledTimes(1);
    } else {
      await expect(inspectCreatorImage(input, new AbortController().signal)).rejects.toThrow('10 MiB');
      expect(loadImage).not.toHaveBeenCalled();
    }
  });

  it('propagates cancellation and decoder failure instead of claiming success', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(inspectCreatorImage(dataUrl(svg('')), controller.signal)).rejects.toThrow();
    expect(loadImage).not.toHaveBeenCalled();
    vi.mocked(loadImage).mockRejectedValueOnce(new Error('Native decode failed'));
    await expect(inspectCreatorImage(dataUrl(svg('')), new AbortController().signal)).rejects.toThrow('Native decode failed');
    const during = new AbortController();
    vi.mocked(loadImage).mockImplementationOnce(async () => { during.abort(); return image; });
    await expect(inspectCreatorImage(dataUrl(svg('')), during.signal)).rejects.toThrow();
    expect(image.getAttribute('src')).toBe('');
  });
});

describe('bounded static raster headers', () => {
  it('reads a real PNG and rejects truncated or inconsistent chunk lengths', () => {
    expect(creatorImageDimensions(png, 'image/png')).toEqual({ width: 192, height: 192 });
    expect(() => creatorImageDimensions(png.slice(0, 30), 'image/png')).toThrow();
    const oversizedChunk = png.slice();
    new DataView(oversizedChunk.buffer).setUint32(33, 0x7fffffff);
    expect(() => creatorImageDimensions(oversizedChunk, 'image/png')).toThrow();
  });

  it('reads synthetic JPEG frame dimensions, not a claim of native decode validity', () => {
    const bytes = new Uint8Array([255, 216, 255, 192, 0, 8, 8, 0, 20, 0, 30, 0, 255, 217]);
    expect(creatorImageDimensions(bytes, 'image/jpeg')).toEqual({ width: 30, height: 20 });
    expect(() => creatorImageDimensions(bytes.slice(0, -2), 'image/jpeg')).toThrow();
    const dnl = new Uint8Array([...bytes.slice(0, -2), 255, 220, 0, 4, 0, 1, 255, 217]);
    expect(() => creatorImageDimensions(dnl, 'image/jpeg')).toThrow();
  });

  it('reads synthetic static WebP dimensions and rejects animation or mismatched RIFF sizes', () => {
    const bytes = new Uint8Array(26);
    const view = new DataView(bytes.buffer);
    bytes.set([82, 73, 70, 70], 0);
    view.setUint32(4, 18, true);
    bytes.set([87, 69, 66, 80, 86, 80, 56, 76], 8);
    view.setUint32(16, 5, true);
    bytes[20] = 0x2f;
    expect(creatorImageDimensions(bytes, 'image/webp')).toEqual({ width: 1, height: 1 });
    view.setUint32(4, 999, true);
    expect(() => creatorImageDimensions(bytes, 'image/webp')).toThrow();
  });
});
