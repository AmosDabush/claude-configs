---
description: Shared Playwright browser automation utilities. Login to sites, scrape data, fill forms, download files.
---

# Browser Automation Skill

Use Playwright to automate browser tasks like logging into sites, scraping data, filling forms, and downloading files.

## Location

`~/.claude/skills/browser-automation/`

## Available Functions

| Function | Description |
|----------|-------------|
| `createBrowser(options)` | Launch browser (headless by default) |
| `createSession(browser, options)` | Create context with cookies support |
| `autoLogin(page, config)` | Generic login flow |
| `checkLogin(page, config)` | Check if logged in |
| `saveCookies(context, file)` | Save session cookies |
| `savePage(page, options)` | Save as PDF, screenshot, or HTML |
| `clickElement(page, selector)` | Wait for element and click |
| `fillField(page, selector, value)` | Fill form field |
| `extractText(page, selector)` | Extract text from elements |
| `waitForDownload(page, action, path)` | Trigger download and save |
| `loadEnv(path)` | Load .env file |

## Site Adapters

Site-specific logic in `adapters/` directory:
- `adapters/monday.js` - Monday.com automation

## Usage Examples

### Quick scrape
```javascript
const { createBrowser, createSession, extractText } = require('~/.claude/skills/browser-automation/browser-lib.js');

const browser = await createBrowser();
const { page } = await createSession(browser);
await page.goto('https://example.com');
const titles = await extractText(page, 'h1, h2');
console.log(titles);
await browser.close();
```

### Login and download
```javascript
const { createBrowser, createSession, autoLogin, savePage } = require('~/.claude/skills/browser-automation/browser-lib.js');

const browser = await createBrowser();
const { page } = await createSession(browser, { cookiesFile: './cookies.json' });

await autoLogin(page, {
  url: 'https://site.com/login',
  emailSelector: 'input[name="email"]',
  passwordSelector: 'input[name="password"]',
  submitSelector: 'button[type="submit"]',
  successPattern: /dashboard/,
  credentials: { email: 'user@example.com', password: 'xxx' }
});

await page.goto('https://site.com/report');
await savePage(page, { format: 'pdf', path: './report.pdf' });
await browser.close();
```

## Instructions for Claude

When user asks for browser automation tasks:

1. **Identify the task type:**
   - Scraping data from a website
   - Filling forms / submitting data
   - Downloading files from authenticated pages
   - Taking screenshots / generating PDFs

2. **Check if site adapter exists:**
   - Monday.com: Use `adapters/monday.js`
   - Other sites: Use generic `browser-lib.js` functions

3. **Write a script** in the appropriate skill directory or as a one-off:
   - For reusable tasks: Create new adapter in `adapters/`
   - For one-time tasks: Write inline script

4. **Handle credentials securely:**
   - Store in skill-specific `.env` files
   - Never hardcode passwords
   - Use `loadEnv()` function

## Dependencies

Playwright is installed in `~/.claude/skills/monday/node_modules/playwright`
(shared to avoid duplication)

pdf-lib for PDF manipulation is in same location.
