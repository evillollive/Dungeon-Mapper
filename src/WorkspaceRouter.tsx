import { lazy, Suspense } from 'react';

const App = lazy(() => import('./App'));
const SessionWorkspace = lazy(() => import('./components/SessionWorkspace'));
const LocalPlayerDisplay = lazy(() => import('./components/LocalPlayerDisplay'));

export default function WorkspaceRouter() {
  const params = new URLSearchParams(window.location.search);
  const player = params.get('player');
  const session = params.get('session');
  const prepare = params.get('prepare');
  return <Suspense fallback={<p role="status">Loading workspace...</p>}>
    {player !== null ? <LocalPlayerDisplay sessionId={player} displayId={params.get('display') ?? ''} /> :
      session !== null || prepare !== null ? <SessionWorkspace sessionId={session} sourceId={prepare} /> : <App />}
  </Suspense>;
}
