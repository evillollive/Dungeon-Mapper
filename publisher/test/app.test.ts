import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import test, { type TestContext } from 'node:test';
import { BASE, COOKIE, createLocalPublisher, LIMITS } from '../src/app.ts';
import { ProviderError } from '../src/provider.ts';
import { startLocalPublisher } from './local.ts';
import { TestProvider } from './provider.ts';

interface Jar { cookie: string; csrf: string }
interface SessionView {
  mode: string; authenticated: boolean; csrf: string; expiresAt: number;
  user: { id: number; login: string } | null; notice?: string;
}
function assertSession(value: unknown): asserts value is SessionView {
  assert(value && typeof value === 'object');
  assert('mode' in value && typeof value.mode === 'string');
  assert('authenticated' in value && typeof value.authenticated === 'boolean');
  assert('csrf' in value && typeof value.csrf === 'string');
  assert('expiresAt' in value && typeof value.expiresAt === 'number');
  assert('user' in value);
  if (value.user !== null) {
    assert(value.user && typeof value.user === 'object');
    assert('id' in value.user && typeof value.user.id === 'number');
    assert('login' in value.user && typeof value.user.login === 'string');
  }
  if ('notice' in value) assert.equal(typeof value.notice, 'string');
}
async function setup(t: TestContext, options: Parameters<typeof startLocalPublisher>[0] = {}) {
  const errors: { code: string }[] = [];
  const server = await startLocalPublisher({ ...options, onError: error => errors.push(error) });
  t.after(() => server.close());
  async function send(path: string, jar: Jar, method = 'GET', headers: Record<string, string> = {}, body = '{}') {
    const url = new URL(path, server.origin);
    assert.equal(url.origin, server.origin, 'Tests must not contact an external provider');
    const response = await fetch(url, {
      method, redirect: 'manual',
      headers: { ...(jar.cookie ? { Cookie: jar.cookie } : {}),
        ...(method === 'POST' ? { Origin: server.origin, 'Content-Type': 'application/json', 'X-Publisher-CSRF': jar.csrf } : {}), ...headers },
      ...(method === 'POST' ? { body } : {}),
    });
    const cookie = response.headers.get('set-cookie');
    if (cookie) jar.cookie = cookie.includes('Max-Age=0') ? '' : cookie.split(';')[0];
    return response;
  }
  async function session(jar: Jar): Promise<SessionView> {
    const response = await send(BASE + 'api/session', jar);
    assert.equal(response.status, 200);
    const value: unknown = await response.json();
    assertSession(value);
    jar.csrf = value.csrf;
    return value;
  }
  async function start(jar: Jar): Promise<URL> {
    const response = await send(BASE + 'api/auth/start', jar, 'POST');
    assert.equal(response.status, 200);
    const value: unknown = await response.json();
    assert(value && typeof value === 'object' && 'authorizationURL' in value && typeof value.authorizationURL === 'string');
    return new URL(value.authorizationURL);
  }
  function callback(authorize: URL, challenge = authorize.searchParams.get('code_challenge')!): string {
    const redirect = authorize.searchParams.get('redirect_uri')!;
    const url = new URL(redirect);
    url.searchParams.set('state', authorize.searchParams.get('state')!);
    url.searchParams.set('code', server.provider.issueCode(challenge, redirect));
    return url.href;
  }
  async function login(jar: Jar): Promise<string> {
    await session(jar);
    const authorize = await start(jar), location = callback(authorize);
    const response = await send(location, jar);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), BASE);
    await response.text();
    assert.equal((await session(jar)).authenticated, true);
    return location;
  }
  return { ...server, send, session, start, callback, login, errors };
}
const jar = (): Jar => ({ cookie: '', csrf: '' });

test('loopback-only simulation rejects production origins and non-test provider modes', () => {
  const provider = new TestProvider();
  assert.throws(() => createLocalPublisher('https://publisher.example', provider), /loopback/);
  assert.throws(() => createLocalPublisher('http://0.0.0.0:5390', provider), /loopback/);
  Object.assign(provider, { kind: 'live' });
  assert.throws(() => createLocalPublisher('http://127.0.0.1:5390', provider), /local test provider/);
});

test('serves an explicit prototype with no-store and framing/referrer protections', async t => {
  const app = await setup(t), client = jar();
  const response = await app.send(BASE, client);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
  assert.equal(response.headers.get('x-publisher-mode'), 'local-prototype');
  const html = await response.text();
  assert.match(html, /Simulated provider only/);
  assert.match(html, /Publish package \(not implemented\)/);
  assert.equal(client.cookie, '');
  const session = await app.send(BASE + 'api/session', client);
  const cookie = session.headers.get('set-cookie')!;
  assert(cookie.startsWith(COOKIE + '='));
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.match(cookie, /Path=\/publisher\//);
  assert(!cookie.includes('local-test-access-'));
  const status: unknown = await session.json();
  assertSession(status);
  assert.equal(status.authenticated, false);
});

test('valid state and PKCE rotate the session and never return provider tokens', async t => {
  const app = await setup(t), client = jar();
  await app.session(client);
  const original = { ...client }, authorize = await app.start(client);
  assert.equal(authorize.origin, app.origin);
  assert.equal(authorize.pathname, BASE + 'test/authorize');
  assert(authorize.searchParams.get('code_challenge'));
  assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
  assert(!authorize.searchParams.has('code_verifier'));
  const response = await app.send(app.callback(authorize), client);
  assert.equal(response.status, 303);
  await response.text();
  assert.notEqual(client.cookie, original.cookie);
  const view = await app.session(client);
  assert.notEqual(view.csrf, original.csrf);
  assert.deepEqual(view.user, { id: 1001, login: 'fixture-creator' });
  const tokens = app.provider.tokensForTest();
  assert.equal(tokens.length, 1);
  assert(!JSON.stringify(view).includes(tokens[0]));
  assert(!client.cookie.includes(tokens[0]));
  const old = await app.send(BASE + 'api/repositories', original);
  assert.equal(old.status, 401); await old.text();
  const repos = await app.send(BASE + 'api/repositories', client);
  assert.equal(repos.status, 200);
  const body = await repos.text();
  assert.match(body, /fixture-creator\/synthetic-maps/);
  assert(!body.includes(tokens[0]));
});

test('duplicate callback state, mismatched state and missing cookies never authorize a user', async t => {
  const app = await setup(t), client = jar();
  await app.session(client);
  const authorize = await app.start(client), callback = new URL(app.callback(authorize));
  callback.searchParams.append('state', 'duplicate');
  let response = await app.send(callback.href, client);
  assert.equal(response.status, 400); await response.text();
  callback.searchParams.delete('state'); callback.searchParams.set('state', 'wrong');
  response = await app.send(callback.href, client);
  assert.equal(response.status, 400); await response.text();
  response = await app.send(app.callback(authorize), jar());
  assert.equal(response.status, 401); await response.text();
  assert.equal((await app.session(client)).authenticated, false);
  assert.equal(app.provider.tokensForTest().length, 0);
});

test('PKCE mismatch consumes the attempt instead of allowing code replay', async t => {
  const app = await setup(t), client = jar();
  await app.session(client);
  const authorize = await app.start(client), callback = app.callback(authorize, 'x'.repeat(43));
  const rejected = await app.send(callback, client);
  assert.equal(rejected.status, 400); await rejected.text();
  const replay = await app.send(callback, client);
  assert.equal(replay.status, 400); await replay.text();
  assert.equal((await app.session(client)).authenticated, false);
  assert.equal(app.provider.tokensForTest().length, 0);
});

test('the local provider rejects attempts to downgrade the PKCE method', async t => {
  const app = await setup(t), client = jar();
  await app.session(client);
  const authorize = await app.start(client);
  authorize.searchParams.set('code_challenge_method', 'plain');
  const response = await app.send(authorize.href, client);
  assert.equal(response.status, 400); await response.text();
  assert.equal(app.provider.tokensForTest().length, 0);
});

test('denial redirects to a clean address without a connected account', async t => {
  const app = await setup(t), client = jar();
  await app.session(client);
  const authorize = await app.start(client), callback = new URL(BASE + 'auth/callback', app.origin);
  callback.searchParams.set('state', authorize.searchParams.get('state')!);
  callback.searchParams.set('error', 'access_denied');
  callback.searchParams.set('error_description', '<script>never reflect this</script>');
  const response = await app.send(callback.href, client);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), BASE);
  assert.equal(await response.text(), '');
  const view = await app.session(client);
  assert.equal(view.authenticated, false);
  assert.match(view.notice!, /declined/);
  assert(!JSON.stringify(view).includes('<script>'));
});

test('expired transactions and provider sessions fail closed without sliding lifetime', async t => {
  let time = 1_800_000_000_000;
  const app = await setup(t, { now: () => time }), client = jar();
  await app.session(client);
  const authorize = await app.start(client), callback = app.callback(authorize);
  time += LIMITS.oauthMs;
  const expired = await app.send(callback, client);
  assert.equal(expired.status, 401); await expired.text();
  await app.login(client);
  const original = await app.session(client);
  time += 5000;
  assert.equal((await app.session(client)).expiresAt, original.expiresAt);
  time = original.expiresAt;
  const denied = await app.send(BASE + 'api/repositories', client);
  assert.equal(denied.status, 401); await denied.text();
  assert.equal((await app.session(client)).authenticated, false);
});

test('API origin, host, CSRF and method boundaries reject confused-deputy requests', async t => {
  const app = await setup(t), client = jar();
  await app.session(client);
  const invalidHeaders: Record<string, string>[] = [
    { Origin: 'https://untrusted.example' },
    { 'X-Publisher-CSRF': 'wrong' },
    { 'Sec-Fetch-Site': 'cross-site' },
  ];
  for (const override of invalidHeaders) {
    const response = await app.send(BASE + 'api/auth/start', client, 'POST', override);
    assert.equal(response.status, 403); await response.text();
  }
  const host = await new Promise<number>((resolve, reject) => {
    const request = httpRequest(new URL(BASE + 'api/session', app.origin), { headers: { Host: 'untrusted.example' } }, response => {
      response.resume();
      response.on('end', () => resolve(response.statusCode!));
    });
    request.on('error', reject);
    request.end();
  });
  assert.equal(host, 400);
  const getStart = await app.send(BASE + 'api/auth/start', client);
  assert.equal(getStart.status, 404); await getStart.text();
  const queryToken = await app.send(BASE + 'api/repositories?access_token=client-supplied', client);
  assert.equal(queryToken.status, 400); await queryToken.text();
});

test('empty JSON is required and actual streamed body bytes are bounded', async t => {
  const app = await setup(t), client = jar();
  await app.session(client);
  for (const body of ['{broken', '{"accessToken":"client-supplied"}', '[]']) {
    const response = await app.send(BASE + 'api/auth/start', client, 'POST', {}, body);
    assert.equal(response.status, 400); await response.text();
  }
  const type = await app.send(BASE + 'api/auth/start', client, 'POST', { 'Content-Type': 'text/plain' });
  assert.equal(type.status, 415); await type.text();
  const large = await app.send(BASE + 'api/auth/start', client, 'POST', {}, ' '.repeat(LIMITS.bodyBytes + 1));
  assert.equal(large.status, 413); await large.text();
  const streamed = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const request = httpRequest(new URL(BASE + 'api/auth/start', app.origin), {
      method: 'POST',
      headers: { Cookie: client.cookie, Origin: app.origin, 'Content-Type': 'application/json', 'X-Publisher-CSRF': client.csrf },
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', value => { body += value; });
      response.on('end', () => resolve({ status: response.statusCode!, body }));
    });
    request.on('error', reject);
    request.write(' '.repeat(LIMITS.bodyBytes));
    request.end('more');
  });
  assert.equal(streamed.status, 413);
  assert.match(streamed.body, /does not accept package uploads/);
});

test('disconnect revokes synthetic credentials, and failed revocation is not called complete', async t => {
  const app = await setup(t), client = jar();
  await app.login(client);
  const old = { ...client };
  const disconnected = await app.send(BASE + 'api/disconnect', client, 'POST');
  assert.equal(disconnected.status, 200); await disconnected.text();
  assert.equal(app.provider.tokensForTest().length, 0);
  const denied = await app.send(BASE + 'api/repositories', old);
  assert.equal(denied.status, 401); await denied.text();
  await app.login(client);
  app.provider.failRevocation = true;
  const partial = await app.send(BASE + 'api/disconnect', client, 'POST');
  assert.equal(partial.status, 502);
  assert.match(await partial.text(), /session ended.*could not be confirmed/);
  assert.equal((await app.session(client)).authenticated, false);
  assert(app.errors.some(error => error.code === 'test_provider_revocation_unconfirmed'));
});

test('revoked provider access ends the local session instead of trying another credential', async t => {
  const app = await setup(t), client = jar();
  await app.login(client);
  await app.provider.revoke(app.provider.tokensForTest()[0], new AbortController().signal);
  const response = await app.send(BASE + 'api/repositories', client);
  assert.equal(response.status, 401);
  assert.match(await response.text(), /revoked/);
  assert.equal((await app.session(client)).authenticated, false);
});

test('an in-flight callback cannot resurrect a disconnected session or overwrite a newer login', async t => {
  const app = await setup(t), client = jar();
  await app.session(client);
  const authorize = await app.start(client), callback = app.callback(authorize), oldCode = new URL(callback).searchParams.get('code');
  const exchange = app.provider.exchange.bind(app.provider);
  let release: () => void = () => {};
  let started: () => void = () => {};
  const entered = new Promise<void>(resolve => { started = resolve; });
  const hold = new Promise<void>(resolve => { release = resolve; });
  app.provider.exchange = async input => {
    const grant = await exchange(input);
    if (input.code === oldCode) { started(); await hold; }
    return grant;
  };
  const pending = app.send(callback, client);
  await entered;
  const logout = await app.send(BASE + 'api/disconnect', client, 'POST');
  assert.equal(logout.status, 200); await logout.text();
  app.provider.user = { id: 1002, login: 'second-fixture-user' };
  await app.login(client);
  const newerCookie = client.cookie;
  release();
  const obsolete = await pending;
  assert.equal(obsolete.status, 401); await obsolete.text();
  assert.equal(client.cookie, newerCookie);
  assert.equal((await app.session(client)).user?.id, 1002);
  assert.equal(app.provider.tokensForTest().length, 1);
});

test('errors do not return or log provider secrets and do not expose write endpoints', async t => {
  const app = await setup(t), client = jar();
  await app.login(client);
  const sensitive = app.provider.tokensForTest()[0];
  app.provider.repositories = async () => { throw new Error(sensitive); };
  const response = await app.send(BASE + 'api/repositories', client);
  assert.equal(response.status, 500);
  assert(!(await response.text()).includes(sensitive));
  assert(!JSON.stringify(app.errors).includes(sensitive));
  for (const path of ['api/publications', 'api/upload', 'api/create-repository', 'api/debug/sessions']) {
    const denied = await app.send(BASE + path, client, 'POST');
    assert.equal(denied.status, 404); await denied.text();
  }
});

test('the session pool is bounded and expired entries are pruned on later requests', async t => {
  let time = 1_800_000_000_000;
  const app = await setup(t, { now: () => time });
  for (let i = 0; i < LIMITS.sessions; i++) await app.session(jar());
  const full = await app.send(BASE + 'api/session', jar());
  assert.equal(full.status, 503); await full.text();
  time += LIMITS.oauthMs + 1;
  assert.equal((await app.session(jar())).authenticated, false);
});

test('invalid provider identity is rejected and its synthetic grant is discarded', async t => {
  const app = await setup(t), client = jar();
  await app.session(client);
  const authorize = await app.start(client), exchange = app.provider.exchange.bind(app.provider);
  app.provider.exchange = async input => ({ ...await exchange(input), user: { id: 0, login: 'invalid-user' } });
  const response = await app.send(app.callback(authorize), client);
  assert.equal(response.status, 500); await response.text();
  assert.equal((await app.session(client)).authenticated, false);
  assert.equal(app.provider.tokensForTest().length, 0);
});

test('provider availability errors remain failures rather than empty successful repository lists', async t => {
  const app = await setup(t), client = jar();
  await app.login(client);
  app.provider.repositories = async () => { throw new ProviderError('unavailable'); };
  const response = await app.send(BASE + 'api/repositories', client);
  assert.equal(response.status, 502);
  assert.match(await response.text(), /operation failed/);
  assert.equal((await app.session(client)).authenticated, true);
});

test('a superseded authorization state cannot complete the newer attempt', async t => {
  const app = await setup(t), client = jar();
  await app.session(client);
  const first = await app.start(client), second = await app.start(client);
  const stale = await app.send(app.callback(first), client);
  assert.equal(stale.status, 400); await stale.text();
  const current = await app.send(app.callback(second), client);
  assert.equal(current.status, 303); await current.text();
  assert.equal((await app.session(client)).authenticated, true);
});

test('duplicate cookies and client-supplied credentials are rejected, not interpreted', async t => {
  const app = await setup(t), client = jar();
  await app.session(client);
  const duplicated = await app.send(BASE + 'api/session', client, 'GET', { Cookie: `${client.cookie}; ${client.cookie}` });
  assert.equal(duplicated.status, 400); await duplicated.text();
  await app.session(client);
  const credentials = await app.send(BASE + 'api/auth/start', client, 'POST', {}, '{"user":{"id":1},"accessToken":"forged"}');
  assert.equal(credentials.status, 400); await credentials.text();
  assert.equal((await app.session(client)).authenticated, false);
});

test('the response deadline is enforced even when a test provider ignores its signal', { timeout: 15_000 }, async t => {
  const app = await setup(t), client = jar();
  await app.login(client);
  app.provider.repositories = async () => new Promise(() => {});
  const response = await app.send(BASE + 'api/repositories', client);
  assert.equal(response.status, 504);
  assert.match(await response.text(), /timed out/);
});
