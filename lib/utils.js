const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Utility functions for the codebase indexer
 */
class Utils {
  /**
   * Get the global storage directory for indexes
   */
  static getGlobalStorageDir() {
    const homeDir = os.homedir();
    let storageDir;

    if (process.platform === 'win32') {
      storageDir = path.join(homeDir, 'AppData', 'Roaming', 'codebase-indexer');
    } else if (process.platform === 'darwin') {
      storageDir = path.join(homeDir, 'Library', 'Application Support', 'codebase-indexer');
    } else {
      storageDir = path.join(homeDir, '.codebase-indexer');
    }

    // Create if doesn't exist
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    return storageDir;
  }

  /**
   * Get the indexes directory
   */
  static getIndexesDir() {
    const indexesDir = path.join(this.getGlobalStorageDir(), 'indexes');
    if (!fs.existsSync(indexesDir)) {
      fs.mkdirSync(indexesDir, { recursive: true });
    }
    return indexesDir;
  }

  /**
   * Get the cache directory
   */
  static getCacheDir() {
    const cacheDir = path.join(this.getGlobalStorageDir(), 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    return cacheDir;
  }

  /**
   * Get the watchers directory
   */
  static getWatchersDir() {
    const watchersDir = path.join(this.getGlobalStorageDir(), 'watchers');
    if (!fs.existsSync(watchersDir)) {
      fs.mkdirSync(watchersDir, { recursive: true });
    }
    return watchersDir;
  }

  /**
   * Generate MD5 hash of content
   */
  static getHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Generate unique ID for a project based on its path
   */
  static generateProjectId(projectPath) {
    const normalized = path.normalize(projectPath).toLowerCase();
    const hash = this.getHash(normalized).substring(0, 8);
    const basename = path.basename(normalized).replace(/[^a-z0-9]/gi, '-');
    return `${basename}-${hash}`;
  }

  /**
   * Normalize file path for consistent comparison
   */
  static normalizePath(filePath) {
    return path.normalize(filePath).replace(/\\/g, '/');
  }

  /**
   * Check if a path is within another path
   */
  static isWithinPath(childPath, parentPath) {
    const relative = path.relative(parentPath, childPath);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  /**
   * Format bytes to human readable size
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format duration in milliseconds to human readable
   */
  static formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * Simple glob pattern matching
   */
  static matchGlob(filePath, pattern) {
    // Special handling for extension patterns like **/*.ext
    // These should only match files, not directories containing .ext
    if (pattern.match(/\*\*\/\*\.\w+$/)) {
      const ext = pattern.split('.').pop();
      // Get the last segment (filename)
      const lastSegment = filePath.split(/[\/\\]/).pop();
      return lastSegment.endsWith('.' + ext);
    }

    // Convert glob pattern to regex for other patterns
    const regexPattern = pattern
      .replace(/\*\*/g, '§DOUBLESTAR§')
      .replace(/\*/g, '[^/]*')
      .replace(/§DOUBLESTAR§/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\./g, '\\.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  /**
   * Check if file matches any of the patterns
   */
  static matchesAnyPattern(filePath, patterns) {
    const normalizedPath = this.normalizePath(filePath);
    return patterns.some(pattern => this.matchGlob(normalizedPath, pattern));
  }

  /**
   * Read file safely with error handling
   */
  static readFileSafe(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return null;
    }
  }

  /**
   * Write file safely with error handling
   */
  static writeFileSafe(filePath, content) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } catch (error) {
      console.error(`Failed to write ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Get file stats safely
   */
  static getStatsSafe(filePath) {
    try {
      return fs.statSync(filePath);
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract keywords from text
   */
  static extractKeywords(text, maxKeywords = 20) {
    // Remove special characters and split into words
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3); // Only words longer than 3 chars

    // Count frequency
    const freq = {};
    words.forEach(word => {
      freq[word] = (freq[word] || 0) + 1;
    });

    // Filter out common stop words
    const stopWords = new Set([
      'this', 'that', 'with', 'from', 'have', 'will', 'would', 'could',
      'should', 'about', 'which', 'their', 'there', 'where', 'when',
      'what', 'them', 'then', 'than', 'these', 'those', 'some', 'into',
      'only', 'also', 'over', 'such', 'just', 'more', 'very', 'been',
      'were', 'they', 'been', 'have', 'make', 'after', 'before', 'through'
    ]);

    const filtered = Object.entries(freq)
      .filter(([word]) => !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords);

    return Object.fromEntries(filtered);
  }

  /**
   * Get relative path from base to target
   */
  static getRelativePath(from, to) {
    return path.relative(from, to).replace(/\\/g, '/');
  }

  /**
   * Sleep for ms milliseconds
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debounce function
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Get current timestamp in ISO format
   */
  static getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Parse file extension
   */
  static getExtension(filePath) {
    return path.extname(filePath).toLowerCase();
  }

  /**
   * Check if file is binary
   */
  static isBinaryFile(filePath) {
    const binaryExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
      '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
      '.exe', '.dll', '.so', '.dylib', '.bin',
      '.class', '.jar', '.war', '.ear',
      '.db', '.sqlite', '.mdb',
      '.mp3', '.mp4', '.avi', '.mov', '.wav',
      '.ttf', '.woff', '.woff2', '.eot'
    ];

    const ext = this.getExtension(filePath);
    return binaryExtensions.includes(ext);
  }

  /**
   * Sanitize filename for use in database
   */
  static sanitizeFilename(filename) {
    return filename.replace(/[<>:"|?*]/g, '_');
  }

  /**
   * Get project name from path
   */
  static getProjectNameFromPath(projectPath) {
    return path.basename(projectPath);
  }

  /**
   * Validate project path
   */
  static isValidProjectPath(projectPath) {
    try {
      const stats = fs.statSync(projectPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get files recursively
   */
  static getFilesRecursive(dir, files = []) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip certain directories
          if (entry.name === '.git' || entry.name === 'node_modules') {
            continue;
          }
          this.getFilesRecursive(fullPath, files);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }

    return files;
  }

  /**
   * Count lines in file
   */
  static countLines(content) {
    return content.split('\n').length;
  }

  /**
   * Create a snippet from content around a match
   */
  static createSnippet(content, searchTerm, contextLines = 2) {
    const lines = content.split('\n');
    const searchLower = searchTerm.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(searchLower)) {
        const start = Math.max(0, i - contextLines);
        const end = Math.min(lines.length, i + contextLines + 1);
        const snippet = lines.slice(start, end).join('\n');
        return {
          lineNumber: i + 1,
          snippet: snippet,
          context: `Lines ${start + 1}-${end}`
        };
      }
    }

    // If no match, return first few lines
    return {
      lineNumber: 1,
      snippet: lines.slice(0, 5).join('\n'),
      context: 'Lines 1-5'
    };
  }

  /**
   * Check if running in Claude Code
   */
  static isClaudeCode() {
    return process.env.CLAUDE_CODE === 'true' || process.env.ANTHROPIC_CLI === 'true';
  }

  /**
   * Get current working directory
   */
  static getCwd() {
    return process.cwd();
  }
}

module.exports = Utils;
