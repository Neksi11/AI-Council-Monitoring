/**
 * LlamaAgent - Uses Meta's Llama models for code analysis
 */

const { AIModelAgent } = require('./ai-model-agent');

class LlamaAgent extends AIModelAgent {
    constructor(config = {}) {
        const modelConfig = {
            provider: config.provider || 'ollama', // Can be 'ollama', 'groq', or 'openai'
            model: config.model || 'llama2:13b',
            apiKey: config.apiKey,
            endpoint: config.endpoint || 'http://localhost:11434',
            maxTokens: config.maxTokens || 2000,
            temperature: config.temperature || 0.1,
            ...config
        };

        super('Llama', modelConfig, config.weight || 0.2);
    }

    /**
     * Llama-specific system prompt
     */
    getSystemPrompt() {
        return `You are Llama, a large language model created by Meta. You are an experienced software engineer with expertise in:

- Code analysis and review
- Software architecture and design patterns
- Performance optimization
- Security best practices
- Cross-platform development

Your role in the AI-COUNCIL is to provide thorough, methodical code analysis with focus on:

1. **Systematic Analysis**: Break down code systematically and methodically
2. **Best Practices**: Ensure adherence to established coding standards
3. **Cross-Platform Considerations**: Think about portability and compatibility
4. **Educational Value**: Provide explanations that help developers learn

Your analysis approach:
- Be thorough and systematic in your review
- Explain the reasoning behind your assessments
- Focus on established best practices and proven patterns
- Consider long-term maintainability and team collaboration
- Provide educational context for your recommendations

Rate the code on a scale of 0-100 where:
- 90-100: Exemplary code following all best practices
- 80-89: Well-written code with minor areas for improvement
- 70-79: Good code that meets standards with some enhancements needed
- 60-69: Adequate code with several issues to address
- 50-59: Below-standard code requiring significant improvements
- 0-49: Poor code with fundamental issues needing major revision

Focus on providing clear, educational feedback that helps developers understand not just what to change, but why.`;
    }

    /**
     * Llama-specific analysis with educational focus
     */
    buildAnalysisPrompt(code, context) {
        const basePrompt = super.buildAnalysisPrompt(code, context);

        return `${basePrompt}

## Llama Analysis Guidelines:
- Provide systematic, step-by-step analysis
- Explain the reasoning behind each assessment
- Focus on established best practices and standards
- Consider maintainability and team collaboration aspects
- Provide educational context for recommendations
- Think about cross-platform compatibility if relevant

## Analysis Framework:
1. **Structure & Organization**: How well is the code organized?
2. **Readability & Clarity**: Is the code easy to understand?
3. **Best Practices**: Does it follow established conventions?
4. **Error Handling**: How robust is the error handling?
5. **Performance**: Are there obvious performance considerations?
6. **Maintainability**: How easy would this be to maintain and extend?

Provide detailed explanations for your assessments to help developers learn and improve.`;
    }

    /**
     * Handle different Llama deployment options
     */
    async callAIModel(prompt) {
        switch (this.modelConfig.provider) {
            case 'ollama':
                return await this.callOllama(prompt);
            case 'groq':
                return await this.callGroq(prompt);
            case 'openai':
                return await this.callOpenAI(prompt);
            default:
                return await super.callAIModel(prompt);
        }
    }

    /**
     * Enhanced Ollama call for local Llama models
     */
    async callOllama(prompt) {
        try {
            const response = await this.client.generate({
                model: this.modelConfig.model,
                prompt: prompt,
                options: {
                    temperature: this.modelConfig.temperature,
                    num_predict: this.modelConfig.maxTokens,
                    top_p: 0.9,
                    repeat_penalty: 1.1
                }
            });

            return response.response;
        } catch (error) {
            // Fallback for different Ollama API versions
            console.warn(`[WARN] Ollama API call failed, trying alternative: ${error.message}`);

            const fetch = require('node-fetch');
            const response = await fetch(`${this.modelConfig.endpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelConfig.model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: this.modelConfig.temperature,
                        num_predict: this.modelConfig.maxTokens
                    }
                })
            });

            const data = await response.json();
            return data.response;
        }
    }

    /**
     * Test if Llama model is available locally
     */
    async testConnection() {
        try {
            if (this.modelConfig.provider === 'ollama') {
                // Check if Ollama is running and model is available
                const fetch = require('node-fetch');
                const response = await fetch(`${this.modelConfig.endpoint}/api/tags`);
                const data = await response.json();

                const modelAvailable = data.models?.some(m =>
                    m.name.includes(this.modelConfig.model.split(':')[0])
                );

                if (!modelAvailable) {
                    console.warn(`[WARN] Llama model ${this.modelConfig.model} not found in Ollama`);
                    return false;
                }
            }

            return await super.testConnection();
        } catch (error) {
            console.error(`[ERROR] Llama connection test failed:`, error.message);
            return false;
        }
    }

    /**
     * Get available Llama models from Ollama
     */
    async getAvailableModels() {
        if (this.modelConfig.provider !== 'ollama') {
            return [];
        }

        try {
            const fetch = require('node-fetch');
            const response = await fetch(`${this.modelConfig.endpoint}/api/tags`);
            const data = await response.json();

            return data.models?.filter(m =>
                m.name.toLowerCase().includes('llama')
            ) || [];
        } catch (error) {
            console.error('Failed to get available Llama models:', error.message);
            return [];
        }
    }
}

module.exports = { LlamaAgent };