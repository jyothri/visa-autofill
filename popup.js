// popup.js

const statusText = document.getElementById('status-text');
const openOptionsBtn = document.getElementById('open-options');

chrome.storage.local.get('qaEntries', result => {
  const entries = result.qaEntries || [];
  if (entries.length === 0) {
    statusText.textContent = 'No entries configured.';
  } else {
    statusText.textContent = `${entries.length} Q&A entr${entries.length === 1 ? 'y' : 'ies'} configured.`;
  }
});

openOptionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
