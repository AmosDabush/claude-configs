#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const MONDAY_DOMAIN = 'mohgov.monday.com';
const MONDAY_EMAIL = env.MONDAY_EMAIL;
const MONDAY_PASSWORD = env.MONDAY_PASSWORD;
const COOKIES_FILE = path.join(__dirname, 'monday-cookies.json');
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

async function loadCookies(context) {
  if (fs.existsSync(COOKIES_FILE)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
      await context.addCookies(cookies);
      return true;
    } catch (e) {
      console.log('Could not load saved cookies, will login fresh');
      return false;
    }
  }
  return false;
}

async function saveCookies(context) {
  const cookies = await context.cookies();
  fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  console.log('Session saved');
}

async function autoLogin(page) {
  console.log('Logging in to Monday.com...');

  // Go to Monday login page
  await page.goto(`https://${MONDAY_DOMAIN}`, { waitUntil: 'networkidle' });

  // Check if already logged in
  if (page.url().includes('/boards') || page.url().includes('/workspaces')) {
    console.log('Already logged in');
    return true;
  }

  // Wait for and fill email
  try {
    // Monday.com login flow - first enter email
    const emailInput = await page.waitForSelector('input[type="email"], input[name="email"], #user_email', { timeout: 10000 });
    await emailInput.fill(MONDAY_EMAIL);
    console.log('  Entered email');

    // Click next/continue button
    const nextButton = await page.$('button[type="submit"], button:has-text("Next"), button:has-text("Continue"), button:has-text("הבא")');
    if (nextButton) {
      await nextButton.click();
      await page.waitForTimeout(2000);
    }

    // Enter password
    const passwordInput = await page.waitForSelector('input[type="password"], input[name="password"], #user_password', { timeout: 10000 });
    await passwordInput.fill(MONDAY_PASSWORD);
    console.log('  Entered password');

    // Click login button
    const loginButton = await page.$('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), button:has-text("התחבר")');
    if (loginButton) {
      await loginButton.click();
    }

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(boards|workspaces|pulse)/, { timeout: 30000 });
    console.log('  Login successful!');

    return true;
  } catch (error) {
    console.error('Login failed:', error.message);
    // Take screenshot for debugging
    await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'login-error.png') });
    console.log('  Screenshot saved to downloads/login-error.png');
    return false;
  }
}

async function checkSession(page) {
  // Try to access Monday and see if we're logged in
  await page.goto(`https://${MONDAY_DOMAIN}`, { waitUntil: 'networkidle' });

  // Check if we're on a logged-in page
  const url = page.url();

  // Check URL patterns
  if (url.includes('/boards') || url.includes('/workspaces') || url.includes('/pulse')) {
    return true;
  }

  // Also check if dashboard elements are visible (logged in state)
  const dashboardElement = await page.$('.workspace-sidebar, [data-testid="home-page"], .monday-workspaces, .profile-avatar');
  if (dashboardElement) {
    return true;
  }

  // Check for greeting text
  const pageContent = await page.content();
  if (pageContent.includes('Good afternoon') || pageContent.includes('Good morning') || pageContent.includes('Good evening')) {
    return true;
  }

  // Check if login form is NOT present (means we're logged in)
  const loginForm = await page.$('input[type="email"], input[name="email"], #user_email');
  return !loginForm;
}

async function downloadDoc(page, docId, format = 'docx', itemName = '', bugId = '', metadata = null) {
  // Create filename: "C-541 - תיאור הבאג.pdf"
  const sanitizedName = itemName.replace(/[\/\\?%*:|"<>]/g, '').substring(0, 40);
  let filename;
  if (bugId && sanitizedName) {
    filename = `${bugId} - ${sanitizedName}.${format}`;
  } else if (bugId) {
    filename = `${bugId}.${format}`;
  } else {
    filename = `${docId}.${format}`;
  }
  const filepath = path.join(DOWNLOAD_DIR, filename);

  console.log(`Downloading doc ${docId} as ${format}...`);

  // First go to Monday home to reset state, then navigate to doc
  await page.goto(`https://${MONDAY_DOMAIN}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Navigate to the doc
  const docUrl = `https://${MONDAY_DOMAIN}/docs/${docId}`;
  try {
    await page.goto(docUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (navError) {
    // Ignore navigation errors, page might still load
    console.log('  Navigation warning (continuing):', navError.message.split('\n')[0]);
  }
  await page.waitForTimeout(5000);  // Initial wait

  // Wait for doc content to actually load - look for "Bug Description" or doc elements
  try {
    await page.waitForSelector('text=Bug Description, text=Item Name, .doc-content, [data-testid="doc-content"]', { timeout: 10000 });
    console.log('  Doc content loaded');
  } catch (e) {
    console.log('  Warning: Doc content selector not found, continuing anyway...');
  }

  await page.waitForTimeout(2000);

  // Close promotional popups (like Sidekick) but NOT the doc modal itself
  // Press Escape once to close any promo popup
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  // Try to close the Sidekick popup specifically if it exists
  try {
    const sidekickClose = await page.$('[data-testid="close-button"], button[aria-label="Close"]:visible');
    if (sidekickClose) {
      await sidekickClose.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {}

  await page.waitForTimeout(500);

  try {
    // Step 1: Click the "..." menu button
    console.log('  Looking for menu button...');

    // Click the "..." menu button at its expected position
    // Based on viewport 1280x800, the menu button is at x=1185, y=37
    await page.mouse.click(1185, 37);
    await page.waitForTimeout(1500);

    // For PDF: Use Print (better Hebrew support)
    // For others: Use Export submenu
    if (format === 'pdf') {
      console.log('  Using Print for PDF (better Hebrew support)...');

      // Click Print option (this opens print-friendly view)
      const printBtn = await page.locator('text=Print').first();
      await printBtn.click({ force: true });
      await page.waitForTimeout(3000); // Wait for print view to load

      // Generate doc PDF from print view
      const tempDocPath = filepath.replace('.pdf', '_doc.pdf');
      await page.emulateMedia({ media: 'print' });
      await page.pdf({ path: tempDocPath, format: 'A4', printBackground: true });

      // If we have metadata, create metadata page and merge
      if (metadata && Object.keys(metadata).length > 0) {
        console.log('  Creating metadata page...');

        // Priority columns to show
        const priorityFields = [
          'Dev Status', 'Assignee', 'Owner', 'Bug Severity',
          'Item Type', 'Priority', 'Reporter', 'Date',
          'QA Status', 'Bug Type', 'Prod/Test'
        ];

        // Build rows HTML with color coding
        const rows = priorityFields
          .filter(field => metadata[field])
          .map(field => {
            const value = metadata[field];
            let valueStyle = '';
            if (field === 'Dev Status') {
              if (value.includes('Done')) valueStyle = 'background:#00c875;color:white;padding:2px 8px;border-radius:3px;';
              else if (value.includes('Review')) valueStyle = 'background:#fdab3d;color:white;padding:2px 8px;border-radius:3px;';
              else if (value.includes('Progress')) valueStyle = 'background:#0086c0;color:white;padding:2px 8px;border-radius:3px;';
            }
            if (field === 'Bug Severity') {
              if (value === 'Critical') valueStyle = 'background:#e2445c;color:white;padding:2px 8px;border-radius:3px;';
              else if (value === 'High') valueStyle = 'background:#fdab3d;color:white;padding:2px 8px;border-radius:3px;';
              else if (value === 'Medium') valueStyle = 'background:#ffcb00;padding:2px 8px;border-radius:3px;';
              else if (value === 'Low') valueStyle = 'background:#00c875;color:white;padding:2px 8px;border-radius:3px;';
            }
            const valueHtml = valueStyle ? `<span style="${valueStyle}">${value}</span>` : value;
            return `<tr><td style="font-weight:bold;padding:8px 20px 8px 0;color:#555;white-space:nowrap;">${field}:</td><td style="padding:8px 0;">${valueHtml}</td></tr>`;
          })
          .join('');

        const metadataHtml = `
          <!DOCTYPE html>
          <html dir="rtl">
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                padding: 40px;
                margin: 0;
                direction: rtl;
              }
              .header { font-size: 28px; font-weight: bold; color: #333; margin-bottom: 10px; }
              .subheader { font-size: 16px; color: #666; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0; }
              table { font-size: 14px; border-collapse: collapse; }
            </style>
          </head>
          <body>
            <div class="header">${bugId || 'Item'}</div>
            <div class="subheader">${itemName}</div>
            <table>${rows}</table>
          </body>
          </html>
        `;

        // Create a new page with metadata HTML
        const metaPage = await page.context().newPage();
        await metaPage.setContent(metadataHtml);
        const metaPath = filepath.replace('.pdf', '_meta.pdf');
        await metaPage.pdf({ path: metaPath, format: 'A4', printBackground: true });
        await metaPage.close();

        // Merge: metadata first, then doc
        console.log('  Merging PDFs...');
        const { PDFDocument } = require('pdf-lib');
        const mergedPdf = await PDFDocument.create();

        const metaDoc = await PDFDocument.load(fs.readFileSync(metaPath));
        const docDoc = await PDFDocument.load(fs.readFileSync(tempDocPath));

        // Get page indices, skip last page if it's likely blank
        const docPageCount = docDoc.getPageCount();
        const docIndices = docPageCount > 1
          ? docDoc.getPageIndices().slice(0, -1)  // Skip last page
          : docDoc.getPageIndices();

        const metaPages = await mergedPdf.copyPages(metaDoc, metaDoc.getPageIndices());
        const docPages = await mergedPdf.copyPages(docDoc, docIndices);

        metaPages.forEach(p => mergedPdf.addPage(p));
        docPages.forEach(p => mergedPdf.addPage(p));

        fs.writeFileSync(filepath, await mergedPdf.save());

        // Cleanup temp files
        fs.unlinkSync(metaPath);
        fs.unlinkSync(tempDocPath);
      } else {
        // No metadata, just rename temp file
        fs.renameSync(tempDocPath, filepath);
      }

      console.log(`  ✓ Saved: ${filepath}`);
      return { success: true, path: filepath };

    } else {
      // Use Export for docx and md
      console.log('  Opening Export submenu...');
      const exportBtn = await page.locator('text=Export').first();
      await exportBtn.hover();
      await page.waitForTimeout(1000);

      // Select format from submenu
      const formatText = {
        'docx': 'Word (.docx)',
        'md': 'Markdown (.md)'
      };
      const targetFormat = formatText[format] || 'Word (.docx)';

      console.log(`  Clicking ${targetFormat}...`);

      // Set up download listener before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

      // Click on the format option
      const formatBtn = await page.locator(`text=${targetFormat}`).first();
      await formatBtn.click({ force: true });

      // Wait for download
      const download = await downloadPromise;
      await download.saveAs(filepath);

      console.log(`  ✓ Saved: ${filepath}`);
      return { success: true, path: filepath };
    }

  } catch (error) {
    console.log(`  Export failed: ${error.message}, falling back to screenshot...`);

    // Fallback to screenshot
    const screenshotPath = path.join(DOWNLOAD_DIR, `${sanitizedName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  ✓ Saved screenshot: ${screenshotPath}`);
    return { success: true, path: screenshotPath, type: 'screenshot' };
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    console.log(`
Monday.com Doc Downloader

Usage:
  node download-docs.js login                    - Test login and save session
  node download-docs.js <doc_id> [format]        - Download single doc by doc_id
  node download-docs.js --items <id1> <id2> ...  - Download docs for item IDs

Formats: pdf (default), md, docx

Examples:
  node download-docs.js login
  node download-docs.js 18393130723 pdf
  node download-docs.js --items 10847290328 10847912580 --format pdf
`);
    process.exit(0);
  }

  const browser = await chromium.launch({
    headless: true  // Run headless for automation
  });

  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 800 }  // Fixed viewport size
  });

  const page = await context.newPage();

  try {
    // Try to load existing cookies
    const hasCookies = await loadCookies(context);

    // Check if session is valid
    let isLoggedIn = false;
    if (hasCookies) {
      isLoggedIn = await checkSession(page);
    }

    // Login if needed
    if (!isLoggedIn) {
      if (!MONDAY_EMAIL || !MONDAY_PASSWORD) {
        console.error('No credentials configured. Add MONDAY_EMAIL and MONDAY_PASSWORD to .env');
        process.exit(1);
      }

      isLoggedIn = await autoLogin(page);
      if (isLoggedIn) {
        await saveCookies(context);
      } else {
        console.error('Could not log in to Monday.com');
        process.exit(1);
      }
    }

    if (args[0] === 'login') {
      // Just test login
      console.log('Login successful! Session saved.');

    } else if (args[0] === '--items') {
      // Download docs for multiple item IDs - each in separate browser instance (PARALLEL)
      const formatIdx = args.indexOf('--format');
      const format = formatIdx > -1 ? args[formatIdx + 1] : 'pdf';
      const originalMode = args.includes('--original');
      const itemIds = args.slice(1).filter(a => !a.startsWith('--') && a !== format);

      // Close the browser - we'll open fresh ones for each doc
      await browser.close();

      // Fetch item details from Monday API
      const mondayApi = require('./monday-api-lib.js');
      const { spawn } = require('child_process');

      // First fetch all items info in parallel (with metadata unless --original)
      console.log(`Fetching info for ${itemIds.length} items...`);
      const items = await Promise.all(itemIds.map(async (itemId) => {
        try {
          const item = await mondayApi.fetchItem(itemId, true); // always fetch all columns
          return { itemId, ...item };
        } catch (err) {
          return { itemId, error: err.message };
        }
      }));

      // Download function for a single item (quiet mode - no verbose output)
      const downloadItem = (item) => {
        return new Promise((resolve) => {
          if (item.error) {
            resolve({ itemId: item.itemId, success: false, error: item.error });
            return;
          }
          if (!item.docId) {
            resolve({ itemId: item.itemId, success: false, error: 'No doc attached' });
            return;
          }

          // Build args - include metadata unless --original
          const childArgs = [__filename, item.docId, format, item.bugId || '', item.name || ''];
          if (!originalMode && item.metadata) {
            childArgs.push('--metadata', JSON.stringify(item.metadata));
          }

          const child = spawn('node', childArgs, {
            cwd: __dirname,
            stdio: ['inherit', 'pipe', 'pipe']
          });

          let output = '';
          child.stdout.on('data', (data) => {
            output += data.toString();
            // Suppress verbose output - only capture for result parsing
          });
          child.stderr.on('data', (data) => {
            output += data.toString();
          });

          child.on('close', (code) => {
            const success = code === 0 && output.includes('✓ Saved');
            const pathMatch = output.match(/Saved: (.+\.(?:pdf|docx|md|png))/);
            resolve({
              itemId: item.itemId,
              name: item.name,
              bugId: item.bugId,
              success,
              path: pathMatch ? pathMatch[1] : null,
              error: success ? null : 'Download failed'
            });
          });
        });
      };

      // Stable batching - max 6 concurrent for Monday.com stability
      const MAX_PER_BATCH = 6;
      const batches = [];
      for (let i = 0; i < items.length; i += MAX_PER_BATCH) {
        batches.push(items.slice(i, Math.min(i + MAX_PER_BATCH, items.length)));
      }
      // Results: 6+5 achieves 11/11 success, more parallel causes timeouts

      const modeStr = originalMode ? ' (original)' : '';

      // Open downloads folder at start
      const { exec } = require('child_process');
      exec(`open "${DOWNLOAD_DIR}"`);

      // Simple clean header
      console.log(`\n📁 ~/.claude/skills/monday/downloads/`);
      console.log(`📋 ${items.length} docs${modeStr}\n`);

      // Show initial list
      items.forEach(item => {
        console.log(`  ○ ${item.bugId || item.itemId}`);
      });

      // Download with simple status updates
      const results = [];
      for (let batchNum = 0; batchNum < batches.length; batchNum++) {
        const batch = batches[batchNum];

        const batchResults = await Promise.all(batch.map(async (item) => {
          const id = item.bugId || item.itemId;
          const result = await downloadItem(item);
          const icon = result.success ? '✓' : '✗';
          console.log(`  ${icon} ${id}`);
          return result;
        }));

        results.push(...batchResults);
      }

      console.log('\n=== Summary ===');
      const succeeded = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      console.log(`Completed: ${succeeded} succeeded, ${failed} failed`);

      return; // Don't close browser again

    } else {
      // Download single doc by doc_id
      // Args: docId [format] [bugId] [itemName] [--metadata JSON]
      const docId = args[0];
      const format = args[1] || 'pdf';
      const bugId = args[2] || '';
      const itemName = args[3] || '';

      // Check for metadata JSON (passed from --items handler)
      const metaIdx = args.indexOf('--metadata');
      let metadata = null;
      if (metaIdx > -1 && args[metaIdx + 1]) {
        try {
          metadata = JSON.parse(args[metaIdx + 1]);
        } catch (e) {}
      }

      await downloadDoc(page, docId, format, itemName, bugId, metadata);
    }

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
