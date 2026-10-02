import { CREATOR_PACKAGE_LIMITS } from './creatorProject';

export const CREATOR_SVG_LIMITS = { elements: 4096, numbers: 200_000, text: 16_384 } as const;
const namespace = 'http://www.w3.org/2000/svg';
const numberPattern = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const paintAttributes = ['fill', 'stroke', 'opacity', 'fill-opacity', 'stroke-opacity',
  'fill-rule', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'stroke-dasharray', 'stroke-dashoffset', 'transform'];
const shapeAttributes: Record<string, string[]> = {
  svg: ['xmlns', 'version', 'width', 'height', 'viewBox', 'preserveAspectRatio'],
  g: [], path: ['d'], rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  circle: ['cx', 'cy', 'r'], ellipse: ['cx', 'cy', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'], polyline: ['points'], polygon: ['points'],
  title: [], desc: [],
};
const enumerated: Record<string, readonly string[]> = {
  'fill-rule': ['nonzero', 'evenodd'],
  'stroke-linecap': ['butt', 'round', 'square'],
  'stroke-linejoin': ['miter', 'round', 'bevel'],
  version: ['1.0', '1.1', '2.0'],
};
const arity: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

export interface CreatorSvgInspection {
  viewBox: [number, number, number, number];
  elements: number;
  numbers: number;
  metadata: string[];
}

function unsupported(detail: string): never {
  throw new Error(`This SVG cannot be shared unchanged: ${detail}. Keep the original and use a supported path/shape-only SVG or raster image.`);
}

/** Admission only: accepted SVG bytes are not rewritten or silently sanitized. */
export function inspectCreatorSvg(text: string): CreatorSvgInspection {
  if (text.length > CREATOR_PACKAGE_LIMITS.imageBytes ||
      new TextEncoder().encode(text).byteLength > CREATOR_PACKAGE_LIMITS.imageBytes) unsupported('file exceeds 10 MiB');
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text)) unsupported('document types and entities are not supported');
  const encoding = /<\?xml\s[^?]*encoding\s*=\s*(['"])(.*?)\1/.exec(text)?.[2];
  if (encoding && !/^utf-8$/i.test(encoding)) unsupported('SVG files must use UTF-8 encoding');
  let markupCount = 0;
  for (let index = text.indexOf('<'); index !== -1; index = text.indexOf('<', index + 1)) {
    if (++markupCount > CREATOR_SVG_LIMITS.elements * 3) unsupported('too many markup nodes');
  }
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.getElementsByTagName('parsererror').length || doc.documentElement.localName !== 'svg' ||
      doc.documentElement.namespaceURI !== namespace) unsupported('invalid SVG document');
  let numericCount = 0, elementCount = 0, textLength = 0, commandCount = 0;
  const metadata: string[] = [];
  function numbers(value: string): number[] {
    const parsed: number[] = [];
    let end = 0;
    for (const match of value.matchAll(numberPattern)) {
      if (value.slice(end, match.index).replace(/[\s,]/g, '')) unsupported('invalid numeric geometry');
      if (++numericCount > CREATOR_SVG_LIMITS.numbers) unsupported('too much vector geometry');
      const number = Number(match[0]);
      if (!Number.isFinite(number) || Math.abs(number) > 1_000_000) unsupported('unbounded numeric geometry');
      parsed.push(number);
      end = match.index + match[0].length;
    }
    if (value.slice(end).replace(/[\s,]/g, '')) unsupported('invalid numeric geometry');
    return parsed;
  }
  function pathData(value: string): void {
    const pieces: string[] = [];
    let end = 0;
    for (const match of value.matchAll(/(?:[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?|[a-zA-Z])/g)) {
      if (value.slice(end, match.index).replace(/[\s,]/g, '')) unsupported('invalid path geometry');
      if (pieces.length >= CREATOR_SVG_LIMITS.numbers) unsupported('too much path geometry');
      pieces.push(match[0]);
      end = match.index + match[0].length;
    }
    if (value.slice(end).replace(/[\s,]/g, '')) unsupported('invalid path geometry');
    if (!pieces.length || !/^[Mm]$/.test(pieces[0])) unsupported('paths must begin with a move command');
    let index = 0;
    while (index < pieces.length) {
      const command = pieces[index++].toUpperCase();
      if (++commandCount > CREATOR_SVG_LIMITS.numbers) unsupported('too many path commands');
      if (!Object.hasOwn(arity, command)) unsupported('unsupported path command');
      const values: string[] = [];
      while (index < pieces.length && !/^[a-zA-Z]$/.test(pieces[index])) values.push(pieces[index++]);
      const parsed = numbers(values.join(' ')), count = arity[command];
      if ((count === 0 && parsed.length) || (count > 0 && (!parsed.length || parsed.length % count))) {
        unsupported('incorrect path command arguments');
      }
      if (command === 'A') for (let i = 0; i < parsed.length; i += 7) {
        if (parsed[i] < 0 || parsed[i + 1] < 0 ||
            ![0, 1].includes(parsed[i + 3]) || ![0, 1].includes(parsed[i + 4])) unsupported('invalid arc arguments');
      }
    }
  }
  function transform(value: string): void {
    const counts: Record<string, number[]> = { matrix: [6], translate: [1, 2], scale: [1, 2], rotate: [1, 3], skewX: [1], skewY: [1] };
    let end = 0;
    for (const match of value.matchAll(/([a-zA-Z]+)\s*\(([^()]*)\)/g)) {
      if (++commandCount > CREATOR_SVG_LIMITS.numbers) unsupported('too many transform commands');
      if (value.slice(end, match.index).replace(/[\s,]/g, '')) unsupported('invalid transform');
      const [, kind, argumentsText] = match;
      if (!Object.hasOwn(counts, kind) || !counts[kind].includes(numbers(argumentsText).length)) unsupported('unsupported transform');
      end = match.index + match[0].length;
    }
    if (!end || value.slice(end).replace(/[\s,]/g, '')) unsupported('invalid transform');
  }
  function attribute(element: Element, name: string, value: string): void {
    if (name === 'xmlns') {
      if (element !== doc.documentElement || value !== namespace) unsupported('unsupported namespace');
    } else if (Object.hasOwn(enumerated, name)) {
      if (!enumerated[name].includes(value)) unsupported(`unsupported ${name}`);
    } else if (name === 'preserveAspectRatio') {
      if (!/^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?:\s+(?:meet|slice))?)$/.test(value)) {
        unsupported('unsupported aspect ratio');
      }
    } else if (name === 'd') pathData(value);
    else if (name === 'transform') transform(value);
    else if (name === 'fill' || name === 'stroke') {
      if (value === 'none' || value === 'currentColor') return;
      if (!/^(?:#[\da-fA-F]{3,8}|[a-zA-Z]+|(?:rgb|rgba|hsl|hsla)\([-+\d.% ,/]+\))$/.test(value)) unsupported('unsupported paint');
      const style = document.createElement('span').style;
      style.color = value;
      if (!style.color) unsupported('invalid color');
    } else if (name === 'stroke-dasharray' && value === 'none') {
      return;
    } else {
      const parsed = numbers(value);
      const expected = name === 'viewBox' ? 4 : name === 'points' || name === 'stroke-dasharray' ? undefined : 1;
      if (!parsed.length || (expected !== undefined && parsed.length !== expected)) unsupported(`invalid ${name}`);
      if (name === 'points' && (parsed.length % 2 || parsed.length < (element.localName === 'polygon' ? 6 : 4))) unsupported('invalid points');
      if (['width', 'height', 'r', 'rx', 'ry', 'stroke-width', 'stroke-miterlimit', 'stroke-dasharray'].includes(name) &&
          parsed.some(value => value < 0)) unsupported(`negative ${name}`);
      if (name.includes('opacity') && (parsed[0] < 0 || parsed[0] > 1)) unsupported('opacity must be between zero and one');
      if (name === 'viewBox' && (parsed[2] <= 0 || parsed[3] <= 0)) unsupported('viewBox must have positive dimensions');
    }
  }
  function visit(node: Node, depth: number): void {
    if (depth > CREATOR_PACKAGE_LIMITS.depth) unsupported('excessive nesting');
    if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE || node.nodeType === Node.DOCUMENT_TYPE_NODE) unsupported('processing instructions are not supported');
    if (node.nodeType === Node.COMMENT_NODE || node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
      const value = node.textContent ?? '';
      textLength += value.length;
      if (textLength > CREATOR_SVG_LIMITS.text) unsupported('too much text metadata');
      const parent = node.parentElement?.localName;
      if (node.nodeType !== Node.COMMENT_NODE && value.trim() && parent !== 'title' && parent !== 'desc') unsupported('rendered text is not supported');
      if (value.trim()) metadata.push(value.trim());
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      elementCount++;
      if (elementCount > CREATOR_SVG_LIMITS.elements) unsupported('too many elements');
      if (element.namespaceURI !== namespace || !Object.hasOwn(shapeAttributes, element.localName)) unsupported('unsupported SVG element');
      if (element.localName === 'svg' && element !== doc.documentElement) unsupported('nested SVG documents are not supported');
      if (['title', 'desc'].includes(element.parentElement?.localName ?? '')) unsupported('text metadata must not contain elements');
      const allowed = [...shapeAttributes[element.localName], ...(['title', 'desc'].includes(element.localName) ? [] : paintAttributes)];
      for (const item of Array.from(element.attributes)) {
        if (!allowed.includes(item.name)) unsupported(`unsupported attribute ${item.name}`);
        attribute(element, item.name, item.value.trim());
      }
    }
    for (const child of Array.from(node.childNodes)) visit(child, depth + 1);
  }
  visit(doc, 0);
  const root = doc.documentElement;
  const box = numbers(root.getAttribute('viewBox') ?? '');
  if (box.length !== 4) unsupported('an explicit viewBox is required');
  const hasWidth = root.hasAttribute('width'), hasHeight = root.hasAttribute('height');
  const width = hasWidth ? Number(root.getAttribute('width'))
    : hasHeight ? Number(root.getAttribute('height')) * box[2] / box[3] : Math.max(300, box[2]);
  const height = hasHeight ? Number(root.getAttribute('height'))
    : hasWidth ? width * box[3] / box[2] : Math.max(300, box[3]);
  if (!(width > 0 && height > 0) || Math.ceil(width) * Math.ceil(height) > CREATOR_PACKAGE_LIMITS.imagePixels) {
    unsupported('image dimensions exceed the sharing limit');
  }
  return { viewBox: [box[0], box[1], box[2], box[3]], elements: elementCount, numbers: numericCount, metadata };
}
