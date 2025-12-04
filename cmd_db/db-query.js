#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const os = require('os');
const { Sequelize } = require('sequelize');

const CONFIG_PATH = path.join(__dirname, 'db-config.json');
const HISTORY_PATH = path.join(__dirname, 'history.json');
const MAX_HISTORY = 20;

function expandTilde(filePath) {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function loadCredentials(config) {
  const credFile = expandTilde(config.credentialsFile || '~/.claude/db-credentials.env');
  if (fs.existsSync(credFile)) {
    require('dotenv').config({ path: credFile });
  }
}

function getDbConfig(config, dbName) {
  const db = config.databases[dbName];
  if (!db) return null;

  const connection = db.extends ? config.connections[db.extends] : {};

  return {
    host: process.env[connection.hostVar],
    user: process.env[connection.userVar],
    password: process.env[connection.passwordVar],
    database: db.dbName,
    port: connection.port || 5432,
    description: db.description
  };
}

function listDatabases(config) {
  loadCredentials(config);
  console.log('Available databases:\n');
  for (const [name, db] of Object.entries(config.databases)) {
    const connection = db.extends ? config.connections[db.extends] : {};
    const host = process.env[connection.hostVar] || 'N/A';
    console.log(`  ${name}`);
    console.log(`    ${db.description || 'No description'}`);
    console.log(`    Host: ${host}`);
    console.log(`    DB: ${db.dbName || 'N/A'}`);
    console.log('');
  }
}

// History functions
function loadHistory() {
  if (fs.existsSync(HISTORY_PATH)) {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  }
  return [];
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function addToHistory(db, sql, env) {
  const history = loadHistory();
  history.unshift({
    timestamp: new Date().toISOString(),
    db: db || 'env',
    sql,
    env: env || 'local'
  });
  // Keep only last MAX_HISTORY entries
  saveHistory(history.slice(0, MAX_HISTORY));
}

function showHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    console.log('No query history.');
    return;
  }
  console.log('Recent queries:\n');
  history.forEach((entry, i) => {
    const date = new Date(entry.timestamp).toLocaleString();
    const sqlPreview = entry.sql.length > 60 ? entry.sql.substring(0, 60) + '...' : entry.sql;
    console.log(`  ${i + 1}. [${entry.db}] ${sqlPreview}`);
    console.log(`     ${date} (${entry.env})`);
  });
}

function getHistoryEntry(n) {
  const history = loadHistory();
  if (n < 1 || n > history.length) {
    return null;
  }
  return history[n - 1];
}

function clearHistory() {
  saveHistory([]);
  console.log('History cleared.');
}

// Schema helper SQL queries
const SCHEMA_QUERIES = {
  tables: `
    SELECT table_schema || '.' || table_name as table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name
  `,
  schemas: `
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      AND schema_name NOT LIKE 'pg_temp%'
      AND schema_name NOT LIKE 'pg_toast%'
    ORDER BY schema_name
  `,
  describe: (table) => {
    const parts = table.includes('.') ? table.split('.') : [null, table];
    const schemaCondition = parts[0] ? `AND table_schema = '${parts[0]}'` : '';
    const tableName = parts[1] || parts[0];
    return `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = '${tableName}' ${schemaCondition}
      ORDER BY ordinal_position
    `;
  }
};

function showHelp() {
  console.log('Usage: db-query [options] "SQL_QUERY"');
  console.log('');
  console.log('Options:');
  console.log('  --db <name>       Use database from config (dev, qa_naharia, lior_test, lior_test2)');
  console.log('  --local, -l       Use project .env (default)');
  console.log('  --global, -g      Use global credentials (~/.claude/db-credentials.env)');
  console.log('  --list            List available databases');
  console.log('  --help, -h        Show this help');
  console.log('');
  console.log('History:');
  console.log('  --history, -H     Show recent queries');
  console.log('  --run <n>         Re-run query #n from history');
  console.log('  --clear-history   Clear query history');
  console.log('');
  console.log('Schema:');
  console.log('  --tables          List all tables');
  console.log('  --schemas         List all schemas');
  console.log('  --describe, -d <table>  Describe table columns');
  console.log('');
  console.log('Examples:');
  console.log('  db-query --db dev "SELECT * FROM patients.patients LIMIT 5"');
  console.log('  db-query --db dev --tables');
  console.log('  db-query --db dev --describe patients.patients');
  console.log('  db-query --run 1   # Re-run last query');
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const showHelpFlag = args.includes('--help') || args.includes('-h');
  const listFlag = args.includes('--list');
  const useGlobalEnv = args.includes('--global') || args.includes('-g');
  // Local is default, --local flag is just for explicitness

  // History flags
  const historyFlag = args.includes('--history') || args.includes('-H');
  const clearHistoryFlag = args.includes('--clear-history');
  const runFlagIndex = args.indexOf('--run');
  const runNumber = runFlagIndex !== -1 ? parseInt(args[runFlagIndex + 1]) : null;

  // Schema flags
  const tablesFlag = args.includes('--tables');
  const schemasFlag = args.includes('--schemas');
  const describeFlagIndex = args.findIndex(a => a === '--describe' || a === '-d');
  const describeTable = describeFlagIndex !== -1 ? args[describeFlagIndex + 1] : null;

  // Get --db value
  const dbFlagIndex = args.indexOf('--db');
  const dbName = dbFlagIndex !== -1 ? args[dbFlagIndex + 1] : null;

  // Get SQL query (first arg that doesn't start with - and isn't a flag value)
  const flagsWithValues = ['--db', '--run', '--describe', '-d'];
  const sql = args.find((arg, i) => {
    if (arg.startsWith('-')) return false;
    if (i > 0 && flagsWithValues.includes(args[i - 1])) return false;
    return true;
  });

  const config = loadConfig();

  if (showHelpFlag) {
    showHelp();
    process.exit(0);
  }

  if (listFlag) {
    listDatabases(config);
    process.exit(0);
  }

  // Handle history commands
  if (historyFlag) {
    showHistory();
    process.exit(0);
  }

  if (clearHistoryFlag) {
    clearHistory();
    process.exit(0);
  }

  // Determine final SQL (from arg or history)
  let finalSql = sql;
  let historyEntry = null;

  if (runNumber) {
    historyEntry = getHistoryEntry(runNumber);
    if (!historyEntry) {
      console.error(`Query #${runNumber} not found in history.`);
      process.exit(1);
    }
    finalSql = historyEntry.sql;
    console.log(`Re-running query #${runNumber}: ${finalSql.substring(0, 50)}...`);
  }

  // Handle schema helpers
  if (tablesFlag) finalSql = SCHEMA_QUERIES.tables;
  if (schemasFlag) finalSql = SCHEMA_QUERIES.schemas;
  if (describeTable) finalSql = SCHEMA_QUERIES.describe(describeTable);

  if (!finalSql) {
    showHelp();
    process.exit(1);
  }

  try {
    let host, user, password, database, port, dialect;

    if (useGlobalEnv) {
      // Load from global credentials file
      loadCredentials(config);
      console.log(`Using credentials: ~/.claude/db-credentials.env (global)`);
    } else {
      // Default: load from project .env
      const envPath = path.join(process.cwd(), '.env');
      require('dotenv').config({ path: envPath });
      console.log(`Using credentials: ${process.cwd()}/.env (local)`);
    }

    if (dbName) {
      // Use database from config (need global credentials loaded)
      if (!useGlobalEnv) {
        // Also load global for db config lookup
        loadCredentials(config);
      }

      const dbConfig = getDbConfig(config, dbName);
      if (!dbConfig) {
        console.error(`Database "${dbName}" not found in config.`);
        console.log('Use --list to see available databases.');
        process.exit(1);
      }
      host = dbConfig.host;
      user = dbConfig.user;
      password = dbConfig.password;
      database = dbConfig.database;
      port = dbConfig.port || 5432;
      dialect = 'postgres';

      console.log(`Using database: ${dbName} (${dbConfig.description || ''})`);
    } else {
      // Use env variables directly
      host = process.env.PG_HOST || process.env.POSTGRES_HOST;
      user = process.env.PG_USER || process.env.POSTGRES_USER;
      password = process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD;
      database = process.env.PG_DB_NAME || process.env.PG_NAME || process.env.POSTGRES_DB;
      port = process.env.PG_PORT || process.env.POSTGRES_PORT || 5432;
      dialect = 'postgres';
    }

    console.log(`Database: ${host} / ${database}`);
    console.log('');

    if (!host || !user || !password || !database) {
      console.error('Missing required connection parameters.');
      console.error('Required: PG_HOST, PG_USER, PG_PASSWORD, PG_DB_NAME');
      process.exit(1);
    }

    const sequelize = new Sequelize(database, user, password, {
      host,
      port: parseInt(port),
      dialect,
      logging: false,
    });

    const [results] = await sequelize.query(finalSql);
    console.log(JSON.stringify(results, null, 2));

    // Save to history (skip schema helper queries)
    if (!tablesFlag && !schemasFlag && !describeTable) {
      addToHistory(dbName, finalSql, useGlobalEnv ? 'global' : 'local');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
