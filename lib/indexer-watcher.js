const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const Utils = require('./utils');
const ConfigManager = require('./config-manager');
const IndexerCore = require('./indexer-core');

/**
 * File Watcher
 * Monitors file changes and updates index automatically
 */
class IndexerWatcher {
  constructor(projectId, projectPath) {
    this.projectId = projectId;
    this.projectPath = projectPath;
    this.configManager = new ConfigManager();
    this.config = this.configManager.getProjectConfig(projectId);
    this.indexer = new IndexerCore(projectId);
    this.watcher = null;
    this.isWatching = false;
    this.stats = {
      filesAdded: 0,
      filesChanged: 0,
      filesDeleted: 0,
      errors: 0
    };
  }

  /**
   * Start watching
   */
  async start() {
    if (this.isWatching) {
      console.log(`Watcher already running for project ${this.projectId}`);
      return;
    }

    console.log(`Starting file watcher for ${this.projectId}...`);
    console.log(`Watching: ${this.projectPath}`);

    this.watcher = chokidar.watch(this.projectPath, {
      ignored: this.getIgnorePatterns(),
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: this.config.debounceMs || 500,
        pollInterval: 100
      },
      depth: 99,
      followSymlinks: false
    });

    this.watcher
      .on('add', filePath => this.onFileAdded(filePath))
      .on('change', filePath => this.onFileChanged(filePath))
      .on('unlink', filePath => this.onFileDeleted(filePath))
      .on('error', error => this.onError(error))
      .on('ready', () => this.onReady());

    this.isWatching = true;
  }

  /**
   * Stop watching
   */
  async stop() {
    if (!this.isWatching) {
      return;
    }

    console.log(`Stopping file watcher for ${this.projectId}...`);

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    this.indexer.close();
    this.isWatching = false;

    console.log(`Watcher stopped for ${this.projectId}`);
  }

  /**
   * Get ignore patterns for chokidar
   */
  getIgnorePatterns() {
    const patterns = this.config.exclude.map(pattern => {
      // Convert glob pattern to regex-like pattern for chokidar
      return pattern.replace(/\*\*/g, '**');
    });

    // Always ignore these
    patterns.push('**/.git/**');
    patterns.push('**/node_modules/**');
    patterns.push('**/.codebase-index/**');

    return patterns;
  }

  /**
   * Check if file should be indexed
   */
  shouldIndexFile(filePath) {
    return this.configManager.shouldIndexFile(filePath, this.config);
  }

  /**
   * Handle file added
   */
  async onFileAdded(filePath) {
    if (!this.shouldIndexFile(filePath)) {
      return;
    }

    try {
      const result = await this.indexer.indexFile(filePath, this.projectPath);

      if (result.status === 'indexed') {
        this.stats.filesAdded++;
        console.log(`[+] Added: ${result.path} (${Utils.formatBytes(result.size)})`);
      } else if (result.status === 'error') {
        this.stats.errors++;
        console.error(`[!] Error adding ${result.path}: ${result.error}`);
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`[!] Error adding ${filePath}:`, error.message);
    }
  }

  /**
   * Handle file changed
   */
  async onFileChanged(filePath) {
    if (!this.shouldIndexFile(filePath)) {
      return;
    }

    try {
      const result = await this.indexer.indexFile(filePath, this.projectPath);

      if (result.status === 'indexed') {
        this.stats.filesChanged++;
        console.log(`[~] Updated: ${result.path} (${Utils.formatBytes(result.size)})`);
      } else if (result.status === 'unchanged') {
        // Silent skip
      } else if (result.status === 'error') {
        this.stats.errors++;
        console.error(`[!] Error updating ${result.path}: ${result.error}`);
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`[!] Error updating ${filePath}:`, error.message);
    }
  }

  /**
   * Handle file deleted
   */
  async onFileDeleted(filePath) {
    try {
      const removed = this.indexer.removeFile(filePath, this.projectPath);

      if (removed) {
        this.stats.filesDeleted++;
        const relativePath = Utils.getRelativePath(this.projectPath, filePath);
        console.log(`[-] Removed: ${relativePath}`);
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`[!] Error removing ${filePath}:`, error.message);
    }
  }

  /**
   * Handle errors
   */
  onError(error) {
    console.error('[WATCHER ERROR]', error);
    this.stats.errors++;
  }

  /**
   * Handle ready event
   */
  onReady() {
    console.log(`\n✓ Watcher ready for ${this.projectId}`);
    console.log(`Monitoring: ${this.projectPath}`);
    console.log(`Press Ctrl+C to stop\n`);
    this.printStats();
  }

  /**
   * Get statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Print statistics
   */
  printStats() {
    const indexStats = this.indexer.getStats();

    console.log('═'.repeat(50));
    console.log(`Project: ${this.projectId}`);
    console.log(`Total files indexed: ${indexStats.fileCount}`);
    console.log(`Total size: ${Utils.formatBytes(indexStats.totalSize)}`);
    console.log('\nWatcher statistics:');
    console.log(`  Files added: ${this.stats.filesAdded}`);
    console.log(`  Files changed: ${this.stats.filesChanged}`);
    console.log(`  Files deleted: ${this.stats.filesDeleted}`);
    console.log(`  Errors: ${this.stats.errors}`);
    console.log('═'.repeat(50));
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      filesAdded: 0,
      filesChanged: 0,
      filesDeleted: 0,
      errors: 0
    };
  }
}

module.exports = IndexerWatcher;
