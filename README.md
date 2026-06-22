# Form Autofill — Chrome Extension

A Chrome extension (Manifest V3) that automatically fills security question answers on configured websites. Answers are stored locally on your device and never synced to the cloud.

## Features

- Automatically fills security question answer fields on target pages
- Matches questions by configurable keywords (e.g. "first company", "city you grew up in")
- Optional per-site username filtering — only autofills when the configured username is detected on the page
- Works with dynamically loaded pages via `MutationObserver`
- Compatible with React/Angular forms (dispatches native `input`/`change` events)

## Supported Sites

- `atlasauth.b2clogin.com`
- `usvisascheduling.com`

Additional sites can be added via the options page.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `autofill/` directory.
5. The extension icon will appear in your toolbar.

## Usage

1. Click the extension icon and open **Settings** (or right-click → Options).
2. Add one or more Q&A entries:
   - **Keywords**: comma-separated words/phrases that appear in the security question (e.g. `first company, worked for`)
   - **Answer**: the answer to fill in automatically
3. Optionally set a **username** per site so the extension only autofills for that account.
4. Navigate to a configured site — answers are filled automatically when question fields appear.

## Project Structure

```
autofill/
├── manifest.json       # Extension manifest (MV3)
├── content.js          # Content script: keyword matching and DOM filling
├── popup.html/js       # Toolbar popup: status and link to settings
├── options.html/js     # Full settings page: manage Q&A entries per site
├── styles/
│   ├── popup.css
│   └── options.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Storage Schema

Data is stored in `chrome.storage.local` under the key `sites`:

```json
[
  {
    "id": "unique-id",
    "domain": "atlasauth.b2clogin.com",
    "username": "john@example.com",
    "qaEntries": [
      { "id": "uid", "keywords": ["first company", "worked for"], "answer": "Acme Corp" },
      { "id": "uid", "keywords": ["city", "grew up"], "answer": "New York" }
    ]
  }
]
```

- `username` is optional — omit to autofill regardless of which account is shown.
- `keywords` are matched as case-insensitive substrings against the question text.
- The first matching entry wins; order your entries accordingly.

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Save and load Q&A entries locally |
| `activeTab` | Read the current tab's domain |
| Host permissions | Inject content script on target sites |
