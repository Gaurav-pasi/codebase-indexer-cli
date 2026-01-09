const path = require('path');
const fs = require('fs');
const Utils = require('./utils');
const ConfigManager = require('./config-manager');

/**
 * Query Interface (JSON-based version)
 */
class IndexerQuery {
  constructor(projectId) {
    this.projectId = projectId;
    this.configManager = new ConfigManager();
    this.searchConfig = this.configManager.getSearchConfig();
    this.dbPath = path.join(Utils.getIndexesDir(), `${projectId}.json`);
    this.db = this.loadDatabase();
  }

  loadDatabase() {
    if (fs.existsSync(this.dbPath)) {
      try {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        return { files: {}, keywords: {}, metadata: {} };
      }
    }
    return { files: {}, keywords: {}, metadata: {} };
  }

  search(query, options = {}) {
    const {
      maxResults = this.searchConfig.maxResults,
      minScore = this.searchConfig.minScore
    } = options;

    const results = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    for (const [filePath, fileData] of Object.entries(this.db.files)) {
      let score = 0;
      const contentLower = fileData.content.toLowerCase();
      const pathLower = filePath.toLowerCase();

      // Full text match in content
      if (contentLower.includes(queryLower)) {
        score += 0.5;
      }

      // Word matches
      queryWords.forEach(word => {
        if (contentLower.includes(word)) score += 0.2;
        if (pathLower.includes(word)) score += 0.3;
      });

      // Keyword matches
      const keywords = this.db.keywords[filePath] || {};
      queryWords.forEach(word => {
        if (keywords[word]) {
          score += 0.3 * Math.min(keywords[word], 5) / 5;
        }
      });

      if (score >= minScore) {
        const snippet = Utils.createSnippet(fileData.content, query, 2);
        results.push({
          filePath: filePath,
          score: Math.min(score, 1),
          snippet: snippet.snippet,
          lineNumber: snippet.lineNumber,
          matchType: 'content'
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  getFile(filePath) {
    return this.db.files[filePath];
  }

  getStats() {
    return {
      totalFiles: Object.keys(this.db.files).length,
      byExtension: []
    };
  }

  close() {}
}

module.exports = IndexerQuery;
