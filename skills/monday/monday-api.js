#!/usr/bin/env node

const https = require('https');
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

const TOKEN = env.MONDAY_TOKEN;
const BOARD_ID = env.MONDAY_BOARD_ID || '9815738160';
const USER_NAME = env.MONDAY_USER_NAME || 'Amos';

// Pass through Hebrew text as-is (modern terminals handle RTL correctly)
function rtl(str) {
  return str || '';
}

// Column IDs
const COLUMNS = {
  assignee: 'multiple_person_mkv1gsr7',
  devStatus: 'color_mkttqd24',
  severity: 'color_mkttf1dq',
  bugId: 'pulse_id_mktt1nht',
  doc: 'doc_mktxk2qp'
};

function mondayRequest(query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });

    const options = {
      hostname: 'api.monday.com',
      port: 443,
      path: '/v2',
      method: 'POST',
      headers: {
        'Authorization': TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function fetchMyBugs() {
  const query = `{
    boards(ids: [${BOARD_ID}]) {
      items_page(limit: 200) {
        items {
          id
          name
          column_values(ids: ["${COLUMNS.assignee}", "${COLUMNS.devStatus}", "${COLUMNS.severity}", "${COLUMNS.bugId}", "${COLUMNS.doc}"]) {
            id
            text
            value
          }
        }
      }
    }
  }`;

  const result = await mondayRequest(query);

  if (result.errors) {
    console.error('API Error:', result.errors);
    return [];
  }

  const items = result.data?.boards?.[0]?.items_page?.items || [];

  // Filter by assignee containing user name
  const myBugs = items.filter(item => {
    const assignee = item.column_values.find(cv => cv.id === COLUMNS.assignee);
    return assignee?.text?.includes(USER_NAME);
  });

  return myBugs.map(item => {
    const devStatus = item.column_values.find(cv => cv.id === COLUMNS.devStatus);
    const severity = item.column_values.find(cv => cv.id === COLUMNS.severity);
    const assignee = item.column_values.find(cv => cv.id === COLUMNS.assignee);
    const bugIdCol = item.column_values.find(cv => cv.id === COLUMNS.bugId);
    const docCol = item.column_values.find(cv => cv.id === COLUMNS.doc);

    // Extract doc_id from doc column value
    let docId = null;
    if (docCol?.value) {
      try {
        const docValue = JSON.parse(docCol.value);
        if (docValue.files && docValue.files.length > 0) {
          docId = docValue.files[0].objectId;
        }
      } catch (e) {}
    }

    // Build link with doc_id if available
    let link = `https://mohgov.monday.com/boards/${BOARD_ID}/pulses/${item.id}`;
    if (docId) {
      link += `?doc_id=${docId}`;
    }

    return {
      id: item.id,
      name: item.name,
      status: devStatus?.text || 'N/A',
      severity: severity?.text || 'N/A',
      assignee: assignee?.text || 'N/A',
      bugId: bugIdCol?.text || null,
      docId: docId,
      link: link
    };
  });
}

async function updateStatus(itemId, statusLabel) {
  const query = `mutation {
    change_column_value(
      item_id: ${itemId},
      board_id: ${BOARD_ID},
      column_id: "${COLUMNS.devStatus}",
      value: "{\\"label\\":\\"${statusLabel}\\"}"
    ) {
      id
      name
    }
  }`;

  const result = await mondayRequest(query);

  if (result.errors) {
    throw new Error(result.errors.map(e => e.message).join(', '));
  }

  return result.data?.change_column_value || null;
}

async function fetchItem(itemId) {
  const query = `{
    items(ids: [${itemId}]) {
      id
      name
      created_at
      updated_at
      column_values {
        id
        text
        value
      }
    }
  }`;

  const result = await mondayRequest(query);

  if (result.errors) {
    console.error('API Error:', result.errors);
    return null;
  }

  return result.data?.items?.[0] || null;
}

async function main() {
  const [,, command, arg] = process.argv;

  try {
    switch (command) {
      case 'bugs':
        const bugs = await fetchMyBugs();
        if (bugs.length === 0) {
          console.log('No bugs found assigned to', USER_NAME);
        } else {
          console.log(`${bugs.length} bugs for ${USER_NAME}:\n`);

          // Group by status
          const byStatus = {};
          bugs.forEach(bug => {
            const status = bug.status || 'Unknown';
            if (!byStatus[status]) byStatus[status] = [];
            byStatus[status].push(bug);
          });

          for (const [status, statusBugs] of Object.entries(byStatus)) {
            console.log(`[${status}] (${statusBugs.length})`);
            statusBugs.forEach(bug => {
              const sev = bug.severity === 'Critical' ? 'CRIT' :
                         bug.severity === 'High' ? 'HIGH' :
                         bug.severity === 'Medium' ? 'MED' : 'LOW';
              const bugIdStr = bug.bugId ? `${bug.bugId}` : bug.id;
              console.log(`  ${rtl(bug.name)} | ${sev} | ${bugIdStr}`);
              console.log(`    Link: ${bug.link}`);
            });
            console.log('');
          }
        }
        break;

      case 'item':
        if (!arg) {
          console.error('Usage: monday-api.js item <item_id>');
          process.exit(1);
        }
        const item = await fetchItem(arg);
        if (!item) {
          console.log('Item not found:', arg);
        } else {
          console.log('\n## Item Details\n');
          console.log(`ID: ${item.id}`);
          console.log(`Name: ${rtl(item.name)}`);
          console.log(`Created: ${item.created_at}`);
          console.log(`Updated: ${item.updated_at}`);
          console.log('\n### Columns:\n');
          item.column_values.forEach(cv => {
            if (cv.text) {
              console.log(`- ${cv.id}: ${rtl(cv.text)}`);
            }
          });
        }
        break;

      case 'set-status':
        const [itemId, ...statusParts] = arg ? [arg, ...process.argv.slice(4)] : [];
        const statusLabel = statusParts.join(' ');

        if (!itemId || !statusLabel) {
          console.error('Usage: monday-api.js set-status <item_id> <status>');
          console.error('');
          console.error('Valid statuses: Done, In Progress, Code Review, Pending Deploy, Stuck');
          process.exit(1);
        }

        const updated = await updateStatus(itemId, statusLabel);
        if (updated) {
          console.log(`Updated "${rtl(updated.name)}" to "${statusLabel}"`);
        } else {
          console.error('Failed to update status');
        }
        break;

      case 'test':
        // Test API connection
        const testQuery = '{ me { id name email } }';
        const testResult = await mondayRequest(testQuery);
        if (testResult.data?.me) {
          console.log('API Connection OK');
          console.log(`User: ${testResult.data.me.name} (${testResult.data.me.email})`);
        } else {
          console.error('API Connection Failed:', testResult);
        }
        break;

      case 'docs':
        // Download docs for specified item IDs or bug numbers (C-XXX)
        const itemIds = process.argv.slice(3);
        const formatArg = itemIds.find(a => a === '--pdf' || a === '--md' || a === '--docx');
        const format = formatArg ? formatArg.replace('--', '') : 'pdf';
        const originalMode = itemIds.includes('--original');
        let cleanItemIds = itemIds.filter(a => !a.startsWith('--'));

        if (cleanItemIds.length === 0) {
          console.error('Usage: monday-api.js docs <C-XXX | item_id> ... [--pdf|--md|--docx] [--original]');
          console.error('');
          console.error('Options:');
          console.error('  --pdf, --md, --docx  Output format (default: pdf)');
          console.error('  --original           Skip metadata header, return original doc only');
          console.error('');
          console.error('Examples:');
          console.error('  monday-api.js docs C-555');
          console.error('  monday-api.js docs C-555 C-554 C-549 --pdf');
          console.error('  monday-api.js docs 10847290328 --original');
          console.error('');
          process.exit(1);
        }

        // Check if any inputs are bug numbers (C-XXX format)
        const bugNumberPattern = /^C-\d+$/i;
        const hasBugNumbers = cleanItemIds.some(id => bugNumberPattern.test(id));

        if (hasBugNumbers) {
          // Fetch all bugs to map C-XXX to item IDs
          console.log('Looking up bug numbers...');
          const lookupQuery = `{
            boards(ids: [${BOARD_ID}]) {
              items_page(limit: 500) {
                items {
                  id
                  column_values(ids: ["${COLUMNS.bugId}"]) {
                    id
                    text
                  }
                }
              }
            }
          }`;
          const bugsResult = await mondayRequest(lookupQuery);

          if (bugsResult.errors) {
            console.error('Error fetching bugs:', bugsResult.errors);
            process.exit(1);
          }

          const bugMap = {};
          const items = bugsResult.data?.boards?.[0]?.items_page?.items || [];
          items.forEach(item => {
            const bugIdCol = item.column_values.find(cv => cv.id === COLUMNS.bugId);
            if (bugIdCol?.text) {
              bugMap[bugIdCol.text.toUpperCase()] = item.id;
            }
          });

          // Convert bug numbers to item IDs
          cleanItemIds = cleanItemIds.map(id => {
            if (bugNumberPattern.test(id)) {
              const upperBugId = id.toUpperCase();
              if (bugMap[upperBugId]) {
                console.log(`  ${id} → ${bugMap[upperBugId]}`);
                return bugMap[upperBugId];
              } else {
                console.error(`  ${id} not found!`);
                return null;
              }
            }
            return id;
          }).filter(Boolean);

          if (cleanItemIds.length === 0) {
            console.error('No valid bug numbers found');
            process.exit(1);
          }
        }

        const { spawn } = require('child_process');
        const downloadScript = path.join(__dirname, 'download-docs.js');

        const downloadArgs = ['--items', ...cleanItemIds, '--format', format];
        if (originalMode) downloadArgs.push('--original');
        console.log(`Downloading docs for ${cleanItemIds.length} items as ${format}${originalMode ? ' (original)' : ' (with metadata)'}...`);

        const child = spawn('node', [downloadScript, ...downloadArgs], {
          stdio: 'inherit',
          cwd: __dirname
        });

        child.on('close', (code) => {
          process.exit(code);
        });
        break;

      case 'docs-login':
        // Interactive login to save session
        const { spawn: spawnLogin } = require('child_process');
        const loginScript = path.join(__dirname, 'download-docs.js');

        console.log('Opening browser for Monday.com login...');

        const loginChild = spawnLogin('node', [loginScript, 'login'], {
          stdio: 'inherit',
          cwd: __dirname
        });

        loginChild.on('close', (code) => {
          process.exit(code);
        });
        break;

      default:
        console.log('Monday.com Bug Tracker');
        console.log('');
        console.log('Usage:');
        console.log('  node monday-api.js bugs                      - Fetch all bugs assigned to you');
        console.log('  node monday-api.js item <id>                 - Fetch specific item details');
        console.log('  node monday-api.js set-status <id> <status>  - Change bug status');
        console.log('  node monday-api.js test                      - Test API connection');
        console.log('');
        console.log('Doc Commands:');
        console.log('  node monday-api.js docs-login                - Save Monday session (run once)');
        console.log('  node monday-api.js docs <id> [ids...] [--pdf|--md]  - Download docs');
        console.log('');
        console.log('Valid statuses: Done, In Progress, Code Review, Pending Deploy, Stuck');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
