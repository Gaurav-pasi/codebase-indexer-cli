const fs = require('fs');
const path = require('path');
const Utils = require('./utils');

/**
 * Configuration Manager
 * Handles global and per-project configuration
 */
class ConfigManager {
  constructor() {
    this.globalConfigPath = path.join(Utils.getGlobalStorageDir(), 'global-config.json');
    this.defaultConfig = this.getDefaultConfig();
    this.ensureGlobalConfig();
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      version: '1.0.0',
      defaults: {
        include: [
          '**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx',
          '**/*.java', '**/*.cs', '**/*.py', '**/*.rb',
          '**/*.php', '**/*.go', '**/*.rs', '**/*.cpp', '**/*.c', '**/*.h',
          '**/*.html', '**/*.htm', '**/*.css', '**/*.scss', '**/*.sass',
          '**/*.json', '**/*.xml', '**/*.yaml', '**/*.yml',
          '**/*.jsp', '**/*.jds', '**/*.jdc', // For your specific use case
          '**/*.sql', '**/*.md', '**/*.txt'
        ],
        exclude: [
          '**/node_modules/**',
          '**/target/**',
          '**/bin/**',
          '**/obj/**',
          '**/.git/**',
          '**/.svn/**',
          '**/.hg/**',
          '**/dist/**',
          '**/build/**',
          '**/*.class',
          '**/*.jar',
          '**/*.war',
          '**/*.ear',
          '**/*.dll',
          '**/*.exe',
          '**/*.so',
          '**/*.dylib',
          '**/*.o',
          '**/*.a',
          '**/*.gif',
          '**/*.png',
          '**/*.jpg',
          '**/*.jpeg',
          '**/*.svg',
          '**/*.ico',
          '**/*.pdf',
          '**/*.zip',
          '**/*.tar',
          '**/*.gz',
          '**/*.rar',
          '**/*.7z',
          '**/logs/**',
          '**/log/**',
          '**/temp/**',
          '**/tmp/**',
          '**/.codebase-index/**',
          '**/.indexer/**'
        ],
        maxFileSize: 5242880, // 5MB
        enableFullTextSearch: true,
        enableWatching: true
      },

      claudeCode: {
        enabled: true,
        autoDetect: true,
        autoInject: true,
        maxFilesInject: 5,
        minScore: 0.3,
        formatOutput: 'markdown',
        verbose: false
      },

      performance: {
        parallelIndexing: true,
        workers: 4,
        cacheTTL: 300000, // 5 minutes
        batchSize: 50,
        debounceMs: 500
      },

      search: {
        maxResults: 10,
        minScore: 0.3,
        enableFuzzy: true,
        contextLines: 5
      }
    };
  }

  /**
   * Ensure global config exists
   */
  ensureGlobalConfig() {
    if (!fs.existsSync(this.globalConfigPath)) {
      this.saveGlobalConfig(this.defaultConfig);
    }
  }

  /**
   * Get global configuration
   */
  getGlobalConfig() {
    try {
      const content = fs.readFileSync(this.globalConfigPath, 'utf8');
      const config = JSON.parse(content);
      // Merge with defaults to ensure all fields exist
      return this.mergeConfigs(this.defaultConfig, config);
    } catch (error) {
      console.warn('Failed to read global config, using defaults:', error.message);
      return this.defaultConfig;
    }
  }

  /**
   * Save global configuration
   */
  saveGlobalConfig(config) {
    try {
      const content = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.globalConfigPath, content, 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to save global config:', error.message);
      return false;
    }
  }

  /**
   * Update global configuration
   */
  updateGlobalConfig(updates) {
    const current = this.getGlobalConfig();
    const updated = this.mergeConfigs(current, updates);
    return this.saveGlobalConfig(updated);
  }

  /**
   * Get project-specific config file path
   */
  getProjectConfigPath(projectId) {
    return path.join(Utils.getGlobalStorageDir(), 'projects', `${projectId}.json`);
  }

  /**
   * Get project configuration
   * Merges global defaults with project-specific overrides
   */
  getProjectConfig(projectId) {
    const globalConfig = this.getGlobalConfig();
    const projectConfigPath = this.getProjectConfigPath(projectId);

    if (!fs.existsSync(projectConfigPath)) {
      // No project-specific config, return global defaults
      return globalConfig.defaults;
    }

    try {
      const content = fs.readFileSync(projectConfigPath, 'utf8');
      const projectConfig = JSON.parse(content);

      // Merge with global defaults
      return this.mergeConfigs(globalConfig.defaults, projectConfig);
    } catch (error) {
      console.warn(`Failed to read project config for ${projectId}, using defaults:`, error.message);
      return globalConfig.defaults;
    }
  }

  /**
   * Save project configuration
   */
  saveProjectConfig(projectId, config) {
    try {
      const projectConfigPath = this.getProjectConfigPath(projectId);
      const dir = path.dirname(projectConfigPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const content = JSON.stringify(config, null, 2);
      fs.writeFileSync(projectConfigPath, content, 'utf8');
      return true;
    } catch (error) {
      console.error(`Failed to save project config for ${projectId}:`, error.message);
      return false;
    }
  }

  /**
   * Update project configuration
   */
  updateProjectConfig(projectId, updates) {
    const current = this.getProjectConfig(projectId);
    const updated = this.mergeConfigs(current, updates);
    return this.saveProjectConfig(projectId, updated);
  }

  /**
   * Delete project configuration
   */
  deleteProjectConfig(projectId) {
    try {
      const projectConfigPath = this.getProjectConfigPath(projectId);
      if (fs.existsSync(projectConfigPath)) {
        fs.unlinkSync(projectConfigPath);
      }
      return true;
    } catch (error) {
      console.error(`Failed to delete project config for ${projectId}:`, error.message);
      return false;
    }
  }

  /**
   * Merge two config objects deeply
   */
  mergeConfigs(base, override) {
    const result = { ...base };

    for (const key in override) {
      if (override.hasOwnProperty(key)) {
        if (typeof override[key] === 'object' && !Array.isArray(override[key]) && override[key] !== null) {
          result[key] = this.mergeConfigs(base[key] || {}, override[key]);
        } else {
          result[key] = override[key];
        }
      }
    }

    return result;
  }

  /**
   * Set a config value using dot notation
   * Example: set('defaults.maxFileSize', 10485760)
   */
  setGlobalValue(keyPath, value) {
    const config = this.getGlobalConfig();
    this.setNestedValue(config, keyPath, value);
    return this.saveGlobalConfig(config);
  }

  /**
   * Set a project config value using dot notation
   */
  setProjectValue(projectId, keyPath, value) {
    const config = this.getProjectConfig(projectId);
    this.setNestedValue(config, keyPath, value);
    return this.saveProjectConfig(projectId, config);
  }

  /**
   * Set nested value in object using dot notation
   */
  setNestedValue(obj, keyPath, value) {
    const keys = keyPath.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Get a config value using dot notation
   */
  getGlobalValue(keyPath) {
    const config = this.getGlobalConfig();
    return this.getNestedValue(config, keyPath);
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, keyPath) {
    const keys = keyPath.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && current.hasOwnProperty(key)) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Check if file should be indexed based on config
   */
  shouldIndexFile(filePath, projectConfig) {
    const normalizedPath = Utils.normalizePath(filePath);

    // Check if binary
    if (Utils.isBinaryFile(normalizedPath)) {
      return false;
    }

    // Check exclusions first
    if (Utils.matchesAnyPattern(normalizedPath, projectConfig.exclude)) {
      return false;
    }

    // Check inclusions
    if (Utils.matchesAnyPattern(normalizedPath, projectConfig.include)) {
      // Check file size
      const stats = Utils.getStatsSafe(filePath);
      if (stats && stats.size <= projectConfig.maxFileSize) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get Claude Code config
   */
  getClaudeCodeConfig() {
    const globalConfig = this.getGlobalConfig();
    return globalConfig.claudeCode || this.defaultConfig.claudeCode;
  }

  /**
   * Update Claude Code config
   */
  updateClaudeCodeConfig(updates) {
    return this.updateGlobalConfig({ claudeCode: updates });
  }

  /**
   * Get search config
   */
  getSearchConfig() {
    const globalConfig = this.getGlobalConfig();
    return globalConfig.search || this.defaultConfig.search;
  }

  /**
   * Get performance config
   */
  getPerformanceConfig() {
    const globalConfig = this.getGlobalConfig();
    return globalConfig.performance || this.defaultConfig.performance;
  }

  /**
   * Reset to defaults
   */
  resetToDefaults() {
    return this.saveGlobalConfig(this.defaultConfig);
  }

  /**
   * Export configuration
   */
  exportConfig(outputPath) {
    try {
      const config = this.getGlobalConfig();
      const content = JSON.stringify(config, null, 2);
      fs.writeFileSync(outputPath, content, 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to export config:', error.message);
      return false;
    }
  }

  /**
   * Import configuration
   */
  importConfig(inputPath) {
    try {
      const content = fs.readFileSync(inputPath, 'utf8');
      const config = JSON.parse(content);
      return this.saveGlobalConfig(config);
    } catch (error) {
      console.error('Failed to import config:', error.message);
      return false;
    }
  }
}

module.exports = ConfigManager;
