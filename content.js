// content.js

function matchesDomain(siteDomain, hostname) {
  return hostname === siteDomain || hostname.endsWith('.' + siteDomain);
}

// Returns the username value currently visible/filled on the page.
// Checks common input patterns and read-only/disabled fields.
function detectUsernameOnPage() {
  const candidates = [];

  // Priority 1: email inputs with a value
  document.querySelectorAll('input[type="email"]').forEach(el => {
    if (el.value && el.value.trim()) candidates.push(el.value.trim());
  });

  // Priority 2: text inputs with common username/email id or name attributes
  document.querySelectorAll('input[type="text"]').forEach(el => {
    if (!el.value || !el.value.trim()) return;
    const key = ((el.id || '') + ' ' + (el.name || '')).toLowerCase();
    if (/user|email|login|account/.test(key)) {
      candidates.push(el.value.trim());
    }
  });

  // Priority 3: any readonly or disabled input with a value (pre-filled usernames)
  document.querySelectorAll('input[readonly], input[disabled]').forEach(el => {
    if (el.value && el.value.trim()) candidates.push(el.value.trim());
  });

  return candidates;
}

function usernameMatches(storedUsername, pageCandidates) {
  const lower = storedUsername.toLowerCase();
  return pageCandidates.some(c => c.toLowerCase() === lower);
}

function findMatchingAnswer(questionText, qaEntries) {
  const lower = questionText.toLowerCase();
  for (const entry of qaEntries) {
    if (!entry.keywords || entry.keywords.length === 0) continue;
    const matched = entry.keywords.some(kw => {
      const trimmed = kw.toLowerCase().trim();
      return trimmed.length > 0 && lower.includes(trimmed);
    });
    if (matched) return entry.answer;
  }
  return null;
}

function fillNativeInput(input, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  );
  if (nativeSetter && nativeSetter.set) {
    nativeSetter.set.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function tryAutofill(qaEntries) {
  const questionElements = document.querySelectorAll('p.textInParagraph');
  if (questionElements.length === 0) return false;

  let filledCount = 0;

  questionElements.forEach(questionEl => {
    const questionText =
      questionEl.getAttribute('aria-label') ||
      questionEl.textContent ||
      '';

    const answer = findMatchingAnswer(questionText, qaEntries);
    if (!answer) return;

    const questionLi = questionEl.closest('li');
    if (!questionLi) return;

    const answerLi = questionLi.nextElementSibling;
    if (!answerLi) return;

    const input = answerLi.querySelector('input[type="password"]');
    if (!input) return;

    fillNativeInput(input, answer);
    filledCount++;
  });

  return filledCount > 0;
}

// Picks the first matching site config for the current page, re-detecting
// the username each time it is called so it works even when the username
// field is populated by the page's own JavaScript after document_idle.
function pickMatchingSite(matchingSites) {
  for (const site of matchingSites) {
    const configuredUsername = site.username && site.username.trim();

    if (configuredUsername) {
      const pageCandidates = detectUsernameOnPage();
      if (!usernameMatches(configuredUsername, pageCandidates)) continue;
    }

    const qaEntries = site.qaEntries || [];
    if (qaEntries.length === 0) continue;

    return qaEntries;
  }
  return null;
}

function autofillWithObserver(matchingSites) {
  // Try immediately — username fields may already be in the DOM.
  const qaEntries = pickMatchingSite(matchingSites);
  if (qaEntries && tryAutofill(qaEntries)) return;

  const observer = new MutationObserver(() => {
    // Re-run site selection on every mutation so that a username field
    // appearing dynamically is detected before attempting to fill.
    const entries = pickMatchingSite(matchingSites);
    if (entries && tryAutofill(entries)) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 15000);
}

// Main: load sites, find those matching this page's hostname.
chrome.storage.local.get('sites', result => {
  const sites = result.sites || [];
  const hostname = window.location.hostname;

  const matchingSites = sites.filter(site => matchesDomain(site.domain, hostname));
  if (matchingSites.length === 0) return;

  autofillWithObserver(matchingSites);
});
