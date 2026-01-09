const fs = require('fs');
const path = require('path');
const Utils = require('./utils');

/**
 * Project Registry
 * Manages the list of all indexed projects
 */
class Registry {
  constructor() {
    this.registryPath = path.join(Utils.getGlobalStorageDir(), 'registry.json');
    this.ensureRegistry();
  }

  /**
   * Ensure registry file exists
   */
  ensureRegistry() {
    if (!fs.existsSync(this.registryPath)) {
      this.save({
        version: '1.0.0',
        projects: []
      });
    }
  }

  /**
   * Load registry
   */
  load() {
    try {
      const content = fs.readFileSync(this.registryPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load registry:', error.message);
      return { version: '1.0.0', projects: [] };
    }
  }

  /**
   * Save registry
   */
  save(data) {
    try {
      const content = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.registryPath, content, 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to save registry:', error.message);
      return false;
    }
  }

  /**
   * Get all projects
   */
  getAll() {
    const registry = this.load();
    return registry.projects || [];
  }

  /**
   * Get project by ID
   */
  getById(projectId) {
    const projects = this.getAll();
    return projects.find(p => p.id === projectId);
  }

  /**
   * Get project by path
   */
  getByPath(projectPath) {
    const normalizedPath = Utils.normalizePath(projectPath);
    const projects = this.getAll();
    return projects.find(p => Utils.normalizePath(p.path) === normalizedPath);
  }

  /**
   * Find project that contains a given path
   */
  findProjectContainingPath(targetPath) {
    const projects = this.getAll();
    const normalizedTarget = Utils.normalizePath(targetPath);

    // First, try exact match
    let match = projects.find(p => Utils.normalizePath(p.path) === normalizedTarget);
    if (match) return match;

    // Then, find project that contains this path
    // Sort by path length (longest first) to get most specific match
    const sorted = projects
      .filter(p => Utils.isWithinPath(normalizedTarget, p.path))
      .sort((a, b) => b.path.length - a.path.length);

    return sorted[0] || null;
  }

  /**
   * Add a project
   */
  add(project) {
    const registry = this.load();

    // Check if already exists
    const existing = this.getById(project.id);
    if (existing) {
      throw new Error(`Project with ID '${project.id}' already exists`);
    }

    // Check if path already exists
    const existingPath = this.getByPath(project.path);
    if (existingPath) {
      throw new Error(`Project at path '${project.path}' already exists with ID '${existingPath.id}'`);
    }

    registry.projects.push({
      ...project,
      addedAt: Utils.getTimestamp()
    });

    return this.save(registry);
  }

  /**
   * Update a project
   */
  update(projectId, updates) {
    const registry = this.load();
    const index = registry.projects.findIndex(p => p.id === projectId);

    if (index === -1) {
      throw new Error(`Project '${projectId}' not found`);
    }

    registry.projects[index] = {
      ...registry.projects[index],
      ...updates,
      updatedAt: Utils.getTimestamp()
    };

    return this.save(registry);
  }

  /**
   * Remove a project
   */
  remove(projectId) {
    const registry = this.load();
    const index = registry.projects.findIndex(p => p.id === projectId);

    if (index === -1) {
      return false;
    }

    registry.projects.splice(index, 1);
    return this.save(registry);
  }

  /**
   * Check if project exists
   */
  exists(projectId) {
    return this.getById(projectId) !== undefined;
  }

  /**
   * Get project count
   */
  count() {
    return this.getAll().length;
  }

  /**
   * Get projects by status
   */
  getByStatus(status) {
    const projects = this.getAll();
    switch (status) {
      case 'indexed':
        return projects.filter(p => p.indexed === true);
      case 'not-indexed':
        return projects.filter(p => p.indexed === false);
      case 'watching':
        return projects.filter(p => p.watching === true);
      case 'not-watching':
        return projects.filter(p => p.watching === false);
      default:
        return projects;
    }
  }

  /**
   * Update project stats
   */
  updateStats(projectId, stats) {
    return this.update(projectId, {
      fileCount: stats.fileCount,
      totalSize: stats.totalSize,
      lastIndexed: Utils.getTimestamp(),
      indexed: true
    });
  }

  /**
   * Mark project as indexed
   */
  markIndexed(projectId, fileCount, totalSize) {
    return this.updateStats(projectId, { fileCount, totalSize });
  }

  /**
   * Mark project as not indexed
   */
  markNotIndexed(projectId) {
    return this.update(projectId, {
      indexed: false,
      fileCount: 0,
      totalSize: 0
    });
  }

  /**
   * Set watching status
   */
  setWatching(projectId, watching) {
    return this.update(projectId, { watching });
  }

  /**
   * Get statistics
   */
  getStats() {
    const projects = this.getAll();

    return {
      total: projects.length,
      indexed: projects.filter(p => p.indexed).length,
      notIndexed: projects.filter(p => !p.indexed).length,
      watching: projects.filter(p => p.watching).length,
      totalFiles: projects.reduce((sum, p) => sum + (p.fileCount || 0), 0),
      totalSize: projects.reduce((sum, p) => sum + (p.totalSize || 0), 0)
    };
  }

  /**
   * Export registry
   */
  export(outputPath) {
    try {
      const registry = this.load();
      const content = JSON.stringify(registry, null, 2);
      fs.writeFileSync(outputPath, content, 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to export registry:', error.message);
      return false;
    }
  }

  /**
   * Import registry
   */
  import(inputPath) {
    try {
      const content = fs.readFileSync(inputPath, 'utf8');
      const registry = JSON.parse(content);
      return this.save(registry);
    } catch (error) {
      console.error('Failed to import registry:', error.message);
      return false;
    }
  }

  /**
   * Clean up orphaned projects (paths that no longer exist)
   */
  cleanup() {
    const registry = this.load();
    const cleaned = registry.projects.filter(project => {
      return Utils.isValidProjectPath(project.path);
    });

    const removed = registry.projects.length - cleaned.length;

    registry.projects = cleaned;
    this.save(registry);

    return removed;
  }

  /**
   * List all projects (formatted for display)
   */
  list() {
    const projects = this.getAll();

    return projects.map(p => ({
      id: p.id,
      name: p.name,
      path: p.path,
      indexed: p.indexed || false,
      watching: p.watching || false,
      fileCount: p.fileCount || 0,
      size: Utils.formatBytes(p.totalSize || 0),
      lastIndexed: p.lastIndexed || 'Never'
    }));
  }
}

module.exports = Registry;
