import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ProviderError, type LocalAuthProvider, type PublisherGrant } from './provider.ts';

export const BASE = '/publisher/';
export const COOKIE = 'dm_publisher_local';
export const LIMITS = {
  sessions: 128, bodyBytes: 4096, oauthMs: 10 * 60_000, sessionMs: 8 * 60 * 60_000, requestMs: 10_000,
} as const;
interface Login { state: string; verifier: string; expiresAt: number; generation: number }
interface Session {
  id: string; csrf: string; expiresAt: number; generation: number;
  login?: Login; grant?: PublisherGrant; notice?: string;
}
class RequestError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status; this.code = code;
  }
}
const token = () => randomBytes(32).toString('base64url');
const equal = (left: string, right: string) => {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};
function awaitProvider<T>(work: Promise<T>, signal: AbortSignal, late?: (value: T) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => { settled = true; signal.removeEventListener('abort', abort); };
    const abort = () => { if (!settled) { cleanup(); reject(signal.reason); } };
    signal.addEventListener('abort', abort, { once: true });
    work.then(value => {
      if (settled) { late?.(value); return; }
      cleanup(); resolve(value);
    }, error => {
      if (settled) return;
      cleanup(); reject(error);
    });
    if (signal.aborted) abort();
  });
}
const staticFiles = new Map([
  [BASE, { type: 'text/html; charset=utf-8', bytes: readFileSync(new URL('../client/index.html', import.meta.url)) }],
  [BASE + 'client.mjs', { type: 'text/javascript; charset=utf-8', bytes: readFileSync(new URL('../client/client.mjs', import.meta.url)) }],
  [BASE + 'style.css', { type: 'text/css; charset=utf-8', bytes: readFileSync(new URL('../client/style.css', import.meta.url)) }],
]);

function headers(response: ServerResponse): void {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('X-Publisher-Mode', 'local-prototype');
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
}
function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}
function cookie(response: ServerResponse, session: Session | undefined, now: number): void {
  const age = session ? Math.max(0, Math.floor((session.expiresAt - now) / 1000)) : 0;
  // Loopback simulation only. Live hosting must use HTTPS and a Secure host-only cookie.
  response.setHeader('Set-Cookie', `${COOKIE}=${session?.id ?? ''}; Path=${BASE}; HttpOnly; SameSite=Lax; Max-Age=${age}`);
}
function cookieId(request: IncomingMessage): string | undefined {
  const value = request.headers.cookie;
  if (!value) return undefined;
  if (value.length > 8192) throw new RequestError(431, 'cookie_too_large', 'The local cookie header is too large.');
  const matches = value.split(';').map(item => item.trim()).filter(item => item.startsWith(COOKIE + '='));
  if (matches.length > 1) throw new RequestError(400, 'invalid_cookie', 'Duplicate publisher cookies are not accepted.');
  if (!matches.length) return undefined;
  const id = matches[0].slice(COOKIE.length + 1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(id)) throw new RequestError(400, 'invalid_cookie', 'The publisher cookie is invalid. Restart the local session.');
  return id;
}
function parameter(url: URL, name: string): string {
  const values = url.searchParams.getAll(name);
  if (values.length !== 1 || values[0].length > 512 || !values[0]) throw new RequestError(400, 'invalid_callback', 'The authorization response is invalid. Start sign-in again.');
  return values[0];
}
async function emptyBody(request: IncomingMessage, signal: AbortSignal): Promise<void> {
  if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new RequestError(415, 'json_required', 'Use an application/json request.');
  }
  const length = request.headers['content-length'];
  if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > LIMITS.bodyBytes)) {
    throw new RequestError(413, 'body_too_large', 'This endpoint does not accept package uploads.');
  }
  const chunks = await new Promise<Buffer[]>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let count = 0, settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      request.removeListener('data', data); request.removeListener('end', end); request.removeListener('error', failed);
      signal.removeEventListener('abort', aborted);
      if (error !== undefined) { request.resume(); reject(error); } else resolve(chunks);
    };
    const data = (chunk: Buffer) => {
      count += chunk.length;
      if (count > LIMITS.bodyBytes) finish(new RequestError(413, 'body_too_large', 'This endpoint does not accept package uploads.'));
      else chunks.push(chunk);
    };
    const end = () => finish();
    const failed = (error: Error) => finish(error);
    const aborted = () => finish(signal.reason);
    request.on('data', data); request.once('end', end); request.once('error', failed);
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) aborted();
  });
  let value: unknown;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new RequestError(400, 'invalid_json', 'The request is not valid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length) {
    throw new RequestError(400, 'unexpected_fields', 'This endpoint accepts an empty JSON object, not credentials or package content.');
  }
}

/** No production composition exists. This handler admits only the local simulated provider. */
export function createLocalPublisher(origin: string, provider: LocalAuthProvider,
  options: { now?: () => number; onError?: (event: { code: string }) => void } = {}) {
  const address = new URL(origin);
  if (address.origin !== origin || address.protocol !== 'http:' || address.hostname !== '127.0.0.1' || !address.port ||
      provider.kind !== 'local-test') throw new Error('The prototype supports only an explicit loopback HTTP origin and local test provider.');
  const now = options.now ?? Date.now;
  const log = options.onError ?? (event => console.error(event.code));
  const sessions = new Map<string, Session>();
  function prune(): void {
    for (const [id, session] of sessions) if (session.expiresAt <= now()) sessions.delete(id);
  }
  function session(request: IncomingMessage, response: ServerResponse, create = false): Session {
    prune();
    const id = cookieId(request), existing = id ? sessions.get(id) : undefined;
    if (existing) return existing;
    if (!create) throw new RequestError(401, 'sign_in_required', 'The local session expired or ended. Start sign-in again.');
    if (sessions.size >= LIMITS.sessions) throw new RequestError(503, 'session_capacity', 'The local prototype session limit is reached.');
    const value: Session = { id: token(), csrf: token(), expiresAt: now() + LIMITS.oauthMs, generation: 0 };
    sessions.set(value.id, value); cookie(response, value, now());
    return value;
  }
  function sameOrigin(request: IncomingMessage, mutation: boolean): void {
    if ((request.headers.origin !== undefined && request.headers.origin !== origin) ||
        request.headers['sec-fetch-site'] === 'cross-site' || (mutation && request.headers.origin !== origin)) {
      throw new RequestError(403, 'origin_rejected', 'Cross-origin publisher API requests are not allowed.');
    }
  }
  function csrf(request: IncomingMessage, current: Session): void {
    const value = request.headers['x-publisher-csrf'];
    if (typeof value !== 'string' || !equal(value, current.csrf)) throw new RequestError(403, 'csrf_rejected', 'Refresh the local publisher before retrying this action.');
  }
  function revokeQuietly(accessToken: string): void {
    const timeout = AbortSignal.timeout(LIMITS.requestMs);
    void awaitProvider(Promise.resolve().then(() => provider.revoke(accessToken, timeout)), timeout)
      .catch(() => log({ code: 'discarded_test_grant_revocation_unconfirmed' }));
  }
  async function route(request: IncomingMessage, response: ServerResponse, signal: AbortSignal): Promise<void> {
    if (request.headers.host !== address.host || !request.url?.startsWith('/') || request.url.startsWith('//') ||
        request.url.includes('\\') || request.url.length > 4096) throw new RequestError(400, 'host_rejected', 'Invalid local publisher host or request target.');
    const url = new URL(request.url, origin), method = request.method;
    if (url.origin !== origin) throw new RequestError(400, 'host_rejected', 'Invalid local publisher origin.');
    const asset = staticFiles.get(url.pathname);
    if (method === 'GET' && asset && !url.search) {
      response.writeHead(200, { 'Content-Type': asset.type }); response.end(asset.bytes); return;
    }
    if (method === 'GET' && url.pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    if (url.pathname.startsWith(BASE + 'api/')) {
      sameOrigin(request, method !== 'GET');
      if (url.search) throw new RequestError(400, 'unexpected_query', 'Publisher API requests do not accept URL credentials or selectors.');
    }
    if (method === 'GET' && url.pathname === BASE + 'api/session') {
      const current = session(request, response, true);
      const notice = current.notice;
      delete current.notice;
      json(response, 200, { mode: 'local-prototype', authenticated: !!current.grant,
        user: current.grant ? { id: current.grant.user.id, login: current.grant.user.login } : null,
        csrf: current.csrf, expiresAt: current.expiresAt, ...(notice ? { notice } : {}) });
      return;
    }
    if (method === 'POST' && url.pathname === BASE + 'api/auth/start') {
      const current = session(request, response);
      csrf(request, current);
      await emptyBody(request, signal);
      signal.throwIfAborted();
      if (sessions.get(current.id) !== current || current.expiresAt <= now()) throw new RequestError(401, 'obsolete_session', 'The local session ended before sign-in started.');
      if (current.grant) throw new RequestError(409, 'already_signed_in', 'Disconnect before signing in as another simulated account.');
      const login = { state: token(), verifier: token(), expiresAt: now() + LIMITS.oauthMs, generation: ++current.generation };
      current.login = login; current.expiresAt = login.expiresAt;
      cookie(response, current, now());
      const authorizationURL = provider.authorizationURL({ origin, redirectURI: origin + BASE + 'auth/callback',
        state: login.state, challenge: createHash('sha256').update(login.verifier).digest('base64url') });
      const target = new URL(authorizationURL);
      if (target.origin !== origin || target.pathname !== BASE + 'test/authorize') throw new Error('A local provider attempted an external authorization redirect.');
      json(response, 200, { authorizationURL }); return;
    }
    if (method === 'GET' && url.pathname === BASE + 'auth/callback') {
      const current = session(request, response), login = current.login;
      const state = parameter(url, 'state');
      if (!login || login.expiresAt <= now() || !equal(state, login.state)) throw new RequestError(400, 'invalid_state', 'This sign-in response is invalid, expired or already used.');
      delete current.login;
      if ([...url.searchParams.keys()].some(key => !['state', 'code', 'error', 'error_description', 'error_uri'].includes(key)) ||
          url.searchParams.has('code') === url.searchParams.has('error')) throw new RequestError(400, 'invalid_callback', 'Invalid sign-in response.');
      if (url.searchParams.has('error')) {
        parameter(url, 'error');
        current.notice = 'Simulated authorization was declined. No account was connected.';
        response.writeHead(303, { Location: BASE }); response.end(); return;
      }
      let grant: PublisherGrant;
      try {
        grant = await awaitProvider(provider.exchange({ code: parameter(url, 'code'), verifier: login.verifier,
          redirectURI: origin + BASE + 'auth/callback', signal }), signal, value => {
          if (value && typeof value.accessToken === 'string' && value.accessToken.length <= 4096) revokeQuietly(value.accessToken);
        });
      } catch (error) {
        if (error instanceof ProviderError && error.code === 'invalid_grant') {
          throw new RequestError(400, 'invalid_grant', 'Authorization failed. Start a new simulated sign-in.');
        }
        throw error;
      }
      if (!grant || typeof grant.accessToken !== 'string' || !grant.accessToken || grant.accessToken.length > 4096 ||
          !Number.isFinite(grant.expiresAt) || grant.expiresAt <= now() || !Number.isSafeInteger(grant.user?.id) || grant.user.id <= 0 ||
          typeof grant.user.login !== 'string' || !/^[a-zA-Z0-9-]{1,39}$/.test(grant.user.login)) {
        if (grant && typeof grant.accessToken === 'string' && grant.accessToken.length <= 4096) revokeQuietly(grant.accessToken);
        throw new Error('Invalid simulated provider grant.');
      }
      if (signal.aborted || sessions.get(current.id) !== current || current.generation !== login.generation || current.expiresAt <= now()) {
        revokeQuietly(grant.accessToken);
        throw new RequestError(401, 'obsolete_login', 'This sign-in was cancelled or replaced. Start again.');
      }
      sessions.delete(current.id);
      const authenticated: Session = {
        id: token(), csrf: token(), generation: 0, grant: { accessToken: grant.accessToken, expiresAt: grant.expiresAt,
          user: { id: grant.user.id, login: grant.user.login } },
        expiresAt: Math.min(now() + LIMITS.sessionMs, grant.expiresAt),
      };
      sessions.set(authenticated.id, authenticated);
      cookie(response, authenticated, now());
      response.writeHead(303, { Location: BASE }); response.end(); return;
    }
    if (method === 'GET' && url.pathname === BASE + 'api/repositories') {
      const current = session(request, response);
      if (!current.grant) throw new RequestError(401, 'sign_in_required', 'Sign in to the simulated provider first.');
      try {
        const repositories = await awaitProvider(provider.repositories(current.grant.accessToken, signal), signal);
        signal.throwIfAborted();
        if (sessions.get(current.id) !== current || current.expiresAt <= now()) throw new RequestError(401, 'sign_in_required', 'The publisher session ended.');
        if (!Array.isArray(repositories) || repositories.length > 50 || repositories.some(repo =>
          !Number.isSafeInteger(repo.id) || repo.id <= 0 || typeof repo.fullName !== 'string' ||
          !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo.fullName) || repo.fullName.length > 150 || typeof repo.canWrite !== 'boolean')) throw new Error('Invalid simulated repository response.');
        json(response, 200, { mode: 'local-prototype', repositories: repositories.map(repo => ({ id: repo.id, fullName: repo.fullName, canWrite: repo.canWrite })) });
      } catch (error) {
        if (error instanceof ProviderError && error.code === 'revoked') {
          if (sessions.get(current.id) === current) { sessions.delete(current.id); cookie(response, undefined, now()); }
          throw new RequestError(401, 'access_revoked', 'Simulated access was revoked. Sign in again; no fallback credentials are used.');
        }
        throw error;
      }
      return;
    }
    if (method === 'POST' && url.pathname === BASE + 'api/disconnect') {
      const current = session(request, response);
      csrf(request, current); await emptyBody(request, signal);
      signal.throwIfAborted();
      if (sessions.get(current.id) !== current || current.expiresAt <= now()) throw new RequestError(401, 'obsolete_session', 'The local session already changed.');
      sessions.delete(current.id); cookie(response, undefined, now());
      if (current.grant) {
        try { await awaitProvider(provider.revoke(current.grant.accessToken, signal), signal); }
        catch {
          log({ code: 'test_provider_revocation_unconfirmed' });
          throw new RequestError(502, 'revocation_unconfirmed', 'The local session ended, but simulated token revocation could not be confirmed.');
        }
      }
      json(response, 200, { mode: 'local-prototype', authenticated: false }); return;
    }
    throw new RequestError(404, 'not_implemented', 'This local prototype has no upload, publication, repository-creation or GitHub write endpoint.');
  }
  return {
    async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
      headers(response);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new RequestError(504, 'request_timeout', 'The local publisher request timed out.')), LIMITS.requestMs);
      timer.unref();
      const close = () => { if (!response.writableFinished) controller.abort(new Error('Client disconnected')); };
      response.once('close', close);
      try { await route(request, response, controller.signal); }
      catch (error) {
        if (response.destroyed || response.writableEnded) return;
        const failure = controller.signal.aborted && controller.signal.reason instanceof RequestError ? controller.signal.reason : error;
        const callback = request.url?.split('?')[0] === BASE + 'auth/callback';
        if (failure instanceof RequestError) {
          if (failure.code === 'invalid_cookie') cookie(response, undefined, now());
          if (failure.status === 413) response.setHeader('Connection', 'close');
          if (callback) {
            response.writeHead(failure.status, { 'Content-Type': 'text/html; charset=utf-8' });
            response.end(staticFiles.get(BASE)!.bytes);
          } else json(response, failure.status, { error: failure.code, message: failure.message });
        }
        else {
          log({ code: 'publisher_internal_error' });
          const status = failure instanceof ProviderError ? 502 : 500;
          if (callback) {
            response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
            response.end(staticFiles.get(BASE)!.bytes);
          } else json(response, status, { error: 'operation_failed', message: 'The simulated publisher operation failed. No real GitHub operation was performed.' });
        }
      } finally {
        clearTimeout(timer); response.removeListener('close', close);
        controller.abort();
      }
    },
    close(): void { sessions.clear(); },
  };
}
