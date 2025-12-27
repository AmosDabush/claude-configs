#!/usr/bin/env node
/**
 * Screenshot to Telegram
 * Take screenshots of websites and send directly to Telegram
 *
 * Usage:
 *   node screenshot-to-telegram.js <url1> [url2] [url3] ...
 *   node screenshot-to-telegram.js https://ynet.co.il
 *   node screenshot-to-telegram.js https://mako.co.il https://walla.co.il
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { createBrowser, createSession } = require('./browser-lib.js');

// Telegram config
const BOT_TOKEN = '8266742407:AAFNIzK-5Q86cCwhwdblNhetDiSrVlllrdg';
const CHAT_ID = '402497072';

async function sendPhotoToTelegram(imagePath, caption) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const imageData = fs.readFileSync(imagePath);
    const filename = path.basename(imagePath);

    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${CHAT_ID}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`),
      imageData,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/sendPhoto`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function captureAndSend(urls) {
  const browser = await createBrowser();
  const { page } = await createSession(browser);
  const tempDir = '/tmp/screenshots';

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  for (const url of urls) {
    try {
      console.log(`Capturing ${url}...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3000);

      const filename = url.replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '_') + '.png';
      const filepath = path.join(tempDir, filename);

      await page.screenshot({ path: filepath, fullPage: false });
      console.log(`Sending to Telegram...`);

      await sendPhotoToTelegram(filepath, url);
      console.log(`Sent: ${url}`);

      // Cleanup
      fs.unlinkSync(filepath);
    } catch (err) {
      console.error(`Failed ${url}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('Done!');
}

// Main
const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.log('Usage: node screenshot-to-telegram.js <url1> [url2] ...');
  process.exit(1);
}

captureAndSend(urls);
