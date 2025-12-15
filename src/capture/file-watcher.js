/**
 * FileWatcher - Monitors files for changes and triggers analysis
 */

const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs').promises;
const { IssuesReporter } = require('../reporting/issues-reporter');

class FileWatcher {
    constructor(config = {}) {
        this.config = {
            // Default directories to watch
            directories: ['./src', './lib'],
            // File patterns to include
            include: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx', '**/*.py', '**/*.java'],
            // Patterns to ignore
            ignore: [
                '**/node_modules/**',
                '**/dist/**',
                '**/build/**',
                '**/.git/**',
                '**/*.test.js',
                '**/*.spec.js',
                '**/*.min.js'
            ],
            // Debounce delay in milliseconds
            debounceDelay: 1000,
            // Maximum file size to analyze (in bytes)
            maxFileSize: 1024 * 1024, // 1MB
            ...config
        };

        this.watcher = null;
        this.isWatching = false;
        this.debounceTimers = new Map();
        this.analysisCallback = null;
        this.stats = {
            filesWatched: 0,
            changesDetected: 0,
            analysisTriggered: 0,
            errors: 0
        };
    }

    /**
     * Start watching files
     */
    async start(directories, orchestrator, storage = null) {
        if (this.isWatching) {
            console.log('[WARN] File watcher is already running');
            return;
        }

        this.orchestrator = orchestrator;
        this.storage = storage; // Hub storage for saving results
        this.config.directories = directories || this.config.directories;

        try {
            console.log('[INFO] Starting real-time file monitoring...');
            console.log(`[INFO] Watching directories: ${Array.isArray(this.config.directories) ? this.config.directories.join(', ') : this.config.directories}`);

            // Create watcher with configuration
            this.watcher = chokidar.watch(this.config.directories, {
                ignored: this.config.ignore,
                persistent: true,
                ignoreInitial: false, // Analyze existing files too
                followSymlinks: false,
                depth: 10,
                awaitWriteFinish: {
                    stabilityThreshold: 1000, // Wait 1 second for file to stabilize
                    pollInterval: 100
                }
            });

            // Set up event listeners
            this.setupEventListeners();

            // Wait for watcher to be ready
            await new Promise((resolve) => {
                this.watcher.on('ready', () => {
                    this.isWatching = true;
                    const fileCount = this.getWatchedFiles().length;
                    console.log(`[INFO] File watcher ready. Monitoring ${fileCount} file(s)`);
                    console.log('[INFO] Real-time AI code analysis is active');
                    console.log('[INFO] Press Ctrl+C to stop\n');
                    resolve();
                });
            });

            return true;
        } catch (error) {
            console.error('[ERROR] Failed to start file watcher:', error.message);
            this.stats.errors++;
            throw error;
        }
    }

    /**
     * Stop watching files
     */
    async stop() {
        if (!this.isWatching) {
            return;
        }

        try {
            console.log('[INFO] Stopping file watcher...');

            // Clear all debounce timers
            this.debounceTimers.forEach(timer => clearTimeout(timer));
            this.debounceTimers.clear();

            // Close watcher
            if (this.watcher) {
                await this.watcher.close();
                this.watcher = null;
            }

            this.isWatching = false;
            console.log('[INFO] File watcher stopped');
        } catch (error) {
            console.error('[ERROR] Failed to stop file watcher:', error.message);
            this.stats.errors++;
            throw error;
        }
    }

    /**
     * Setup event listeners for file changes
     */
    setupEventListeners() {
        // File added
        this.watcher.on('add', (filePath) => {
            this.stats.filesWatched++;
            this.handleFileChange(filePath, 'add');
        });

        // File changed
        this.watcher.on('change', (filePath) => {
            this.stats.changesDetected++;
            this.handleFileChange(filePath, 'change');
        });

        // File removed
        this.watcher.on('unlink', (filePath) => {
            this.clearDebounceTimer(filePath);
        });

        // Error handling
        this.watcher.on('error', (error) => {
            console.error('[ERROR] File watcher error:', error.message);
            this.stats.errors++;
        });
    }

    /**
     * Handle file change with debouncing
     */
    handleFileChange(filePath, changeType) {
        // Clear existing timer for this file
        this.clearDebounceTimer(filePath);

        // Set new debounce timer
        const timer = setTimeout(async () => {
            try {
                await this.processFileChange(filePath, changeType);
                this.debounceTimers.delete(filePath);
            } catch (error) {
                console.error(`[ERROR] Failed to process file change for ${filePath}:`, error.message);
                this.stats.errors++;
            }
        }, this.config.debounceDelay);

        this.debounceTimers.set(filePath, timer);
    }

    /**
     * Process file change after debounce
     */
    async processFileChange(filePath, changeType) {
        try {
            // Check if file should be analyzed
            if (!this.shouldAnalyzeFile(filePath)) {
                return;
            }

            // Read file content
            const fileContent = await this.readFile(filePath);
            if (!fileContent) {
                return;
            }

            // Detect if change is likely AI-generated (more aggressive detection)
            const isAIGenerated = this.detectAIGenerated(fileContent, changeType, filePath);

            // Only analyze if likely AI-generated or new file
            if (!isAIGenerated && changeType === 'change') {
                // Skip small incremental changes that are likely manual edits
                return;
            }

            // Prepare analysis context
            const context = {
                filePath: filePath,
                language: this.detectLanguage(filePath),
                changeType: changeType,
                isAIGenerated: isAIGenerated,
                fileSize: fileContent.length,
                timestamp: new Date().toISOString(),
                source: 'file-watcher'
            };

            // Trigger analysis via orchestrator
            if (this.orchestrator) {
                console.log(`[ANALYZING] ${filePath} (${context.language})`);
                this.stats.analysisTriggered++;

                const result = await this.orchestrator.evaluateCode(fileContent, context);

                // Save to Hub storage if available
                if (this.storage) {
                    try {
                        await this.storage.storeWatchResult(filePath, result);
                    } catch (storageError) {
                        // Silently fail storage - analysis still completed
                    }
                }

                // Generate issues report for AI assistants
                try {
                    const reporter = new IssuesReporter();
                    if (result.status !== 'APPROVED') {
                        const reportPath = await reporter.generateReport(filePath, result);
                        console.log(`[REPORT] Issues report saved to: ${reportPath}`);
                    } else {
                        // Clear issues when file passes
                        await reporter.clearIssues(filePath);
                    }
                } catch (reportError) {
                    // Silently fail report generation
                }

                // Display clean result
                this.displayAnalysisResult(filePath, result);
            }

        } catch (error) {
            console.error(`[ERROR] Processing file ${filePath}:`, error.message);
            this.stats.errors++;
        }
    }

    /**
     * Display analysis result in clean format
     */
    displayAnalysisResult(filePath, result) {
        const status = result.status || 'UNKNOWN';
        const score = result.finalScore || 0;
        const consensus = result.consensus || 0;

        console.log(`\n[RESULT] ${filePath}`);
        console.log(`  Status: ${status}`);
        console.log(`  Score: ${score}/100`);
        console.log(`  Consensus: ${(consensus * 100).toFixed(1)}%`);

        if (status === 'APPROVED') {
            console.log(`  [PASS] Code meets quality standards`);
        } else {
            console.log(`  [FAIL] Code does not meet quality standards`);
            if (result.reasoning) {
                console.log(`  Reason: ${result.reasoning}`);
            }
        }

        // Show agent scores
        if (result.agentResults && result.agentResults.length > 0) {
            console.log(`  Agents: ${result.agentResults.map(r => `${r.agentName || r.name}: ${r.score}`).join(', ')}`);
        }

        // Show top issues detected
        const criticalIssues = result.recommendations?.critical || [];
        const importantIssues = result.recommendations?.important || [];

        if (criticalIssues.length > 0 || importantIssues.length > 0) {
            console.log(`\n[ISSUES DETECTED]`);

            // Show up to 5 critical issues
            if (criticalIssues.length > 0) {
                console.log(`  Critical (${criticalIssues.length}):`);
                criticalIssues.slice(0, 5).forEach((issue, i) => {
                    const line = issue.line ? ` (line ${issue.line})` : '';
                    console.log(`    ${i + 1}. ${issue.message?.substring(0, 80)}${line}`);
                });
            }

            // Show up to 3 important issues
            if (importantIssues.length > 0) {
                console.log(`  Important (${importantIssues.length}):`);
                importantIssues.slice(0, 3).forEach((issue, i) => {
                    const line = issue.line ? ` (line ${issue.line})` : '';
                    console.log(`    ${i + 1}. ${issue.message?.substring(0, 80)}${line}`);
                });
            }
        }

        console.log('');
    }


    /**
     * Read file content safely
     */
    async readFile(filePath) {
        try {
            const stats = await fs.stat(filePath);

            // Check file size
            if (stats.size > this.config.maxFileSize) {
                return null;
            }

            // Check if file is binary
            if (this.isBinaryFile(filePath)) {
                return null;
            }

            const content = await fs.readFile(filePath, 'utf8');
            return content;
        } catch (error) {
            return null;
        }
    }

    /**
     * Determine if file should be analyzed
     */
    shouldAnalyzeFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.php'];

        return supportedExtensions.includes(ext);
    }

    /**
     * Detect programming language from file path
     */
    detectLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();

        const languageMap = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp'
        };

        return languageMap[ext] || 'unknown';
    }

    /**
     * Detect if change is likely AI-generated
     */
    detectAIGenerated(content, changeType, filePath) {
        // More aggressive detection for IDE AI agents
        const indicators = [
            // Large insertions (common with AI code generation)
            content.length > 300,
            // Multiple functions/classes in one change
            (content.match(/function\s+\w+|class\s+\w+|def\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length > 1,
            // Complete file additions (very likely AI)
            changeType === 'add',
            // Presence of detailed comments (AI often adds explanatory comments)
            (content.match(/\/\*\*[\s\S]*?\*\/|\/\/.*$/gm) || []).length > 2,
            // Multiple imports (AI often generates complete modules)
            (content.match(/^import\s+|^require\s*\(/gm) || []).length > 2,
            // Complete function/class definitions (AI generates full implementations)
            (content.match(/^\s*(export\s+)?(async\s+)?function|^\s*(export\s+)?class|^\s*def\s+\w+/gm) || []).length > 0,
            // File was just created (high probability of AI generation)
            changeType === 'add' && content.length > 100
        ];

        // Return true if any strong indicator is present (more permissive for real-time monitoring)
        const strongIndicators = [
            changeType === 'add' && content.length > 100,
            content.length > 500,
            (content.match(/function\s+\w+|class\s+\w+|def\s+\w+/g) || []).length > 2
        ];

        // If strong indicator, always analyze
        if (strongIndicators.some(Boolean)) {
            return true;
        }

        // Otherwise, analyze if multiple indicators present
        return indicators.filter(Boolean).length >= 1;
    }

    /**
     * Check if file is binary
     */
    isBinaryFile(filePath) {
        const binaryExtensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx',
            '.zip', '.tar', '.gz', '.rar',
            '.exe', '.dll', '.so', '.dylib',
            '.mp3', '.mp4', '.avi', '.mov'
        ];

        const ext = path.extname(filePath).toLowerCase();
        return binaryExtensions.includes(ext);
    }

    /**
     * Clear debounce timer for a file
     */
    clearDebounceTimer(filePath) {
        const timer = this.debounceTimers.get(filePath);
        if (timer) {
            clearTimeout(timer);
            this.debounceTimers.delete(filePath);
        }
    }

    /**
     * Get list of currently watched files
     */
    getWatchedFiles() {
        if (!this.watcher) return [];
        return Object.keys(this.watcher.getWatched()).reduce((files, dir) => {
            const dirFiles = this.watcher.getWatched()[dir];
            return files.concat(dirFiles.map(file => path.join(dir, file)));
        }, []);
    }

    /**
     * Get watcher statistics
     */
    getStats() {
        return {
            ...this.stats,
            isWatching: this.isWatching,
            watchedFiles: this.getWatchedFiles().length,
            activeTimers: this.debounceTimers.size
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // If watcher is running, restart with new config
        if (this.isWatching) {
            console.log('[INFO] Restarting file watcher with new configuration...');
            const directories = this.config.directories;
            this.stop().then(() => {
                this.start(directories, this.orchestrator);
            });
        }
    }

    /**
     * Add directory to watch list
     */
    addDirectory(directory) {
        if (this.watcher && this.isWatching) {
            this.watcher.add(directory);
        } else {
            this.config.directories.push(directory);
        }
    }

    /**
     * Remove directory from watch list
     */
    removeDirectory(directory) {
        if (this.watcher && this.isWatching) {
            this.watcher.unwatch(directory);
        } else {
            this.config.directories = this.config.directories.filter(dir => dir !== directory);
        }
    }
}

module.exports = { FileWatcher };