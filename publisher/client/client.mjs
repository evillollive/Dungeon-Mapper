const get = id => document.getElementById(id);
const controls = ['signin', 'disconnect', 'refresh', 'list'];
let csrf = '';
let authenticated = false;
let busy = false;
let navigating = false;
const callbackFailed = location.pathname.endsWith('/auth/callback');
if (callbackFailed) history.replaceState(null, '', '/publisher/');

function message(text, error = false) {
  get('message').textContent = text;
  get('message').setAttribute('role', error ? 'alert' : 'status');
}
function buttons() {
  for (const id of controls) get(id).disabled = busy;
  get('signin').disabled = busy || !csrf;
  get('signin').hidden = authenticated;
  get('disconnect').hidden = !authenticated;
  get('repositories').hidden = !authenticated;
}
async function api(path, method = 'GET') {
  const response = await fetch('/publisher/api/' + path, {
    method, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
    headers: method === 'POST' ? { 'Content-Type': 'application/json', 'X-Publisher-CSRF': csrf } : {},
    ...(method === 'POST' ? { body: '{}' } : {}),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.message || 'The local publisher request failed.');
    error.status = response.status;
    throw error;
  }
  return result;
}
async function session() {
  const value = await api('session');
  if (value.mode !== 'local-prototype') throw new Error('Unexpected publisher mode. This page is for local simulation only.');
  csrf = value.csrf;
  authenticated = value.authenticated;
  get('connection').textContent = authenticated
    ? `Simulated account: ${value.user.login}. Session expires ${new Date(value.expiresAt).toLocaleTimeString()}.`
    : 'No account connected. This is a local simulated session.';
  get('repository-list').replaceChildren();
  if (value.notice) message(value.notice);
  buttons();
}
async function run(action) {
  if (busy) return;
  busy = true; buttons(); message('');
  try { await action(); }
  catch (error) {
    navigating = false;
    if (error.status === 401) {
      authenticated = false; csrf = '';
      get('repository-list').replaceChildren();
      get('connection').textContent = 'The simulated session ended. Refresh before signing in again.';
    }
    message(error.message || 'The local publisher operation failed.', true);
  } finally { busy = navigating; buttons(); }
}
get('signin').addEventListener('click', () => void run(async () => {
  const result = await api('auth/start', 'POST');
  const target = new URL(result.authorizationURL);
  if (target.origin !== location.origin || target.pathname !== '/publisher/test/authorize') throw new Error('External sign-in is not enabled in this prototype.');
  navigating = true;
  location.assign(target.href);
}));
get('disconnect').addEventListener('click', () => void run(async () => {
  let error;
  try { await api('disconnect', 'POST'); }
  catch (failure) { error = failure; }
  await session();
  if (error) throw error;
  message('Simulated account disconnected. No editor data or repositories were changed.');
}));
get('refresh').addEventListener('click', () => void run(session));
get('list').addEventListener('click', () => void run(async () => {
  const result = await api('repositories');
  get('repository-list').replaceChildren(...result.repositories.map(repository => {
    const item = document.createElement('li');
    item.textContent = `${repository.fullName}: ${repository.canWrite ? 'simulated write access' : 'simulated read access'}`;
    return item;
  }));
}));
void run(async () => {
  await session();
  if (callbackFailed) message('Simulated sign-in failed or expired. Start a new sign-in; no real GitHub operation occurred.', true);
});
window.addEventListener('pageshow', event => {
  if (event.persisted) { navigating = false; busy = false; void run(session); }
});
