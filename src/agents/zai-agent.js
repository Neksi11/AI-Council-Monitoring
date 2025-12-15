/**
 * ZaiAgent - Uses Zai GML 4.6 for code analysis
 * Zai GML 4.6 is a high-performance AI model for code analysis
 */

const { AIModelAgent } = require('./ai-model-agent');

class ZaiAgent extends AIModelAgent {
    constructor(config = {}) {
        const modelConfig = {
            provider: config.provider || 'openai', // Default to OpenAI-compatible API
            model: config.model || process.env.ZAI_MODEL || 'glm-4.6', // Must be lowercase!
            apiKey: config.apiKey || process.env.ZAI_API_KEY,
            endpoint: config.endpoint || process.env.ZAI_BASE_URL || 'https://api.z.ai/api/coding/paas/v4',
            maxTokens: config.maxTokens || 2000,
            temperature: config.temperature || 0.1,
            ...config
        };

        super('Zai', modelConfig, config.weight || 0.2);
    }

    /**
     * Initialize Zai client (OpenAI-compatible interface)
     */
    initializeClient() {
        try {
            const { OpenAI } = require('openai');
            return new OpenAI({
                apiKey: this.modelConfig.apiKey,
                baseURL: this.modelConfig.endpoint
            });
        } catch (error) {
            console.warn(`[WARN] Zai client not available: ${error.message}`);
            return null;
        }
    }

    /**
     * Zai GML 4.6-specific system prompt
     */
    getSystemPrompt() {
        return `You are Zai GML 4.6, an advanced AI model specialized in deep code analysis and architectural review. Your expertise includes:

- **Deep Code Understanding**: Comprehensive analysis of code structure, patterns, and design
- **Architectural Insights**: Evaluation of code architecture, scalability, and maintainability
- **Performance Optimization**: Identification of performance bottlenecks and optimization opportunities
- **Security Analysis**: Deep security vulnerability assessment
- **Best Practices**: Expert knowledge of industry best practices and standards

Your role in the AI-COUNCIL is to provide:

1. **Comprehensive Analysis**: Deep, thorough examination of code quality and structure
2. **Architectural Review**: Evaluation of design patterns, scalability, and maintainability
3. **Performance Insights**: Detailed performance analysis and optimization recommendations
4. **Security Assessment**: Comprehensive security vulnerability identification
5. **Best Practice Guidance**: Expert recommendations based on industry standards

Your analysis style:
- Be thorough and comprehensive in your assessment
- Focus on long-term maintainability and scalability
- Provide detailed explanations for your findings
- Consider the broader architectural implications
- Offer specific, actionable recommendations

Rate the code on a scale of 0-100 where:
- 90-100: Exceptional code with excellent architecture and best practices
- 80-89: High-quality code with solid architecture and good practices
- 70-79: Good code with minor architectural or practice issues
- 60-69: Functional code but needs architectural improvements
- 50-59: Code with significant architectural or quality issues
- 0-49: Code with serious architectural or quality problems requiring major rework

Provide detailed, actionable feedback that helps developers understand not just what's wrong, but why it matters and how to fix it.`;
    }

    /**
     * Zai-specific analysis with focus on deep understanding
     */
    buildAnalysisPrompt(code, context) {
        const basePrompt = super.buildAnalysisPrompt(code, context);

        return `${basePrompt}

## Zai GML 4.6 Deep Analysis Focus:

### Architectural Analysis:
- Evaluate the overall code structure and organization
- Assess design patterns and their appropriateness
- Consider scalability and maintainability implications
- Review separation of concerns and modularity

### Performance Deep Dive:
- Identify potential performance bottlenecks
- Analyze time and space complexity
- Consider optimization opportunities
- Evaluate resource usage patterns

### Security Deep Assessment:
- Comprehensive vulnerability analysis
- Review input validation and sanitization
- Assess authentication and authorization patterns
- Evaluate data handling and privacy concerns

### Best Practices Evaluation:
- Adherence to language-specific best practices
- Framework-specific recommendations
- Industry standard compliance
- Code maintainability and readability

### Questions to Consider:
- How will this code scale as the application grows?
- What are the long-term maintenance implications?
- Are there architectural patterns that would improve this code?
- What security considerations might be overlooked?
- How does this code compare to industry best practices?

Provide a comprehensive analysis that goes beyond surface-level issues to understand the deeper implications of the code's design and implementation.`;
    }

    /**
     * Enhanced parsing for Zai's detailed response style
     */
    parseAIResponse(response) {
        const parsed = super.parseAIResponse(response);

        // Zai provides more detailed architectural insights
        if (parsed.recommendations) {
            parsed.recommendations = parsed.recommendations.map(rec => ({
                type: 'architectural',
                suggestion: rec,
                priority: 'high',
                category: 'best_practice'
            }));
        }

        return parsed;
    }
}

module.exports = { ZaiAgent };


