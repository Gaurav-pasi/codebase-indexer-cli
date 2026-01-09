/**
 * Universal Codebase Indexer
 * Main exports
 */

const Utils = require('./utils');
const ConfigManager = require('./config-manager');
const Registry = require('./registry');
const IndexerCore = require('./indexer-core');
const IndexerQuery = require('./indexer-query');
const IndexerWatcher = require('./indexer-watcher');
const ProjectManager = require('./project-manager');
const ClaudeHook = require('./claude-hook');

module.exports = {
  Utils,
  ConfigManager,
  Registry,
  IndexerCore,
  IndexerQuery,
  IndexerWatcher,
  ProjectManager,
  ClaudeHook
};
