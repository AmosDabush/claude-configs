#!/usr/bin/env node

/**
 * skill-db-sync.js
 *
 * Syncs database metadata with coview-db-expert skill.
 * Compares current DB state with what's documented in SKILL.md,
 * identifies new tables/columns, and adds them to Pending Review section.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Use shared db connection module
const { getConnection } = require('./db-connection');

// Paths
const SKILL_PATH = path.join(os.homedir(), '.claude/skills/coview-db-expert/SKILL.md');
const SYNC_STATE_PATH = path.join(__dirname, 'sync-state.json');

// Schemas to sync (exclude system schemas)
const RELEVANT_SCHEMAS = ['patients', 'common', 'labs', 'nursing', 'staff', 'ambulance', 'logistics', 'public'];

// Load sync state (what we knew last time)
function loadSyncState() {
  if (fs.existsSync(SYNC_STATE_PATH)) {
    return JSON.parse(fs.readFileSync(SYNC_STATE_PATH, 'utf8'));
  }
  return { tables: {}, lastSync: null };
}

function saveSyncState(state) {
  state.lastSync = new Date().toISOString();
  fs.writeFileSync(SYNC_STATE_PATH, JSON.stringify(state, null, 2));
}

// Parse SKILL.md to find documented tables
function parseSkillTables() {
  const content = fs.readFileSync(SKILL_PATH, 'utf8');
  const tables = new Set();

  // Match patterns like: patients.cases, common.wards, etc.
  const tablePattern = /\b(patients|common|labs|nursing|staff|ambulance|logistics|public)\.[a-z_]+/gi;
  let match;
  while ((match = tablePattern.exec(content)) !== null) {
    tables.add(match[0].toLowerCase());
  }

  // Also match table names in markdown tables (| table_name | ...)
  const tableRowPattern = /\|\s*([a-z_]+)\s*\|.*\|\s*(patients|common|labs|nursing|staff|ambulance|logistics|public)\s*\|/gi;
  while ((match = tableRowPattern.exec(content)) !== null) {
    tables.add(`${match[2].toLowerCase()}.${match[1].toLowerCase()}`);
  }

  return tables;
}

// Add Pending Review section if it doesn't exist
function ensurePendingReviewSection() {
  let content = fs.readFileSync(SKILL_PATH, 'utf8');

  if (!content.includes('## Pending Review')) {
    // Add before Changelog section or at end
    const changelogIndex = content.indexOf('## Changelog');
    const pendingSection = `## Pending Review (Auto-Synced)

Items below were discovered by \`/skill-db-sync\` and need business description.
Run \`/skill-db-review\` to add descriptions and move to main sections.

### New Tables (needs review)

| Schema | Table | Columns | Foreign Keys | Status |
|--------|-------|---------|--------------|--------|

### New Columns (needs review)

| Table | Column | Type | Nullable | Status |
|-------|--------|------|----------|--------|

---

`;

    if (changelogIndex !== -1) {
      content = content.slice(0, changelogIndex) + pendingSection + content.slice(changelogIndex);
    } else {
      content += '\n' + pendingSection;
    }

    fs.writeFileSync(SKILL_PATH, content);
  }
}

// Add new tables to Pending Review section
function addToPendingReview(newTables, newColumns) {
  let content = fs.readFileSync(SKILL_PATH, 'utf8');

  // Find the New Tables section and add entries
  if (newTables.length > 0) {
    const tablesSectionMarker = '### New Tables (needs review)';
    const tablesHeaderEnd = '|--------|-------|---------|--------------|--------|';

    const markerIndex = content.indexOf(tablesSectionMarker);
    if (markerIndex !== -1) {
      const headerEndIndex = content.indexOf(tablesHeaderEnd, markerIndex);
      if (headerEndIndex !== -1) {
        const insertPoint = headerEndIndex + tablesHeaderEnd.length;

        const newRows = newTables.map(t => {
          const fks = t.foreignKeys.length > 0
            ? t.foreignKeys.map(fk => `${fk.column}->${fk.refTable}`).join(', ')
            : 'none';
          const cols = t.columns.slice(0, 5).map(c => c.name).join(', ');
          const colSuffix = t.columns.length > 5 ? ` (+${t.columns.length - 5} more)` : '';
          return `\n| ${t.schema} | ${t.table} | ${cols}${colSuffix} | ${fks} | needs review |`;
        }).join('');

        content = content.slice(0, insertPoint) + newRows + content.slice(insertPoint);
      }
    }
  }

  // Find the New Columns section and add entries
  if (newColumns.length > 0) {
    const columnsSectionMarker = '### New Columns (needs review)';
    const columnsHeaderEnd = '|-------|--------|------|----------|--------|';

    const markerIndex = content.indexOf(columnsSectionMarker);
    if (markerIndex !== -1) {
      const headerEndIndex = content.indexOf(columnsHeaderEnd, markerIndex);
      if (headerEndIndex !== -1) {
        const insertPoint = headerEndIndex + columnsHeaderEnd.length;

        const newRows = newColumns.map(c => {
          return `\n| ${c.schema}.${c.table} | ${c.column} | ${c.type} | ${c.nullable} | needs review |`;
        }).join('');

        content = content.slice(0, insertPoint) + newRows + content.slice(insertPoint);
      }
    }
  }

  fs.writeFileSync(SKILL_PATH, content);
}

// Update changelog
function updateChangelog(newTablesCount, newColumnsCount) {
  let content = fs.readFileSync(SKILL_PATH, 'utf8');
  const date = new Date().toISOString().split('T')[0];

  const changelogMarker = '| Date | What was learned | Source | Added by |';
  const changelogHeaderEnd = '|------|------------------|--------|----------|';

  const markerIndex = content.indexOf(changelogMarker);
  if (markerIndex !== -1) {
    const headerEndIndex = content.indexOf(changelogHeaderEnd, markerIndex);
    if (headerEndIndex !== -1) {
      const insertPoint = headerEndIndex + changelogHeaderEnd.length;
      const entry = `\n| ${date} | DB Sync: ${newTablesCount} new tables, ${newColumnsCount} new columns added to Pending Review | /skill-db-sync | Auto |`;
      content = content.slice(0, insertPoint) + entry + content.slice(insertPoint);
      fs.writeFileSync(SKILL_PATH, content);
    }
  }
}

async function fetchDbMetadata(sequelize) {
  // Get all tables with their schemas
  const [tables] = await sequelize.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = ANY(ARRAY['${RELEVANT_SCHEMAS.join("','")}'])
      AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name
  `);

  // Get all columns
  const [columns] = await sequelize.query(`
    SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = ANY(ARRAY['${RELEVANT_SCHEMAS.join("','")}'])
    ORDER BY table_schema, table_name, ordinal_position
  `);

  // Get foreign keys
  const [foreignKeys] = await sequelize.query(`
    SELECT
      tc.table_schema,
      tc.table_name,
      kcu.column_name,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = ANY(ARRAY['${RELEVANT_SCHEMAS.join("','")}'])
  `);

  // Organize data
  const tableMap = {};

  for (const t of tables) {
    const key = `${t.table_schema}.${t.table_name}`;
    tableMap[key] = {
      schema: t.table_schema,
      table: t.table_name,
      columns: [],
      foreignKeys: []
    };
  }

  for (const c of columns) {
    const key = `${c.table_schema}.${c.table_name}`;
    if (tableMap[key]) {
      tableMap[key].columns.push({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable,
        default: c.column_default
      });
    }
  }

  for (const fk of foreignKeys) {
    const key = `${fk.table_schema}.${fk.table_name}`;
    if (tableMap[key]) {
      tableMap[key].foreignKeys.push({
        column: fk.column_name,
        refTable: `${fk.foreign_table_schema}.${fk.foreign_table_name}`,
        refColumn: fk.foreign_column_name
      });
    }
  }

  return tableMap;
}

function compareWithSyncState(dbTables, syncState) {
  const newTables = [];
  const newColumns = [];

  // If this is first sync, don't report anything as new - just establish baseline
  if (!syncState.lastSync) {
    return { newTables: [], newColumns: [], isFirstSync: true };
  }

  for (const [fullName, tableData] of Object.entries(dbTables)) {
    // Check if table is new (not in previous sync state)
    if (!syncState.tables[fullName]) {
      newTables.push(tableData);
    } else {
      // Table exists, check for new columns
      const knownColumns = new Set(syncState.tables[fullName].columns || []);
      for (const col of tableData.columns) {
        if (!knownColumns.has(col.name)) {
          newColumns.push({
            schema: tableData.schema,
            table: tableData.table,
            column: col.name,
            type: col.type,
            nullable: col.nullable
          });
        }
      }
    }
  }

  return { newTables, newColumns, isFirstSync: false };
}

function updateSyncState(syncState, dbTables) {
  for (const [fullName, tableData] of Object.entries(dbTables)) {
    syncState.tables[fullName] = {
      columns: tableData.columns.map(c => c.name),
      lastSeen: new Date().toISOString()
    };
  }
  return syncState;
}

async function main() {
  const args = process.argv.slice(2);
  const dbName = args.includes('--db') ? args[args.indexOf('--db') + 1] : 'dev';
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log('Usage: skill-db-sync [options]');
    console.log('');
    console.log('Options:');
    console.log('  --db <name>    Database to sync from (default: dev)');
    console.log('  --dry-run      Show what would be synced without making changes');
    console.log('  --verbose, -v  Show detailed output');
    console.log('  --help, -h     Show this help');
    console.log('');
    console.log('Example:');
    console.log('  skill-db-sync --db dev');
    console.log('  skill-db-sync --dry-run --verbose');
    process.exit(0);
  }

  console.log('=== CoView DB Skill Sync ===\n');

  try {
    // Connect using shared module
    const { sequelize, dbConfig } = await getConnection(dbName);
    console.log(`Connecting to: ${dbName} (${dbConfig.host}/${dbConfig.database})`);

    // Fetch current DB state
    console.log('Fetching database metadata...');
    const dbTables = await fetchDbMetadata(sequelize);
    const tableCount = Object.keys(dbTables).length;
    const columnCount = Object.values(dbTables).reduce((sum, t) => sum + t.columns.length, 0);
    console.log(`Found ${tableCount} tables with ${columnCount} columns\n`);

    // Load previous sync state
    const syncState = loadSyncState();
    if (syncState.lastSync) {
      console.log(`Last sync: ${syncState.lastSync}`);
      console.log(`Known tables: ${Object.keys(syncState.tables).length}`);
    } else {
      console.log('First sync - will record baseline (no changes reported)');
    }

    // Compare only against sync state (not SKILL.md parsing)
    console.log('\nComparing...');
    const { newTables, newColumns, isFirstSync } = compareWithSyncState(dbTables, syncState);

    // Report findings
    console.log('\n=== Sync Results ===\n');

    if (isFirstSync) {
      console.log('First sync complete - baseline established.');
      console.log(`Recorded ${tableCount} tables as known.`);
      console.log('Future syncs will detect new tables/columns added after this point.');

      // Save baseline
      if (!dryRun) {
        const newState = updateSyncState(syncState, dbTables);
        saveSyncState(newState);
        console.log('Baseline saved.');
      }
    } else if (newTables.length === 0 && newColumns.length === 0) {
      console.log('No new tables or columns found. Skill is up to date!');

      // Still update sync state to track current baseline
      if (!dryRun) {
        const newState = updateSyncState(syncState, dbTables);
        saveSyncState(newState);
      }
    } else {
      if (newTables.length > 0) {
        console.log(`NEW TABLES (${newTables.length}):`);
        for (const t of newTables) {
          console.log(`  - ${t.schema}.${t.table} (${t.columns.length} columns)`);
          if (verbose) {
            console.log(`    Columns: ${t.columns.map(c => c.name).join(', ')}`);
            if (t.foreignKeys.length > 0) {
              console.log(`    FKs: ${t.foreignKeys.map(fk => `${fk.column}->${fk.refTable}`).join(', ')}`);
            }
          }
        }
        console.log('');
      }

      if (newColumns.length > 0) {
        console.log(`NEW COLUMNS (${newColumns.length}):`);
        for (const c of newColumns) {
          console.log(`  - ${c.schema}.${c.table}.${c.column} (${c.type})`);
        }
        console.log('');
      }

      if (!dryRun) {
        // Update SKILL.md
        console.log('Updating SKILL.md...');
        ensurePendingReviewSection();
        addToPendingReview(newTables, newColumns);
        updateChangelog(newTables.length, newColumns.length);
        console.log('SKILL.md updated with Pending Review items');

        // Update sync state
        const newState = updateSyncState(syncState, dbTables);
        saveSyncState(newState);
        console.log('Sync state saved');

        console.log('\n=== Next Steps ===');
        console.log('Run /skill-db-review to add business descriptions to new items');
      } else {
        console.log('[DRY RUN] No changes made');
      }
    }

    await sequelize.close();

    // Output JSON summary for skill to parse
    const summary = {
      newTables: newTables.length,
      newColumns: newColumns.length,
      totalTables: tableCount,
      success: true
    };
    console.log('\n__SYNC_SUMMARY__');
    console.log(JSON.stringify(summary));

  } catch (error) {
    console.error('Error:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
