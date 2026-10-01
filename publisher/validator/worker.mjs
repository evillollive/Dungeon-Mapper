import { JSDOM, VirtualConsole } from 'jsdom';
import { CREATOR_PACKAGE_LIMITS } from '../../src/utils/creatorPackageContract.ts';

let window;
let inspecting = false;
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
  const result = await inspect(bytes, AbortSignal.timeout(8000));
  if (domFailed) throw new Error('DOM validation failed.');
  process.stdout.write(JSON.stringify({ ok: true, ...result }));
} catch {
  // Untrusted archive text and native diagnostics must not become API messages or logs.
  process.stdout.write(JSON.stringify({ ok: false, error: inspecting ? 'invalid_package' : 'validator_failed' }));
} finally {
  window?.close();
}
