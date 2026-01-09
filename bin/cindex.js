#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const ProjectManager = require('../lib/project-manager');
const ConfigManager = require('../lib/config-manager');
const Registry = require('../lib/registry');
const Utils = require('../lib/utils');

const program = new Command();
const projectManager = new ProjectManager();
const configManager = new ConfigManager();
const registry = new Registry();

// Package info
program
  .name('cindex')
  .description('Universal codebase indexer for reducing AI token usage')
  .version('1.0.0');

// ============================================
// PROJECT MANAGEMENT COMMANDS
// ============================================

program
  .command('add <path>')
  .description('Add a project to index')
  .option('-n, --name <name>', 'Project name')
  .option('-w, --watch', 'Start watching for changes')
  .option('-i, --index', 'Index immediately after adding')
  .action(async (projectPath, options) => {
    try {
      const absolutePath = path.resolve(projectPath);
      const project = await projectManager.addProject(absolutePath, {
        name: options.name,
        watch: options.watch,
        index: options.index
      });

      console.log(`\n✓ Project added successfully!`);
      if (options.index) {
        console.log(`✓ Indexing complete`);
      }
      if (options.watch) {
        console.log(`✓ File watcher started`);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('remove <projectIdOrPath>')
  .description('Remove a project from index')
  .action(async (projectIdOrPath) => {
    try {
      await projectManager.removeProject(projectIdOrPath);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all indexed projects')
  .action(() => {
    const projects = projectManager.listProjects();

    if (projects.length === 0) {
      console.log('No projects found. Add a project with: cindex add <path>');
      return;
    }

    console.log('\n📚 Indexed Projects:\n');
    console.log('═'.repeat(80));

    projects.forEach(p => {
      const status = p.indexed ? '✓' : '⚪';
      const watching = p.watching ? '👁' : '  ';
      console.log(`${status} ${watching} ${p.name}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Path: ${p.path}`);
      console.log(`   Files: ${p.fileCount} | Size: ${p.size}`);
      console.log(`   Last indexed: ${p.lastIndexed}`);
      console.log('─'.repeat(80));
    });

    const stats = projectManager.getGlobalStats();
    console.log(`\nTotal: ${stats.total} projects | ${stats.totalFiles} files | ${Utils.formatBytes(stats.totalSize)}`);
  });

// ============================================
// INDEXING COMMANDS
// ============================================

program
  .command('index [projectIdOrPath]')
  .description('Index a project (or all projects with --all)')
  .option('-a, --all', 'Index all projects')
  .action(async (projectIdOrPath, options) => {
    try {
      if (options.all) {
        const projects = registry.getAll();
        console.log(`Indexing ${projects.length} projects...\n`);

        for (const project of projects) {
          await projectManager.indexProject(project.id);
        }

        console.log('\n✓ All projects indexed!');
      } else {
        const target = projectIdOrPath || Utils.getCwd();
        await projectManager.indexProject(target);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('reindex <projectIdOrPath>')
  .description('Re-index a project (clear and rebuild)')
  .action(async (projectIdOrPath) => {
    try {
      await projectManager.reindexProject(projectIdOrPath);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// ============================================
// WATCHING COMMANDS
// ============================================

program
  .command('watch [projectIdOrPath]')
  .description('Start watching a project for changes')
  .option('-a, --all', 'Watch all projects')
  .option('-d, --daemon', 'Run in background (not implemented yet)')
  .action(async (projectIdOrPath, options) => {
    try {
      if (options.all) {
        await projectManager.startAllWatchers();
        console.log('\n✓ All watchers started');
        console.log('Press Ctrl+C to stop all watchers\n');

        // Keep process running
        process.on('SIGINT', async () => {
          console.log('\nStopping all watchers...');
          await projectManager.stopAllWatchers();
          process.exit(0);
        });
      } else {
        const target = projectIdOrPath || Utils.getCwd();
        await projectManager.startWatcher(target);

        // Keep process running
        process.on('SIGINT', async () => {
          console.log('\nStopping watcher...');
          await projectManager.stopWatcher(target);
          process.exit(0);
        });
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('unwatch <projectIdOrPath>')
  .description('Stop watching a project')
  .action(async (projectIdOrPath) => {
    try {
      await projectManager.stopWatcher(projectIdOrPath);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show watcher status')
  .action(() => {
    const status = projectManager.getWatcherStatus();

    if (status.length === 0) {
      console.log('No watchers currently running');
      return;
    }

    console.log('\n👁  Active Watchers:\n');
    console.log('═'.repeat(60));

    status.forEach(s => {
      console.log(`${s.project.name} (${s.project.id})`);
      console.log(`  Path: ${s.project.path}`);
      console.log(`  Files added: ${s.stats.filesAdded}`);
      console.log(`  Files changed: ${s.stats.filesChanged}`);
      console.log(`  Files deleted: ${s.stats.filesDeleted}`);
      console.log(`  Errors: ${s.stats.errors}`);
      console.log('─'.repeat(60));
    });
  });

// ============================================
// SEARCH COMMANDS
// ============================================

program
  .command('search <query>')
  .description('Search indexed files')
  .option('-p, --project <id>', 'Search specific project')
  .option('-a, --all', 'Search all projects')
  .option('-e, --extension <ext>', 'Filter by file extension')
  .option('-l, --limit <n>', 'Max results', '10')
  .option('-d, --detailed', 'Show detailed results')
  .action(async (query, options) => {
    try {
      const results = await projectManager.search(query, {
        projectId: options.project,
        maxResults: parseInt(options.limit),
        allProjects: options.all
      });

      if (!results || results.length === 0) {
        console.log('No projects found to search');
        return;
      }

      let totalResults = 0;

      results.forEach(({ project, results: files }) => {
        if (files.length === 0) return;

        totalResults += files.length;

        console.log(`\n📂 Project: ${project.name} (${project.path})`);
        console.log('═'.repeat(80));

        files.forEach((file, index) => {
          const score = Math.round(file.score * 100);
          console.log(`\n${index + 1}. ${file.filePath} (${score}% relevance)`);

          if (options.detailed && file.snippet) {
            console.log(`   ${file.snippet.split('\n')[0].substring(0, 100)}...`);
          }

          if (options.detailed && file.matchType) {
            console.log(`   Match type: ${file.matchType}`);
          }
        });

        console.log('\n');
      });

      if (totalResults === 0) {
        console.log(`No results found for: "${query}"`);
      } else {
        console.log(`Found ${totalResults} result(s)`);
      }

    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// ============================================
// STATISTICS COMMANDS
// ============================================

program
  .command('stats [projectIdOrPath]')
  .description('Show statistics')
  .action((projectIdOrPath) => {
    try {
      if (projectIdOrPath) {
        // Project stats
        const stats = projectManager.getProjectStats(projectIdOrPath);

        if (!stats.indexed) {
          console.log(`Project "${stats.project.name}" is not indexed`);
          return;
        }

        console.log(`\n📊 Statistics for: ${stats.project.name}\n`);
        console.log('═'.repeat(60));
        console.log(`Path: ${stats.project.path}`);
        console.log(`Total files: ${stats.stats.fileCount}`);
        console.log(`Total size: ${Utils.formatBytes(stats.stats.totalSize)}`);
        console.log(`\nFiles by extension:`);

        stats.stats.byExtension.forEach(ext => {
          console.log(`  ${ext.extension}: ${ext.count} files (${Utils.formatBytes(ext.size)})`);
        });

      } else {
        // Global stats
        const stats = projectManager.getGlobalStats();

        console.log('\n📊 Global Statistics\n');
        console.log('═'.repeat(60));
        console.log(`Total projects: ${stats.total}`);
        console.log(`Indexed projects: ${stats.indexed}`);
        console.log(`Not indexed: ${stats.notIndexed}`);
        console.log(`Watching: ${stats.watching}`);
        console.log(`Total files: ${stats.totalFiles}`);
        console.log(`Total size: ${Utils.formatBytes(stats.totalSize)}`);
      }

    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// ============================================
// CONFIGURATION COMMANDS
// ============================================

program
  .command('config')
  .description('Show configuration')
  .option('-s, --show', 'Show current configuration')
  .option('-e, --edit', 'Edit configuration (not implemented)')
  .option('-r, --reset', 'Reset to defaults')
  .action((options) => {
    try {
      if (options.reset) {
        configManager.resetToDefaults();
        console.log('✓ Configuration reset to defaults');
      } else {
        const config = configManager.getGlobalConfig();
        console.log('\n⚙️  Global Configuration:\n');
        console.log(JSON.stringify(config, null, 2));
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// ============================================
// MAINTENANCE COMMANDS
// ============================================

program
  .command('clean')
  .description('Clean up orphaned projects')
  .action(() => {
    try {
      const removed = projectManager.cleanup();
      console.log(`✓ Cleaned up ${removed} orphaned project(s)`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// ============================================
// CLAUDE CODE INTEGRATION
// ============================================

program
  .command('setup-claude')
  .description('Setup Claude Code integration')
  .action(() => {
    const hookPath = path.join(__dirname, '..', 'lib', 'claude-hook.js');

    console.log('\n🔧 Claude Code Integration Setup\n');
    console.log('Add the following to your Claude Code settings.json:\n');
    console.log('File location: ~/.config/claude-code/settings.json\n');

    const hookConfig = {
      hooks: {
        'user-prompt-submit': {
          command: `node ${hookPath}`,
          passUserPrompt: true,
          injectOutput: true,
          timeout: 5000
        }
      }
    };

    console.log(JSON.stringify(hookConfig, null, 2));

    console.log('\n✓ Copy the above configuration to your settings.json');
    console.log('✓ The indexer will automatically suggest files when you use Claude Code\n');
  });

program
  .command('hook-query')
  .description('Execute hook query (used by Claude Code)')
  .action(async () => {
    // This is called by Claude Code hook
    // Input comes from stdin or args
    const ClaudeHook = require('../lib/claude-hook');
    // The claude-hook.js file handles its own execution
    process.exit(0);
  });

// ============================================
// HELP & INFO
// ============================================

program
  .command('info')
  .description('Show system information')
  .action(() => {
    console.log('\n📦 Codebase Indexer\n');
    console.log(`Version: 1.0.0`);
    console.log(`Storage: ${Utils.getGlobalStorageDir()}`);
    console.log(`Indexes: ${Utils.getIndexesDir()}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Node: ${process.version}\n`);

    const stats = projectManager.getGlobalStats();
    console.log(`Projects: ${stats.total} (${stats.indexed} indexed)`);
    console.log(`Total files: ${stats.totalFiles}`);
    console.log(`Total size: ${Utils.formatBytes(stats.totalSize)}\n`);
  });

// Parse command line
program.parse();
