/**
 * Monday.com Browser Adapter
 * Site-specific logic for Monday.com automation
 */

const path = require('path');
const fs = require('fs');
const browserLib = require('../browser-lib.js');

const MONDAY_DOMAIN = 'mohgov.monday.com';

/**
 * Monday.com login configuration
 */
function getLoginConfig(credentials) {
  return {
    url: `https://${MONDAY_DOMAIN}`,
    emailSelector: 'input[type="email"], input[name="email"], #user_email',
    passwordSelector: 'input[type="password"], input[name="password"], #user_password',
    submitSelector: 'button[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), button:has-text("התחבר")',
    nextButtonSelector: 'button[type="submit"], button:has-text("Next"), button:has-text("Continue"), button:has-text("הבא")',
    successPattern: /\/(boards|workspaces|pulse)/,
    credentials,
    timeout: 30000
  };
}

/**
 * Check if logged in to Monday.com
 */
async function checkMondayLogin(page) {
  return await browserLib.checkLogin(page, {
    url: `https://${MONDAY_DOMAIN}`,
    loggedInPattern: /\/(boards|workspaces|pulse)/,
    loggedInSelector: '.workspace-sidebar, [data-testid="home-page"], .monday-workspaces, .profile-avatar',
    loggedOutSelector: 'input[type="email"], input[name="email"], #user_email'
  });
}

/**
 * Login to Monday.com with auto-detection
 */
async function loginToMonday(page, credentials, cookiesFile) {
  // Try existing session first
  if (cookiesFile) {
    const isLoggedIn = await checkMondayLogin(page);
    if (isLoggedIn) {
      console.log('Already logged in to Monday.com');
      return true;
    }
  }

  // Perform login
  const config = getLoginConfig(credentials);
  const success = await browserLib.autoLogin(page, config);

  // Save cookies on success
  if (success && cookiesFile) {
    await browserLib.saveCookies(page.context(), cookiesFile);
  }

  return success;
}

/**
 * Navigate to a Monday.com document
 */
async function navigateToDoc(page, docId) {
  // First go to Monday home to reset state
  await page.goto(`https://${MONDAY_DOMAIN}`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  });
  await page.waitForTimeout(2000);

  // Navigate to the doc
  const docUrl = `https://${MONDAY_DOMAIN}/docs/${docId}`;
  try {
    await page.goto(docUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (navError) {
    // Ignore navigation errors, page might still load
    console.log('  Navigation warning (continuing):', navError.message.split('\n')[0]);
  }

  await page.waitForTimeout(5000);

  // Wait for doc content
  try {
    await page.waitForSelector(
      'text=Bug Description, text=Item Name, .doc-content, [data-testid="doc-content"]',
      { timeout: 10000 }
    );
    console.log('  Doc content loaded');
  } catch (e) {
    console.log('  Warning: Doc content selector not found, continuing...');
  }

  await page.waitForTimeout(2000);

  // Close promotional popups
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  try {
    const closeBtn = await page.$('[data-testid="close-button"], button[aria-label="Close"]:visible');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {}
}

/**
 * Open the "..." menu in Monday doc view
 * Position is fixed based on viewport 1280x800
 */
async function openDocMenu(page) {
  console.log('  Looking for menu button...');
  await page.mouse.click(1185, 37);
  await page.waitForTimeout(1500);
}

/**
 * Download Monday doc as PDF using Print
 */
async function downloadAsPdf(page, outputPath) {
  console.log('  Using Print for PDF...');

  await openDocMenu(page);

  // Click Print option
  const printBtn = await page.locator('text=Print').first();
  await printBtn.click({ force: true });
  await page.waitForTimeout(3000);

  // Generate PDF
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: outputPath, format: 'A4', printBackground: true });

  return outputPath;
}

/**
 * Download Monday doc via Export menu
 */
async function downloadViaExport(page, outputPath, format) {
  const formatText = {
    'docx': 'Word (.docx)',
    'md': 'Markdown (.md)'
  };
  const targetFormat = formatText[format] || 'Word (.docx)';

  console.log('  Opening Export submenu...');
  await openDocMenu(page);

  const exportBtn = await page.locator('text=Export').first();
  await exportBtn.hover();
  await page.waitForTimeout(1000);

  console.log(`  Clicking ${targetFormat}...`);

  const savedPath = await browserLib.waitForDownload(
    page,
    async () => {
      const formatBtn = await page.locator(`text=${targetFormat}`).first();
      await formatBtn.click({ force: true });
    },
    outputPath,
    30000
  );

  return savedPath;
}

/**
 * Create metadata PDF page for Monday bug
 */
async function createMetadataPdf(page, metadata, bugId, itemName, outputPath) {
  const priorityFields = [
    'Dev Status', 'Assignee', 'Owner', 'Bug Severity',
    'Item Type', 'Priority', 'Reporter', 'Date',
    'QA Status', 'Bug Type', 'Prod/Test'
  ];

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

  const html = `
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

  const metaPage = await page.context().newPage();
  await metaPage.setContent(html);
  await metaPage.pdf({ path: outputPath, format: 'A4', printBackground: true });
  await metaPage.close();

  return outputPath;
}

/**
 * Merge metadata and doc PDFs
 */
async function mergePdfs(metaPath, docPath, outputPath) {
  // pdf-lib is in monday's node_modules
  const pdfLibPath = path.join(__dirname, '../../monday/node_modules/pdf-lib');
  const { PDFDocument } = require(pdfLibPath);

  const mergedPdf = await PDFDocument.create();

  const metaDoc = await PDFDocument.load(fs.readFileSync(metaPath));
  const docDoc = await PDFDocument.load(fs.readFileSync(docPath));

  // Skip last page of doc if likely blank
  const docPageCount = docDoc.getPageCount();
  const docIndices = docPageCount > 1
    ? docDoc.getPageIndices().slice(0, -1)
    : docDoc.getPageIndices();

  const metaPages = await mergedPdf.copyPages(metaDoc, metaDoc.getPageIndices());
  const docPages = await mergedPdf.copyPages(docDoc, docIndices);

  metaPages.forEach(p => mergedPdf.addPage(p));
  docPages.forEach(p => mergedPdf.addPage(p));

  fs.writeFileSync(outputPath, await mergedPdf.save());

  return outputPath;
}

module.exports = {
  MONDAY_DOMAIN,
  getLoginConfig,
  checkMondayLogin,
  loginToMonday,
  navigateToDoc,
  openDocMenu,
  downloadAsPdf,
  downloadViaExport,
  createMetadataPdf,
  mergePdfs
};
