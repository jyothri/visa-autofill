// content.js — injected into atlasauth.b2clogin.com

function findMatchingAnswer(questionText, entries) {
  const lower = questionText.toLowerCase();
  for (const entry of entries) {
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
  // Use native input setter to work with React/Angular controlled inputs
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

function tryAutofill(entries) {
  // Find all security question paragraphs
  const questionElements = document.querySelectorAll('p.textInParagraph');
  if (questionElements.length === 0) return false;

  let filledCount = 0;

  questionElements.forEach(questionEl => {
    const questionText =
      questionEl.getAttribute('aria-label') ||
      questionEl.textContent ||
      '';

    const answer = findMatchingAnswer(questionText, entries);
    if (!answer) return;

    // The input is in the next sibling <li> of the question's parent <li>
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

function autofillWithObserver(entries) {
  // Try immediately in case elements are already in the DOM
  if (tryAutofill(entries)) return;

  // Fall back to MutationObserver for dynamically loaded pages
  const observer = new MutationObserver(() => {
    if (tryAutofill(entries)) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Stop observing after 15 seconds to avoid memory leaks
  setTimeout(() => observer.disconnect(), 15000);
}

// Load Q&A entries from storage and trigger autofill
chrome.storage.local.get('qaEntries', result => {
  const entries = result.qaEntries || [];
  if (entries.length === 0) return;
  autofillWithObserver(entries);
});
