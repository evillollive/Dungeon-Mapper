import { gitCommit, gitObject, gitTree, checkedEntries, type GitCommit, type GitEntry, type LocalGitProvider } from '../src/gitObjects.ts';
import { ProviderError } from '../src/provider.ts';
import { TestProvider } from './provider.ts';

export type FakeWrite = 'blob' | 'tree' | 'commit' | 'branch';
/** In-memory remote stand-in. It never opens GitHub, Git, a repository path or a network client. */
export class TestGitProvider extends TestProvider implements LocalGitProvider {
  readonly blobs = new Map<string, Uint8Array>();
  readonly trees = new Map<string, GitEntry[]>();
  readonly commits = new Map<string, GitCommit>();
  readonly branches = new Map<string, string>();
  readonly writes: FakeWrite[] = [];
  dropResponseAfter?: FakeWrite;
  protectBranches = false;
  beforeWrite?: (kind: FakeWrite) => Promise<void>;
  afterWrite?: (kind: FakeWrite) => Promise<void>;
  constructor(now?: () => number) {
    super(now);
    const entries = [
      this.seedBlob('README.md', 'Unrelated repository notes\n'),
      this.seedBlob('.github/workflows/existing.yml', 'Synthetic existing workflow, never executed\n'),
      this.seedBlob('maps/another-vault/map.json', '{"synthetic":"unrelated"}\n'),
    ];
    const tree = gitTree(entries);
    this.trees.set(tree, entries);
    const commit = { tree, parent: null, message: 'Synthetic repository base\n', timestamp: 1 };
    const sha = gitCommit(commit);
    this.commits.set(sha, commit);
    this.branches.set('main', sha);
    this.repositoryState.headSha = sha;
  }
  seedBlob(path: string, content: string): GitEntry {
    const bytes = Buffer.from(content), sha = gitObject('blob', bytes);
    this.blobs.set(sha, Uint8Array.from(bytes));
    return { path, mode: '100644', sha };
  }
  replaceBase(entries: GitEntry[]): void {
    const tree = gitTree(entries);
    this.trees.set(tree, structuredClone(entries));
    const commit = { tree, parent: this.repositoryState.headSha, message: 'Changed synthetic base\n', timestamp: 2 };
    const sha = gitCommit(commit);
    this.commits.set(sha, commit);
    this.branches.set('main', sha);
    this.repositoryState.headSha = sha;
  }
  private async permitted(token: string, id: number, signal: AbortSignal, write = false) {
    const repository = await this.repository(token, id, signal);
    if (write && !repository.canWrite) throw new ProviderError('denied');
  }
  async commit(token: string, id: number, sha: string, signal: AbortSignal): Promise<GitCommit> {
    await this.permitted(token, id, signal);
    const value = this.commits.get(sha);
    if (!value) throw new ProviderError('unavailable');
    return structuredClone(value);
  }
  async tree(token: string, id: number, sha: string, signal: AbortSignal): Promise<GitEntry[]> {
    await this.permitted(token, id, signal);
    const value = this.trees.get(sha);
    if (!value) throw new ProviderError('unavailable');
    return structuredClone(value);
  }
  async blob(token: string, id: number, sha: string, signal: AbortSignal): Promise<Uint8Array> {
    await this.permitted(token, id, signal);
    const value = this.blobs.get(sha);
    if (!value) throw new ProviderError('unavailable');
    return Uint8Array.from(value);
  }
  async branch(token: string, id: number, branch: string, signal: AbortSignal): Promise<string | null> {
    await this.permitted(token, id, signal);
    return this.branches.get(branch) ?? null;
  }
  private async before(kind: FakeWrite, token: string, id: number, signal: AbortSignal) {
    await this.permitted(token, id, signal, true);
    await this.beforeWrite?.(kind);
    signal.throwIfAborted();
    this.writes.push(kind);
  }
  private async after(kind: FakeWrite) {
    await this.afterWrite?.(kind);
    if (this.dropResponseAfter === kind) {
      this.dropResponseAfter = undefined;
      throw new ProviderError('unavailable');
    }
  }
  async createBlob(token: string, id: number, bytes: Uint8Array, signal: AbortSignal): Promise<string> {
    await this.before('blob', token, id, signal);
    const sha = gitObject('blob', bytes);
    this.blobs.set(sha, Uint8Array.from(bytes));
    await this.after('blob'); return sha;
  }
  async createTree(token: string, id: number, entries: readonly GitEntry[], signal: AbortSignal): Promise<string> {
    await this.before('tree', token, id, signal);
    const value = checkedEntries(entries), sha = gitTree(value);
    for (const entry of value) if (entry.mode !== '160000' && !this.blobs.has(entry.sha)) throw new ProviderError('unavailable');
    this.trees.set(sha, value);
    await this.after('tree'); return sha;
  }
  async createCommit(token: string, id: number, commit: GitCommit, signal: AbortSignal): Promise<string> {
    await this.before('commit', token, id, signal);
    if (!this.trees.has(commit.tree) || !commit.parent || !this.commits.has(commit.parent)) throw new ProviderError('unavailable');
    const sha = gitCommit(commit);
    this.commits.set(sha, structuredClone(commit));
    await this.after('commit'); return sha;
  }
  async createBranch(token: string, id: number, branch: string, sha: string, signal: AbortSignal): Promise<void> {
    await this.before('branch', token, id, signal);
    if (this.protectBranches || this.branches.has(branch) || !branch.startsWith('dm-maps/') || !this.commits.has(sha)) {
      throw new ProviderError('denied');
    }
    this.branches.set(branch, sha);
    await this.after('branch');
  }
}
