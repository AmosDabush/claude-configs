#!/usr/bin/env node
const { chromium } = require("playwright");
const https = require("https");
const fs = require("fs");

const BOT_TOKEN = "8266742407:AAFNIzK-5Q86cCwhwdblNhetDiSrVlllrdg";
const CHAT_ID = "402497072";

async function sendPhoto(imagePath, caption) {
  return new Promise((resolve, reject) => {
    const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
    const imageData = fs.readFileSync(imagePath);
    const body = Buffer.concat([
      Buffer.from("--" + boundary + '\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n' + CHAT_ID + "\r\n"),
      Buffer.from("--" + boundary + '\r\nContent-Disposition: form-data; name="caption"\r\n\r\n' + caption + "\r\n"),
      Buffer.from("--" + boundary + '\r\nContent-Disposition: form-data; name="photo"; filename="screenshot.png"\r\nContent-Type: image/png\r\n\r\n'),
      imageData,
      Buffer.from("\r\n--" + boundary + "--\r\n")
    ]);
    const req = https.request({
      hostname: "api.telegram.org",
      port: 443,
      path: "/bot" + BOT_TOKEN + "/sendPhoto",
      method: "POST",
      headers: { "Content-Type": "multipart/form-data; boundary=" + boundary, "Content-Length": body.length }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    locale: "he-IL"
  });

  // Set cookies to accept privacy policy
  await context.addCookies([
    { name: "gdpr", value: "1", domain: ".ynet.co.il", path: "/" },
    { name: "consent", value: "true", domain: ".ynet.co.il", path: "/" }
  ]);

  const page = await context.newPage();

  console.log("Opening ynet...");
  await page.goto("https://www.ynet.co.il", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(5000);

  await page.screenshot({ path: "/tmp/ynet_mobile_home.png", fullPage: false });
  await sendPhoto("/tmp/ynet_mobile_home.png", "Ynet Mobile - Homepage");
  console.log("Homepage sent");

  // Find first real article
  const articleUrl = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a"));
    for (const link of links) {
      const href = link.href || "";
      const isBadLink = href.includes("privacy") || href.includes("contact") || href.includes("terms");
      if (href.includes("/article/") && !isBadLink) {
        return href;
      }
    }
    return null;
  });

  console.log("Found: " + articleUrl);

  if (articleUrl) {
    await page.goto(articleUrl, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(5000);

    const finalUrl = page.url();
    const title = await page.title();
    console.log("Final URL: " + finalUrl);
    console.log("Title: " + title);

    await page.screenshot({ path: "/tmp/ynet_mobile_article.png", fullPage: false });
    await sendPhoto("/tmp/ynet_mobile_article.png", title.substring(0, 50));
    console.log("Article sent");
  }

  await browser.close();
  console.log("Done!");
})();
