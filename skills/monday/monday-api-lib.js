// Monday.com API Library - shared functions

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

const COLUMNS = {
  assignee: 'multiple_person_mkv1gsr7',
  devStatus: 'color_mkttqd24',
  severity: 'color_mkttf1dq',
  bugId: 'pulse_id_mktt1nht',
  doc: 'doc_mktxk2qp',
  itemType: 'color_mktt44ya',
  owner: 'lookup_mktttmmz',
  feature: 'board_relation_mktt2djz',
  epic: 'lookup_mktttmmz',
  priority: 'color_mktx60aa',
  qaStatus: 'color_mktt382w',
  reporter: 'multiple_person_mktxhek8',
  bugType: 'color_mktx31dx',
  prodTest: 'color_mktx495y',
  date: 'date_mktxmsq8'
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

async function fetchItem(itemId, includeAllColumns = false) {
  // If we need all columns, fetch them all; otherwise just doc and bugId
  const columnIds = includeAllColumns
    ? Object.values(COLUMNS).filter((v, i, a) => a.indexOf(v) === i) // unique values
    : [COLUMNS.doc, COLUMNS.bugId];

  const query = `{
    items(ids: [${itemId}]) {
      id
      name
      column_values {
        id
        text
        value
        column {
          title
        }
      }
    }
  }`;

  const result = await mondayRequest(query);

  if (result.errors) {
    throw new Error(result.errors.map(e => e.message).join(', '));
  }

  const item = result.data?.items?.[0];
  if (!item) return null;

  // Extract doc_id
  let docId = null;
  const docCol = item.column_values.find(cv => cv.id === COLUMNS.doc);
  if (docCol?.value) {
    try {
      const docValue = JSON.parse(docCol.value);
      if (docValue.files && docValue.files.length > 0) {
        docId = docValue.files[0].objectId;
      }
    } catch (e) {}
  }

  // Extract bug ID (e.g., C-541)
  const bugIdCol = item.column_values.find(cv => cv.id === COLUMNS.bugId);
  const bugId = bugIdCol?.text || null;

  // Build metadata object from all columns with text values
  const metadata = {};
  item.column_values.forEach(cv => {
    if (cv.text && cv.column?.title) {
      metadata[cv.column.title] = cv.text;
    }
  });

  return {
    id: item.id,
    name: item.name,
    docId: docId,
    bugId: bugId,
    metadata: metadata
  };
}

async function fetchItemsByIds(itemIds) {
  const query = `{
    items(ids: [${itemIds.join(',')}]) {
      id
      name
      column_values(ids: ["${COLUMNS.doc}", "${COLUMNS.bugId}"]) {
        id
        value
        text
      }
    }
  }`;

  const result = await mondayRequest(query);

  if (result.errors) {
    throw new Error(result.errors.map(e => e.message).join(', '));
  }

  return (result.data?.items || []).map(item => {
    let docId = null;
    let bugId = null;

    const docCol = item.column_values.find(cv => cv.id === COLUMNS.doc);
    if (docCol?.value) {
      try {
        const docValue = JSON.parse(docCol.value);
        if (docValue.files && docValue.files.length > 0) {
          docId = docValue.files[0].objectId;
        }
      } catch (e) {}
    }

    const bugIdCol = item.column_values.find(cv => cv.id === COLUMNS.bugId);
    bugId = bugIdCol?.text || null;

    return {
      id: item.id,
      name: item.name,
      docId: docId,
      bugId: bugId
    };
  });
}

module.exports = {
  mondayRequest,
  fetchItem,
  fetchItemsByIds,
  COLUMNS,
  BOARD_ID
};
