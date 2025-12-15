/**
 * GPTAgent - Uses OpenAI's GPT models for code analysis
 */

const { AIModelAgent } = require('./ai-model-agent');

class GPTAgent extends AIModelAgent {
    constructor(config = {}) {
        const modelConfig = {
            provider: 'openai',
            model: config.model || 'gpt-4-turbo-preview',
            apiKey: config.apiKey || process.env.OPENAI_API_KEY,
            maxTokens: config.maxTokens || 1500,
            temperature: config.temperature || 0.1,
            ...config
        };

        super('GPT', modelConfig, config.weight || 0.2);
    }

    /**
     * GPT-specific system prompt
     */
    getSystemPrompt() {
        return `You are GPT, OpenAI's advanced language model with extensive training on code and software engineering. You have deep expertise in:

- Code analysis and debugging
- Software architecture and design patterns
- Performance optimization techniques
- Security vulnerability assessment
- Modern development practices and frameworks

Your role in the AI-COUNCIL is to provide expert-level code analysis with focus on:

1. **Technical Excellence**: Assess code quality, structure, and implementation
2. **Best Practices**: Ensure adherence to industry standards and conventions
3. **Problem Solving**: Identify issues and provide clear solutions
4. **Modern Patterns**: Evaluate use of contemporary development practices

Your analysis approach:
- Provide detailed, technical assessments
- Focus on practical, implementable solutions
- Consider both immediate and long-term implications
- Balance perfectionism with pragmatic development needs
- Explain complex concepts clearly and concisely

Rate the code on a scale of 0-100 where:
- 90-100: Exceptional code demonstrating mastery of best practices
- 80-89: High-quality code with solid engineering principles
- 70-79: Good code that meets professional standards
- 60-69: Adequate code with room for improvement
- 50-59: Below-standard code requiring significant enhancements
- 0-49: Poor code with serious issues requiring major revision

Provide precise, actionable feedback that demonstrates deep technical understanding.`;
    }

    /**
     * GPT-specific analysis with technical depth
     */
    buildAnalysisPrompt(code, context) {
        const basePrompt = super.buildAnalysisPrompt(code, context);

        return `${basePrompt}

## GPT Technical Analysis Framework:

### Code Quality Assessment:
- **Structure**: Is the code well-organized and logically structured?
- **Readability**: Is it easy to understand and follow?
- **Maintainability**: How easy would it be to modify or extend?
- **Testability**: Is the code designed for easy testing?

### Technical Implementation:
- **Algorithm Efficiency**: Are the algorithms and data structures optimal?
- **Error Handling**: Is error handling comprehensive and appropriate?
- **Resource Management**: Are resources (memory, connections, etc.) managed properly?
- **Concurrency**: If applicable, are concurrency concerns addressed?

### Security & Reliability:
- **Input Validation**: Is user input properly validated and sanitized?
- **Security Vulnerabilities**: Are there potential security risks?
- **Edge Cases**: Are edge cases and error conditions handled?
- **Data Integrity**: Is data handled safely and consistently?

### Modern Practices:
- **Design Patterns**: Are appropriate design patterns used correctly?
- **Framework Usage**: Is the framework/library used idiomatically?
- **Performance**: Are there obvious performance optimizations available?
- **Scalability**: How well would this code scale with increased load?

Provide specific, technical recommendations with code examples where helpful.`;
    }

    /**
     * Enhanced OpenAI API call with function calling support
     */
    async callOpenAI(prompt) {
        try {
            const response = await this.client.chat.completions.create({
                model: this.modelConfig.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert code reviewer. Analyze the provided code and respond with detailed, structured feedback in JSON format.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.modelConfig.maxTokens,
                temperature: this.modelConfig.temperature,
                response_format: { type: "json_object" }
            });

            return response.choices[0].message.content;
        } catch (error) {
            // Fallback to regular completion if JSON mode fails
            console.warn(`[WARN] JSON mode failed, using regular completion: ${error.message}`);

            const response = await this.client.chat.completions.create({
                model: this.modelConfig.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.modelConfig.maxTokens,
                temperature: this.modelConfig.temperature
            });

            return response.choices[0].message.content;
        }
    }

    /**
     * Advanced analysis with code understanding
     */
    async analyze(code, context) {
        // Add GPT-specific context for better analysis
        const enhancedContext = {
            ...context,
            analysisDepth: 'detailed',
            includeExamples: true,
            focusAreas: ['technical_excellence', 'best_practices', 'performance', 'security']
        };

        const result = await super.analyze(code, enhancedContext);

        // Add GPT-specific enhancements to the result
        if (result.score > 0) {
            result.technicalDepth = 'high';
            result.analysisType = 'comprehensive';
        }

        return result;
    }

    /**
     * Code-specific prompt enhancement
     */
    buildAnalysisPrompt(code, context) {
        const basePrompt = super.buildAnalysisPrompt(code, context);

        // Add code complexity analysis
        const codeMetrics = this.analyzeCodeComplexity(code);

        return `${basePrompt}

## Code Metrics:
- Lines of Code: ${codeMetrics.loc}
- Cyclomatic Complexity: ${codeMetrics.complexity}
- Function Count: ${codeMetrics.functions}
- Comment Ratio: ${codeMetrics.commentRatio}%

## GPT Analysis Instructions:
Consider these metrics in your analysis. For complex code (high LOC or complexity), focus more on:
- Refactoring opportunities
- Breaking down large functions
- Improving modularity
- Adding comprehensive tests

For simpler code, focus more on:
- Code style and conventions
- Performance optimizations
- Security considerations
- Documentation quality

Provide specific, implementable recommendations with priority levels.`;
    }

    /**
     * Analyze code complexity metrics
     */
    analyzeCodeComplexity(code) {
        const lines = code.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        const commentLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
        });

        // Simple cyclomatic complexity calculation
        const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?'];
        let complexity = 1; // Base complexity

        complexityKeywords.forEach(keyword => {
            // Escape special regex characters and handle operators differently
            let pattern;
            if (['&&', '||', '?'].includes(keyword)) {
                // For operators, escape special characters
                pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            } else {
                // For keywords, use word boundaries
                pattern = `\\b${keyword}\\b`;
            }
            const matches = code.match(new RegExp(pattern, 'g'));
            if (matches) complexity += matches.length;
        });

        // Count functions
        const functionMatches = code.match(/function\s+\w+|=>\s*{|:\s*function/g) || [];

        return {
            loc: nonEmptyLines.length,
            complexity: complexity,
            functions: functionMatches.length,
            commentRatio: Math.round((commentLines.length / lines.length) * 100)
        };
    }

    /**
     * Get model capabilities
     */
    getCapabilities() {
        return {
            ...super.getModelInfo(),
            features: [
                'Advanced code analysis',
                'Technical depth assessment',
                'Best practices evaluation',
                'Performance optimization',
                'Security vulnerability detection',
                'Modern pattern recognition'
            ],
            strengths: [
                'Comprehensive technical analysis',
                'Clear, actionable recommendations',
                'Deep understanding of multiple languages',
                'Strong pattern recognition'
            ]
        };
    }
}

module.exports = { GPTAgent };