import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { publicationMetadata, type PublicationMetadata } from './plans.ts';
import { RequestError } from './errors.ts';
import { CREATOR_PACKAGE_LIMITS } from '../../src/utils/creatorPackageContract.ts';

export const VALIDATION_LIMITS = { concurrent: 1, workerMs: 8000, heapMiB: 256, responseBytes: 4096 } as const;
export interface ValidatedPackage {
  package: PublicationMetadata;
  profile: 'layout' | 'encounter';
  license: 'CC-BY-4.0' | 'CC-BY-SA-4.0' | 'AGPL-3.0-or-later';
}

/** Completion includes child exit, so cancellation cannot release a slot while a decoder still runs. */
export function validatePackage(bytes: Uint8Array, signal: AbortSignal): Promise<ValidatedPackage> {
  signal.throwIfAborted();
  if (!bytes.length || bytes.length > CREATOR_PACKAGE_LIMITS.zipBytes) {
    throw new RequestError(413, 'package_size', 'Choose a nonempty ZIP no larger than 32 MiB.');
  }
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [`--max-old-space-size=${VALIDATION_LIMITS.heapMiB}`,
      join(dirname(fileURLToPath(import.meta.url)), '../validator/worker.mjs')],
    { stdio: ['pipe', 'pipe', 'pipe'], env: { NODE_ENV: 'production' } });
    let failure: unknown;
    let failed = false;
    let output = '';
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
      if (Buffer.byteLength(output) + chunk.length > VALIDATION_LIMITS.responseBytes) {
        stop(new RequestError(500, 'validator_output_failed', 'The local validator returned an invalid response.'));
      } else output += chunk.toString('utf8');
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
        const value: unknown = JSON.parse(output);
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
        resolve({ package: metadata, profile: value.profile, license: value.license });
      } catch (error) {
        reject(error instanceof RequestError ? error : new RequestError(500, 'validator_response_failed', 'The local validator returned an invalid receipt.'));
      }
    });
    if (signal.aborted) abort();
    else child.stdin.end(bytes);
  });
}
