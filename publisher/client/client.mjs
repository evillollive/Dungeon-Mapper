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
let simulationAvailable = false;
let simulating = false;
let serverBusy = false;
let receiptLoading = false;
let receiptTimer;
let receiptController;
let receiptFailed = false;
let runSettled = Promise.resolve();
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
  get('simulate-consent').checked = false;
}
function clearReceipts() {
  clearTimeout(receiptTimer);
  receiptController?.abort();
  serverBusy = false;
  receiptFailed = false;
  get('operation-list').replaceChildren();
  get('operation-progress').textContent = '';
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
  get('disconnect').disabled = false;
  get('repositories').hidden = !authenticated;
  get('package-section').hidden = !authenticated;
  get('package-file').disabled = busy || !authenticated;
  get('repository').disabled = busy || !authenticated || get('repository').options.length < 2;
  get('plan').disabled = busy || !selected || !get('repository').value;
  get('recheck').disabled = busy || !plan;
  get('validate-consent').disabled = busy || !plan || plan.status === 'server-validated';
  get('validate').disabled = busy || !selected || !plan || plan.status === 'server-validated' || !get('validate-consent').checked;
  get('simulation-confirmation').hidden = !simulationAvailable;
  get('simulation-unavailable').hidden = simulationAvailable;
  get('simulate-consent').disabled = busy || !plan || plan.status !== 'server-validated';
  get('simulate').disabled = busy || serverBusy || !selected || !plan || plan.status !== 'server-validated' || !get('simulate-consent').checked;
  get('operations').hidden = !authenticated || !simulationAvailable;
  get('recover').disabled = receiptLoading;
  get('stop-simulation').hidden = !simulating && !serverBusy;
  for (const button of get('operation-list').querySelectorAll('button')) button.disabled = busy || button.dataset.active === 'true';
  get('cancel').hidden = !busy || navigating;
}
async function api(path, method = 'GET', body = {}, contentType = 'application/json', headers = {}, signal = job?.signal) {
  const response = await fetch('/publisher/api/' + path, {
    method, credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal,
    headers: method === 'POST' ? { 'Content-Type': contentType, 'X-Publisher-CSRF': csrf, ...headers } : {},
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
  if (accountId !== nextAccount || csrf !== value.csrf || !value.authenticated) { clearPackage(); clearReceipts(); }
  csrf = value.csrf;
  accountId = nextAccount;
  authenticated = value.authenticated;
  simulationAvailable = value.simulationAvailable === true;
  clearTimeout(sessionTimer);
  if (authenticated) sessionTimer = setTimeout(() => {
    job?.abort();
    authenticated = false; csrf = ''; accountId = null;
    clearPackage(); clearReceipts(); resetDestinations(); buttons();
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
  let settled;
  runSettled = new Promise(resolve => { settled = resolve; });
  job = current;
  busy = true; buttons(); message('');
  try { await action(current.signal); }
  catch (error) {
    navigating = false;
    if (current.signal.aborted) {
      clearPlan();
      message('Request cancelled. A submitted ZIP or accepted fake write may remain in the local process. Refresh saved receipts and reconcile before any further simulation. No GitHub writes were sent.');
    } else {
      if (error.status === 401) {
        job?.abort();
        clearTimeout(sessionTimer);
        authenticated = false; csrf = ''; accountId = null;
        clearPackage(); clearReceipts(); resetDestinations();
        get('connection').textContent = 'The simulated session ended. Refresh before signing in again.';
      }
      if ([403, 409, 410].includes(error.status)) clearPlan();
      message(error.message || 'The local publisher operation failed.', true);
    }
  } finally {
    if (job === current) job = null;
    current.abort();
    busy = navigating; buttons();
    settled();
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
  get('simulate-consent').checked = false;
  clearTimeout(planTimer);
  planTimer = setTimeout(() => {
    if (simulating) job?.abort();
    clearPlan(); buttons(); message('The destination plan expired. Recover any submitted simulation from its saved receipt; no real GitHub publication occurred.');
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
get('disconnect').addEventListener('click', () => void (async () => {
  if (busy) { job?.abort(); await runSettled; }
  await run(async () => {
  let error;
  try { await api('disconnect', 'POST'); }
  catch (failure) { error = failure; }
  clearPackage(); clearReceipts();
  await session();
  if (error) throw error;
  message('Simulated account disconnected. Existing fake objects and metadata receipts were not deleted. No editor data or real repositories were changed.');
  });
})());
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
const phaseLabels = {
  prepared: 'Prepared, no fake writes confirmed',
  writing: 'Simulation in progress',
  'outcome-unknown': 'Outcome unknown: reconcile, do not repeat writes',
  'branch-verified': 'Fake branch verified at last readback',
  conflict: 'Conflict: the fake branch does not match',
  blocked: 'Stopped before fake writes',
};
function showReceipts(value) {
  if (value.mode !== 'local-simulation' || !Array.isArray(value.operations)) throw new Error('Unexpected local receipt response.');
  serverBusy = value.sessionBusy === true;
  get('operation-list').replaceChildren(...value.operations.map(item => {
    if (item.mode !== 'local-simulation' || item.writesToGitHub !== false || item.packageStoredInReceipt !== false ||
        !Object.hasOwn(phaseLabels, item.phase)) throw new Error('Unexpected simulated operation receipt.');
    const card = document.createElement('article'), title = document.createElement('h3'), detail = document.createElement('dl');
    card.className = 'receipt'; card.dataset.phase = item.phase; card.dataset.operation = item.id;
    title.textContent = phaseLabels[item.phase];
    for (const [label, text] of [
      ['Operation', item.id], ['Repository ID', String(item.repositoryId)], ['Fake branch', item.branch],
      ['ZIP SHA-256', item.packageSha256], ['Expected commit', item.expectedCommit],
      ['Last recorded stage', item.stage], ['Request state', item.active ? 'Active; wait for cleanup' : 'Settled; saved observation only'],
      ['Problem', item.problem ?? 'None recorded'],
    ]) {
      const term = document.createElement('dt'), description = document.createElement('dd');
      term.textContent = label; description.textContent = text; detail.append(term, description);
    }
    const note = document.createElement('p'), reconcile = document.createElement('button');
    note.textContent = item.objectsMayExist
      ? 'Fake objects may exist in memory. No GitHub objects, checks, merge or release exist.'
      : 'This receipt does not confirm fake objects. No GitHub writes occurred.';
    reconcile.textContent = 'Reconcile saved receipt (reads only)';
    reconcile.dataset.active = String(item.active);
    reconcile.addEventListener('click', () => void run(async signal => {
      get('operation-progress').textContent = 'Reading the fake repository again. No writes or ZIP upload will be repeated...';
      try {
        await api(`operations/${item.id}/reconcile`, 'POST', {}, 'application/json', {}, signal);
        await refreshReceipts();
        message('Read-only reconciliation finished. Review the saved outcome below; nothing was written to GitHub.');
      } catch (error) {
        await refreshReceipts();
        throw error;
      }
    }));
    card.append(title, detail, note, reconcile); return card;
  }));
  get('operation-progress').textContent = value.operations.length
    ? `${value.operations.length} saved receipt(s) for this account.${value.sessionBusy ? ' This session is still processing; refresh for the next recorded stage.' : ''}`
    : 'No saved receipts for this account. If a request is still validating, its durable intent may not exist yet.';
  buttons();
}
async function refreshReceipts() {
  if (!authenticated || !simulationAvailable || receiptLoading) return;
  const identity = csrf;
  const controller = new AbortController();
  receiptController = controller; receiptLoading = true; buttons();
  try {
    const value = await api('operations', 'GET', {}, 'application/json', {}, controller.signal);
    if (identity !== csrf || !authenticated) return;
    receiptFailed = false;
    showReceipts(value);
  } catch (error) {
    if (controller.signal.aborted) return;
    receiptFailed = true; serverBusy = false;
    message(error.message || 'Saved receipts could not be read. Do not repeat a publication request.', true);
    if (error.status === 401) {
      authenticated = false; csrf = ''; accountId = null;
      clearPackage(); clearReceipts(); resetDestinations();
      clearTimeout(sessionTimer);
      get('connection').textContent = 'The simulated session ended. Refresh before signing in again.';
    }
  } finally {
    if (receiptController === controller) receiptController = null;
    receiptLoading = false; buttons();
    if (serverBusy) monitorReceipts();
  }
}
function monitorReceipts() {
  clearTimeout(receiptTimer);
  if (receiptFailed || (!simulating && !serverBusy) || !authenticated) return;
  receiptTimer = setTimeout(async () => {
    await refreshReceipts();
    monitorReceipts();
  }, 1000);
}
get('recover').addEventListener('click', () => void refreshReceipts());
get('simulate-consent').addEventListener('change', buttons);
get('simulate').addEventListener('click', () => void run(async signal => {
  if (!selected || plan?.status !== 'server-validated' || !get('simulate-consent').checked) throw new Error('Validate and explicitly confirm the reviewed package and fake destination first.');
  const reviewed = plan;
  simulating = true; buttons(); monitorReceipts();
  get('operation-progress').textContent = 'Submitting the exact ZIP again for independent validation and fake publication. No GitHub requests...';
  try {
    await api(`plans/${reviewed.id}/simulate`, 'POST', selected.bytes, 'application/zip',
      { 'X-Publisher-Confirm': reviewed.id }, signal);
    signal.throwIfAborted();
    message('Simulation request settled. Read its receipt below; only exact readback can confirm a fake branch.');
  } finally {
    simulating = false; clearTimeout(receiptTimer); clearPlan(); buttons();
    await refreshReceipts();
  }
}));
get('stop-simulation').addEventListener('click', () => void (async () => {
  try {
    await api('operations/cancel', 'POST', {}, 'application/json', {}, new AbortController().signal);
    job?.abort();
    await runSettled;
    message('Request cancelled. Recover and reconcile saved receipts; accepted fake writes are not undone.');
    await refreshReceipts();
  } catch (error) { message(error.message || 'Cancellation could not be confirmed. Recover saved receipts before continuing.', true); }
})());
void run(async () => {
  await session();
  if (callbackFailed) message('Simulated sign-in failed or expired. Start a new sign-in; no real GitHub operation occurred.', true);
});
window.addEventListener('pagehide', () => { job?.abort(); clearPackage(); clearReceipts(); });
window.addEventListener('pageshow', event => {
  if (event.persisted) { navigating = false; busy = false; void run(session); }
});
