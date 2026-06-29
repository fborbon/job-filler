# Job Filler — Firefox Extension

Autofill job application forms in one click. Stores your profile locally and injects it into any form — text fields, dropdowns, and file uploads.

## Features

- **Smart field detection** — matches fields by `id`, `name`, `placeholder`, `aria-label`, `<label>` text, `autocomplete`, and `data-automation-id` (Workday)
- **All common fields** — first/last name, full name, email, phone (split country code + number), address, city, province/state, country, LinkedIn, GitHub, website, pronoun, availability, cover letter text
- **PDF injection** — uploads your CV and cover letter directly into file inputs via `DataTransfer` — no drag-and-drop needed
- **Dropdown support** — fills `<select>` elements (country, state, pronoun) by matching option text
- **Framework-compatible** — uses the native value setter + synthetic events so React / Angular / Vue apps detect the changes
- **Persistent window** — opens as a detached popup that stays open when file dialogs appear

## Tested platforms

Greenhouse · Lever · Workday · LinkedIn Easy Apply · Ashby · and any standard HTML form

## Install

### Temporary (any Firefox)

1. Clone or download this repo
2. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on…**
3. Select `manifest.json`

The extension resets on browser restart. Re-load it from `about:debugging` each time.

### Permanent (no signing required)

Use **Firefox Developer Edition** or **Firefox Nightly** — both allow unsigned extensions without extra configuration. Install via `about:addons` → ⚙️ → **Install Add-on From File…** and select the built `.xpi`.

## Setup

1. Click the **Job Filler** toolbar icon — a small window opens
2. Fill in your profile (personal info, links, documents)
3. Upload your CV and cover letter PDFs
4. Click **Save Profile**

Your data is stored entirely in `browser.storage.local` — nothing is sent anywhere.

## Usage

Open a job application, click the toolbar icon, then click **Autofill Page**. Matched fields are highlighted green for 2 seconds. The status bar shows how many fields were filled.

## Build

```bash
npx web-ext build --source-dir . --artifacts-dir dist
```

Requires [web-ext](https://github.com/mozilla/web-ext).

## Project structure

```
job-filler/
├── manifest.json          # Extension manifest (MV2)
├── background/
│   └── background.js      # Opens detached popup window; seeds default profile on install
├── content/
│   └── autofill.js        # Field detection + filling logic (injected into every page)
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js           # Profile storage and autofill trigger
└── icons/
    └── icon.svg
```

## License

MIT
