#!/usr/bin/env node

/**
 * skill-db-review.js
 *
 * Interactive review of pending items in coview-db-expert skill.
 * Lists items that need business descriptions and outputs them
 * for Claude to process interactively.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Paths
const SKILL_PATH = path.join(os.homedir(), '.claude/skills/coview-db-expert/SKILL.md');

// Parse pending tables from SKILL.md
function parsePendingTables() {
  const content = fs.readFileSync(SKILL_PATH, 'utf8');
  const tables = [];

  // Find the New Tables section
  const tablesSectionStart = content.indexOf('### New Tables (needs review)');
  if (tablesSectionStart === -1) return tables;

  const tablesSectionEnd = content.indexOf('### New Columns', tablesSectionStart);
  const tablesSection = content.slice(tablesSectionStart, tablesSectionEnd !== -1 ? tablesSectionEnd : undefined);

  // Parse table rows: | schema | table | columns | fks | status |
  const rowPattern = /\|\s*(\w+)\s*\|\s*(\w+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*needs review\s*\|/gi;
  let match;
  while ((match = rowPattern.exec(tablesSection)) !== null) {
    tables.push({
      schema: match[1],
      table: match[2],
      columns: match[3].trim(),
      foreignKeys: match[4].trim(),
      fullName: `${match[1]}.${match[2]}`
    });
  }

  return tables;
}

// Parse pending columns from SKILL.md
function parsePendingColumns() {
  const content = fs.readFileSync(SKILL_PATH, 'utf8');
  const columns = [];

  // Find the New Columns section
  const columnsSectionStart = content.indexOf('### New Columns (needs review)');
  if (columnsSectionStart === -1) return columns;

  const columnsSectionEnd = content.indexOf('---', columnsSectionStart);
  const columnsSection = content.slice(columnsSectionStart, columnsSectionEnd !== -1 ? columnsSectionEnd : undefined);

  // Parse column rows: | table | column | type | nullable | status |
  const rowPattern = /\|\s*([^|]+)\s*\|\s*(\w+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*needs review\s*\|/gi;
  let match;
  while ((match = rowPattern.exec(columnsSection)) !== null) {
    columns.push({
      table: match[1].trim(),
      column: match[2],
      type: match[3].trim(),
      nullable: match[4].trim()
    });
  }

  return columns;
}

// Update a table's status from "needs review" to "reviewed"
function markTableReviewed(schema, table) {
  let content = fs.readFileSync(SKILL_PATH, 'utf8');
  const pattern = new RegExp(
    `\\|\\s*${schema}\\s*\\|\\s*${table}\\s*\\|([^|]+)\\|([^|]+)\\|\\s*needs review\\s*\\|`,
    'i'
  );
  content = content.replace(pattern, `| ${schema} | ${table} |$1|$2| reviewed |`);
  fs.writeFileSync(SKILL_PATH, content);
}

// Update a column's status from "needs review" to "reviewed"
function markColumnReviewed(table, column) {
  let content = fs.readFileSync(SKILL_PATH, 'utf8');
  const pattern = new RegExp(
    `\\|\\s*${table.replace('.', '\\.')}\\s*\\|\\s*${column}\\s*\\|([^|]+)\\|([^|]+)\\|\\s*needs review\\s*\\|`,
    'i'
  );
  content = content.replace(pattern, `| ${table} | ${column} |$1|$2| reviewed |`);
  fs.writeFileSync(SKILL_PATH, content);
}

// Add table to Key Tables section
function addToKeyTables(schema, table, description) {
  let content = fs.readFileSync(SKILL_PATH, 'utf8');

  // Find Key Tables Detail section
  const keyTablesMarker = '### Key Tables Detail';
  const keyTablesHeaderEnd = '|-------|--------|---------|-------------|';

  const markerIndex = content.indexOf(keyTablesMarker);
  if (markerIndex !== -1) {
    const headerEndIndex = content.indexOf(keyTablesHeaderEnd, markerIndex);
    if (headerEndIndex !== -1) {
      const insertPoint = headerEndIndex + keyTablesHeaderEnd.length;
      const newRow = `\n| ${table} | ${schema} | ${description} | (see schema) |`;
      content = content.slice(0, insertPoint) + newRow + content.slice(insertPoint);
      fs.writeFileSync(SKILL_PATH, content);
      return true;
    }
  }
  return false;
}

// Add to Learned Knowledge section
function addToLearnedKnowledge(item, description, source) {
  let content = fs.readFileSync(SKILL_PATH, 'utf8');
  const date = new Date().toISOString().split('T')[0];

  const learnedMarker = '### Recently Learned Q&A';
  const learnedHeaderEnd = '|------|----------|--------|--------|';

  const markerIndex = content.indexOf(learnedMarker);
  if (markerIndex !== -1) {
    const headerEndIndex = content.indexOf(learnedHeaderEnd, markerIndex);
    if (headerEndIndex !== -1) {
      const insertPoint = headerEndIndex + learnedHeaderEnd.length;
      const newRow = `\n| ${date} | What is ${item}? | ${description} | ${source} |`;
      content = content.slice(0, insertPoint) + newRow + content.slice(insertPoint);
      fs.writeFileSync(SKILL_PATH, content);
      return true;
    }
  }
  return false;
}

function main() {
  const args = process.argv.slice(2);
  const listOnly = args.includes('--list');
  const markReviewed = args.includes('--mark-reviewed');
  const addDescription = args.includes('--add-description');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log('Usage: skill-db-review [options]');
    console.log('');
    console.log('Options:');
    console.log('  --list                    List all pending items');
    console.log('  --mark-reviewed           Mark item as reviewed');
    console.log('    --table <schema.table>  Table to mark');
    console.log('    --column <table.column> Column to mark');
    console.log('  --add-description         Add description to item');
    console.log('    --table <schema.table>  Table to describe');
    console.log('    --desc <description>    Business description');
    console.log('  --help, -h                Show this help');
    console.log('');
    console.log('Example:');
    console.log('  skill-db-review --list');
    console.log('  skill-db-review --mark-reviewed --table patients.new_table');
    console.log('  skill-db-review --add-description --table patients.new_table --desc "Stores X data"');
    process.exit(0);
  }

  const pendingTables = parsePendingTables();
  const pendingColumns = parsePendingColumns();

  if (listOnly || (!markReviewed && !addDescription)) {
    // Default: list pending items
    console.log('=== Pending Review Items ===\n');

    if (pendingTables.length === 0 && pendingColumns.length === 0) {
      console.log('No pending items! All items have been reviewed.');
      process.exit(0);
    }

    if (pendingTables.length > 0) {
      console.log(`TABLES (${pendingTables.length}):\n`);
      for (let i = 0; i < pendingTables.length; i++) {
        const t = pendingTables[i];
        console.log(`${i + 1}. ${t.fullName}`);
        console.log(`   Columns: ${t.columns}`);
        console.log(`   Foreign Keys: ${t.foreignKeys}`);
        console.log('');
      }
    }

    if (pendingColumns.length > 0) {
      console.log(`COLUMNS (${pendingColumns.length}):\n`);
      for (let i = 0; i < pendingColumns.length; i++) {
        const c = pendingColumns[i];
        console.log(`${i + 1}. ${c.table}.${c.column} (${c.type}, ${c.nullable})`);
      }
      console.log('');
    }

    // Output JSON for Claude to parse
    console.log('__PENDING_ITEMS__');
    console.log(JSON.stringify({
      tables: pendingTables,
      columns: pendingColumns,
      totalPending: pendingTables.length + pendingColumns.length
    }));

    process.exit(0);
  }

  if (markReviewed) {
    const tableArg = args.includes('--table') ? args[args.indexOf('--table') + 1] : null;
    const columnArg = args.includes('--column') ? args[args.indexOf('--column') + 1] : null;

    if (tableArg) {
      const [schema, table] = tableArg.split('.');
      markTableReviewed(schema, table);
      console.log(`Marked ${tableArg} as reviewed`);
    } else if (columnArg) {
      const parts = columnArg.split('.');
      const column = parts.pop();
      const table = parts.join('.');
      markColumnReviewed(table, column);
      console.log(`Marked ${columnArg} as reviewed`);
    } else {
      console.error('Specify --table or --column');
      process.exit(1);
    }
    process.exit(0);
  }

  if (addDescription) {
    const tableArg = args.includes('--table') ? args[args.indexOf('--table') + 1] : null;
    const descArg = args.includes('--desc') ? args[args.indexOf('--desc') + 1] : null;

    if (!tableArg || !descArg) {
      console.error('Specify --table and --desc');
      process.exit(1);
    }

    const [schema, table] = tableArg.split('.');

    // Add to Key Tables
    const addedToKeyTables = addToKeyTables(schema, table, descArg);

    // Add to Learned Knowledge
    const addedToLearned = addToLearnedKnowledge(tableArg, descArg, '/skill-db-review');

    // Mark as reviewed
    markTableReviewed(schema, table);

    if (addedToKeyTables) {
      console.log(`Added ${tableArg} to Key Tables with description`);
    }
    if (addedToLearned) {
      console.log(`Added ${tableArg} to Learned Knowledge`);
    }
    console.log(`Marked ${tableArg} as reviewed`);

    process.exit(0);
  }
}

main();
