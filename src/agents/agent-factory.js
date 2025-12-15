/**
 * AgentFactory - Dynamically creates AI agents
 */

const { ClaudeAgent } = require('./claude-agent');
const { GPTAgent } = require('./gpt-agent');
const { GrokAgent } = require('./grok-agent');
const { GeminiAgent } = require('./gemini-agent');
const { LlamaAgent } = require('./llama-agent');
const { ZaiAgent } = require('./zai-agent');
const { OpenRouterAgent } = require('./openrouter-agent');
const { AIModelAgent } = require('./ai-model-agent');

class AgentFactory {
    constructor() {
        this.agentTypes = {
            claude: ClaudeAgent,
            gpt: GPTAgent,
            grok: GrokAgent,
            gemini: GeminiAgent,
            llama: LlamaAgent,
            zai: ZaiAgent,
            openrouter: OpenRouterAgent
        };
    }

    /**
     * Create an agent by name
     */
    createAgent(name, config = {}) {
        const AgentClass = this.agentTypes[name.toLowerCase()];

        if (!AgentClass) {
            throw new Error(`Unknown agent type: ${name}. Available: ${Object.keys(this.agentTypes).join(', ')}`);
        }

        try {
            return new AgentClass(config);
        } catch (error) {
            console.warn(`[WARN] Failed to create ${name} agent: ${error.message}`);
            return null;
        }
    }

    /**
     * Create multiple agents from configuration
     */
    createAgentsFromConfig(modelsConfig) {
        const agents = new Map();

        Object.entries(modelsConfig).forEach(([name, config]) => {
            if (config.enabled) {
                // Check if API key is available before creating agent
                if (this.hasValidApiKeySync(name)) {
                    const agent = this.createAgent(name, config);
                    if (agent) {
                        agents.set(name, agent);
                    }
                } else {
                    // Silently skip agents without API keys
                    console.log(`[WARN] Skipping ${name} agent: API key not configured`);
                }
            }
        });

        return agents;
    }

    /**
     * Create a custom agent with specific configuration
     */
    createCustomAgent(name, provider, config) {
        try {
            const customConfig = {
                provider: provider,
                ...config
            };

            const agent = new AIModelAgent(name, customConfig);
            return agent;
        } catch (error) {
            console.warn(`[WARN] Failed to create custom agent ${name}: ${error.message}`);
            return null;
        }
    }

    /**
     * Get available agent types
     */
    getAvailableAgentTypes() {
        return Object.keys(this.agentTypes);
    }

    /**
     * Register a new agent type
     */
    registerAgentType(name, AgentClass) {
        this.agentTypes[name.toLowerCase()] = AgentClass;
        console.log(`📝 Registered new agent type: ${name}`);
    }

    /**
     * Auto-detect and create available agents
     */
    async autoCreateAgents() {
        const agents = new Map();
        const availableAgents = [];

        // Check each agent type
        for (const [name, AgentClass] of Object.entries(this.agentTypes)) {
            try {
                // Try to create with minimal config
                const testConfig = this.getDefaultConfig(name);
                const agent = new AgentClass(testConfig);

                // Test if API key is available
                if (await this.hasValidApiKey(name)) {
                    agents.set(name, agent);
                    availableAgents.push(name);
                    console.log(`[OK] Auto-created ${name} agent`);
                } else {
                    console.log(`[WARN] ${name} agent available but no API key found`);
                }
            } catch (error) {
                console.log(`[ERROR] ${name} agent not available: ${error.message}`);
            }
        }

        console.log(`[INFO] Auto-created ${agents.size} agents: ${availableAgents.join(', ')}`);
        return agents;
    }

    /**
     * Get default configuration for an agent type
     */
    getDefaultConfig(agentType) {
        const defaults = {
            claude: {
                model: 'claude-3-sonnet-20240229',
                weight: 0.25
            },
            gpt: {
                model: 'gpt-4-turbo-preview',
                weight: 0.25
            },
            grok: {
                model: 'grok-beta',
                weight: 0.2
            },
            gemini: {
                model: 'gemini-pro',
                weight: 0.15
            },
            llama: {
                model: 'llama2:13b',
                provider: 'ollama',
                weight: 0.15
            },
            zai: {
                model: 'glm-4.6', // Z.AI requires lowercase
                weight: 0.2
            },
            openrouter: {
                model: 'meta-llama/llama-3.1-8b-instruct:free',
                weight: 0.15
            }
        };

        return defaults[agentType.toLowerCase()] || { weight: 0.2 };
    }

    /**
     * Check if API key is available for agent type
     */
    async hasValidApiKey(agentType) {
        return this.hasValidApiKeySync(agentType);
    }

    /**
     * Synchronous version of API key check
     */
    hasValidApiKeySync(agentType) {
        const keyMappings = {
            claude: 'ANTHROPIC_API_KEY',
            gpt: 'OPENAI_API_KEY',
            grok: 'GROQ_API_KEY',
            gemini: 'GOOGLE_API_KEY',
            llama: null, // Local model, no API key needed
            zai: 'ZAI_API_KEY',
            openrouter: 'OPENROUTER_API_KEY'
        };

        const envKey = keyMappings[agentType.toLowerCase()];

        if (!envKey) {
            return true; // No API key required (e.g., local models)
        }

        const apiKey = process.env[envKey];
        return !!(apiKey && apiKey.trim().length > 0 && !apiKey.includes('your-') && !apiKey.includes('api-key-here'));
    }

    /**
     * Create agents with fallback strategy
     */
    async createWithFallback(preferredAgents = ['claude', 'gpt', 'gemini']) {
        const agents = new Map();

        // Try preferred agents first
        for (const agentName of preferredAgents) {
            if (await this.hasValidApiKey(agentName)) {
                const agent = this.createAgent(agentName);
                if (agent) {
                    agents.set(agentName, agent);
                }
            }
        }

        // If no preferred agents available, try any available
        if (agents.size === 0) {
            console.log('⚠️  No preferred agents available, trying all available agents...');
            return await this.autoCreateAgents();
        }

        return agents;
    }

    /**
     * Validate agent configuration
     */
    validateAgentConfig(name, config) {
        const errors = [];

        if (!name || typeof name !== 'string') {
            errors.push('Agent name must be a non-empty string');
        }

        if (!config || typeof config !== 'object') {
            errors.push('Agent config must be an object');
        }

        if (config.weight !== undefined && (typeof config.weight !== 'number' || config.weight < 0 || config.weight > 1)) {
            errors.push('Agent weight must be a number between 0 and 1');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = { AgentFactory };