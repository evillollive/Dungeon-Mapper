import { JSDOM, VirtualConsole } from 'jsdom';
import { CREATOR_PACKAGE_LIMITS } from '../../src/utils/creatorPackageContract.ts';

let window;
let inspecting = false;
const includeMembers = process.argv[2] === '--members';
function reply(value, files = []) {
  const header = Buffer.from(JSON.stringify(value));
  if (includeMembers) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(header.length);
    process.stdout.write(length);
  }
  process.stdout.write(header);
  for (const file of files) process.stdout.write(file.bytes);
}
try {
  let domFailed = false;
  const console = new VirtualConsole();
  console.on('jsdomError', () => { domFailed = true; });
  window = new JSDOM('', { virtualConsole: console }).window;
  Object.assign(globalThis, { DOMParser: window.DOMParser, Node: window.Node, document: window.document });
  const { inspect } = await import('./dist/inspect.js');
  const chunks = [];
  let count = 0;
  for await (const chunk of process.stdin) {
    count += chunk.length;
    if (count > CREATOR_PACKAGE_LIMITS.zipBytes) throw new Error('Worker input limit exceeded.');
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  chunks.length = 0;
  inspecting = true;
  const { files = [], ...result } = await inspect(bytes, AbortSignal.timeout(8000), includeMembers);
  if (domFailed) throw new Error('DOM validation failed.');
  reply({ ok: true, ...result, ...(includeMembers ? { files: files.map(file => ({ path: file.path, bytes: file.bytes.length })) } : {}) }, files);
} catch {
  // Untrusted archive text and native diagnostics must not become API messages or logs.
  reply({ ok: false, error: inspecting ? 'invalid_package' : 'validator_failed' });
} finally {
  window?.close();
}
