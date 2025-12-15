/**
 * AIModelAgent - Base class for AI model-based agents
 * Integrates with various AI models (Claude, Grok, Zai, Llama, etc.)
 */

const { BaseAgent } = require('./base-agent');

class AIModelAgent extends BaseAgent {
    constructor(name, modelConfig, weight = 0.2) {
        super(name, weight);
        this.modelConfig = {
            provider: modelConfig.provider, // 'anthropic', 'openai', 'groq', 'ollama', etc.
            model: modelConfig.model,       // 'claude-3', 'gpt-4', 'llama-2', etc.
            apiKey: modelConfig.apiKey,
            endpoint: modelConfig.endpoint,
            maxTokens: modelConfig.maxTokens || 1000,
            temperature: modelConfig.temperature || 0.1,
            ...modelConfig
        };

        this.systemPrompt = this.getSystemPrompt();
        this.client = this.initializeClient();
        this.errorLogged = false; // Track if we've already logged an API key error
    }

    /**
     * Initialize the AI model client based on provider
     */
    initializeClient() {
        switch (this.modelConfig.provider) {
            case 'anthropic':
                return this.initializeAnthropicClient();
            case 'openai':
                return this.initializeOpenAIClient();
            case 'groq':
                return this.initializeGroqClient();
            case 'ollama':
                return this.initializeOllamaClient();
            case 'google':
                return this.initializeGoogleClient();
            default:
                throw new Error(`Unsupported AI provider: ${this.modelConfig.provider}`);
        }
    }

    /**
     * Initialize Anthropic (Claude) client
     */
    initializeAnthropicClient() {
        try {
            const { Anthropic } = require('@anthropic-ai/sdk');
            return new Anthropic({
                apiKey: this.modelConfig.apiKey
            });
        } catch (error) {
            console.warn(`[WARN] Anthropic SDK not available: ${error.message}`);
            return null;
        }
    }

    /**
     * Initialize OpenAI client
     */
    initializeOpenAIClient() {
        try {
            const { OpenAI } = require('openai');
            return new OpenAI({
                apiKey: this.modelConfig.apiKey
            });
        } catch (error) {
            console.warn(`[WARN] OpenAI SDK not available: ${error.message}`);
            return null;
        }
    }

    /**
     * Initialize Groq client (using OpenAI-compatible interface)
     */
    initializeGroqClient() {
        try {
            const { OpenAI } = require('openai');
            return new OpenAI({
                apiKey: this.modelConfig.apiKey,
                baseURL: this.modelConfig.endpoint || 'https://api.groq.com/openai/v1'
            });
        } catch (error) {
            // Silently fail - error will be handled in analyze method
            return null;
        }
    }

    /**
     * Initialize Ollama client (local models)
     */
    initializeOllamaClient() {
        try {
            const { Ollama } = require('ollama');
            return new Ollama({
                host: this.modelConfig.endpoint || 'http://localhost:11434'
            });
        } catch (error) {
            console.warn(`[WARN] Ollama client not available: ${error.message}`);
            return null;
        }
    }

    /**
     * Initialize Google (Gemini) client
     */
    initializeGoogleClient() {
        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            return new GoogleGenerativeAI(this.modelConfig.apiKey);
        } catch (error) {
            console.warn(`[WARN] Google AI SDK not available: ${error.message}`);
            return null;
        }
    }

    /**
     * Main analysis method - calls the AI model
     */
    async analyze(code, context) {
        const startTime = Date.now();

        try {
            if (!this.client) {
                return this.createErrorResult('AI model client not available');
            }

            console.log(`[${this.name}] Analyzing code...`);

            // Prepare the prompt
            const prompt = this.buildAnalysisPrompt(code, context);

            // Call the AI model
            const response = await this.callAIModel(prompt);

            // Parse the response
            const analysis = this.parseAIResponse(response);

            // Create standardized result
            const result = this.createResult(
                analysis.score,
                analysis.issues,
                analysis.reasoning,
                analysis.confidence
            );

            result.executionTime = Date.now() - startTime;
            result.modelUsed = `${this.modelConfig.provider}/${this.modelConfig.model}`;

            return result;

        } catch (error) {
            // Suppress repeated API key errors - only log once per agent instance
            const isApiKeyError = error.message && (
                error.message.includes('API key') ||
                error.message.includes('api key') ||
                error.message.includes('API_KEY') ||
                error.message.includes('authentication') ||
                error.message.includes('401') ||
                error.message.includes('403')
            );

            if (isApiKeyError && this.errorLogged) {
                // Already logged, just return error result silently
                return this.createErrorResult(error.message);
            }

            if (isApiKeyError) {
                this.errorLogged = true;
                console.error(`[WARN] ${this.name} API key error (will suppress further messages):`, error.message.substring(0, 100));
            } else {
                console.error(`[ERROR] ${this.name} analysis failed:`, error.message);
            }

            return this.createErrorResult(error.message);
        }
    }

    /**
     * Build analysis prompt for the AI model
     */
    buildAnalysisPrompt(code, context) {
        return `${this.systemPrompt}

## Code to Analyze:
\`\`\`${context.language || 'javascript'}
${code}
\`\`\`

## Context:
- File: ${context.filePath || 'unknown'}
- Language: ${context.language || 'unknown'}
- Framework: ${context.framework || 'none'}
- Is AI Generated: ${context.isAIGenerated ? 'Yes' : 'No'}

## Instructions:
Analyze this code and provide your assessment in the following JSON format:

\`\`\`json
{
  "score": 85,
  "confidence": 0.9,
  "reasoning": "Detailed explanation of your analysis...",
  "issues": [
    {
      "severity": "high|medium|low",
      "type": "security|performance|quality|style",
      "message": "Description of the issue",
      "line": 10,
      "suggestion": "How to fix this issue"
    }
  ],
  "strengths": [
    "What the code does well..."
  ],
  "recommendations": [
    "Specific actionable recommendations..."
  ]
}
\`\`\`

Focus on providing actionable, specific feedback. Be thorough but concise.`;
    }

    /**
     * Call the AI model based on provider
     */
    async callAIModel(prompt) {
        switch (this.modelConfig.provider) {
            case 'anthropic':
                return await this.callAnthropic(prompt);
            case 'openai':
                return await this.callOpenAI(prompt);
            case 'groq':
                return await this.callGroq(prompt);
            case 'ollama':
                return await this.callOllama(prompt);
            case 'google':
                return await this.callGoogle(prompt);
            default:
                throw new Error(`Unsupported provider: ${this.modelConfig.provider}`);
        }
    }

    /**
     * Call Anthropic (Claude) API
     */
    async callAnthropic(prompt) {
        const response = await this.client.messages.create({
            model: this.modelConfig.model,
            max_tokens: this.modelConfig.maxTokens,
            temperature: this.modelConfig.temperature,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        return response.content[0].text;
    }

    /**
     * Call OpenAI API (also used by Z.AI and other OpenAI-compatible APIs)
     */
    async callOpenAI(prompt) {
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

        // Handle both standard content and Z.AI's reasoning_content
        const message = response.choices[0].message;
        return message.content || message.reasoning_content || '';
    }

    /**
     * Call Groq API
     */
    async callGroq(prompt) {
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

    /**
     * Call Ollama (local models)
     */
    async callOllama(prompt) {
        const response = await this.client.generate({
            model: this.modelConfig.model,
            prompt: prompt,
            options: {
                temperature: this.modelConfig.temperature,
                num_predict: this.modelConfig.maxTokens
            }
        });

        return response.response;
    }

    /**
     * Call Google (Gemini) API
     */
    async callGoogle(prompt) {
        const model = this.client.getGenerativeModel({
            model: this.modelConfig.model
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }

    /**
     * Parse AI model response
     */
    parseAIResponse(response) {
        try {
            // Ensure response is a string
            if (typeof response !== 'string') {
                response = JSON.stringify(response);
            }

            // Remove markdown code block wrappers if present
            let jsonStr = response.trim();

            // Handle ```json ... ``` format
            if (jsonStr.startsWith('```')) {
                // Remove opening ```json or ```
                jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '');
                // Remove closing ```
                jsonStr = jsonStr.replace(/\n?```\s*$/, '');
            }

            // Try to find JSON object in the response
            const jsonStart = jsonStr.indexOf('{');
            const jsonEnd = jsonStr.lastIndexOf('}');

            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
            }

            const parsed = JSON.parse(jsonStr.trim());

            // Validate and normalize the response
            return {
                score: Math.max(0, Math.min(100, parsed.score || 50)),
                confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
                reasoning: parsed.reasoning || 'No reasoning provided',
                issues: Array.isArray(parsed.issues) ? parsed.issues : [],
                strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
                recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
            };

        } catch (error) {
            console.warn(`[WARN] Failed to parse AI response, using fallback: ${error.message}`);

            // Ensure response is a string for fallback processing
            const responseStr = typeof response === 'string' ? response : JSON.stringify(response);

            // Fallback: extract score from text if JSON parsing fails
            const scoreMatch = responseStr.match(/score[:\s]*(\d+)/i);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;

            return {
                score: Math.max(0, Math.min(100, score)),
                confidence: 0.3, // Low confidence for unparseable responses
                reasoning: `AI analysis completed. Raw response: ${responseStr.substring(0, 200)}...`,
                issues: [],
                strengths: [],
                recommendations: []
            };
        }
    }

    /**
     * Get system prompt for the AI model (to be overridden by specific agents)
     */
    getSystemPrompt() {
        return `You are an expert code reviewer and software engineer. Your task is to analyze code for quality, security, performance, and best practices.

Provide a comprehensive analysis with:
1. A score from 0-100 (100 being perfect code)
2. Your confidence level (0.0 to 1.0)
3. Detailed reasoning for your assessment
4. Specific issues found with severity levels
5. Code strengths and positive aspects
6. Actionable recommendations for improvement

Be thorough, objective, and constructive in your feedback.`;
    }

    /**
     * Create error result when AI model fails
     */
    createErrorResult(errorMessage) {
        return this.createResult(
            30, // Low score for failed analysis
            [{
                severity: 'high',
                type: 'analysis_error',
                message: `AI model analysis failed: ${errorMessage}`,
                suggestion: 'Check AI model configuration and API keys'
            }],
            `Analysis failed due to AI model error: ${errorMessage}`,
            0.1 // Very low confidence
        );
    }

    /**
     * Test AI model connection
     */
    async testConnection() {
        try {
            const testPrompt = "Respond with 'OK' if you can receive this message.";
            const response = await this.callAIModel(testPrompt);
            return response.toLowerCase().includes('ok');
        } catch (error) {
            console.error(`❌ ${this.name} connection test failed:`, error.message);
            return false;
        }
    }

    /**
     * Get model information
     */
    getModelInfo() {
        return {
            name: this.name,
            provider: this.modelConfig.provider,
            model: this.modelConfig.model,
            weight: this.weight,
            enabled: this.enabled,
            hasApiKey: !!this.modelConfig.apiKey,
            clientAvailable: !!this.client
        };
    }
}

module.exports = { AIModelAgent };