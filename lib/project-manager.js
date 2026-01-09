const fs = require('fs');
const path = require('path');
const Utils = require('./utils');
const Registry = require('./registry');
const ConfigManager = require('./config-manager');
const IndexerCore = require('./indexer-core');
const IndexerQuery = require('./indexer-query');
const IndexerWatcher = require('./indexer-watcher');

/**
 * Project Manager
 * High-level API for managing multiple indexed projects
 */
class ProjectManager {
  constructor() {
    this.registry = new Registry();
    this.configManager = new ConfigManager();
    this.watchers = new Map(); // projectId -> IndexerWatcher
  }

  /**
   * Add a new project
   */
  async addProject(projectPath, options = {}) {
    // Validate path
    if (!Utils.isValidProjectPath(projectPath)) {
      throw new Error(`Invalid project path: ${projectPath}`);
    }

    const normalizedPath = path.resolve(projectPath);

    // Check if already exists
    const existing = this.registry.getByPath(normalizedPath);
    if (existing) {
      throw new Error(`Project already exists: ${existing.name} (${existing.id})`);
    }

    // Generate project ID
    const projectId = Utils.generateProjectId(normalizedPath);

    // Create project entry
    const project = {
      id: projectId,
      name: options.name || Utils.getProjectNameFromPath(normalizedPath),
      path: normalizedPath,
      indexFile: `${projectId}.db`,
      indexed: false,
      watching: options.watch || false,
      fileCount: 0,
      totalSize: 0,
      config: options.config || 'inherit'
    };

    // Save to registry
    this.registry.add(project);

    console.log(`✓ Added project: ${project.name}`);
    console.log(`  ID: ${project.id}`);
    console.log(`  Path: ${project.path}`);

    // If auto-index is enabled
    if (options.index) {
      await this.indexProject(projectId);
    }

    // If watch is enabled
    if (options.watch) {
      await this.startWatcher(projectId);
    }

    return project;
  }

  /**
   * Remove a project
   */
  async removeProject(projectIdOrPath) {
    const project = this.getProject(projectIdOrPath);
    if (!project) {
      throw new Error(`Project not found: ${projectIdOrPath}`);
    }

    // Stop watcher if running
    if (this.watchers.has(project.id)) {
      await this.stopWatcher(project.id);
    }

    // Remove from registry
    this.registry.remove(project.id);

    // Delete index file
    const indexPath = path.join(Utils.getIndexesDir(), project.indexFile);
    if (fs.existsSync(indexPath)) {
      fs.unlinkSync(indexPath);
    }

    // Delete project config
    this.configManager.deleteProjectConfig(project.id);

    console.log(`✓ Removed project: ${project.name}`);

    return true;
  }

  /**
   * Get project by ID or path
   */
  getProject(projectIdOrPath) {
    // Try by ID first
    let project = this.registry.getById(projectIdOrPath);

    // Try by path
    if (!project) {
      project = this.registry.getByPath(projectIdOrPath);
    }

    // Try finding project that contains path
    if (!project) {
      project = this.registry.findProjectContainingPath(projectIdOrPath);
    }

    return project;
  }

  /**
   * Get all projects
   */
  getAllProjects() {
    return this.registry.getAll();
  }

  /**
   * Index a project
   */
  async indexProject(projectIdOrPath, options = {}) {
    const project = this.getProject(projectIdOrPath);
    if (!project) {
      throw new Error(`Project not found: ${projectIdOrPath}`);
    }

    console.log(`\nIndexing project: ${project.name}`);
    console.log(`Path: ${project.path}\n`);

    const startTime = Date.now();
    const indexer = new IndexerCore(project.id);
    const config = this.configManager.getProjectConfig(project.id);

    // Get all files to index
    const allFiles = Utils.getFilesRecursive(project.path);
    const filesToIndex = allFiles.filter(f =>
      this.configManager.shouldIndexFile(f, config)
    );

    console.log(`Found ${filesToIndex.length} files to index (${allFiles.length} total files)`);

    let indexed = 0;
    let skipped = 0;
    let errors = 0;

    // Index files in batches
    const batchSize = this.configManager.getPerformanceConfig().batchSize || 50;

    for (let i = 0; i < filesToIndex.length; i += batchSize) {
      const batch = filesToIndex.slice(i, i + batchSize);

      for (const file of batch) {
        const result = await indexer.indexFile(file, project.path);

        if (result.status === 'indexed') {
          indexed++;
          if (indexed % 10 === 0) {
            process.stdout.write(`\rIndexed: ${indexed}/${filesToIndex.length}`);
          }
        } else if (result.status === 'unchanged') {
          skipped++;
        } else if (result.status === 'error') {
          errors++;
        }
      }
    }

    process.stdout.write('\n');

    // Get stats
    const stats = indexer.getStats();
    const duration = Date.now() - startTime;

    // Update registry
    this.registry.updateStats(project.id, stats);

    // Optimize database
    indexer.optimize();
    indexer.close();

    console.log(`\n✓ Indexing complete!`);
    console.log(`  Files indexed: ${indexed}`);
    console.log(`  Files skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Total size: ${Utils.formatBytes(stats.totalSize)}`);
    console.log(`  Duration: ${Utils.formatDuration(duration)}`);

    return {
      indexed,
      skipped,
      errors,
      duration,
      stats
    };
  }

  /**
   * Re-index a project (clear and rebuild)
   */
  async reindexProject(projectIdOrPath) {
    const project = this.getProject(projectIdOrPath);
    if (!project) {
      throw new Error(`Project not found: ${projectIdOrPath}`);
    }

    console.log(`Re-indexing project: ${project.name}`);

    // Clear existing index
    const indexer = new IndexerCore(project.id);
    indexer.clear();
    indexer.close();

    // Index again
    return await this.indexProject(project.id);
  }

  /**
   * Start file watcher for a project
   */
  async startWatcher(projectIdOrPath) {
    const project = this.getProject(projectIdOrPath);
    if (!project) {
      throw new Error(`Project not found: ${projectIdOrPath}`);
    }

    // Check if already watching
    if (this.watchers.has(project.id)) {
      console.log(`Watcher already running for ${project.name}`);
      return;
    }

    // Create and start watcher
    const watcher = new IndexerWatcher(project.id, project.path);
    await watcher.start();

    this.watchers.set(project.id, watcher);

    // Update registry
    this.registry.setWatching(project.id, true);

    return watcher;
  }

  /**
   * Stop file watcher for a project
   */
  async stopWatcher(projectIdOrPath) {
    const project = this.getProject(projectIdOrPath);
    if (!project) {
      throw new Error(`Project not found: ${projectIdOrPath}`);
    }

    const watcher = this.watchers.get(project.id);
    if (!watcher) {
      console.log(`No watcher running for ${project.name}`);
      return;
    }

    await watcher.stop();
    this.watchers.delete(project.id);

    // Update registry
    this.registry.setWatching(project.id, false);
  }

  /**
   * Start watchers for all projects
   */
  async startAllWatchers() {
    const projects = this.registry.getByStatus('indexed');

    console.log(`Starting watchers for ${projects.length} projects...`);

    for (const project of projects) {
      try {
        await this.startWatcher(project.id);
      } catch (error) {
        console.error(`Failed to start watcher for ${project.name}:`, error.message);
      }
    }
  }

  /**
   * Stop all watchers
   */
  async stopAllWatchers() {
    console.log(`Stopping ${this.watchers.size} watchers...`);

    for (const [projectId, watcher] of this.watchers) {
      try {
        await watcher.stop();
      } catch (error) {
        console.error(`Failed to stop watcher for ${projectId}:`, error.message);
      }
    }

    this.watchers.clear();
  }

  /**
   * Search across one or all projects
   */
  async search(query, options = {}) {
    const {
      projectId = null,
      maxResults = 10,
      allProjects = false
    } = options;

    const results = [];

    if (allProjects) {
      // Search across all indexed projects
      const projects = this.registry.getByStatus('indexed');

      for (const project of projects) {
        try {
          const searcher = new IndexerQuery(project.id);
          const projectResults = searcher.search(query, { maxResults });
          searcher.close();

          results.push({
            project: project,
            results: projectResults
          });
        } catch (error) {
          console.error(`Search error in ${project.name}:`, error.message);
        }
      }
    } else {
      // Search in specific project or current directory
      let targetProject;

      if (projectId) {
        targetProject = this.getProject(projectId);
      } else {
        // Auto-detect from current directory
        targetProject = this.registry.findProjectContainingPath(Utils.getCwd());
      }

      if (!targetProject) {
        throw new Error('No project found. Specify a project or run from a project directory.');
      }

      const searcher = new IndexerQuery(targetProject.id);
      const searchResults = searcher.search(query, { maxResults });
      searcher.close();

      results.push({
        project: targetProject,
        results: searchResults
      });
    }

    return results;
  }

  /**
   * Get statistics for all projects
   */
  getGlobalStats() {
    return this.registry.getStats();
  }

  /**
   * Get statistics for a specific project
   */
  getProjectStats(projectIdOrPath) {
    const project = this.getProject(projectIdOrPath);
    if (!project) {
      throw new Error(`Project not found: ${projectIdOrPath}`);
    }

    if (!project.indexed) {
      return {
        project: project,
        indexed: false
      };
    }

    const indexer = new IndexerCore(project.id);
    const stats = indexer.getStats();
    indexer.close();

    return {
      project: project,
      indexed: true,
      stats: stats
    };
  }

  /**
   * List all projects
   */
  listProjects() {
    return this.registry.list();
  }

  /**
   * Clean up orphaned projects
   */
  cleanup() {
    const removed = this.registry.cleanup();
    console.log(`Cleaned up ${removed} orphaned project(s)`);
    return removed;
  }

  /**
   * Get watcher status
   */
  getWatcherStatus() {
    const status = [];

    for (const [projectId, watcher] of this.watchers) {
      const project = this.registry.getById(projectId);
      status.push({
        project: project,
        stats: watcher.getStats(),
        isWatching: watcher.isWatching
      });
    }

    return status;
  }
}

module.exports = ProjectManager;
