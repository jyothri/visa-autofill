// options.js

// ── State ─────────────────────────────────────────────────────────────────────

let sites = [];
let currentSiteId = null;   // which site is open in the edit view
let editingQaId = null;     // which Q&A entry is being edited (null = adding new)

// ── DOM refs ──────────────────────────────────────────────────────────────────

const viewSites = document.getElementById('view-sites');
const viewEditSite = document.getElementById('view-edit-site');

const sitesList = document.getElementById('sites-list');
const addSiteBtn = document.getElementById('add-site-btn');

const backBtn = document.getElementById('back-btn');
const editSiteTitle = document.getElementById('edit-site-title');
const siteDomainInput = document.getElementById('site-domain');
const siteUsernameInput = document.getElementById('site-username');
const saveSiteBtn = document.getElementById('save-site-btn');
const siteStatus = document.getElementById('site-status');

const qaSection = document.getElementById('qa-section');
const qaList = document.getElementById('qa-list');
const qaFormTitle = document.getElementById('qa-form-title');
const qaKeywordsInput = document.getElementById('qa-keywords');
const qaAnswerInput = document.getElementById('qa-answer');
const saveQaBtn = document.getElementById('save-qa-btn');
const cancelQaBtn = document.getElementById('cancel-qa-btn');
const qaStatus = document.getElementById('qa-status');

// ── Persistence ───────────────────────────────────────────────────────────────

function loadSites(cb) {
  chrome.storage.local.get('sites', result => {
    sites = result.sites || [];
    if (cb) cb();
  });
}

function persistSites(cb) {
  chrome.storage.local.set({ sites }, cb);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function uid() {
  return String(Date.now()) + Math.random().toString(36).slice(2, 7);
}

function showMsg(el, msg, type) {
  el.textContent = msg;
  el.className = 'status-msg ' + type;
  setTimeout(() => { el.textContent = ''; el.className = 'status-msg'; }, 3000);
}

function currentSite() {
  return sites.find(s => s.id === currentSiteId) || null;
}

// ── View switching ────────────────────────────────────────────────────────────

function showSitesView() {
  currentSiteId = null;
  editingQaId = null;
  viewEditSite.classList.add('hidden');
  viewSites.classList.remove('hidden');
  renderSitesList();
}

function showEditSiteView(siteId) {
  currentSiteId = siteId;
  editingQaId = null;
  viewSites.classList.add('hidden');
  viewEditSite.classList.remove('hidden');

  const site = currentSite();
  if (site) {
    editSiteTitle.textContent = 'Edit Website';
    siteDomainInput.value = site.domain;
    siteUsernameInput.value = site.username || '';
    saveSiteBtn.textContent = 'Save Website';
    qaSection.classList.remove('hidden');
  } else {
    editSiteTitle.textContent = 'Add Website';
    siteDomainInput.value = '';
    siteUsernameInput.value = '';
    saveSiteBtn.textContent = 'Add Website';
    qaSection.classList.add('hidden');
  }

  resetQaForm();
  renderQaList();
  siteDomainInput.focus();
}

// ── Sites list rendering ──────────────────────────────────────────────────────

function renderSitesList() {
  sitesList.innerHTML = '';

  if (sites.length === 0) {
    sitesList.innerHTML = '<p class="empty-state">No websites configured. Click "Add Website" to get started.</p>';
    return;
  }

  sites.forEach(site => {
    const card = document.createElement('div');
    card.className = 'entry-card';

    const usernameInfo = site.username
      ? `<div class="entry-meta">Username: ${escapeHtml(site.username)}</div>`
      : '<div class="entry-meta muted">No username filter</div>';

    const count = (site.qaEntries || []).length;
    const qaInfo = `<div class="entry-meta muted">${count} Q&amp;A entr${count === 1 ? 'y' : 'ies'}</div>`;

    card.innerHTML = `
      <div class="entry-info">
        <div class="entry-domain">${escapeHtml(site.domain)}</div>
        ${usernameInfo}
        ${qaInfo}
      </div>
      <div class="entry-actions">
        <button class="btn btn-secondary btn-sm edit-site-btn" data-id="${site.id}">Edit</button>
        <button class="btn btn-danger btn-sm delete-site-btn" data-id="${site.id}">Delete</button>
      </div>
    `;

    sitesList.appendChild(card);
  });

  sitesList.querySelectorAll('.edit-site-btn').forEach(btn =>
    btn.addEventListener('click', () => showEditSiteView(btn.dataset.id))
  );
  sitesList.querySelectorAll('.delete-site-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteSite(btn.dataset.id))
  );
}

// ── Site CRUD ─────────────────────────────────────────────────────────────────

function saveSite() {
  const domain = siteDomainInput.value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const username = siteUsernameInput.value.trim();

  if (!domain || !domain.includes('.') || /\s/.test(domain)) {
    showMsg(siteStatus, 'Please enter a valid domain (e.g. example.com).', 'error');
    siteDomainInput.focus();
    return;
  }

  const site = currentSite();
  if (site) {
    site.domain = domain;
    site.username = username;
    showMsg(siteStatus, 'Website saved.', 'success');
  } else {
    const newSite = { id: uid(), domain, username, qaEntries: [] };
    sites.push(newSite);
    currentSiteId = newSite.id;
    editSiteTitle.textContent = 'Edit Website';
    saveSiteBtn.textContent = 'Save Website';
    qaSection.classList.remove('hidden');
    renderQaList();
    showMsg(siteStatus, 'Website added.', 'success');
  }

  persistSites();
}

function deleteSite(id) {
  sites = sites.filter(s => s.id !== id);
  persistSites(() => renderSitesList());
}

// ── Q&A list rendering ────────────────────────────────────────────────────────

function renderQaList() {
  const site = currentSite();
  const entries = site ? site.qaEntries || [] : [];
  qaList.innerHTML = '';

  if (entries.length === 0) {
    qaList.innerHTML = '<p class="empty-state">No entries yet. Add one below.</p>';
    return;
  }

  entries.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'entry-card';

    const keywordsDisplay = entry.keywords.join(', ') || '(no keywords)';
    const masked = '•'.repeat(Math.min(entry.answer.length, 12));

    card.innerHTML = `
      <div class="entry-info">
        <div class="entry-keywords"><strong>Keywords:</strong> ${escapeHtml(keywordsDisplay)}</div>
        <div class="entry-answer"><strong>Answer:</strong> <span class="masked">${masked}</span></div>
      </div>
      <div class="entry-actions">
        <button class="btn btn-secondary btn-sm edit-qa-btn" data-id="${entry.id}">Edit</button>
        <button class="btn btn-danger btn-sm delete-qa-btn" data-id="${entry.id}">Delete</button>
      </div>
    `;

    qaList.appendChild(card);
  });

  qaList.querySelectorAll('.edit-qa-btn').forEach(btn =>
    btn.addEventListener('click', () => startEditQa(btn.dataset.id))
  );
  qaList.querySelectorAll('.delete-qa-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteQa(btn.dataset.id))
  );
}

// ── Q&A form ──────────────────────────────────────────────────────────────────

function resetQaForm() {
  editingQaId = null;
  qaKeywordsInput.value = '';
  qaAnswerInput.value = '';
  qaFormTitle.textContent = 'Add Q\u0026A Entry';
  saveQaBtn.textContent = 'Add Entry';
  cancelQaBtn.classList.add('hidden');
}

function startEditQa(id) {
  const site = currentSite();
  if (!site) return;
  const entry = site.qaEntries.find(e => e.id === id);
  if (!entry) return;

  editingQaId = id;
  qaKeywordsInput.value = entry.keywords.join(', ');
  qaAnswerInput.value = entry.answer;
  qaFormTitle.textContent = 'Edit Q\u0026A Entry';
  saveQaBtn.textContent = 'Update Entry';
  cancelQaBtn.classList.remove('hidden');
  qaKeywordsInput.focus();
}

function saveQa() {
  const keywords = qaKeywordsInput.value
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);
  const answer = qaAnswerInput.value.trim();

  if (keywords.length === 0) {
    showMsg(qaStatus, 'Please enter at least one keyword.', 'error');
    qaKeywordsInput.focus();
    return;
  }
  if (!answer) {
    showMsg(qaStatus, 'Please enter an answer.', 'error');
    qaAnswerInput.focus();
    return;
  }

  // Ensure the site exists (auto-save site first if it was just being added)
  let site = currentSite();
  if (!site) {
    showMsg(qaStatus, 'Save the website details first.', 'error');
    siteDomainInput.focus();
    return;
  }

  if (!site.qaEntries) site.qaEntries = [];

  if (editingQaId) {
    const idx = site.qaEntries.findIndex(e => e.id === editingQaId);
    if (idx !== -1) site.qaEntries[idx] = { id: editingQaId, keywords, answer };
    showMsg(qaStatus, 'Entry updated.', 'success');
  } else {
    site.qaEntries.push({ id: uid(), keywords, answer });
    showMsg(qaStatus, 'Entry added.', 'success');
  }

  persistSites();
  resetQaForm();
  renderQaList();
}

function deleteQa(id) {
  const site = currentSite();
  if (!site) return;
  site.qaEntries = site.qaEntries.filter(e => e.id !== id);
  if (editingQaId === id) resetQaForm();
  persistSites();
  renderQaList();
}

// ── Event listeners ───────────────────────────────────────────────────────────

addSiteBtn.addEventListener('click', () => showEditSiteView(null));
backBtn.addEventListener('click', showSitesView);
saveSiteBtn.addEventListener('click', saveSite);
saveQaBtn.addEventListener('click', saveQa);
cancelQaBtn.addEventListener('click', resetQaForm);

// ── Init ──────────────────────────────────────────────────────────────────────

loadSites(() => renderSitesList());
