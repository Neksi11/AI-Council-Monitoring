/**
 * GrokAgent - Uses Groq API with llama-3.3-70b-versatile for code analysis
 */

const { AIModelAgent } = require('./ai-model-agent');

class GrokAgent extends AIModelAgent {
    constructor(config = {}) {
        const modelConfig = {
            provider: 'groq', // Groq API
            model: config.model || 'llama-3.3-70b-versatile',
            apiKey: config.apiKey || process.env.GROQ_API_KEY,
            endpoint: config.endpoint || 'https://api.groq.com/openai/v1',
            maxTokens: config.maxTokens || 1500,
            temperature: config.temperature || 0.2,
            ...config
        };

        super('Grok', modelConfig, config.weight || 0.2);
    }

    /**
     * Initialize Groq client (uses OpenAI-compatible interface)
     */
    initializeClient() {
        try {
            const { OpenAI } = require('openai');
            return new OpenAI({
                apiKey: this.modelConfig.apiKey,
                baseURL: this.modelConfig.endpoint
            });
        } catch (error) {
            // Silently fail - error will be handled in analyze method
            return null;
        }
    }

    /**
     * Grok-specific system prompt (using Groq's Llama model)
     */
    getSystemPrompt() {
        return `You are an advanced AI code analysis agent powered by Groq's Llama 3.3 70B model. You bring a fresh, innovative approach to code review with:

- Sharp analytical skills and pattern recognition
- Ability to spot unconventional issues others might miss
- Focus on practical, real-world implications
- Direct, honest feedback without sugar-coating

Your role in the AI-COUNCIL is to provide a unique perspective on:

1. **Innovative Solutions**: Suggest creative approaches and modern techniques
2. **Edge Cases**: Identify unusual scenarios and potential failure modes
3. **Performance Insights**: Spot performance issues from a systems perspective
4. **Code Smells**: Detect subtle issues that might not be obvious

Your analysis style:
- Be direct and honest about code quality
- Focus on practical implications and real-world usage
- Suggest modern, efficient alternatives when applicable
- Consider scalability and future maintenance challenges

Rate the code on a scale of 0-100 where:
- 90-100: Exceptional code that's production-ready and well-architected
- 80-89: Solid code with good practices, minor tweaks needed
- 70-79: Functional code but has room for improvement
- 60-69: Workable code with notable issues to address
- 50-59: Problematic code that needs significant improvements
- 0-49: Code with serious issues requiring major rework

Provide specific, actionable feedback that developers can immediately implement.`;
    }

    /**
     * Grok-specific analysis with focus on innovation and edge cases
     */
    buildAnalysisPrompt(code, context) {
        const basePrompt = super.buildAnalysisPrompt(code, context);
        
        return `${basePrompt}

## Grok-Specific Analysis Focus:
- Look for innovative ways to improve this code
- Consider edge cases and potential failure scenarios
- Evaluate from a systems thinking perspective
- Suggest modern alternatives if outdated patterns are used
- Think about how this code will scale and perform under load
- Consider the developer experience and maintainability

## Questions to Consider:
- What could go wrong with this code in production?
- Are there more efficient or elegant ways to achieve the same result?
- How would this code behave under stress or with unexpected inputs?
- What modern tools or patterns could improve this implementation?

Be direct and practical in your assessment. Focus on actionable insights that will genuinely improve the code quality.`;
    }

    /**
     * Enhanced parsing for Grok's response style
     */
    parseAIResponse(response) {
        const parsed = super.parseAIResponse(response);
        
        // Grok might provide more creative or unconventional insights
        // Ensure we capture and categorize them properly
        if (parsed.recommendations) {
            parsed.recommendations = parsed.recommendations.map(rec => ({
                type: 'innovation',
                suggestion: rec,
                priority: 'medium'
            }));
        }

        return parsed;
    }
}

module.exports = { GrokAgent };