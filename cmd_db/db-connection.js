/**
 * db-connection.js
 *
 * Shared database connection module.
 * Used by db-query.js, skill-db-sync.js, and other scripts.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { Sequelize } = require('sequelize');

const CONFIG_PATH = path.join(__dirname, 'db-config.json');

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

function listDatabases() {
  const config = loadConfig();
  loadCredentials(config);

  const databases = [];
  for (const [name, db] of Object.entries(config.databases)) {
    const connection = db.extends ? config.connections[db.extends] : {};
    databases.push({
      name,
      description: db.description || 'No description',
      host: process.env[connection.hostVar] || 'N/A',
      dbName: db.dbName || 'N/A'
    });
  }
  return databases;
}

/**
 * Get a Sequelize connection to a named database
 * @param {string} dbName - Database name from config (dev, qa_naharia, etc.)
 * @returns {Promise<{sequelize: Sequelize, dbConfig: object}>}
 */
async function getConnection(dbName) {
  const config = loadConfig();
  loadCredentials(config);

  const dbConfig = getDbConfig(config, dbName);
  if (!dbConfig) {
    throw new Error(`Database "${dbName}" not found in config.`);
  }

  if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
    throw new Error('Missing required connection parameters. Check credentials file.');
  }

  const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'postgres',
    logging: false,
  });

  return { sequelize, dbConfig };
}

/**
 * Get connection from environment variables (for local .env usage)
 * @param {string} envPath - Path to .env file
 * @returns {Promise<{sequelize: Sequelize, dbConfig: object}>}
 */
async function getConnectionFromEnv(envPath) {
  require('dotenv').config({ path: envPath });

  const host = process.env.PG_HOST || process.env.POSTGRES_HOST;
  const user = process.env.PG_USER || process.env.POSTGRES_USER;
  const password = process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD;
  const database = process.env.PG_DB_NAME || process.env.PG_NAME || process.env.POSTGRES_DB;
  const port = process.env.PG_PORT || process.env.POSTGRES_PORT || 5432;

  if (!host || !user || !password || !database) {
    throw new Error('Missing required connection parameters in .env');
  }

  const dbConfig = { host, user, password, database, port };

  const sequelize = new Sequelize(database, user, password, {
    host,
    port: parseInt(port),
    dialect: 'postgres',
    logging: false,
  });

  return { sequelize, dbConfig };
}

module.exports = {
  loadConfig,
  loadCredentials,
  getDbConfig,
  listDatabases,
  getConnection,
  getConnectionFromEnv,
  expandTilde
};
