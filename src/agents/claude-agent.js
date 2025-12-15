/**
 * ClaudeAgent - Uses Anthropic's Claude for code analysis
 */

const { AIModelAgent } = require('./ai-model-agent');

class ClaudeAgent extends AIModelAgent {
    constructor(config = {}) {
        const modelConfig = {
            provider: 'anthropic',
            model: config.model || 'claude-3-sonnet-20240229',
            apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
            maxTokens: config.maxTokens || 1500,
            temperature: config.temperature || 0.1,
            ...config
        };

        super('Claude', modelConfig, config.weight || 0.25);
    }

    /**
     * Claude-specific system prompt
     */
    getSystemPrompt() {
        return `You are Claude, an AI assistant created by Anthropic. You are an expert software engineer and code reviewer with deep knowledge of:

- Security vulnerabilities and best practices
- Performance optimization techniques
- Code quality and maintainability
- Modern programming patterns and anti-patterns
- Testing strategies and methodologies

Your role in the AI-COUNCIL is to provide thorough, accurate code analysis with a focus on:

1. **Security Analysis**: Identify potential vulnerabilities, injection attacks, authentication issues
2. **Code Quality**: Assess readability, maintainability, and adherence to best practices  
3. **Architecture Review**: Evaluate design patterns, separation of concerns, and scalability
4. **Performance Considerations**: Identify bottlenecks, inefficient algorithms, resource usage

Provide constructive, actionable feedback that helps developers improve their code. Be specific about issues and always suggest concrete solutions.

Rate the code on a scale of 0-100 where:
- 90-100: Excellent code with minimal issues
- 80-89: Good code with minor improvements needed
- 70-79: Acceptable code with some issues to address
- 60-69: Below average code with significant issues
- 50-59: Poor code with major problems
- 0-49: Severely problematic code requiring substantial rework

Be honest but constructive in your assessment.`;
    }

    /**
     * Enhanced analysis for Claude's capabilities
     */
    async analyze(code, context) {
        // Add Claude-specific context to the analysis
        const enhancedContext = {
            ...context,
            analysisType: 'comprehensive',
            focusAreas: ['security', 'quality', 'performance', 'maintainability']
        };

        return await super.analyze(code, enhancedContext);
    }

    /**
     * Claude-specific prompt building with enhanced instructions
     */
    buildAnalysisPrompt(code, context) {
        const basePrompt = super.buildAnalysisPrompt(code, context);
        
        return `${basePrompt}

## Additional Claude Instructions:
- Pay special attention to security vulnerabilities
- Consider the broader architectural implications
- Provide specific, actionable recommendations
- If you see patterns that could be improved, suggest better alternatives
- Consider the maintainability and readability of the code
- Think about how this code might behave in production environments

Remember: You are part of an AI council. Your analysis will be combined with other AI models' assessments to make a final decision about code quality.`;
    }
}

module.exports = { ClaudeAgent };