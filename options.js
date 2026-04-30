// options.js

let entries = [];
let editingId = null;

const entriesList = document.getElementById('entries-list');
const keywordsInput = document.getElementById('keywords-input');
const answerInput = document.getElementById('answer-input');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');
const formStatus = document.getElementById('form-status');

function loadEntries() {
  chrome.storage.local.get('qaEntries', result => {
    entries = result.qaEntries || [];
    renderEntries();
  });
}

function saveEntries() {
  chrome.storage.local.set({ qaEntries: entries });
}

function renderEntries() {
  entriesList.innerHTML = '';

  if (entries.length === 0) {
    entriesList.innerHTML = '<p class="empty-state">No entries yet. Add one below.</p>';
    return;
  }

  entries.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.dataset.id = entry.id;

    const keywordsDisplay = entry.keywords.join(', ') || '(no keywords)';
    const maskedAnswer = '•'.repeat(Math.min(entry.answer.length, 12));

    card.innerHTML = `
      <div class="entry-info">
        <div class="entry-keywords"><strong>Keywords:</strong> ${escapeHtml(keywordsDisplay)}</div>
        <div class="entry-answer"><strong>Answer:</strong> <span class="masked">${maskedAnswer}</span></div>
      </div>
      <div class="entry-actions">
        <button class="btn btn-secondary btn-sm edit-btn" data-id="${entry.id}">Edit</button>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${entry.id}">Delete</button>
      </div>
    `;

    entriesList.appendChild(card);
  });

  // Attach event listeners
  entriesList.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => startEdit(btn.dataset.id));
  });
  entriesList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteEntry(btn.dataset.id));
  });
}

function startEdit(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;

  editingId = id;
  keywordsInput.value = entry.keywords.join(', ');
  answerInput.value = entry.answer;
  formTitle.textContent = 'Edit Entry';
  saveBtn.textContent = 'Update Entry';
  cancelBtn.style.display = 'inline-block';
  clearStatus();
  keywordsInput.focus();
}

function cancelEdit() {
  editingId = null;
  keywordsInput.value = '';
  answerInput.value = '';
  formTitle.textContent = 'Add New Entry';
  saveBtn.textContent = 'Save Entry';
  cancelBtn.style.display = 'none';
  clearStatus();
}

function deleteEntry(id) {
  entries = entries.filter(e => e.id !== id);
  saveEntries();
  renderEntries();
  if (editingId === id) cancelEdit();
  showStatus('Entry deleted.', 'success');
}

function handleSave() {
  const keywords = keywordsInput.value
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);
  const answer = answerInput.value.trim();

  if (keywords.length === 0) {
    showStatus('Please enter at least one keyword.', 'error');
    keywordsInput.focus();
    return;
  }
  if (!answer) {
    showStatus('Please enter an answer.', 'error');
    answerInput.focus();
    return;
  }

  if (editingId) {
    const idx = entries.findIndex(e => e.id === editingId);
    if (idx !== -1) {
      entries[idx] = { id: editingId, keywords, answer };
    }
    showStatus('Entry updated.', 'success');
  } else {
    entries.push({ id: String(Date.now()), keywords, answer });
    showStatus('Entry saved.', 'success');
  }

  saveEntries();
  renderEntries();
  cancelEdit();
}

function showStatus(msg, type) {
  formStatus.textContent = msg;
  formStatus.className = 'status-msg ' + type;
  setTimeout(clearStatus, 3000);
}

function clearStatus() {
  formStatus.textContent = '';
  formStatus.className = 'status-msg';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

saveBtn.addEventListener('click', handleSave);
cancelBtn.addEventListener('click', cancelEdit);

loadEntries();
