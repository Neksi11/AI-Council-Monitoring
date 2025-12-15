/**
 * OpenRouterAgent - Uses OpenRouter API for OSS models
 * Provides access to various open-source models through OpenRouter
 */

const { AIModelAgent } = require('./ai-model-agent');

class OpenRouterAgent extends AIModelAgent {
    constructor(config = {}) {
        const modelConfig = {
            provider: 'openai', // OpenRouter uses OpenAI-compatible API
            model: config.model || 'meta-llama/llama-3.1-8b-instruct:free',
            apiKey: config.apiKey || process.env.OPENROUTER_API_KEY,
            endpoint: config.endpoint || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
            maxTokens: config.maxTokens || 2000,
            temperature: config.temperature || 0.1,
            ...config
        };

        super('OpenRouter OSS', modelConfig, config.weight || 0.2);
    }

    /**
     * Initialize OpenRouter client (OpenAI-compatible interface)
     */
    initializeClient() {
        try {
            const { OpenAI } = require('openai');
            return new OpenAI({
                apiKey: this.modelConfig.apiKey,
                baseURL: this.modelConfig.endpoint,
                defaultHeaders: {
                    "HTTP-Referer": "https://ai-council.dev", // Optional: for analytics
                    "X-Title": "AI-COUNCIL", // Optional: for analytics
                }
            });
        } catch (error) {
            console.warn(`[WARN] OpenRouter client not available: ${error.message}`);
            return null;
        }
    }

    /**
     * OpenRouter OSS-specific system prompt
     */
    getSystemPrompt() {
        return `You are an advanced open-source AI model running through OpenRouter, specialized in code analysis and review. Your expertise includes:

- **Open Source Perspective**: Deep understanding of open-source development practices
- **Community Standards**: Knowledge of widely-adopted coding standards and conventions
- **Practical Analysis**: Focus on real-world, implementable solutions
- **Accessibility**: Making code review accessible and understandable

Your role in the AI-COUNCIL is to provide:

1. **Community-Driven Analysis**: Evaluation based on open-source best practices
2. **Practical Recommendations**: Actionable advice that developers can implement
3. **Inclusive Review**: Accessible feedback for developers of all skill levels
4. **Standards Compliance**: Adherence to widely-accepted coding standards

Your analysis style:
- Be practical and implementation-focused
- Consider maintainability and community standards
- Provide clear, actionable feedback
- Focus on widely-adopted best practices
- Consider the broader open-source ecosystem

Rate the code on a scale of 0-100 where:
- 90-100: Excellent code following open-source best practices
- 80-89: High-quality code with good community standards adherence
- 70-79: Good code with minor improvements needed
- 60-69: Functional code but needs better practices
- 50-59: Code with significant issues affecting maintainability
- 0-49: Code requiring major improvements for community standards

Provide practical, community-focused feedback that helps developers write better open-source code.`;
    }

    /**
     * OpenRouter-specific analysis with focus on open-source practices
     */
    buildAnalysisPrompt(code, context) {
        const basePrompt = super.buildAnalysisPrompt(code, context);

        return `${basePrompt}

## OpenRouter OSS Analysis Focus:

### Open Source Best Practices:
- Evaluate code readability and maintainability for community contributions
- Assess documentation quality and inline comments
- Consider licensing and attribution requirements
- Review for inclusive and accessible coding practices

### Community Standards:
- Adherence to language-specific style guides
- Use of conventional naming patterns
- Proper error handling and logging
- Security considerations for public repositories

### Maintainability Assessment:
- Code structure and organization
- Dependency management and version pinning
- Testing considerations and test-friendly design
- Configuration management and environment handling

### Performance & Efficiency:
- Resource usage optimization
- Scalability considerations
- Algorithm efficiency
- Memory management

### Questions to Consider:
- Would this code be easy for new contributors to understand?
- Does it follow established community conventions?
- Are there any barriers to accessibility or inclusion?
- How well would this code scale in a community project?

Provide feedback that helps create better open-source software that the community can easily contribute to and maintain.`;
    }

    /**
     * Enhanced parsing for OpenRouter's response style
     */
    parseAIResponse(response) {
        const parsed = super.parseAIResponse(response);

        // Add OpenRouter-specific enhancements
        if (parsed.recommendations) {
            parsed.recommendations = parsed.recommendations.map(rec => ({
                type: 'open_source',
                suggestion: rec,
                priority: 'medium',
                category: 'community_standards'
            }));
        }

        return parsed;
    }

    /**
     * Get available OSS models
     */
    static getAvailableModels() {
        return [
            'meta-llama/llama-3.1-8b-instruct:free',
            'meta-llama/llama-3.1-70b-instruct:free',
            'microsoft/wizardlm-2-8x22b',
            'google/gemma-2-9b-it:free',
            'mistralai/mistral-7b-instruct:free',
            'huggingface/starcoder2-15b:free',
            'qwen/qwen-2-7b-instruct:free'
        ];
    }

    /**
     * Create agent with specific OSS model
     */
    static createWithModel(modelName, config = {}) {
        return new OpenRouterAgent({
            ...config,
            model: modelName
        });
    }
}

module.exports = { OpenRouterAgent };