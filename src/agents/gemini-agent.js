/**
 * GeminiAgent - Uses Google's Gemini for code analysis
 */

const { AIModelAgent } = require('./ai-model-agent');

class GeminiAgent extends AIModelAgent {
    constructor(config = {}) {
        const modelConfig = {
            provider: 'google',
            model: config.model || 'gemini-pro',
            apiKey: config.apiKey || process.env.GOOGLE_API_KEY,
            maxTokens: config.maxTokens || 1500,
            temperature: config.temperature || 0.1,
            ...config
        };

        super('Gemini', modelConfig, config.weight || 0.15);
    }

    /**
     * Gemini-specific system prompt
     */
    getSystemPrompt() {
        return `You are Gemini, Google's advanced AI model with multimodal capabilities and deep understanding of software engineering. You excel at:

- Comprehensive code analysis across multiple languages
- Understanding complex codebases and their relationships
- Identifying subtle bugs and potential issues
- Providing context-aware recommendations
- Analyzing code from multiple perspectives simultaneously

Your role in the AI-COUNCIL is to provide multi-faceted analysis with focus on:

1. **Comprehensive Review**: Analyze code from multiple angles simultaneously
2. **Context Awareness**: Consider the broader codebase context and implications
3. **Bug Detection**: Identify subtle bugs and edge cases
4. **Integration Analysis**: How well does this code integrate with larger systems

Your analysis strengths:
- Multi-perspective analysis (security, performance, maintainability)
- Deep understanding of language-specific idioms and patterns
- Ability to see connections and dependencies
- Strong pattern recognition across different coding paradigms

Rate the code on a scale of 0-100 where:
- 90-100: Outstanding code with excellent practices across all dimensions
- 80-89: High-quality code with strong fundamentals and minor improvements
- 70-79: Good code that meets standards with some areas for enhancement
- 60-69: Acceptable code with moderate issues requiring attention
- 50-59: Below-average code with significant problems to address
- 0-49: Poor code with fundamental flaws requiring substantial rework

Provide comprehensive, multi-dimensional feedback that considers all aspects of code quality.`;
    }

    /**
     * Gemini-specific analysis with multi-perspective approach
     */
    buildAnalysisPrompt(code, context) {
        const basePrompt = super.buildAnalysisPrompt(code, context);

        return `${basePrompt}

## Gemini Multi-Perspective Analysis:
Analyze this code from multiple perspectives simultaneously:

### 1. Technical Quality
- Code structure and organization
- Algorithm efficiency and correctness
- Error handling and edge cases
- Resource management

### 2. Security Perspective
- Potential vulnerabilities
- Input validation and sanitization
- Authentication and authorization
- Data protection considerations

### 3. Maintainability View
- Code readability and documentation
- Modularity and separation of concerns
- Testing considerations
- Future extensibility

### 4. Integration Context
- How well does this fit with typical system architectures?
- Potential integration challenges
- API design and usability
- Dependency management

### 5. Language-Specific Analysis
- Idiomatic use of language features
- Framework-specific best practices
- Performance characteristics for this language
- Common pitfalls and how they're avoided (or not)

Provide a comprehensive assessment that synthesizes insights from all these perspectives.`;
    }

    /**
     * Enhanced Google AI client initialization
     */
    initializeClient() {
        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            return new GoogleGenerativeAI(this.modelConfig.apiKey);
        } catch (error) {
            console.warn(`[WARN] Google AI SDK not available: ${error.message}`);
            return null;
        }
    }

    /**
     * Enhanced Google AI API call with safety settings
     */
    async callGoogle(prompt) {
        try {
            const model = this.client.getGenerativeModel({
                model: this.modelConfig.model,
                generationConfig: {
                    temperature: this.modelConfig.temperature,
                    maxOutputTokens: this.modelConfig.maxTokens,
                    topP: 0.8,
                    topK: 40
                }
            });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error(`[ERROR] Gemini API call failed:`, error.message);
            throw error;
        }
    }

    /**
     * Enhanced response parsing for Gemini's detailed responses
     */
    parseAIResponse(response) {
        const parsed = super.parseAIResponse(response);

        // Gemini often provides very detailed responses, ensure we capture all insights
        if (typeof response === 'string' && !parsed.reasoning) {
            // Extract key insights from detailed text response
            const sections = response.split(/\n\s*\n/);
            const insights = sections.filter(section =>
                section.length > 50 &&
                (section.includes('analysis') || section.includes('recommendation') || section.includes('issue'))
            );

            if (insights.length > 0) {
                parsed.reasoning = insights.join('\n\n');
            }
        }

        return parsed;
    }

    /**
     * Multi-model analysis (if multiple Gemini models are available)
     */
    async analyzeWithMultipleModels(code, context) {
        const models = ['gemini-pro', 'gemini-pro-vision'];
        const results = [];

        for (const modelName of models) {
            try {
                const tempConfig = { ...this.modelConfig, model: modelName };
                const tempAgent = new GeminiAgent(tempConfig);
                const result = await tempAgent.analyze(code, context);
                results.push(result);
            } catch (error) {
                console.warn(`[WARN] Failed to analyze with ${modelName}:`, error.message);
            }
        }

        // Combine results if multiple models were used
        if (results.length > 1) {
            const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
            const combinedIssues = results.flatMap(r => r.issues);
            const combinedReasoning = results.map(r => r.reasoning).join('\n\n---\n\n');

            return this.createResult(
                Math.round(avgScore),
                combinedIssues,
                combinedReasoning,
                Math.max(...results.map(r => r.confidence))
            );
        }

        return results[0] || this.createErrorResult('No models available');
    }
}

module.exports = { GeminiAgent };