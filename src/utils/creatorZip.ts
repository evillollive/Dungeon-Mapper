import { AsyncZipDeflate, Zip } from 'fflate';
import { CREATOR_PACKAGE_LIMITS } from './creatorProject';
import { assertCreatorMembers, assertCreatorPackageId, type CreatorPackageFile } from './creatorPackageFormat';

/** One compression operation at a time; transfers never detach reviewed source files. */
export function encodeCreatorZip(packageId: string, files: readonly CreatorPackageFile[],
  signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
  signal.throwIfAborted();
  assertCreatorPackageId(packageId);
  assertCreatorMembers(files);
  const owned = [...files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
    .map(file => ({ path: file.path, bytes: new Uint8Array(file.bytes) }));
  return new Promise((resolve, reject) => {
    let settled = false;
    let total = 0;
    let rejectEntry: ((error: unknown) => void) | undefined;
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    const cleanup = () => { settled = true; signal.removeEventListener('abort', abort); };
    const fail = (error: unknown) => {
      if (settled) return;
      cleanup();
      archive.terminate();
      chunks.length = 0;
      rejectEntry?.(error);
      reject(error);
    };
    const abort = () => fail(signal.reason);
    const archive = new Zip((error, bytes, final) => {
      if (settled) return;
      if (error) { fail(error); return; }
      if (!bytes || bytes.byteLength > CREATOR_PACKAGE_LIMITS.zipBytes - total) {
        fail(new Error('The creator ZIP exceeds 32 MiB. Choose fewer levels or smaller assets; the original is unchanged.'));
        return;
      }
      chunks.push(new Uint8Array(bytes));
      total += bytes.byteLength;
      if (final) {
        cleanup();
        const result = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
        chunks.length = 0;
        resolve(result);
      }
    });
    signal.addEventListener('abort', abort, { once: true });
    async function compress(): Promise<void> {
      for (const file of owned) {
        signal.throwIfAborted();
        await new Promise<void>((done, failed) => {
          rejectEntry = failed;
          const entry = new AsyncZipDeflate(`maps/${packageId}/${file.path}`, { level: 6 });
          try {
            entry.mtime = new Date(1980, 0, 1);
            entry.os = 0;
            archive.add(entry);
            const forward = entry.ondata;
            entry.ondata = (error, data, final) => {
              if (settled) return;
              forward(error, data, final);
              if (error) failed(error);
              else if (final) {
                entry.terminate();
                rejectEntry = undefined;
                done();
              }
            };
            if (!settled) entry.push(file.bytes, true);
          } catch (error) {
            entry.terminate();
            failed(error);
          }
        });
      }
      signal.throwIfAborted();
      archive.end();
    }
    void compress().catch(fail);
  });
}
