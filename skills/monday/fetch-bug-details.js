const https = require("https");
const fs = require("fs");
const path = require("path");

const envPath = path.join(process.env.HOME, ".claude/skills/monday/.env");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join("=").trim();
  }
});

const docIds = process.argv.slice(2);
if (docIds.length === 0) {
  console.log("Usage: node fetch-bug-details.js <doc_id1> <doc_id2> ...");
  process.exit(1);
}

const query = `{docs(object_ids: [${docIds.join(",")}]) { id name blocks { type content } }}`;

const postData = JSON.stringify({ query });
const options = {
  hostname: "api.monday.com",
  port: 443,
  path: "/v2",
  method: "POST",
  headers: {
    "Authorization": env.MONDAY_TOKEN,
    "Content-Type": "application/json",
    "API-Version": "2024-10"
  }
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    const result = JSON.parse(data);
    if (!result.data || !result.data.docs) {
      console.error("Error:", JSON.stringify(result, null, 2));
      return;
    }
    result.data.docs.forEach((doc, idx) => {
      console.log("========================================");
      console.log("Doc ID:", docIds[idx]);
      console.log("");
      doc.blocks.forEach(block => {
        try {
          const content = JSON.parse(block.content);
          if (content.deltaFormat) {
            let text = "";
            content.deltaFormat.forEach(d => {
              if (typeof d.insert === "string") text += d.insert;
            });
            const skip = ["Item Name", "Feature", "Epic", "Severity"].some(s => text.startsWith(s));
            if (text.trim() && !skip) {
              if (block.type.includes("title")) {
                console.log("### " + text);
              } else {
                console.log(text);
              }
            }
          }
        } catch(e) {}
      });
      console.log("");
    });
  });
});
req.on("error", (e) => console.error("Error:", e));
req.write(postData);
req.end();
