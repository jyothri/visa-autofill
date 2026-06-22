# Chrome Extension: Security Question Autofill

## Overview
A Chrome extension (Manifest V3) that automatically fills in security question answers on `atlasauth.b2clogin.com`. Users manage their Q&A pairs via an options/popup page; answers are stored in Chrome extension storage.

---

## File Structure

```
autofill/
├── manifest.json          # Extension manifest (MV3)
├── content.js             # Content script injected into target page
├── popup.html             # Extension toolbar popup UI
├── popup.js               # Popup logic
├── options.html           # Full options page for managing Q&A pairs
├── options.js             # Options page logic
├── styles/
│   ├── popup.css
│   └── options.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Component Breakdown

### 1. `manifest.json`
- Manifest Version: 3
- Permissions: `storage`, `activeTab`
- Host permissions: `https://atlasauth.b2clogin.com/*`
- Content scripts: inject `content.js` on `https://atlasauth.b2clogin.com/*`
- Action: popup via `popup.html`
- Options page: `options.html`

### 2. Chrome Storage Schema
Stored under `chrome.storage.local` key `sites`:

```json
[
  {
    "id": "uid",
    "domain": "atlasauth.b2clogin.com",
    "username": "john@example.com",
    "qaEntries": [
      { "id": "uid", "keywords": ["first company", "worked for"], "answer": "Acme Corp" },
      { "id": "uid", "keywords": ["first job", "city", "town"], "answer": "New York" }
    ]
  }
]
```

Each site contains:
- `id`: unique identifier
- `domain`: hostname to match (e.g. `atlasauth.b2clogin.com`); supports subdomain match
- `username`: optional — if set, autofill only runs when this username is detected on the page (case-insensitive exact match)
- `qaEntries`: array of Q&A pairs, each with `keywords` and `answer`

### 3. `content.js` — Content Script
**Injection**: Runs at `document_idle` on `atlasauth.b2clogin.com`

**Algorithm**:
1. Query all `<p class="textInParagraph">` elements on the page
2. For each question element:
   a. Extract question text (from `textContent` or `aria-label`)
   b. Load Q&A entries from `chrome.storage.local`
   c. Find first entry where ANY keyword matches (case-insensitive substring match)
   d. If match found: locate the next sibling `<li>` containing `<input type="password">` and set its value
3. Dispatch native `input` and `change` events on each filled input (required for React/Angular form detection)
4. Use `MutationObserver` as fallback if elements are not present at `document_idle` (B2C pages may load dynamically)

**DOM Traversal**:
```
<p class="textInParagraph" id="kbq2aReadOnly"> ← question text here
  ↓ parent <li>
    → next sibling <li>
      → <input type="password"> ← fill answer here
```

### 4. `options.html` + `options.js` — Q&A Management UI
**Features**:
- List all saved Q&A entries
- Add new entry: enter question keywords (comma-separated) + answer
- Edit existing entry
- Delete entry
- Save button persists to `chrome.storage.local`

**UI Layout**:
```
[ Security Question Autofill - Settings ]

Saved Entries:
┌─────────────────────────────────────────────┐
│ Keywords: first company, worked for         │
│ Answer: ••••••••  [Edit] [Delete]           │
├─────────────────────────────────────────────┤
│ Keywords: first job, city                   │
│ Answer: ••••••••  [Edit] [Delete]           │
└─────────────────────────────────────────────┘

[ + Add New Entry ]

Add / Edit Entry:
  Keywords (comma-separated): [________________]
  Answer:                     [________________]
  [Save Entry]  [Cancel]
```

### 5. `popup.html` + `popup.js` — Toolbar Popup
**Features**:
- Quick status: show how many Q&A pairs are configured
- Button to open full options page
- Toggle to enable/disable autofill

---

## Implementation Steps

1. **Create `manifest.json`** with MV3 structure, host permissions, content script, popup, and options page
2. **Create `content.js`** with storage load, keyword matching, DOM traversal, and input filling logic
3. **Create `options.html` + `options.js`** with CRUD UI for Q&A pairs
4. **Create `popup.html` + `popup.js`** with status display and link to options
5. **Add CSS styles** for options and popup pages
6. **Add placeholder icons** (can use simple colored squares initially)
7. **Test** by loading as unpacked extension in Chrome and navigating to the target page

---

## Keyword Matching Logic

```
function findMatchingAnswer(questionText, entries) {
  const lowerQuestion = questionText.toLowerCase();
  for (const entry of entries) {
    const matched = entry.keywords.some(kw =>
      lowerQuestion.includes(kw.toLowerCase().trim())
    );
    if (matched) return entry.answer;
  }
  return null;
}
```

---

## Edge Cases
- **No match found**: skip that question silently
- **Dynamic page load**: use `MutationObserver` to watch for question elements being added to DOM
- **Multiple matching entries**: use first match (entries are ordered by user)
- **Empty keywords**: skip entries with no keywords
- **Answer visibility**: answers are stored in plain text in `chrome.storage.local` (local device only, not synced)
