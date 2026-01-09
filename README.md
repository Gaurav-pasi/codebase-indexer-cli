# Codebase Indexer for Claude Code

**Save 85-95% on AI tokens by indexing your code once, instead of reading hundreds of files every time!**

[![npm version](https://img.shields.io/npm/v/codebase-indexer-cli.svg)](https://www.npmjs.com/package/codebase-indexer-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What Problem Does This Solve?

Every time you ask Claude Code a question about your codebase, it has to:
- Search through hundreds or thousands of files
- Read 20-50 complete files to find answers
- Use 150,000+ tokens (~$0.45 per query)
- Take 20-30 seconds to respond

**This tool changes that.**

## How It Works

**Before (Without Indexer):**
```
You: "How does authentication work?"
Claude: *searches 1,000+ files*
        *reads 25 files completely*
        *uses 150,000 tokens ($0.45)*
        *responds in 30 seconds*
```

**After (With Indexer):**
```
You: "How does authentication work?"
Indexer: *searches index in 50ms*
         *suggests 3 most relevant files*
Claude: *reads only those 3 files*
        *uses 15,000 tokens ($0.05)*
        *responds in 5 seconds*
```

**Result: 90% token savings, 5x faster responses! 💰**

---

## Quick Start

### Installation

```bash
npm install -g codebase-indexer-cli
```

**Verify installation:**
```bash
cindex --version
```

### Index Your First Project

```bash
# Navigate to your project
cd /path/to/your/project

# Add and index it
cindex add . --name "My Backend API" --index
```

**What happens:**
- Indexes all supported files (Java, JS, Python, etc.)
- Creates searchable index (~2-10 min for large projects)
- Enables instant search

### Setup Claude Code Hook

Run the setup command:
```bash
cindex setup-claude
```

This configures Claude Code to automatically use your index.

### Test It!

1. **Start Claude Code** in your project:
   ```bash
   cd /path/to/your/project
   claude
   ```

2. **Ask a question:**
   ```
   "How does the payment processing work?"
   ```

3. **See the magic!** Before Claude responds, you'll see:
   ```
   📚 Codebase Index - Relevant Files

   Found 5 relevant file(s):
   1. PaymentService.java (95% relevance)
   2. PaymentController.js (90% relevance)
   3. payment-utils.ts (85% relevance)
   ```

4. **Claude reads ONLY those files** instead of searching everything!

---

## Common Commands

### View All Your Indexed Projects
```bash
cindex list
```

**Example output:**
```
✓ My Backend API (1,234 files, 45 MB)
✓ Frontend App (856 files, 23 MB)
✓ Mobile App (432 files, 12 MB)
Total: 3 projects | 2,522 files | 80 MB
```

### Search Your Code
```bash
# Search in current project (auto-detected)
cindex search "payment processing"

# Search with detailed snippets
cindex search "authentication" --detailed

# Search across ALL indexed projects
cindex search "error handling" --all

# Limit results
cindex search "database" --limit 10
```

### View Project Statistics
```bash
# Stats for current project
cindex stats

# Stats for specific project
cindex stats my-backend-api
```

**Example output:**
```
Total files: 1,234
Total size: 45 MB

Files by extension:
  .js: 456 files (18 MB)
  .java: 234 files (12 MB)
  .py: 189 files (8 MB)
  .ts: 167 files (5 MB)
```

### Add More Projects
```bash
# Add current directory
cindex add . --name "My Project" --index

# Add specific path
cindex add /path/to/project --name "Backend API" --index

# Add without indexing (index later)
cindex add /path/to/project --name "My App"
```

### Update Index After Code Changes
```bash
# Re-index current project (fast - only changed files)
cindex index

# Re-index specific project
cindex index my-backend-api

# Force complete re-index
cindex reindex my-backend-api
```

### Auto-Update with File Watcher
```bash
# Watch current project
cindex watch

# Watch specific project
cindex watch my-backend-api

# Watch all projects
cindex watch --all
```

### Get Help
```bash
cindex --help
cindex search --help
```

---

## Real-World Token Savings

### Daily Usage Example

If you work with Claude Code **10 times per day**:

| Metric | Without Indexer | With Indexer | Savings |
|--------|----------------|--------------|---------|
| **Tokens per query** | 150,000 | 15,000 | 90% ⬇️ |
| **Cost per query** | $0.45 | $0.05 | $0.40 💰 |
| **Response time** | 30 sec | 5 sec | 83% faster ⚡ |
| | | | |
| **Daily tokens** | 1,500,000 | 150,000 | 1,350,000 saved |
| **Daily cost** | $4.50 | $0.45 | **$4.05 saved** |

### Monthly & Yearly Savings

| Period | Cost Without | Cost With | **You Save** |
|--------|--------------|-----------|--------------|
| **Monthly** | $135 | $13.50 | **$121.50** 💰 |
| **Yearly** | $1,640 | $164 | **$1,476** 🎉 |

**Plus:** Your responses are **5x faster**, and you get **more accurate** file suggestions!

---

## How It Works Internally

### Data Storage

Everything is stored **locally on your machine**:

**On Windows:**
```
C:\Users\<YourName>\AppData\Roaming\codebase-indexer\
├── indexes/
│   ├── my-backend-api-abc123.json
│   ├── frontend-app-def456.json
│   └── mobile-app-ghi789.json
├── registry.json           (list of all projects)
└── global-config.json      (settings)
```

**On macOS/Linux:**
```
~/.config/codebase-indexer/
├── indexes/
│   ├── my-backend-api-abc123.json
│   ├── frontend-app-def456.json
│   └── mobile-app-ghi789.json
├── registry.json
└── global-config.json
```

**Your code never leaves your machine. 100% local, 100% private.**

### Claude Code Hook

The hook is configured in:
- **Windows:** `C:\Users\<YourName>\AppData\Roaming\claude-code\settings.json`
- **macOS/Linux:** `~/.config/claude-code/settings.json`

It automatically runs before each Claude Code query to suggest relevant files.

---

## Advanced Features

### 1. Automatic File Watching

Keep your index automatically updated as you code:

```bash
# Watch current project
cindex watch

# Watch all indexed projects
cindex watch --all
```

**Keep this running in a background terminal.** When you edit files, they're automatically re-indexed!

### 2. Multi-Project Search

Search across all your codebases at once:

```bash
# Search all projects
cindex search "authentication" --all

# Filter by file extension
cindex search "UserService" --extension .java

# Combine filters
cindex search "payment" --all --extension .ts --limit 20
```

### 3. Incremental Re-Indexing

Re-indexing is **super fast** because it only updates changed files:

```bash
# Re-index current project
cindex index

# Typical output:
# ✓ Indexing complete!
#   Files indexed: 3        (only changed files!)
#   Files skipped: 1,231    (unchanged - skipped)
#   Duration: 1.2s
```

Hash-based change detection means **99.9% of files are skipped** on re-index!

### 4. Detailed Search Results

Get code snippets with your search results:

```bash
cindex search "authentication" --detailed
```

**Output:**
```
Found 5 relevant file(s):

1. AuthService.java (95% relevance)
   Snippet:
   public class AuthService {
     public boolean authenticate(String username, String password) {
       ...
   Match type: content

2. auth-middleware.ts (90% relevance)
   ...
```

### 5. Project-Specific Configuration

Customize indexing for each project:

```bash
# Edit project config
cindex config my-backend-api

# Common customizations:
# - Add custom file extensions
# - Exclude specific directories
# - Set max file size
# - Configure file patterns
```

---

## Frequently Asked Questions

### Do I need to re-index every time I change a file?

**No!** You have options:
- **Automatic:** Run `cindex watch --all` in a background terminal
- **Manual:** Run `cindex index` when you make significant changes
- **Just work:** The index stays helpful even if slightly outdated

### Will this work with my programming language?

**Yes!** Supports all text-based files:
- **Languages:** Java, JavaScript, TypeScript, Python, C#, C++, Go, Rust, PHP, Ruby, Kotlin, Swift, etc.
- **Web:** HTML, CSS, SCSS, JSX, TSX, Vue, Svelte
- **Config:** JSON, YAML, XML, TOML, ENV
- **Custom:** Any text-based file format you use

### How much disk space does it use?

About **1:1 ratio** with your source code. A 50 MB project creates a ~50 MB index.

### Can I index multiple projects?

**Yes!** Index unlimited projects:
```bash
cindex add /path/to/project1 --name "Backend" --index
cindex add /path/to/project2 --name "Frontend" --index
cindex add /path/to/project3 --name "Mobile" --index
```

Search all at once with `cindex search "query" --all`

### Does this send my code anywhere?

**Absolutely not.** Everything runs 100% locally on your machine. Your code never leaves your computer.

### Will this slow down my computer?

**No.** Indexing is a one-time operation (or incremental updates). Searches are instant (< 100ms).

### What's the difference between `index` and `reindex`?

- **`cindex index`** - Incremental update (only changed files)
- **`cindex reindex`** - Full rebuild (all files from scratch)

Use `index` for daily updates. Use `reindex` only if index gets corrupted.

### Can I exclude certain directories?

**Yes!** Edit global config:
```bash
cindex config

# Or edit manually:
# ~/.config/codebase-indexer/global-config.json
```

Common exclusions: `node_modules`, `.git`, `dist`, `build`, `target`

---

## Troubleshooting

### "cindex: command not found"

**Cause:** Package not installed globally or PATH not updated

**Fix:**
```bash
npm install -g codebase-indexer-cli

# If still not working, try:
npm link
```

### Hook not working in Claude Code?

**Test manually:**
```bash
cd /path/to/your/project
echo "test query" | cindex hook-test
```

If this shows results but Claude Code doesn't:
1. Restart Claude Code
2. Check hook configuration: `cindex setup-claude`
3. Verify settings file exists in Claude Code config directory

### Index not updating after file changes?

**Quick fix:**
```bash
# Force re-index current project
cindex index

# Or rebuild from scratch
cindex reindex
```

### Search returns no results?

**Check project is indexed:**
```bash
cindex list
```

Look for "Files: 0" - if yes, run:
```bash
cindex index
```

**Check you're in the right directory:**
```bash
pwd  # or `cd` on Windows
cindex list
```

Make sure current directory matches an indexed project path.

### Files being excluded unexpectedly?

**Check global config:**
```bash
cindex info
```

Review `exclude` patterns. Common issue: overly broad patterns like `**/*.log` excluding important files.

### Indexing is slow?

**Normal for first-time indexing.** Large projects (10,000+ files) can take 5-10 minutes.

**If re-indexing is slow:**
```bash
# Use incremental update instead of full rebuild
cindex index  # Good (fast)
cindex reindex  # Slow (rebuilds everything)
```

---

## Uninstall

If you want to remove everything:

```bash
# Uninstall npm package
npm uninstall -g codebase-indexer-cli
```

**Optional: Remove all data**

On Windows:
```bash
rmdir /s "%APPDATA%\codebase-indexer"
```

On macOS/Linux:
```bash
rm -rf ~/.config/codebase-indexer
```

**Optional: Remove Claude Code hook**

Edit Claude Code settings and remove the `hooks` section:
- **Windows:** `%APPDATA%\claude-code\settings.json`
- **macOS/Linux:** `~/.config/claude-code/settings.json`

---

## Features

✅ **85-95% reduction in AI token costs**
✅ **5x faster responses** from Claude Code
✅ **More accurate file suggestions** based on relevance scoring
✅ **Works with ANY codebase** - Java, Python, JavaScript, Go, Rust, etc.
✅ **Multi-project support** - Index unlimited projects
✅ **Auto-detection** - Automatically knows which project you're in
✅ **Lightning-fast search** - Results in milliseconds
✅ **Incremental updates** - Only re-indexes changed files
✅ **File watching** - Automatic updates as you code
✅ **100% local** - Your code never leaves your machine
✅ **Zero compilation** - Pure JavaScript, works out of the box
✅ **Cross-platform** - Windows, macOS, Linux

---

## Use Cases

**Perfect for:**
- Large enterprise codebases (1,000+ files)
- Multi-repo projects
- Legacy code exploration
- Code migration projects
- Team knowledge sharing
- Reducing AI costs in professional workflows

**Example scenarios:**
- "How does authentication work in this 10-year-old Java project?"
- "Find all files related to payment processing across 5 microservices"
- "Where is the user registration flow implemented?"
- "Show me all API endpoints related to billing"

---

## How to Contribute

This is an open-source project! Contributions welcome:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

**Ideas for contributions:**
- Add support for more file types
- Improve search relevance algorithm
- Add semantic search capabilities
- Create plugins for other AI tools
- Improve documentation

---

## Technical Details

**For developers who want to know more:**

- **Storage:** JSON-based index (no database compilation required)
- **Search Engine:** Full-text search with keyword extraction and TF-IDF relevance scoring
- **Change Detection:** MD5 hash-based file change tracking
- **File Watching:** chokidar for cross-platform file system monitoring
- **Node.js:** Requires v14 or higher
- **Platform:** Windows, Linux, macOS (fully cross-platform)
- **Dependencies:**
  - `chokidar` - File system watching
  - `chalk` - Terminal colors
  - `commander` - CLI framework
  - `ora` - Loading spinners
  - `inquirer` - Interactive prompts

**Architecture:**
```
cindex CLI
    ↓
Project Manager (multi-project support)
    ↓
Indexer Core (file processing, hashing)
    ↓
Query Engine (search, relevance scoring)
    ↓
Claude Hook (automatic suggestions)
```

---

## Roadmap

**Planned features:**
- [ ] Semantic search using embeddings
- [ ] Git integration (index only committed files)
- [ ] Cloud sync for team sharing (optional)
- [ ] VS Code extension
- [ ] Support for binary file metadata
- [ ] Advanced relevance tuning
- [ ] Integration with other AI tools (Cursor, GitHub Copilot)

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

## Support & Community

- **Issues:** Report bugs or request features on [GitHub Issues](https://github.com/Gaurav-pasi/codebase-indexer-cli/issues)
- **Discussions:** Ask questions on [GitHub Discussions](https://github.com/Gaurav-pasi/codebase-indexer-cli/discussions)

---

## Acknowledgments

Built with ❤️ for developers who want to save money and time on AI-powered coding.

Special thanks to:
- Anthropic for Claude Code
- The open-source community
- All contributors

---

**Ready to save 85-95% on AI tokens?** 🚀

```bash
npm install -g codebase-indexer-cli
cindex add . --name "My Project" --index
```

**Your first indexed project will pay for itself in days of use.**
