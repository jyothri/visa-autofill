// popup.js

const statusText = document.getElementById('status-text');
const openOptionsBtn = document.getElementById('open-options');

chrome.storage.local.get('sites', result => {
  const sites = result.sites || [];
  if (sites.length === 0) {
    statusText.textContent = 'No websites configured.';
  } else {
    const totalQa = sites.reduce((sum, s) => sum + (s.qaEntries || []).length, 0);
    statusText.textContent = `${sites.length} site${sites.length === 1 ? '' : 's'}, ${totalQa} Q&A entr${totalQa === 1 ? 'y' : 'ies'}.`;
  }
});

openOptionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
