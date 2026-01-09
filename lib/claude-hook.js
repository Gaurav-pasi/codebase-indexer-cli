#!/usr/bin/env node

const ProjectManager = require('./project-manager');
const ConfigManager = require('./config-manager');
const Utils = require('./utils');

/**
 * Universal Claude Code Hook
 * Automatically searches index and suggests relevant files
 */
class ClaudeHook {
  constructor() {
    this.projectManager = new ProjectManager();
    this.configManager = new ConfigManager();
    this.claudeConfig = this.configManager.getClaudeCodeConfig();
  }

  /**
   * Main execution entry point
   */
  async execute(userInput, currentDir = null) {
    if (!this.claudeConfig.enabled) {
      return null;
    }

    try {
      // Get current directory
      const cwd = currentDir || Utils.getCwd();

      // Auto-detect project
      const project = this.detectProject(cwd);

      if (!project) {
        if (this.claudeConfig.verbose) {
          console.error('[HOOK] No indexed project detected in current directory');
        }
        return null;
      }

      // Extract search terms
      const searchTerms = this.extractSearchTerms(userInput);

      if (searchTerms.length === 0) {
        // No clear search intent
        return null;
      }

      // Search the project
      const results = await this.projectManager.search(searchTerms.join(' '), {
        projectId: project.id,
        maxResults: this.claudeConfig.maxFilesInject
      });

      if (!results || results.length === 0 || results[0].results.length === 0) {
        return null;
      }

      // Format output for Claude
      return this.formatOutput(results[0].results, project, userInput);

    } catch (error) {
      if (this.claudeConfig.verbose) {
        console.error('[HOOK ERROR]', error);
      }
      // Silent fail - don't break Claude Code
      return null;
    }
  }

  /**
   * Detect which project the user is currently in
   */
  detectProject(cwd) {
    const projects = this.projectManager.getAllProjects();

    // Find project that contains current directory
    for (const project of projects) {
      if (!project.indexed) continue;

      if (Utils.isWithinPath(cwd, project.path) || cwd === project.path) {
        return project;
      }
    }

    // Check parent directories
    let dir = cwd;
    const root = Utils.normalizePath(dir).split('/')[0] + '/';

    while (dir !== root) {
      for (const project of projects) {
        if (!project.indexed) continue;

        if (Utils.normalizePath(dir) === Utils.normalizePath(project.path)) {
          return project;
        }
      }
      dir = Utils.normalizePath(dir + '/..');
    }

    return null;
  }

  /**
   * Extract search terms from user's natural language question
   */
  extractSearchTerms(input) {
    // Common stop words to filter out
    const stopWords = new Set([
      'how', 'what', 'where', 'when', 'why', 'who', 'which',
      'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'should', 'could', 'may', 'might', 'must', 'can',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
      'to', 'for', 'of', 'as', 'by', 'with', 'from', 'about',
      'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them'
    ]);

    // Extract words
    const words = input
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    // Remove duplicates
    return [...new Set(words)];
  }

  /**
   * Format output for Claude Code
   */
  formatOutput(results, project, userQuery) {
    if (!this.claudeConfig.autoInject) {
      // Just return file paths
      return results.map(r => r.filePath).join('\n');
    }

    // Format as markdown
    let output = `## 📚 Codebase Index - Relevant Files\n\n`;
    output += `**Project:** ${project.name}\n`;
    output += `**Query:** "${userQuery}"\n\n`;

    if (results.length === 0) {
      return null;
    }

    output += `Found ${results.length} relevant file(s):\n\n`;

    results.forEach((result, index) => {
      const score = Math.round(result.score * 100);
      output += `**${index + 1}. ${result.filePath}** (${score}% relevance)\n`;

      if (result.snippet) {
        // Clean up snippet
        const snippetLines = result.snippet.split('\n').slice(0, 3);
        const preview = snippetLines.join('\n').substring(0, 200);
        output += `\`\`\`\n${preview}\n\`\`\`\n`;
      }

      if (result.matchType) {
        output += `*Match type: ${result.matchType}*\n`;
      }

      output += '\n';
    });

    // Add recommendation
    output += this.generateRecommendation(results);

    output += `\n---\n`;
    output += `*Tip: These files were automatically identified from the codebase index for "${project.name}"*\n`;

    return output;
  }

  /**
   * Generate recommendation text
   */
  generateRecommendation(results) {
    if (results.length === 0) {
      return '';
    }

    const topFile = results[0].filePath;
    const topScore = Math.round(results[0].score * 100);

    if (results.length === 1) {
      return `💡 **Recommendation:** Start with \`${topFile}\` (${topScore}% match)\n`;
    } else if (results.length === 2) {
      return `💡 **Recommendation:** Check \`${topFile}\` first (${topScore}% match), then review the second file\n`;
    } else {
      const topThree = results.slice(0, 3).map(r => `\`${r.filePath}\``).join(', ');
      return `💡 **Recommendation:** Start with these ${Math.min(3, results.length)} files: ${topThree}\n`;
    }
  }
}

/**
 * CLI Execution
 * Called by Claude Code hook
 */
async function main() {
  const hook = new ClaudeHook();

  // Get user input from command line args or stdin
  let userInput = process.argv.slice(2).join(' ');

  if (!userInput) {
    // Try reading from stdin
    userInput = await readStdin();
  }

  if (!userInput || userInput.trim().length === 0) {
    // No input, exit silently
    process.exit(0);
  }

  // Get current directory from environment or process
  const cwd = process.env.PWD || process.env.CD || process.cwd();

  // Execute hook
  const output = await hook.execute(userInput, cwd);

  if (output) {
    console.log(output);
  }

  process.exit(0);
}

/**
 * Read from stdin
 */
function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    let data = '';
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', chunk => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data.trim());
    });

    // Timeout after 1 second
    setTimeout(() => {
      resolve(data.trim());
    }, 1000);
  });
}

// Export for use as module
module.exports = ClaudeHook;

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    // Silent error - don't break Claude Code
    if (process.env.VERBOSE === 'true') {
      console.error('[HOOK ERROR]', error);
    }
    process.exit(0);
  });
}
