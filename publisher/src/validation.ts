import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { publicationMetadata, type PublicationMetadata } from './plans.ts';
import { RequestError } from './errors.ts';
import { assertCreatorMemberPath, CREATOR_PACKAGE_LIMITS, CREATOR_REQUIRED_FILES } from '../../src/utils/creatorPackageContract.ts';

export const VALIDATION_LIMITS = { concurrent: 1, workerMs: 8000, heapMiB: 256, responseBytes: 4096 } as const;
export interface ValidatedPackage {
  package: PublicationMetadata;
  profile: 'layout' | 'encounter';
  license: 'CC-BY-4.0' | 'CC-BY-SA-4.0' | 'AGPL-3.0-or-later';
}
export interface ValidatedPublicationPackage extends ValidatedPackage {
  files: { path: string; bytes: Uint8Array }[];
}

/** Completion includes child exit, so cancellation cannot release a slot while a decoder still runs. */
export function validatePackage(bytes: Uint8Array, signal: AbortSignal): Promise<ValidatedPackage> {
  return runValidation(bytes, signal, false);
}
export async function validatePublicationPackage(bytes: Uint8Array, signal: AbortSignal): Promise<ValidatedPublicationPackage> {
  const result = await runValidation(bytes, signal, true);
  if (!result.files) throw new RequestError(500, 'validator_members_missing', 'The validator did not return the reviewed members.');
  return { ...result, files: result.files };
}
function runValidation(bytes: Uint8Array, signal: AbortSignal, includeMembers: boolean): Promise<ValidatedPackage & { files?: ValidatedPublicationPackage['files'] }> {
  signal.throwIfAborted();
  if (!bytes.length || bytes.length > CREATOR_PACKAGE_LIMITS.zipBytes) {
    throw new RequestError(413, 'package_size', 'Choose a nonempty ZIP no larger than 32 MiB.');
  }
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [`--max-old-space-size=${VALIDATION_LIMITS.heapMiB}`,
      join(dirname(fileURLToPath(import.meta.url)), '../validator/worker.mjs'), ...(includeMembers ? ['--members'] : [])],
    { stdio: ['pipe', 'pipe', 'pipe'], env: { NODE_ENV: 'production' } });
    let failure: unknown;
    let failed = false;
    const chunks: Buffer[] = [];
    let outputBytes = 0;
    const headerLimit = 64 * 1024;
    const outputLimit = includeMembers ? CREATOR_PACKAGE_LIMITS.expandedBytes + headerLimit + 4 : VALIDATION_LIMITS.responseBytes;
    let diagnostics = 0;
    const stop = (error: unknown) => {
      if (!failed) { failure = error; failed = true; }
      child.kill('SIGKILL');
    };
    const abort = () => stop(signal.reason);
    const timer = setTimeout(() => stop(new RequestError(504, 'validation_timeout', 'Independent package validation timed out. Nothing was published.')), VALIDATION_LIMITS.workerMs);
    timer.unref();
    signal.addEventListener('abort', abort, { once: true });
    child.on('error', () => stop(new RequestError(503, 'validator_unavailable', 'The local validator could not start. Install its dependencies and rebuild the publisher.')));
    child.stdin.on('error', () => stop(new RequestError(500, 'validator_input_failed', 'The local validator stopped before receiving the package.')));
    child.stdout.on('data', (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > outputLimit) {
        stop(new RequestError(500, 'validator_output_failed', 'The local validator returned an invalid response.'));
      } else chunks.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      diagnostics += chunk.length;
      if (diagnostics > VALIDATION_LIMITS.responseBytes) stop(new RequestError(500, 'validator_failed', 'The local validator failed. No package contents were logged.'));
    });
    child.on('close', code => {
      clearTimeout(timer); signal.removeEventListener('abort', abort);
      if (failed) { reject(failure); return; }
      if (code !== 0 || diagnostics) {
        reject(new RequestError(500, 'validator_failed', 'The local validator failed. No package contents were logged.'));
        return;
      }
      try {
        const output = Buffer.concat(chunks);
        chunks.length = 0;
        const headerBytes = includeMembers ? output.readUInt32BE(0) : output.length;
        if (headerBytes > (includeMembers ? headerLimit : VALIDATION_LIMITS.responseBytes) ||
            headerBytes > output.length - (includeMembers ? 4 : 0)) throw new Error('Invalid worker framing.');
        let offset = includeMembers ? headerBytes + 4 : headerBytes;
        const value: unknown = JSON.parse(output.subarray(includeMembers ? 4 : 0, offset).toString('utf8'));
        if (!value || typeof value !== 'object' || !('ok' in value)) throw new Error('Invalid worker result.');
        if (value.ok === false) {
          const invalid = 'error' in value && value.error === 'invalid_package';
          throw new RequestError(invalid ? 422 : 503, invalid ? 'package_validation_failed' : 'validator_unavailable',
            invalid ? 'Independent validation rejected this package as invalid or unsupported. Keep the original; nothing was published.'
              : 'The local validator could not initialize. Install its dependencies and rebuild the publisher.');
        }
        if (value.ok !== true || !('package' in value) || !('profile' in value) || !('license' in value)) throw new Error('Invalid worker receipt.');
        const metadata = publicationMetadata({ repositoryId: 1, package: value.package }).package;
        if (value.profile !== 'layout' && value.profile !== 'encounter') throw new Error('Invalid worker profile.');
        if (value.license !== 'CC-BY-4.0' && value.license !== 'CC-BY-SA-4.0' && value.license !== 'AGPL-3.0-or-later') throw new Error('Invalid worker license.');
        const files: ValidatedPublicationPackage['files'] = [];
        if (includeMembers) {
          if (!('files' in value) || !Array.isArray(value.files) || value.files.length !== metadata.memberCount) throw new Error('Invalid worker members.');
          const paths = new Set<string>();
          for (const item of value.files) {
            if (!item || typeof item !== 'object' || typeof item.path !== 'string' ||
                !Number.isSafeInteger(item.bytes) || item.bytes <= 0 || item.bytes > output.length - offset ||
                paths.has(item.path)) throw new Error('Invalid worker member bounds.');
            assertCreatorMemberPath(item.path);
            paths.add(item.path);
            files.push({ path: item.path, bytes: Uint8Array.from(output.subarray(offset, offset + item.bytes)) });
            offset += item.bytes;
          }
          if (offset !== output.length || files.reduce((sum, file) => sum + file.bytes.length, 0) !== metadata.expandedBytes ||
              CREATOR_REQUIRED_FILES.some(path => !paths.has(path))) throw new Error('Incomplete worker members.');
        }
        resolve({ package: metadata, profile: value.profile, license: value.license, ...(includeMembers ? { files } : {}) });
      } catch (error) {
        reject(error instanceof RequestError ? error : new RequestError(500, 'validator_response_failed', 'The local validator returned an invalid receipt.'));
      }
    });
    if (signal.aborted) abort();
    else child.stdin.end(bytes);
  });
}
