import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { ProviderError, type LocalAuthProvider, type PublisherGrant, type PublisherUser } from '../src/provider.ts';
import { BASE } from '../src/app.ts';

export class TestProvider implements LocalAuthProvider {
  readonly kind = 'local-test';
  private codes = new Map<string, { challenge: string; redirectURI: string; expiresAt: number }>();
  private grants = new Map<string, PublisherGrant>();
  private now: () => number;
  user: PublisherUser = { id: 1001, login: 'fixture-creator' };
  failRevocation = false;
  constructor(now: () => number = Date.now) { this.now = now; }
  private prune(): void {
    for (const [code, value] of this.codes) if (value.expiresAt <= this.now()) this.codes.delete(code);
    for (const [key, value] of this.grants) if (value.expiresAt <= this.now()) this.grants.delete(key);
  }
  authorizationURL(input: { origin: string; redirectURI: string; state: string; challenge: string }): string {
    const url = new URL(BASE + 'test/authorize', input.origin);
    url.searchParams.set('redirect_uri', input.redirectURI);
    url.searchParams.set('state', input.state);
    url.searchParams.set('code_challenge', input.challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.href;
  }
  issueCode(challenge: string, redirectURI: string): string {
    this.prune();
    if (this.codes.size >= 128) throw new ProviderError('unavailable');
    const code = randomBytes(32).toString('base64url');
    this.codes.set(code, { challenge, redirectURI, expiresAt: this.now() + 60_000 });
    return code;
  }
  async exchange(input: { code: string; verifier: string; redirectURI: string; signal: AbortSignal }): Promise<PublisherGrant> {
    input.signal.throwIfAborted(); this.prune();
    const expected = this.codes.get(input.code);
    this.codes.delete(input.code);
    const actual = createHash('sha256').update(input.verifier).digest('base64url');
    if (!expected || expected.redirectURI !== input.redirectURI || actual.length !== expected.challenge.length ||
        !timingSafeEqual(Buffer.from(actual), Buffer.from(expected.challenge))) throw new ProviderError('invalid_grant');
    if (this.grants.size >= 128) throw new ProviderError('unavailable');
    const grant = { accessToken: 'local-test-access-' + randomBytes(32).toString('base64url'),
      expiresAt: this.now() + 60 * 60_000, user: { ...this.user } };
    this.grants.set(grant.accessToken, grant);
    return grant;
  }
  async repositories(accessToken: string, signal: AbortSignal) {
    signal.throwIfAborted(); this.prune();
    const grant = this.grants.get(accessToken);
    if (!grant) throw new ProviderError('revoked');
    return [{ id: 2001, fullName: `${grant.user.login}/synthetic-maps`, canWrite: true }];
  }
  async revoke(accessToken: string, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    if (this.failRevocation) throw new ProviderError('unavailable');
    this.grants.delete(accessToken);
  }
  tokensForTest(): string[] { return [...this.grants.keys()]; }
  close(): void { this.codes.clear(); this.grants.clear(); }
}
