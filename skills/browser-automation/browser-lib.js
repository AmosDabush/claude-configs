#!/usr/bin/env node
/**
 * Browser Automation Library
 * Shared Playwright utilities for browser automation tasks
 */

const fs = require('fs');
const path = require('path');

// Playwright is installed in monday skill for now - we'll use it from there
// This allows us to share without duplicating the large playwright installation
const PLAYWRIGHT_PATH = path.join(__dirname, '../monday/node_modules/playwright');
const { chromium } = require(PLAYWRIGHT_PATH);

/**
 * Create a browser instance
 * @param {Object} options
 * @param {boolean} options.headless - Run without visible window (default: true)
 * @param {Object} options.viewport - Window size (default: { width: 1280, height: 800 })
 * @returns {Promise<Browser>}
 */
async function createBrowser(options = {}) {
  const { headless = true } = options;

  return await chromium.launch({ headless });
}

/**
 * Create a browser context with session support
 * @param {Browser} browser
 * @param {Object} options
 * @param {string} options.cookiesFile - Path to save/load cookies
 * @param {boolean} options.acceptDownloads - Enable file downloads (default: true)
 * @param {Object} options.viewport - Window size
 * @returns {Promise<{context: BrowserContext, page: Page}>}
 */
async function createSession(browser, options = {}) {
  const {
    cookiesFile,
    acceptDownloads = true,
    viewport = { width: 1280, height: 800 }
  } = options;

  const context = await browser.newContext({
    acceptDownloads,
    viewport
  });

  // Load cookies if file exists
  if (cookiesFile && fs.existsSync(cookiesFile)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiesFile, 'utf8'));
      await context.addCookies(cookies);
    } catch (e) {
      console.log('Could not load cookies:', e.message);
    }
  }

  const page = await context.newPage();

  return { context, page };
}

/**
 * Save cookies from context to file
 * @param {BrowserContext} context
 * @param {string} cookiesFile
 */
async function saveCookies(context, cookiesFile) {
  const cookies = await context.cookies();
  fs.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2));
}

/**
 * Check if user is logged in by testing URL patterns or selectors
 * @param {Page} page
 * @param {Object} config
 * @param {string} config.url - URL to navigate to for checking
 * @param {RegExp|string} config.loggedInPattern - URL pattern when logged in
 * @param {string} config.loggedInSelector - Element that exists when logged in
 * @param {string} config.loggedOutSelector - Element that exists when logged out (login form)
 * @returns {Promise<boolean>}
 */
async function checkLogin(page, config) {
  const { url, loggedInPattern, loggedInSelector, loggedOutSelector } = config;

  if (url) {
    await page.goto(url, { waitUntil: 'networkidle' });
  }

  // Check URL pattern
  if (loggedInPattern) {
    const currentUrl = page.url();
    if (typeof loggedInPattern === 'string') {
      if (currentUrl.includes(loggedInPattern)) return true;
    } else if (loggedInPattern.test(currentUrl)) {
      return true;
    }
  }

  // Check for logged-in element
  if (loggedInSelector) {
    const element = await page.$(loggedInSelector);
    if (element) return true;
  }

  // Check for logged-out element (login form)
  if (loggedOutSelector) {
    const loginForm = await page.$(loggedOutSelector);
    return !loginForm;
  }

  return false;
}

/**
 * Generic auto-login flow
 * @param {Page} page
 * @param {Object} config
 * @param {string} config.url - Login page URL
 * @param {string} config.emailSelector - Email/username input selector
 * @param {string} config.passwordSelector - Password input selector
 * @param {string} config.submitSelector - Submit button selector
 * @param {string} config.nextButtonSelector - "Next" button after email (for 2-step flows)
 * @param {RegExp|string} config.successPattern - URL pattern indicating success
 * @param {Object} config.credentials - { email, password }
 * @param {number} config.timeout - Timeout in ms (default: 30000)
 * @returns {Promise<boolean>}
 */
async function autoLogin(page, config) {
  const {
    url,
    emailSelector,
    passwordSelector,
    submitSelector,
    nextButtonSelector,
    successPattern,
    credentials,
    timeout = 30000
  } = config;

  console.log('Logging in...');

  try {
    // Navigate to login page
    await page.goto(url, { waitUntil: 'networkidle' });

    // Fill email
    const emailInput = await page.waitForSelector(emailSelector, { timeout: 10000 });
    await emailInput.fill(credentials.email);
    console.log('  Entered email');

    // Click next button if 2-step flow
    if (nextButtonSelector) {
      const nextButton = await page.$(nextButtonSelector);
      if (nextButton) {
        await nextButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Fill password
    const passwordInput = await page.waitForSelector(passwordSelector, { timeout: 10000 });
    await passwordInput.fill(credentials.password);
    console.log('  Entered password');

    // Submit
    const submitButton = await page.$(submitSelector);
    if (submitButton) {
      await submitButton.click();
    }

    // Wait for success
    await page.waitForURL(successPattern, { timeout });
    console.log('  Login successful!');

    return true;
  } catch (error) {
    console.error('Login failed:', error.message);
    return false;
  }
}

/**
 * Save page content in various formats
 * @param {Page} page
 * @param {Object} options
 * @param {string} options.format - 'pdf', 'screenshot', 'html'
 * @param {string} options.path - Output file path
 * @param {boolean} options.fullPage - Capture entire scrollable area (for screenshots)
 * @param {string} options.paperFormat - PDF paper size (default: 'A4')
 * @param {boolean} options.printBackground - Include backgrounds in PDF (default: true)
 * @returns {Promise<string>} - Path to saved file
 */
async function savePage(page, options) {
  const {
    format = 'pdf',
    path: outputPath,
    fullPage = true,
    paperFormat = 'A4',
    printBackground = true
  } = options;

  switch (format) {
    case 'pdf':
      await page.emulateMedia({ media: 'print' });
      await page.pdf({
        path: outputPath,
        format: paperFormat,
        printBackground
      });
      break;

    case 'screenshot':
      await page.screenshot({
        path: outputPath,
        fullPage
      });
      break;

    case 'html':
      const content = await page.content();
      fs.writeFileSync(outputPath, content);
      break;

    default:
      throw new Error(`Unknown format: ${format}`);
  }

  return outputPath;
}

/**
 * Wait for element and click it
 * @param {Page} page
 * @param {string} selector - Element selector
 * @param {Object} options
 * @param {number} options.timeout - Wait timeout (default: 10000)
 * @param {boolean} options.force - Force click even if not visible
 */
async function clickElement(page, selector, options = {}) {
  const { timeout = 10000, force = false } = options;

  const element = await page.waitForSelector(selector, { timeout });
  await element.click({ force });
}

/**
 * Fill a form field
 * @param {Page} page
 * @param {string} selector - Input selector
 * @param {string} value - Value to fill
 * @param {Object} options
 * @param {boolean} options.clear - Clear field first (default: true)
 */
async function fillField(page, selector, value, options = {}) {
  const { clear = true } = options;

  const input = await page.waitForSelector(selector);
  if (clear) {
    await input.fill('');
  }
  await input.fill(value);
}

/**
 * Extract text content from elements
 * @param {Page} page
 * @param {string} selector - Elements selector
 * @returns {Promise<string[]>}
 */
async function extractText(page, selector) {
  return await page.$$eval(selector, elements =>
    elements.map(el => el.textContent?.trim()).filter(Boolean)
  );
}

/**
 * Wait for download and save it
 * @param {Page} page
 * @param {Function} triggerAction - Async function that triggers the download
 * @param {string} savePath - Path to save the downloaded file
 * @param {number} timeout - Download timeout (default: 30000)
 * @returns {Promise<string>} - Path to saved file
 */
async function waitForDownload(page, triggerAction, savePath, timeout = 30000) {
  const downloadPromise = page.waitForEvent('download', { timeout });

  await triggerAction();

  const download = await downloadPromise;
  await download.saveAs(savePath);

  return savePath;
}

/**
 * Load environment variables from a file
 * @param {string} envPath - Path to .env file
 * @returns {Object} - Key-value pairs
 */
function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const env = {};
  const content = fs.readFileSync(envPath, 'utf8');

  content.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });

  return env;
}

module.exports = {
  createBrowser,
  createSession,
  saveCookies,
  checkLogin,
  autoLogin,
  savePage,
  clickElement,
  fillField,
  extractText,
  waitForDownload,
  loadEnv,
  // Re-export chromium for advanced usage
  chromium
};
