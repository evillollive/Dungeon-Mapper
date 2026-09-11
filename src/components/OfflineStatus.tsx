import { useEffect, useState } from 'react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { applySavedUpdate, workerRequest } from '../utils/appUpdate';
import './OfflineStatus.css';

let registrationPromise: Promise<ServiceWorkerRegistration> | undefined;
export default function OfflineStatus({ blocked = false }: { blocked?: boolean }) {
  const offline = useOfflineStatus();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [setupAttempt, setSetupAttempt] = useState(0);
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let active = true;
    const cleanups: (() => void)[] = [];
    async function checkCache(reg: ServiceWorkerRegistration) {
      if (reg.active?.state !== 'activated') return;
      const status = await workerRequest(reg.active, 'OFFLINE_STATUS');
      if (!active) return;
      setReady(status.ready === true);
      if (!status.ready) setMessage('Offline files are missing. Reconnect and check for updates before relying on offline use.');
    }
    registrationPromise ??= navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`,
      { scope: import.meta.env.BASE_URL, updateViaCache: 'none' });
    void registrationPromise.then(reg => {
      if (!active) return;
      setRegistration(reg);
      const refresh = () => {
        if (!active) return;
        setWaiting(reg.waiting);
        void checkCache(reg).catch(error => {
          if (active) {
            setReady(false);
            setMessage(error instanceof Error ? error.message : 'Offline cache check failed.');
          }
        });
      };
      const trackInstall = () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', refresh);
        cleanups.push(() => worker.removeEventListener('statechange', refresh));
      };
      reg.addEventListener('updatefound', trackInstall);
      navigator.serviceWorker.addEventListener('controllerchange', refresh);
      window.addEventListener('online', refresh);
      cleanups.push(() => { reg.removeEventListener('updatefound', trackInstall);
        navigator.serviceWorker.removeEventListener('controllerchange', refresh); window.removeEventListener('online', refresh); });
      trackInstall();
      refresh();
    }).catch(error => {
      registrationPromise = undefined;
      if (active) setMessage(error instanceof Error ? error.message : 'Offline setup failed.');
    });
    return () => { active = false; cleanups.forEach(cleanup => cleanup()); };
  }, [setupAttempt]);
  if (!import.meta.env.PROD) return null;
  async function checkUpdates() {
    setBusy(true); setMessage('');
    try {
      if (!('serviceWorker' in navigator)) throw new Error('Offline support is unavailable in this browser.');
      if (!registration) {
        setSetupAttempt(attempt => attempt + 1);
        setMessage('Retrying offline setup...');
        return;
      }
      await registration.update();
      if (registration.active) {
        setReady(false);
        const result = await workerRequest(registration.active, 'OFFLINE_STATUS');
        setReady(result.ready === true);
        if (!result.ready) throw new Error('Offline files are missing. Keep a JSON backup and reconnect before reloading.');
      }
      setMessage('Update check completed. Installed updates appear here when ready.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Update check failed.'); }
    finally { setBusy(false); }
  }
  async function applyUpdate() {
    if (!waiting) return;
    setBusy(true); setMessage('');
    try { await applySavedUpdate(waiting); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Update failed. The workspace was not reloaded.'); }
    finally { setBusy(false); }
  }
  return <details className="offline-status">
    <summary>{waiting ? 'Update ready' : offline ? 'Offline' : 'Offline & updates'}</summary>
    <div aria-label="Offline and app updates">
    <span role="status">{offline ? 'Offline. ' : ''}{ready ? 'App and built-in art cached.' : 'Offline cache not ready.'}</span>
    <span>Device storage is not a backup.</span>
    {waiting ? <button type="button" disabled={busy || blocked} onClick={() => void applyUpdate()}>Update saved workspace</button>
      : <button type="button" disabled={busy || offline} onClick={() => void checkUpdates()}>{registration ? 'Check for updates' : 'Retry offline setup'}</button>}
    {waiting && <span>Update available. No automatic reload.</span>}
    {message && <p role="status">{message}</p>}
    </div>
  </details>;
}
