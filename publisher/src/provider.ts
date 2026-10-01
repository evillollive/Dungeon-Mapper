export interface PublisherUser { id: number; login: string }
export interface PublisherGrant {
  accessToken: string;
  expiresAt: number;
  user: PublisherUser;
}
export interface PublisherRepository { id: number; fullName: string; canWrite: boolean }
export interface PublisherRepositorySnapshot extends PublisherRepository {
  installationId: number;
  private: boolean;
  defaultBranch: string;
  headSha: string | null;
}
export interface LocalAuthProvider {
  kind: 'local-test';
  authorizationURL(input: { origin: string; redirectURI: string; state: string; challenge: string }): string;
  exchange(input: { code: string; verifier: string; redirectURI: string; signal: AbortSignal }): Promise<PublisherGrant>;
  repositories(accessToken: string, signal: AbortSignal): Promise<PublisherRepository[]>;
  repository(accessToken: string, repositoryId: number, signal: AbortSignal): Promise<PublisherRepositorySnapshot>;
  revoke(accessToken: string, signal: AbortSignal): Promise<void>;
}
export class ProviderError extends Error {
  readonly code: 'invalid_grant' | 'revoked' | 'unavailable' | 'denied';
  constructor(code: ProviderError['code']) {
    super('The simulated provider rejected this operation.');
    this.code = code;
  }
}
