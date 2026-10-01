import { inspectLocalPackage } from './package-review.mjs';

const get = id => document.getElementById(id);
const controls = ['signin', 'disconnect', 'refresh', 'list', 'clear-package'];
let csrf = '';
let accountId = null;
let authenticated = false;
let busy = false;
let navigating = false;
let job = null;
let selected = null;
let plan = null;
let selection = 0;
let sessionTimer;
let planTimer;
const previewURLs = new Set();
const callbackFailed = location.pathname.endsWith('/auth/callback');
if (callbackFailed) history.replaceState(null, '', '/publisher/');

function message(text, error = false) {
  get('message').textContent = text;
  get('message').setAttribute('role', error ? 'alert' : 'status');
}
function clearPlan() {
  clearTimeout(planTimer);
  plan = null; get('plan-detail').hidden = true; get('plan-summary').replaceChildren();
  get('validate-consent').checked = false;
  get('validation-status').textContent = '';
}
function clearPackage() {
  selection++;
  selected = null;
  clearPlan();
  get('package-file').value = '';
  get('package-detail').hidden = true;
  get('package-previews').replaceChildren();
  get('package-notices').textContent = '';
  get('package-summary').textContent = '';
  get('package-warning').textContent = '';
  get('package-status').textContent = 'No package selected.';
  for (const url of previewURLs) URL.revokeObjectURL(url);
  previewURLs.clear();
}
function buttons() {
  for (const id of controls) get(id).disabled = busy;
  get('signin').disabled = busy || !csrf;
  get('signin').hidden = authenticated;
  get('disconnect').hidden = !authenticated;
  get('repositories').hidden = !authenticated;
  get('package-section').hidden = !authenticated;
  get('package-file').disabled = busy || !authenticated;
  get('repository').disabled = busy || !authenticated || get('repository').options.length < 2;
  get('plan').disabled = busy || !selected || !get('repository').value;
  get('recheck').disabled = busy || !plan;
  get('validate-consent').disabled = busy || !plan || plan.status === 'server-validated';
  get('validate').disabled = busy || !selected || !plan || plan.status === 'server-validated' || !get('validate-consent').checked;
  get('cancel').hidden = !busy || navigating;
}
async function api(path, method = 'GET', body = {}, contentType = 'application/json') {
  const response = await fetch('/publisher/api/' + path, {
    method, credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: job?.signal,
    headers: method === 'POST' ? { 'Content-Type': contentType, 'X-Publisher-CSRF': csrf } : {},
    ...(method === 'POST' ? { body: contentType === 'application/zip' ? body : JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.message || 'The local publisher request failed.');
    error.status = response.status;
    throw error;
  }
  return result;
}
function resetDestinations() {
  get('repository-list').replaceChildren();
  get('repository').replaceChildren(new Option('Choose a destination', ''));
  clearPlan();
}
async function session() {
  const value = await api('session');
  if (value.mode !== 'local-prototype') throw new Error('Unexpected publisher mode. This page is for local simulation only.');
  const nextAccount = value.user?.id ?? null;
  if (accountId !== nextAccount || csrf !== value.csrf || !value.authenticated) clearPackage();
  csrf = value.csrf;
  accountId = nextAccount;
  authenticated = value.authenticated;
  clearTimeout(sessionTimer);
  if (authenticated) sessionTimer = setTimeout(() => {
    job?.abort();
    authenticated = false; csrf = ''; accountId = null;
    clearPackage(); resetDestinations(); buttons();
    get('connection').textContent = 'The simulated session expired. Refresh before signing in again.';
  }, Math.max(0, value.expiresAt - Date.now()));
  get('connection').textContent = authenticated
    ? `Simulated account: ${value.user.login}. Session expires ${new Date(value.expiresAt).toLocaleTimeString()}.`
    : 'No account connected. This is a local simulated session.';
  resetDestinations();
  if (value.notice) message(value.notice);
  buttons();
}
async function run(action) {
  if (busy) return;
  const current = new AbortController();
  job = current;
  busy = true; buttons(); message('');
  try { await action(current.signal); }
  catch (error) {
    navigating = false;
    if (current.signal.aborted) {
      clearPlan();
      message('Request cancelled. An explicit ZIP submission may already have reached the local validator; uploaded bytes are discarded during cleanup. No GitHub writes were sent.');
    } else {
      if (error.status === 401) {
        clearTimeout(sessionTimer);
        authenticated = false; csrf = ''; accountId = null;
        clearPackage(); resetDestinations();
        get('connection').textContent = 'The simulated session ended. Refresh before signing in again.';
      }
      if ([403, 409, 410].includes(error.status)) clearPlan();
      message(error.message || 'The local publisher operation failed.', true);
    }
  } finally {
    if (job === current) job = null;
    current.abort();
    busy = navigating; buttons();
  }
}
function showPackage(value) {
  const epoch = selection;
  selected = value;
  const { manifest, metadata } = value;
  get('package-status').textContent = `Inspected locally: ${metadata.memberCount} files, ${metadata.zipBytes.toLocaleString()} ZIP bytes. Selection itself does not send file contents.`;
  get('package-summary').textContent = `${manifest.title} / declared creator ${manifest.author} / ${manifest.license} / version ${manifest.contentVersion} / ${manifest.profile}`;
  get('package-notices').textContent = JSON.stringify({ sources: value.notices, members: manifest.members }, null, 2);
  get('package-warning').textContent = value.metadataWarning;
  for (const [index, file] of value.previews.entries()) {
    const url = URL.createObjectURL(new Blob([file.bytes], { type: 'image/png' }));
    previewURLs.add(url);
    const figure = document.createElement('figure'), image = document.createElement('img'), caption = document.createElement('figcaption');
    image.src = url; image.alt = `Creator package level ${index + 1}`;
    image.addEventListener('error', () => {
      if (epoch !== selection || !selected) return;
      clearPackage(); message('A package preview could not be displayed. Select and inspect the file again.', true); buttons();
    });
    caption.textContent = `Level ${index + 1}: author-facing preview`;
    figure.append(image, caption);
    get('package-previews').append(figure);
  }
  get('package-detail').hidden = false;
}
function showPlan(value) {
  const validated = value.status === 'server-validated';
  if (!selected || value.mode !== 'local-prototype' || !['metadata-only', 'server-validated'].includes(value.status) ||
      value.packageReceived !== validated || value.packageRetained !== false || value.writesPerformed !== false ||
      (validated && (value.validation?.decoder !== 'node-native-v1' || !Number.isFinite(value.validation.validatedAt))) ||
      Object.keys(selected.metadata).some(key => value.package[key] !== selected.metadata[key]) ||
      value.repository.id !== Number(get('repository').value)) throw new Error('The planning response does not match the selected local package and destination.');
  plan = value;
  get('plan-title').textContent = validated ? 'Destination plan: server-validated package' : 'Destination plan: metadata only';
  get('plan-warning').textContent = validated
    ? 'The local Node validator checked this ZIP independently and discarded the uploaded bytes. No GitHub objects, branch, PR or workflow run has been created.'
    : 'The server has not received or validated the ZIP. No GitHub objects, branch, PR or workflow run has been created.';
  get('validation-status').textContent = validated
    ? 'Independent archive, profile, reference, rights-declaration and native image checks passed. This does not prove ownership, licensing permission or publication readiness.'
    : '';
  get('validate-consent').checked = false;
  clearTimeout(planTimer);
  planTimer = setTimeout(() => {
    clearPlan(); buttons(); message('The destination plan expired. Review the destination again; nothing was published.');
  }, Math.max(0, value.expiresAt - Date.now()));
  const fields = [
    ['Repository', value.repository.fullName], ['Visibility', value.repository.private ? 'Private (simulated)' : 'Public (simulated)'],
    ['Reviewed base', `${value.repository.defaultBranch} / ${value.repository.headSha}`],
    ['Proposed new branch', value.branch], ['Package', `${value.package.packageId} / ${value.package.contentVersion}`],
    ['ZIP SHA-256', value.package.packageSha256], ['Plan expires', new Date(value.expiresAt).toLocaleTimeString()],
  ];
  get('plan-summary').replaceChildren(...fields.flatMap(([label, content]) => {
    const term = document.createElement('dt'), description = document.createElement('dd');
    term.textContent = label; description.textContent = content;
    return [term, description];
  }));
  get('plan-detail').hidden = false;
  get('plan-title').focus();
  get('plan-title').scrollIntoView({ block: 'nearest' });
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
  clearPackage();
  await session();
  if (error) throw error;
  message('Simulated account disconnected. No editor data or repositories were changed.');
}));
get('refresh').addEventListener('click', () => void run(session));
get('cancel').addEventListener('click', () => {
  job?.abort();
  message('Cancellation requested. Local controls stay locked until the request settles. A server validation slot stays locked until its child process exits.');
});
get('clear-package').addEventListener('click', () => { clearPackage(); buttons(); });
get('package-file').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file || busy || !authenticated) return;
  clearPackage();
  const epoch = selection;
  void run(async signal => {
    get('package-status').textContent = 'Inspecting the ZIP locally. No file upload is taking place...';
    try {
      const value = await inspectLocalPackage(file, signal);
      signal.throwIfAborted();
      if (epoch !== selection || !authenticated) throw new Error('The selected package or session changed. Choose the file again.');
      showPackage(value);
    } catch (error) {
      clearPackage();
      throw error;
    }
  });
});
get('list').addEventListener('click', () => void run(async () => {
  const result = await api('repositories');
  resetDestinations();
  get('repository-list').replaceChildren(...result.repositories.map(repository => {
    const item = document.createElement('li');
    item.textContent = `${repository.fullName}: ${repository.canWrite ? 'simulated write access' : 'simulated read access'}`;
    const option = new Option(`${repository.fullName}${repository.canWrite ? '' : ' (read only)'}`, String(repository.id));
    option.disabled = !repository.canWrite;
    get('repository').append(option);
    return item;
  }));
}));
get('repository').addEventListener('change', () => { clearPlan(); buttons(); });
get('plan').addEventListener('click', () => void run(async signal => {
  if (!selected) throw new Error('Inspect a creator ZIP first.');
  clearPlan();
  const value = await api('plans', 'POST', { repositoryId: Number(get('repository').value), package: selected.metadata });
  signal.throwIfAborted();
  showPlan(value);
}));
get('recheck').addEventListener('click', () => void run(async signal => {
  if (!plan) throw new Error('Review a destination plan first.');
  try {
    const value = await api(`plans/${plan.id}/recheck`, 'POST');
    signal.throwIfAborted();
    showPlan(value);
    message('Simulated destination still matches the reviewed plan. This recheck sends no ZIP and publishes nothing.');
  } catch (error) { clearPlan(); throw error; }
}));
get('validate-consent').addEventListener('change', buttons);
get('validate').addEventListener('click', () => void run(async signal => {
  if (!selected || !plan || !get('validate-consent').checked) throw new Error('Review the package and explicitly approve sending it to the local validator first.');
  get('validation-status').textContent = 'Sending the reviewed ZIP to the loopback-only validator. Nothing is sent to GitHub...';
  try {
    const value = await api(`plans/${plan.id}/validate`, 'POST', selected.bytes, 'application/zip');
    signal.throwIfAborted();
    showPlan(value);
    message('The local server independently validated the ZIP and discarded its bytes. Nothing was published.');
  } catch (error) { clearPlan(); throw error; }
}));
void run(async () => {
  await session();
  if (callbackFailed) message('Simulated sign-in failed or expired. Start a new sign-in; no real GitHub operation occurred.', true);
});
window.addEventListener('pagehide', () => { job?.abort(); clearPackage(); });
window.addEventListener('pageshow', event => {
  if (event.persisted) { navigating = false; busy = false; void run(session); }
});
