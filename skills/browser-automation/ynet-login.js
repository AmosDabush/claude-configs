#!/usr/bin/env node
/**
 * Open ynet in visible browser to accept cookies manually
 * Run once, accept cookies, then cookies will be saved for future use
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const COOKIES_FILE = path.join(__dirname, "ynet-cookies.json");

(async () => {
  console.log("Opening ynet in visible browser...");
  console.log("Please accept the cookie/privacy popup when it appears.");
  console.log("Then press Enter here to save cookies and close.\n");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
  });

  const page = await context.newPage();
  await page.goto("https://www.ynet.co.il");

  // Wait for user to accept cookies
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", async () => {
    // Save cookies
    const cookies = await context.cookies();
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
    console.log("\nCookies saved to: " + COOKIES_FILE);
    console.log("Saved " + cookies.length + " cookies");

    await browser.close();
    process.exit(0);
  });
})();
