import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { BASE, createLocalPublisher } from '../src/app.ts';
import { TestProvider } from './provider.ts';
import { TestGitProvider } from './gitProvider.ts';
import { OperationStore } from '../src/operationStore.ts';

const html = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export async function startLocalPublisher(options: {
  port?: number; now?: () => number; provider?: TestProvider; onError?: (event: { code: string }) => void;
  receiptPath?: string;
} = {}) {
  const provider = options.provider ?? (options.receiptPath ? new TestGitProvider(options.now) : new TestProvider(options.now));
  if (options.receiptPath && !(provider instanceof TestGitProvider)) throw new Error('Receipt-backed simulation requires the concrete in-memory TestGitProvider.');
  const store = options.receiptPath ? new OperationStore(options.receiptPath) : undefined;
  const ready: { app?: ReturnType<typeof createLocalPublisher> } = {};
  let origin = '';
  const server = createServer({ maxHeaderSize: 8192, requestTimeout: 10_000, headersTimeout: 5000, keepAliveTimeout: 1000 }, (request, response) => {
    const app = ready.app;
    if (!app) { response.writeHead(503); response.end(); return; }
    const url = new URL(request.url ?? '/', origin);
    if (request.method === 'GET' && request.headers.host === new URL(origin).host && url.origin === origin &&
        request.url?.startsWith('/') && url.pathname === BASE + 'test/authorize') {
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Referrer-Policy', 'no-referrer');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
      const state = url.searchParams.get('state') ?? '', challenge = url.searchParams.get('code_challenge') ?? '';
      const redirectURI = url.searchParams.get('redirect_uri') ?? '';
      if (['state', 'code_challenge', 'code_challenge_method', 'redirect_uri'].some(key => url.searchParams.getAll(key).length !== 1) ||
          url.searchParams.getAll('decision').length > 1 ||
          [...url.searchParams.keys()].some(key => !['state', 'code_challenge', 'code_challenge_method', 'redirect_uri', 'decision'].includes(key)) ||
          url.searchParams.get('code_challenge_method') !== 'S256' ||
          !/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(challenge) || redirectURI !== origin + BASE + 'auth/callback') {
        response.writeHead(400); response.end('Invalid simulated authorization request.'); return;
      }
      const decision = url.searchParams.get('decision');
      if (decision !== null) {
        const callback = new URL(redirectURI);
        callback.searchParams.set('state', state);
        if (decision === 'allow') {
          try { callback.searchParams.set('code', provider.issueCode(challenge, redirectURI)); }
          catch { response.writeHead(503); response.end('The simulated provider is unavailable.'); return; }
        } else if (decision === 'deny') callback.searchParams.set('error', 'access_denied');
        else { response.writeHead(400); response.end('Invalid simulated choice.'); return; }
        response.writeHead(303, { Location: callback.href }); response.end(); return;
      }
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        ${app.stylePaths.map(path => `<link rel="stylesheet" href="${html(path)}">`).join('')}<title>Simulated authorization</title><main>
        <p class="eyebrow">LOCAL TEST PROVIDER / NOT GITHUB</p><h1>Simulated authorization</h1>
        <p>No real account, password, access token or repository is involved.</p><p>Fixture account: ${html(provider.user.login)}</p>
        <form method="get" action="${BASE}test/authorize">
        <input type="hidden" name="state" value="${html(state)}"><input type="hidden" name="code_challenge" value="${html(challenge)}">
        <input type="hidden" name="code_challenge_method" value="S256">
        <input type="hidden" name="redirect_uri" value="${html(redirectURI)}">
        <button class="primary" name="decision" value="allow">Allow simulated sign-in</button>
        <button name="decision" value="deny">Deny simulated sign-in</button></form></main></html>`);
      return;
    }
    void app.handle(request, response);
  });
  server.maxHeadersCount = 32;
  try { await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  }); } catch (error) { store?.close(); throw error; }
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Local publisher did not obtain a loopback address.');
  origin = `http://127.0.0.1:${address.port}`;
  try {
    ready.app = createLocalPublisher(origin, provider, { now: options.now, onError: options.onError,
      ...(store && provider instanceof TestGitProvider ? { simulation: { store, provider } } : {}) });
  }
  catch (error) {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    store?.close();
    throw error;
  }
  return {
    origin, url: origin + BASE, provider,
    async close(): Promise<void> {
      await ready.app?.close(); provider.close(); server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      store?.close();
    },
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const port = Number(process.argv[2] ?? 5390);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a local port between 1024 and 65535.');
  const running = await startLocalPublisher({ port, receiptPath: process.env.PUBLISHER_RECEIPTS });
  console.log(`LOCAL SIMULATION ONLY: ${running.url}`);
  console.log('Explicit ZIP validation stays on this machine. No real GitHub connection, credentials or publication. Stop with Ctrl+C.');
  console.log(process.env.PUBLISHER_RECEIPTS
    ? 'Fake publication enabled. Metadata-only receipts survive restart; in-memory fake repository objects do not.'
    : 'Fake publication disabled. Set PUBLISHER_RECEIPTS to an absolute SQLite path in an existing private directory to enable it.');
  let closing = false;
  const stop = () => { if (!closing) { closing = true; void running.close(); } };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
