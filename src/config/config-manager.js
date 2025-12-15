/**
 * ConfigManager - Handles configuration loading and validation
 */

const fs = require('fs').promises;
const path = require('path');

class ConfigManager {
    constructor() {
        this.defaultConfig = {
            project: {
                name: 'ai-council-project',
                language: 'javascript',
                framework: null
            },
            supabase: {
                url: null,
                key: null
            },
            monitoring: {
                directories: ['./src', './lib'],
                ignore: [
                    '**/node_modules/**',
                    '**/dist/**',
                    '**/build/**',
                    '**/.git/**',
                    '**/*.test.js',
                    '**/*.spec.js',
                    '**/*.min.js'
                ],
                fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java'],
                debounceDelay: 1000,
                maxFileSize: 1024 * 1024 // 1MB
            },
            // AI Model Agents Configuration
            models: {
                claude: {
                    enabled: true,
                    weight: 0.25,
                    apiKey: null, // Set via environment variable ANTHROPIC_API_KEY
                    model: 'claude-3-sonnet-20240229',
                    maxTokens: 1500,
                    temperature: 0.1
                },
                gpt: {
                    enabled: true,
                    weight: 0.25,
                    apiKey: null, // Set via environment variable OPENAI_API_KEY
                    model: 'gpt-4-turbo-preview',
                    maxTokens: 1500,
                    temperature: 0.1
                },
                grok: {
                    enabled: true, // Enabled by default
                    weight: 0.2,
                    apiKey: null, // Set via environment variable GROQ_API_KEY
                    model: 'llama-3.3-70b-versatile',
                    provider: 'groq',
                    endpoint: 'https://api.groq.com/openai/v1',
                    maxTokens: 1500,
                    temperature: 0.2
                },
                gemini: {
                    enabled: true,
                    weight: 0.15,
                    apiKey: null, // Set via environment variable GOOGLE_API_KEY
                    model: 'gemini-pro',
                    maxTokens: 1500,
                    temperature: 0.1
                },
                llama: {
                    enabled: false, // Disabled by default (requires local setup)
                    weight: 0.15,
                    model: 'llama2:13b',
                    provider: 'ollama',
                    endpoint: 'http://localhost:11434',
                    maxTokens: 2000,
                    temperature: 0.1
                },
                zai: {
                    enabled: true, // Enabled by default
                    weight: 0.2,
                    apiKey: null, // Set via environment variable ZAI_API_KEY
                    model: 'glm-4.6', // Z.AI requires lowercase model names
                    endpoint: 'https://api.z.ai/api/coding/paas/v4',
                    maxTokens: 2000,
                    temperature: 0.1
                },
                openrouter: {
                    enabled: true, // Enabled by default
                    weight: 0.15,
                    apiKey: null, // Set via environment variable OPENROUTER_API_KEY
                    model: 'mistralai/devstral-2512:free',
                    maxTokens: 2000,
                    temperature: 0.1
                }
            },
            thresholds: {
                // AI Council thresholds (adaptive)
                minScore: 70,           // Minimum score for approval
                minConsensus: 0.6,      // Minimum consensus between agents (lower for flexibility)
                minAgents: 1,           // Minimum number of agents required (flexible)

                // Default minimum score for any agent
                defaultAgentMinScore: 50,

                // Individual agent minimum scores (optional overrides)
                agentMinScores: {
                    claude: 60,
                    gpt: 60,
                    grok: 55,
                    gemini: 60,
                    llama: 55,
                    zai: 60
                },

                // Automatic rejection thresholds
                autoReject: {
                    maxScore: 30,       // Lower threshold for flexibility
                    minConsensus: 0.2,  // Lower threshold for single agent
                    criticalIssues: 5   // Higher threshold for flexibility
                },

                // Adaptive thresholds based on agent count
                adaptive: {
                    enabled: true,
                    singleAgent: {
                        minScore: 65,
                        minConsensus: 0.7  // Based on agent confidence
                    },
                    multiAgent: {
                        minScore: 70,
                        minConsensus: 0.6
                    }
                },

                // Legacy thresholds (for backward compatibility)
                autoApprove: 85,
                reviewNeeded: 60,
                consensusRequired: 0.7
            },
            learning: {
                enabled: true,
                patternExtraction: true,
                weightAdjustment: true,
                feedbackLoop: true
            },
            notifications: {
                desktop: true,
                vscode: true,
                webhook: null
            },
            output: {
                verbose: false,
                logLevel: 'info', // error, warn, info, debug
                saveResults: true,
                resultsPath: './.ai-council/results'
            }
        };

        this.configPath = './.ai-council.json';
        this.config = null;
    }

    /**
     * Load configuration from file or create default
     */
    async load(configPath = null) {
        try {
            this.configPath = configPath || this.configPath;

            // Check if config file exists
            const configExists = await this.fileExists(this.configPath);

            if (configExists) {
                const configContent = await fs.readFile(this.configPath, 'utf8');
                const userConfig = JSON.parse(configContent);

                // Merge with defaults
                this.config = this.mergeConfig(this.defaultConfig, userConfig);

                // Validate configuration
                this.validateConfig();
            } else {
                this.config = { ...this.defaultConfig };
            }

            // Load environment variables
            this.loadEnvironmentVariables();

            return this.config;
        } catch (error) {
            console.error('[ERROR] Failed to load configuration:', error.message);
            this.config = { ...this.defaultConfig };
            return this.config;
        }
    }

    /**
     * Save configuration to file
     */
    async save(configPath = null) {
        try {
            const savePath = configPath || this.configPath;

            // Ensure directory exists
            const configDir = path.dirname(savePath);
            await this.ensureDirectory(configDir);

            // Save configuration
            const configJson = JSON.stringify(this.config, null, 2);
            await fs.writeFile(savePath, configJson, 'utf8');

            return true;
        } catch (error) {
            console.error('[ERROR] Failed to save configuration:', error.message);
            throw error;
        }
    }

    /**
     * Initialize project with default configuration
     */
    async init(options = {}) {
        try {
            // Create base configuration
            this.config = this.mergeConfig(this.defaultConfig, options);

            // Set project name from current directory if not provided
            if (!this.config.project.name || this.config.project.name === 'ai-council-project') {
                const currentDir = path.basename(process.cwd());
                this.config.project.name = currentDir;
            }

            // Create necessary directories
            await this.createProjectStructure();

            // Save configuration
            await this.save();

            // Create example files
            await this.createExampleFiles();

            return this.config;
        } catch (error) {
            console.error('[ERROR] Failed to initialize project:', error.message);
            throw error;
        }
    }

    /**
     * Get current configuration
     */
    get() {
        return this.config || this.defaultConfig;
    }

    /**
     * Update configuration
     */
    update(updates) {
        this.config = this.mergeConfig(this.config || this.defaultConfig, updates);
        return this.config;
    }

    /**
     * Validate configuration
     */
    validateConfig() {
        const config = this.config;
        const errors = [];

        // Validate model weights sum (optional, just warn)
        if (config.models) {
            const totalWeight = Object.values(config.models)
                .filter(m => m && typeof m === 'object')
                .reduce((sum, model) => sum + (model.weight || 0), 0);
            // Weight validation is optional - just skip if not balanced
        }

        // Validate thresholds
        if (config.thresholds) {
            if (config.thresholds.autoApprove <= config.thresholds.autoReject) {
                errors.push('autoApprove threshold must be higher than autoReject');
            }
        }

        // Validate directories exist
        // Note: We'll check this when starting the watcher

        if (errors.length > 0) {
            throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Load environment variables
     */
    loadEnvironmentVariables() {
        // Try to load .env file
        this.loadDotEnv();

        // AI Model API Keys
        if (process.env.ANTHROPIC_API_KEY) {
            this.config.models.claude.apiKey = process.env.ANTHROPIC_API_KEY;
        }
        if (process.env.OPENAI_API_KEY) {
            this.config.models.gpt.apiKey = process.env.OPENAI_API_KEY;
        }
        if (process.env.GOOGLE_API_KEY) {
            this.config.models.gemini.apiKey = process.env.GOOGLE_API_KEY;
        }
        if (process.env.GOOGLE_MODEL) {
            this.config.models.gemini.model = process.env.GOOGLE_MODEL;
        }
        if (process.env.GROQ_API_KEY) {
            this.config.models.grok.apiKey = process.env.GROQ_API_KEY;
        }
        // Legacy support for GROK_API_KEY
        if (!this.config.models.grok.apiKey && process.env.GROK_API_KEY) {
            this.config.models.grok.apiKey = process.env.GROK_API_KEY;
        }
        if (process.env.ZAI_API_KEY) {
            this.config.models.zai.apiKey = process.env.ZAI_API_KEY;
        }
        if (process.env.ZAI_BASE_URL) {
            this.config.models.zai.endpoint = process.env.ZAI_BASE_URL;
        }
        if (process.env.ZAI_MODEL) {
            this.config.models.zai.model = process.env.ZAI_MODEL;
        }
        // Legacy support for ZAI_API_ENDPOINT
        if (process.env.ZAI_API_ENDPOINT) {
            this.config.models.zai.endpoint = process.env.ZAI_API_ENDPOINT;
        }

        // OpenRouter configuration
        if (process.env.OPENROUTER_API_KEY) {
            this.config.models.openrouter = this.config.models.openrouter || {};
            this.config.models.openrouter.apiKey = process.env.OPENROUTER_API_KEY;
            this.config.models.openrouter.enabled = true;
        }
        if (process.env.OPENROUTER_MODEL) {
            this.config.models.openrouter = this.config.models.openrouter || {};
            this.config.models.openrouter.model = process.env.OPENROUTER_MODEL;
        }

        // Supabase configuration
        if (process.env.SUPABASE_URL) {
            this.config.supabase.url = process.env.SUPABASE_URL;
        }
        if (process.env.SUPABASE_ANON_KEY) {
            this.config.supabase.key = process.env.SUPABASE_ANON_KEY;
        }

        // Log level
        if (process.env.AI_COUNCIL_LOG_LEVEL) {
            this.config.output.logLevel = process.env.AI_COUNCIL_LOG_LEVEL;
        }

        // Verbose mode
        if (process.env.AI_COUNCIL_VERBOSE === 'true') {
            this.config.output.verbose = true;
        }
    }

    /**
     * Load .env file if it exists
     */
    loadDotEnv() {
        try {
            const envPath = './.env';
            const fs = require('fs');
            const envExists = fs.existsSync(envPath);

            if (envExists) {
                const envContent = fs.readFileSync(envPath, 'utf8');
                const lines = envContent.split(/\r?\n/); // Handle both \n and \r\n

                lines.forEach(line => {
                    const trimmed = line.trim();
                    // Skip empty lines and comments
                    if (trimmed && !trimmed.startsWith('#')) {
                        // Handle both KEY=value and KEY="value" formats
                        const match = trimmed.match(/^([^=]+)=(.*)$/);
                        if (match) {
                            const key = match[1].trim();
                            let value = match[2].trim();

                            // Remove quotes if present
                            if ((value.startsWith('"') && value.endsWith('"')) ||
                                (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.slice(1, -1);
                            }

                            // Only set if value is not empty and not a placeholder
                            if (value && !value.includes('your-') && !value.includes('here')) {
                                process.env[key] = value;
                            }
                        }
                    }
                });
            }
        } catch (error) {
            // Silently fail if .env loading fails
        }
    }

    /**
     * Merge configurations recursively
     */
    mergeConfig(defaultConfig, userConfig) {
        const merged = { ...defaultConfig };

        for (const key in userConfig) {
            if (userConfig[key] && typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
                merged[key] = this.mergeConfig(defaultConfig[key] || {}, userConfig[key]);
            } else {
                merged[key] = userConfig[key];
            }
        }

        return merged;
    }

    /**
     * Create project directory structure
     * Note: Main storage now uses Hub folder (see hub-storage.js)
     * This method is kept for legacy compatibility but doesn't create folders
     */
    async createProjectStructure() {
        // Hub folder is now the primary storage location
        // See: src/storage/hub-storage.js
        // No additional folders needed here
    }

    /**
     * Create example files
     */
    async createExampleFiles() {
        // Create .gitignore entry for Hub folder
        const gitignorePath = '.gitignore';
        const gitignoreEntry = '\n# AI-COUNCIL\nHub/watch/\nHub/results/\n';

        try {
            const gitignoreExists = await this.fileExists(gitignorePath);
            if (gitignoreExists) {
                const content = await fs.readFile(gitignorePath, 'utf8');
                if (!content.includes('# AI-COUNCIL')) {
                    await fs.appendFile(gitignorePath, gitignoreEntry);
                }
            } else {
                await fs.writeFile(gitignorePath, gitignoreEntry);
            }
        } catch (error) {
            // Silently fail
        }

        // Create README section
        const readmePath = 'README.md';
        const readmeSection = `
## AI-COUNCIL

This project uses AI-COUNCIL for automated code quality assurance.

### Commands
- \`ai-council watch\` - Start monitoring files
- \`ai-council analyze <file>\` - Analyze specific file
- \`ai-council dashboard\` - View results dashboard

### Configuration
Edit \`.ai-council.json\` to customize settings.
`;

        try {
            const readmeExists = await this.fileExists(readmePath);
            if (!readmeExists) {
                await fs.writeFile(readmePath, `# ${this.config.project.name}${readmeSection}`);
            }
        } catch (error) {
            // Silently fail
        }
    }

    /**
     * Ensure directory exists
     */
    async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch (error) {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get configuration schema for validation
     */
    getSchema() {
        return {
            type: 'object',
            properties: {
                project: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        language: { type: 'string' },
                        framework: { type: ['string', 'null'] }
                    }
                },
                supabase: {
                    type: 'object',
                    properties: {
                        url: { type: ['string', 'null'] },
                        key: { type: ['string', 'null'] }
                    }
                },
                agents: {
                    type: 'object',
                    patternProperties: {
                        '^[a-z]+$': {
                            type: 'object',
                            properties: {
                                enabled: { type: 'boolean' },
                                weight: { type: 'number', minimum: 0, maximum: 1 }
                            }
                        }
                    }
                },
                thresholds: {
                    type: 'object',
                    properties: {
                        autoApprove: { type: 'number', minimum: 0, maximum: 100 },
                        autoReject: { type: 'number', minimum: 0, maximum: 100 },
                        reviewNeeded: { type: 'number', minimum: 0, maximum: 100 },
                        consensusRequired: { type: 'number', minimum: 0, maximum: 1 }
                    }
                }
            }
        };
    }
}

module.exports = { ConfigManager };