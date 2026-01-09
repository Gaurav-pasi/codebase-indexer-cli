const fs = require('fs');
const path = require('path');
const Utils = require('./utils');
const ConfigManager = require('./config-manager');

/**
 * Core Indexer (JSON-based version - no compilation required)
 */
class IndexerCore {
  constructor(projectId) {
    this.projectId = projectId;
    this.configManager = new ConfigManager();
    this.config = this.configManager.getProjectConfig(projectId);
    this.dbPath = path.join(Utils.getIndexesDir(), `${projectId}.json`);
    this.db = this.loadDatabase();
  }

  loadDatabase() {
    if (fs.existsSync(this.dbPath)) {
      try {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        console.warn(`Failed to load database: ${error.message}`);
      }
    }
    return { files: {}, keywords: {}, metadata: {}, version: '1.0.0' };
  }

  saveDatabase() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.db, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Failed to save database: ${error.message}`);
      return false;
    }
  }

  async indexFile(filePath, projectPath) {
    try {
      const relativePath = Utils.getRelativePath(projectPath, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const hash = Utils.getHash(content);
      const stats = fs.statSync(filePath);

      if (this.db.files[relativePath] && this.db.files[relativePath].hash === hash) {
        return { status: 'unchanged', path: relativePath };
      }

      const extension = Utils.getExtension(filePath);
      const lines = Utils.countLines(content);
      const keywords = Utils.extractKeywords(content);

      this.db.files[relativePath] = {
        file_path: relativePath,
        content: content,
        hash: hash,
        size: stats.size,
        lines: lines,
        extension: extension,
        modified_at: stats.mtime.toISOString(),
        indexed_at: Utils.getTimestamp()
      };

      this.db.keywords[relativePath] = keywords;
      this.saveDatabase();

      return { status: 'indexed', path: relativePath, size: stats.size };
    } catch (error) {
      return { status: 'error', path: filePath, error: error.message };
    }
  }

  removeFile(filePath, projectPath) {
    const relativePath = Utils.getRelativePath(projectPath, filePath);
    const existed = !!this.db.files[relativePath];
    delete this.db.files[relativePath];
    delete this.db.keywords[relativePath];
    if (existed) this.saveDatabase();
    return existed;
  }

  getStats() {
    const files = Object.values(this.db.files);
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    const byExtension = {};
    files.forEach(f => {
      if (!byExtension[f.extension]) {
        byExtension[f.extension] = { extension: f.extension, count: 0, size: 0 };
      }
      byExtension[f.extension].count++;
      byExtension[f.extension].size += f.size || 0;
    });
    return {
      fileCount: files.length,
      totalSize: totalSize,
      byExtension: Object.values(byExtension).sort((a, b) => b.count - a.count)
    };
  }

  getAllFiles() {
    return Object.values(this.db.files);
  }

  clear() {
    this.db = { files: {}, keywords: {}, metadata: {}, version: '1.0.0' };
    this.saveDatabase();
  }

  close() {
    this.saveDatabase();
  }

  optimize() {}
}

module.exports = IndexerCore;
