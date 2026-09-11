type UpdateGuard = () => string | null;
let guard: UpdateGuard | null = null;
export function registerUpdateGuard(next: UpdateGuard) {
  guard = next;
  return () => { if (guard === next) guard = null; };
}
export function updateBlocker(): string | null {
  if (document.querySelector('[role="dialog"]')) return 'Close the open dialog before updating.';
  return guard ? guard() : 'Return to a saved project in the editor before updating. End or save any running session first.';
}

export function workerRequest(worker: ServiceWorker, type: string): Promise<{ ready?: boolean; accepted?: boolean; missing?: number }> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(new Error('The offline worker did not respond. Keep working and try again later.'));
    }, 8000);
    channel.port1.onmessage = event => {
      clearTimeout(timer);
      channel.port1.close();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data);
    };
    worker.postMessage({ type }, [channel.port2]);
  });
}

export async function applySavedUpdate(worker: ServiceWorker): Promise<void> {
  const reason = updateBlocker();
  if (reason) throw new Error(reason);
  const root = document.getElementById('root');
  const wasInert = root?.inert ?? false;
  const stopInput = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
  const events = ['keydown', 'keyup', 'pointerdown', 'pointerup', 'click', 'input', 'change'] as const;
  if (root) root.inert = true;
  for (const type of events) window.addEventListener(type, stopInput, true);
  try {
    const result = await workerRequest(worker, 'APPLY_SAVED_UPDATE');
    if (!result.accepted) throw new Error('The update was not accepted.');
    await new Promise<void>((resolve, reject) => {
      const finish = () => {
        if (worker.state !== 'activated' && worker.state !== 'redundant') return;
        clearTimeout(timer);
        worker.removeEventListener('statechange', finish);
        if (worker.state === 'activated') resolve();
        else reject(new Error('The update was replaced. Try again.'));
      };
      const timer = setTimeout(() => {
        worker.removeEventListener('statechange', finish);
        reject(new Error('Update activation timed out. No reload was requested.'));
      }, 10000);
      worker.addEventListener('statechange', finish);
      finish();
    });
    // No navigation occurs unless the current in-memory state is still durable.
    const latest = updateBlocker();
    if (latest) throw new Error(latest);
    window.location.reload();
  } finally {
    if (root) root.inert = wasInert;
    for (const type of events) window.removeEventListener(type, stopInput, true);
  }
}
