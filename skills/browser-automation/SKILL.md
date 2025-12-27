---
name: "browser-automation"
description: "Shared Playwright browser automation utilities. Login to sites, scrape data, fill forms, download files."
---

# Browser Automation Skill

Shared Playwright infrastructure for browser automation tasks.

## Capabilities

- **Login & Session Management** - Auto-login to sites, save/load cookies
- **Web Scraping** - Extract data from pages, even JavaScript-rendered content
- **Form Filling** - Automate form submissions
- **File Downloads** - Download files from authenticated pages
- **PDF Generation** - Save pages as PDF with print styling
- **Screenshots** - Capture full-page or element screenshots

## Installation

Playwright is installed in this skill's directory. Other skills can use it via:

```javascript
const browser = require('~/.claude/skills/browser-automation/browser-lib.js');
```

## Core Functions

### createBrowser(options)
Launch a browser instance.
- `headless` (default: true) - Run without visible window
- `viewport` - Window size (default: 1280x800)

### createSession(browser, options)
Create a browser context with optional saved cookies.
- `cookiesFile` - Path to load/save cookies
- `acceptDownloads` - Enable file downloads

### autoLogin(page, config)
Generic login flow.
- `url` - Login page URL
- `emailSelector` - Email input selector
- `passwordSelector` - Password input selector
- `submitSelector` - Submit button selector
- `successPattern` - URL pattern indicating successful login
- `credentials` - { email, password }

### savePage(page, options)
Save page content.
- `format` - 'pdf', 'screenshot', 'html'
- `path` - Output file path
- `fullPage` - Capture entire scrollable area

## Site-Specific Adapters

Each site can have its own adapter in `adapters/` directory:
- `adapters/monday.js` - Monday.com specifics
- `adapters/generic.js` - Generic site handler

## Usage Examples

### From Another Skill

```javascript
const { createBrowser, autoLogin, savePage } = require('~/.claude/skills/browser-automation/browser-lib.js');

async function downloadReport() {
  const browser = await createBrowser();
  const { context, page } = await createSession(browser, {
    cookiesFile: './my-cookies.json'
  });

  await autoLogin(page, {
    url: 'https://example.com/login',
    emailSelector: 'input[name="email"]',
    passwordSelector: 'input[name="password"]',
    submitSelector: 'button[type="submit"]',
    successPattern: /dashboard/,
    credentials: { email: 'user@example.com', password: 'xxx' }
  });

  await page.goto('https://example.com/report');
  await savePage(page, { format: 'pdf', path: './report.pdf' });

  await browser.close();
}
```

## Environment Variables

Credentials should be stored in each skill's own `.env` file, not here.
This skill provides the automation infrastructure only.

## Installed Dependencies

- playwright (with chromium)
- pdf-lib (for PDF manipulation)

## Changelog

| Date | Change |
|------|--------|
| 2024-12-26 | Initial creation - extracted from Monday skill |
