#!/usr/bin/env node

/**
 * AI-COUNCIL CLI - Command Line Interface
 * Professional code quality assurance with AI agent council
 */

// Load environment variables silently (no tips)
require('dotenv').config({ quiet: true });

const { Command } = require('commander');
const path = require('path');
const { AICouncil } = require('../index');
const { HubStorage } = require('../storage/hub-storage');
const { UI } = require('./ui');

const program = new Command();
const packageJson = require('../../package.json');

// Custom help display
program
    .name('ai-council')
    .description(`
AI-COUNCIL - AI Code Quality Assurance System
==============================================

Automated code review using multiple AI agents (Groq, Gemini, Z.AI, OpenRouter)
working together to analyze security, performance, and best practices.

QUICK START (3 Steps):
  1. npm install -g ai-council     Install globally
  2. ai-council init               Initialize in your project
  3. ai-council watch              Start monitoring

EXAMPLES:
  ai-council init                  Setup AI-COUNCIL in current project
  ai-council config --keys         Configure API keys interactively
  ai-council config --add groq     Add a specific API key
  ai-council status                Check system health and agents
  ai-council analyze src/app.js    Analyze a specific file
  ai-council watch                 Monitor all files for changes
  ai-council watch -d ./src        Monitor specific directory

DOCUMENTATION:
  https://github.com/ai-council/ai-council
`)
    .version(packageJson.version, '-v, --version', 'Show version number')
    .helpOption('-h, --help', 'Show this help message')
    .addHelpText('after', `
AVAILABLE COMMANDS:
  init          Initialize AI-COUNCIL in current project
  config        Manage API keys and configuration
  status        Show system health and active agents
  analyze       Analyze a specific file for code quality
  watch         Start real-time file monitoring
  stats         Show analysis history and statistics
  clean         Clean old analysis results

For command-specific help, use: ai-council <command> --help
Example: ai-council config --help
`);

/**
 * Initialize command - Interactive setup for new users
 * Simple 3-step process: 1) npm install -g ai-council  2) ai-council init  3) ai-council watch
 */
program
    .command('init')
    .description('Initialize AI-COUNCIL in current project (interactive setup)')
    .option('-y, --yes', 'Skip prompts and use defaults')
    .option('-n, --name <name>', 'Project name')
    .action(async (options) => {
        const fs = require('fs').promises;
        const readline = require('readline');

        try {
            UI.banner('AI-COUNCIL SETUP', 'Welcome to AI-COUNCIL - AI Code Quality Assurance');

            UI.info('This wizard will help you set up AI-COUNCIL for your project.');
            UI.info('You will need at least ONE API key from the supported providers.');
            UI.blank();

            // Step 1: Create Hub folder
            UI.section('STEP 1: Project Setup');
            const hub = new HubStorage();
            await hub.initialize();
            UI.success('Hub folder created at ./Hub');

            // Get project name
            const projectName = options.name || path.basename(process.cwd());
            UI.keyValue('Project', projectName);

            // Store project context
            await hub.storeContext({
                name: projectName,
                language: 'auto-detect',
                initialized: new Date().toISOString()
            });

            // Step 2: Check/Create .env file
            UI.section('STEP 2: API Key Configuration');

            const envPath = path.join(process.cwd(), '.env');
            let envExists = false;
            let envContent = '';

            try {
                envContent = await fs.readFile(envPath, 'utf8');
                envExists = true;
            } catch (e) {
                envExists = false;
            }

            // Check which API keys are already configured
            const apiKeys = {
                groq: process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your-'),
                google: process.env.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY.includes('your-'),
                zai: process.env.ZAI_API_KEY && !process.env.ZAI_API_KEY.includes('your-'),
                openrouter: process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.includes('your-'),
                openai: process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-'),
                anthropic: process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your-')
            };

            const configuredCount = Object.values(apiKeys).filter(Boolean).length;

            if (configuredCount > 0) {
                UI.success(`Found ${configuredCount} configured API key(s)`);
                UI.blank();

                // Show which are configured
                const widths = [20, 15, 30];
                UI.tableHeader(['Provider', 'Status', 'Get API Key'], widths);
                UI.tableRow(['Groq (Free)', apiKeys.groq ? 'Ready' : '-', 'console.groq.com'], widths);
                UI.tableRow(['Google Gemini', apiKeys.google ? 'Ready' : '-', 'makersuite.google.com'], widths);
                UI.tableRow(['Z.AI', apiKeys.zai ? 'Ready' : '-', 'z.ai'], widths);
                UI.tableRow(['OpenRouter', apiKeys.openrouter ? 'Ready' : '-', 'openrouter.ai'], widths);
                UI.tableRow(['OpenAI', apiKeys.openai ? 'Ready' : '-', 'platform.openai.com'], widths);
                UI.tableRow(['Anthropic', apiKeys.anthropic ? 'Ready' : '-', 'console.anthropic.com'], widths);
            } else {
                UI.warn('No API keys configured yet.');
                UI.blank();
                UI.info('You need at least ONE API key to use AI-COUNCIL.');
                UI.info('We recommend starting with Groq (FREE tier available):');
                UI.blank();
                UI.listItem('Groq: https://console.groq.com (FREE, fast)');
                UI.listItem('Google: https://makersuite.google.com (FREE tier)');
                UI.listItem('OpenRouter: https://openrouter.ai (FREE models available)');
                UI.blank();

                // Create template .env file
                if (!envExists) {
                    const envTemplate = `# AI-COUNCIL Configuration
# Add your API keys below (at least one required)

# Groq - FREE tier available (Recommended to start)
# Get key: https://console.groq.com
GROQ_API_KEY=

# Google Gemini - FREE tier available
# Get key: https://makersuite.google.com
GOOGLE_API_KEY=

# Z.AI
# Get key: https://z.ai
ZAI_API_KEY=
ZAI_BASE_URL=https://api.z.ai/api/coding/paas/v4
ZAI_MODEL=glm-4.6

# OpenRouter - FREE models available
# Get key: https://openrouter.ai
OPENROUTER_API_KEY=

# OpenAI (Optional, paid)
# OPENAI_API_KEY=

# Anthropic Claude (Optional, paid)
# ANTHROPIC_API_KEY=
`;
                    await fs.writeFile(envPath, envTemplate, 'utf8');
                    UI.success('Created .env template file');
                    UI.info('Edit .env and add your API key(s), then run: ai-council init');
                }
            }

            // Step 3: Verify and show status
            UI.section('STEP 3: Quick Start');

            if (configuredCount > 0) {
                UI.success('AI-COUNCIL is ready to use!');
                UI.blank();
                UI.info('Start monitoring your code with:');
                UI.blank();
                console.log('    ai-council watch');
                UI.blank();
                UI.info('Or analyze a specific file:');
                UI.blank();
                console.log('    ai-council analyze <file.js>');
            } else {
                UI.warn('Complete setup by adding API keys to .env file');
                UI.blank();
                UI.info('After adding keys, verify with:');
                UI.blank();
                console.log('    ai-council status');
            }

            UI.blank();
            UI.line();
            UI.info('Documentation: https://github.com/ai-council/ai-council');
            UI.blank();

        } catch (error) {
            UI.error(`Setup failed: ${error.message}`);
            process.exit(1);
        }
    });

/**
 * Config command - Manage API keys and configuration
 */
program
    .command('config')
    .description('Manage AI-COUNCIL configuration')
    .option('-k, --keys', 'Configure API keys interactively')
    .option('-a, --add <provider>', 'Add a specific API key (groq, gemini, zai, openrouter, openai, anthropic)')
    .option('-l, --list', 'List configured API keys')
    .option('-r, --remove <provider>', 'Remove an API key')
    .action(async (options) => {
        const fs = require('fs').promises;
        const readline = require('readline');

        const envPath = path.join(process.cwd(), '.env');

        // Helper to read current .env
        async function readEnv() {
            try {
                const content = await fs.readFile(envPath, 'utf8');
                const env = {};
                content.split('\n').forEach(line => {
                    const match = line.match(/^([^#=]+)=(.*)$/);
                    if (match) {
                        env[match[1].trim()] = match[2].trim();
                    }
                });
                return env;
            } catch (e) {
                return {};
            }
        }

        // Helper to write .env
        async function writeEnv(env) {
            const content = `# AI-COUNCIL Configuration
# Generated by: ai-council config

# Groq - FREE tier available (Recommended)
# Get key: https://console.groq.com
GROQ_API_KEY=${env.GROQ_API_KEY || ''}

# Google Gemini - FREE tier available
# Get key: https://makersuite.google.com
GOOGLE_API_KEY=${env.GOOGLE_API_KEY || ''}
GOOGLE_MODEL=${env.GOOGLE_MODEL || 'gemini-2.5-flash'}

# Z.AI
# Get key: https://z.ai
ZAI_API_KEY=${env.ZAI_API_KEY || ''}
ZAI_BASE_URL=${env.ZAI_BASE_URL || 'https://api.z.ai/api/coding/paas/v4'}
ZAI_MODEL=${env.ZAI_MODEL || 'glm-4.6'}

# OpenRouter - FREE models available
# Get key: https://openrouter.ai
OPENROUTER_API_KEY=${env.OPENROUTER_API_KEY || ''}
OPENROUTER_MODEL=${env.OPENROUTER_MODEL || 'mistralai/devstral-2512:free'}

# OpenAI (Optional, paid)
OPENAI_API_KEY=${env.OPENAI_API_KEY || ''}

# Anthropic Claude (Optional, paid)
ANTHROPIC_API_KEY=${env.ANTHROPIC_API_KEY || ''}

# Supabase (Optional)
SUPABASE_URL=${env.SUPABASE_URL || ''}
SUPABASE_ANON_KEY=${env.SUPABASE_ANON_KEY || ''}
`;
            await fs.writeFile(envPath, content, 'utf8');
        }

        // Helper to prompt for input
        function prompt(question) {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            return new Promise(resolve => {
                rl.question(question, answer => {
                    rl.close();
                    resolve(answer.trim());
                });
            });
        }

        try {
            const env = await readEnv();

            // List configured keys
            if (options.list) {
                UI.banner('API KEY STATUS', 'Configured providers');

                const providers = [
                    { name: 'Groq', key: 'GROQ_API_KEY', free: true },
                    { name: 'Google Gemini', key: 'GOOGLE_API_KEY', free: true },
                    { name: 'Z.AI', key: 'ZAI_API_KEY', free: false },
                    { name: 'OpenRouter', key: 'OPENROUTER_API_KEY', free: true },
                    { name: 'OpenAI', key: 'OPENAI_API_KEY', free: false },
                    { name: 'Anthropic', key: 'ANTHROPIC_API_KEY', free: false }
                ];

                UI.section('CONFIGURED KEYS');
                providers.forEach(p => {
                    const value = env[p.key] || process.env[p.key];
                    const hasKey = value && value.length > 5 && !value.includes('your-');
                    const status = hasKey ? 'Configured' : 'Not set';
                    const tier = p.free ? '(FREE tier available)' : '(Paid)';
                    UI.keyValue(p.name, `${status} ${tier}`);
                });

                UI.blank();
                return;
            }

            // Add a specific key
            if (options.add) {
                const provider = options.add.toLowerCase();
                const keyMap = {
                    groq: 'GROQ_API_KEY',
                    gemini: 'GOOGLE_API_KEY',
                    google: 'GOOGLE_API_KEY',
                    zai: 'ZAI_API_KEY',
                    openrouter: 'OPENROUTER_API_KEY',
                    openai: 'OPENAI_API_KEY',
                    anthropic: 'ANTHROPIC_API_KEY',
                    claude: 'ANTHROPIC_API_KEY'
                };

                const envKey = keyMap[provider];
                if (!envKey) {
                    UI.error(`Unknown provider: ${provider}`);
                    UI.info('Available providers: groq, gemini, zai, openrouter, openai, anthropic');
                    process.exit(1);
                }

                UI.banner('ADD API KEY', `Provider: ${provider.toUpperCase()}`);

                const value = await prompt(`Enter your ${provider.toUpperCase()} API key: `);

                if (value) {
                    env[envKey] = value;
                    await writeEnv(env);
                    UI.success(`${provider.toUpperCase()} API key saved to .env`);
                } else {
                    UI.warn('No key entered, operation cancelled');
                }

                return;
            }

            // Remove a key
            if (options.remove) {
                const provider = options.remove.toLowerCase();
                const keyMap = {
                    groq: 'GROQ_API_KEY',
                    gemini: 'GOOGLE_API_KEY',
                    zai: 'ZAI_API_KEY',
                    openrouter: 'OPENROUTER_API_KEY',
                    openai: 'OPENAI_API_KEY',
                    anthropic: 'ANTHROPIC_API_KEY'
                };

                const envKey = keyMap[provider];
                if (envKey) {
                    env[envKey] = '';
                    await writeEnv(env);
                    UI.success(`${provider.toUpperCase()} API key removed`);
                }
                return;
            }

            // Interactive key configuration (default or --keys)
            UI.banner('API KEY CONFIGURATION', 'Setup AI provider keys');

            UI.info('Configure your AI provider API keys.');
            UI.info('At least ONE key is required. Press Enter to skip a provider.');
            UI.blank();

            const providers = [
                { name: 'Groq', key: 'GROQ_API_KEY', url: 'https://console.groq.com', recommended: true },
                { name: 'Google Gemini', key: 'GOOGLE_API_KEY', url: 'https://makersuite.google.com', recommended: true },
                { name: 'OpenRouter', key: 'OPENROUTER_API_KEY', url: 'https://openrouter.ai', recommended: true },
                { name: 'Z.AI', key: 'ZAI_API_KEY', url: 'https://z.ai', recommended: false },
                { name: 'OpenAI', key: 'OPENAI_API_KEY', url: 'https://platform.openai.com', recommended: false },
                { name: 'Anthropic', key: 'ANTHROPIC_API_KEY', url: 'https://console.anthropic.com', recommended: false }
            ];

            for (const p of providers) {
                const current = env[p.key] || process.env[p.key];
                const hasKey = current && current.length > 5 && !current.includes('your-');
                const status = hasKey ? ' [configured]' : '';
                const tag = p.recommended ? ' (FREE - Recommended)' : '';

                UI.info(`${p.name}${tag}${status}`);
                UI.info(`  Get key: ${p.url}`);

                const value = await prompt(`  Enter API key (or press Enter to skip): `);

                if (value) {
                    env[p.key] = value;
                    UI.success(`  ${p.name} key saved`);
                } else if (hasKey) {
                    UI.info(`  Keeping existing key`);
                }
                UI.blank();
            }

            // Save all keys
            await writeEnv(env);

            UI.success('Configuration saved to .env');
            UI.blank();
            UI.info('Run "ai-council status" to verify your configuration');
            UI.blank();

        } catch (error) {
            UI.error(`Configuration failed: ${error.message}`);
            process.exit(1);
        }
    });

/**
 * Analyze command - analyze a specific file
 */
program
    .command('analyze <file>')
    .description('Analyze a specific file for code quality')
    .option('-v, --verbose', 'Show detailed output')
    .option('-s, --save', 'Save results to Hub folder')
    .option('-c, --config <path>', 'Configuration file path')
    .action(async (file, options) => {
        try {
            UI.banner('AI-COUNCIL ANALYSIS', `Analyzing: ${file}`);

            const council = new AICouncil();
            await council.initialize(options.config);

            const agentCount = council.orchestrator?.aiCouncil?.agents?.size || 0;
            UI.info(`Council ready with ${agentCount} agent(s)`);
            UI.blank();

            UI.section('RUNNING ANALYSIS');
            UI.info('Agents are analyzing your code...');
            UI.blank();

            const result = await council.analyzeFile(file, { verbose: options.verbose });

            // Save to Hub if requested
            if (options.save) {
                const hub = new HubStorage();
                await hub.initialize();
                await hub.storeWatchResult(file, result);
                UI.info('Results saved to Hub folder');
            }

            // Display results
            displayAnalysisResult(result, options.verbose);

            // Exit with appropriate code
            const exitCode = result.status === 'APPROVED' ? 0 : 1;
            process.exit(exitCode);

        } catch (error) {
            UI.error(`Analysis failed: ${error.message}`);
            process.exit(1);
        }
    });

/**
 * Watch command - monitor files for changes
 */
program
    .command('watch')
    .description('Start monitoring files for changes')
    .option('-d, --directories <dirs>', 'Directories to watch (comma-separated)', './src')
    .option('-c, --config <path>', 'Configuration file path')
    .action(async (options) => {
        try {
            UI.banner('AI-COUNCIL WATCH MODE', 'Monitoring files for changes');

            const council = new AICouncil();
            await council.initialize(options.config);

            // Initialize Hub storage
            const hub = new HubStorage();
            await hub.initialize();

            const agentCount = council.orchestrator?.aiCouncil?.agents?.size || 0;
            UI.info(`Council ready with ${agentCount} agent(s)`);

            const directories = options.directories.split(',').map(d => d.trim());
            UI.info(`Watching directories: ${directories.join(', ')}`);
            UI.blank();

            UI.section('ACTIVE MONITORING');
            UI.info('Press Ctrl+C to stop');
            UI.blank();

            await council.startWatching(directories);

            // Handle graceful shutdown
            process.on('SIGINT', async () => {
                UI.blank();
                UI.info('Shutting down...');
                await council.cleanup();
                UI.success('Watch mode stopped');
                process.exit(0);
            });

            process.stdin.resume();

        } catch (error) {
            UI.error(`Watch mode failed: ${error.message}`);
            process.exit(1);
        }
    });

/**
 * Status command - show system status
 */
program
    .command('status')
    .description('Show AI-COUNCIL system status')
    .option('-c, --config <path>', 'Configuration file path')
    .action(async (options) => {
        try {
            UI.banner('AI-COUNCIL STATUS', 'System Health Check');

            const council = new AICouncil();

            try {
                await council.initialize(options.config);
            } catch (error) {
                // Continue to show status even if initialization fails
            }

            const health = await council.healthCheck();
            const hub = new HubStorage();
            const hubHealth = await hub.healthCheck();

            // System status
            UI.section('SYSTEM');
            UI.status('Overall', health.status.toUpperCase());
            UI.status('Hub Storage', hubHealth.connected ? 'Connected' : 'Not initialized');

            // Agent status
            UI.section('AGENTS');
            const agentCount = health.components.agentCount || 0;
            UI.keyValue('Active Agents', agentCount);

            if (council.orchestrator?.aiCouncil?.agents) {
                UI.blank();
                const widths = [20, 30, 15];
                UI.tableHeader(['Agent', 'Model', 'Status'], widths);

                for (const [name, agent] of council.orchestrator.aiCouncil.agents) {
                    const info = agent.getModelInfo();
                    UI.tableRow(
                        [name, info.model || 'N/A', info.clientAvailable ? 'Ready' : 'Error'],
                        widths
                    );
                }
            }

            // Statistics
            if (hubHealth.connected) {
                const stats = await hub.getStats();
                UI.section('STATISTICS');
                UI.keyValue('Total Analyses', stats.totalAnalyses);
                UI.keyValue('Approved', stats.approved);
                UI.keyValue('Rejected', stats.rejected);
                UI.keyValue('Average Score', stats.averageScore + '/100');
                if (stats.lastAnalysis) {
                    UI.keyValue('Last Analysis', stats.lastAnalysis);
                }
            }

            UI.blank();

        } catch (error) {
            UI.error(`Status check failed: ${error.message}`);
            process.exit(1);
        }
    });

/**
 * Stats command - show analysis statistics
 */
program
    .command('stats')
    .description('Show analysis statistics from Hub')
    .option('-l, --limit <number>', 'Number of recent analyses to show', '10')
    .action(async (options) => {
        try {
            UI.banner('AI-COUNCIL STATISTICS', 'Analysis History');

            const hub = new HubStorage();
            await hub.initialize();

            const stats = await hub.getStats();
            const results = await hub.getWatchResults(parseInt(options.limit));

            UI.section('SUMMARY');
            UI.keyValue('Total Analyses', stats.totalAnalyses);
            UI.keyValue('Approved', stats.approved);
            UI.keyValue('Rejected', stats.rejected);
            UI.keyValue('Review Needed', stats.reviewNeeded);
            UI.keyValue('Average Score', stats.averageScore + '/100');

            if (results.length > 0) {
                UI.section('RECENT ANALYSES');
                const widths = [25, 12, 15, 20];
                UI.tableHeader(['File', 'Score', 'Status', 'Time'], widths);

                for (const r of results) {
                    const fileName = path.basename(r.file || 'Unknown');
                    const score = (r.result?.finalScore || 0) + '/100';
                    const status = r.result?.status || 'Unknown';
                    const time = new Date(r.timestamp).toLocaleString();
                    UI.tableRow([fileName, score, status, time], widths);
                }
            }

            UI.blank();

        } catch (error) {
            UI.error(`Statistics failed: ${error.message}`);
            process.exit(1);
        }
    });

/**
 * Config command - manage configuration
 */
program
    .command('config')
    .description('Manage AI-COUNCIL configuration')
    .option('--show', 'Show current configuration')
    .option('--set <key=value>', 'Set configuration value')
    .option('--reset', 'Reset to default configuration')
    .action(async (options) => {
        try {
            const council = new AICouncil();

            if (options.show) {
                UI.banner('AI-COUNCIL CONFIGURATION');
                const config = council.getConfig();
                console.log(JSON.stringify(config, null, 2));
            } else if (options.set) {
                const [key, value] = options.set.split('=');
                if (!key || !value) {
                    UI.error('Invalid format. Use: --set key=value');
                    process.exit(1);
                }
                UI.info(`Setting ${key} = ${value}`);
                UI.success('Configuration updated');
            } else if (options.reset) {
                UI.info('Resetting configuration to defaults');
                UI.success('Configuration reset');
            } else {
                UI.info('Use --show, --set, or --reset options');
            }

        } catch (error) {
            UI.error(`Configuration failed: ${error.message}`);
            process.exit(1);
        }
    });

/**
 * Clean command - cleanup old results
 */
program
    .command('clean')
    .description('Clean up old analysis results')
    .option('-k, --keep <number>', 'Number of recent results to keep', '100')
    .action(async (options) => {
        try {
            UI.banner('AI-COUNCIL CLEANUP');

            const hub = new HubStorage();
            await hub.initialize();

            const keepCount = parseInt(options.keep);
            UI.info(`Keeping last ${keepCount} results...`);

            const deleted = await hub.cleanup(keepCount);
            UI.success(`Removed ${deleted} old result files`);
            UI.blank();

        } catch (error) {
            UI.error(`Cleanup failed: ${error.message}`);
            process.exit(1);
        }
    });

/**
 * Display analysis result with professional formatting
 */
function displayAnalysisResult(result, verbose = false) {
    UI.blank();
    UI.section('ANALYSIS RESULT');

    // Overall result
    UI.status('Status', result.status);
    UI.score('Final Score', result.finalScore);
    UI.keyValue('Consensus', (result.consensus * 100).toFixed(1) + '%');
    UI.keyValue('Analysis Time', result.executionTime + 'ms');

    if (result.debateResult?.debated) {
        UI.keyValue('Debate Rounds', result.debateResult.rounds);
    }

    // Agent results
    if (result.agentResults && result.agentResults.length > 0) {
        UI.section('AGENT RATINGS');

        const successfulAgents = result.agentResults.filter(r => !r.error && r.score > 0);
        for (const agent of successfulAgents) {
            UI.agentResult(
                agent.agentName || agent.name || 'Unknown',
                agent.score,
                agent.confidence || 0
            );

            if (verbose && agent.issues && agent.issues.length > 0) {
                UI.blank();
                for (const issue of agent.issues.slice(0, 3)) {
                    UI.issue(
                        issue.severity,
                        issue.message,
                        issue.suggestion,
                        issue.line,
                        4
                    );
                }
                UI.blank();
            }
        }
    }

    // Issues summary
    if (result.rejectionDetails && result.status !== 'APPROVED') {
        UI.section('ISSUES FOUND');

        if (result.rejectionDetails.primaryIssues) {
            for (const issue of result.rejectionDetails.primaryIssues.slice(0, 5)) {
                UI.issue(
                    issue.severity,
                    issue.message,
                    issue.suggestion,
                    issue.line
                );
                UI.blank();
            }
        }

        // What needs fixing
        if (verbose && result.rejectionDetails.whatNeedsFixing) {
            UI.section('REQUIRED FIXES');
            let count = 1;
            for (const fix of result.rejectionDetails.whatNeedsFixing.slice(0, 5)) {
                UI.numberedItem(count++, fix.issue);
                UI.listItem(`Fix: ${fix.fix}`, 4);
                if (fix.line) {
                    UI.listItem(`Line: ${fix.line}`, 4);
                }
                UI.blank();
            }
        }
    }

    // Recommendations
    if (result.recommendations) {
        const allRecs = [
            ...(result.recommendations.critical || []),
            ...(result.recommendations.important || [])
        ].slice(0, 3);

        if (allRecs.length > 0) {
            UI.section('RECOMMENDATIONS');
            for (const rec of allRecs) {
                UI.listItem(rec.message || rec.action || rec);
            }
        }
    }

    UI.blank();

    // Final summary
    if (result.status === 'APPROVED') {
        UI.success('Code meets quality standards');
    } else {
        UI.error('Code requires improvements before approval');
    }

    UI.blank();
}

// Error handlers
process.on('unhandledRejection', (reason, promise) => {
    UI.error(`Unhandled error: ${reason}`);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    UI.error(`Fatal error: ${error.message}`);
    process.exit(1);
});

// Parse arguments
program.parse();

// Show help if no command
if (!process.argv.slice(2).length) {
    program.outputHelp();
}