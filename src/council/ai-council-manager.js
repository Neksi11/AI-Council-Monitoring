/**
 * AICouncilManager - Manages AI model agents and threshold-based approval
 */

const { AgentFactory } = require('../agents/agent-factory');
const { DebateOrchestrator } = require('./debate-orchestrator');

class AICouncilManager {
    constructor(config = {}) {
        this.config = {
            // AI Model configurations
            models: {
                claude: {
                    enabled: true,
                    weight: 0.25,
                    apiKey: process.env.ANTHROPIC_API_KEY,
                    model: 'claude-3-sonnet-20240229',
                    ...config.models?.claude
                },
                gpt: {
                    enabled: true,
                    weight: 0.25,
                    apiKey: process.env.OPENAI_API_KEY,
                    model: 'gpt-4-turbo-preview',
                    ...config.models?.gpt
                },
                grok: {
                    enabled: true, // Enabled by default
                    weight: 0.2,
                    apiKey: process.env.GROQ_API_KEY, // Note: Using GROQ not GROK
                    model: 'llama-3.3-70b-versatile',
                    ...config.models?.grok
                },
                gemini: {
                    enabled: true,
                    weight: 0.15,
                    apiKey: process.env.GOOGLE_API_KEY,
                    model: process.env.GOOGLE_MODEL || 'gemini-1.5-flash',
                    ...config.models?.gemini
                },
                llama: {
                    enabled: false, // Disabled by default (requires local setup)
                    weight: 0.15,
                    model: 'llama2:13b',
                    provider: 'ollama',
                    ...config.models?.llama
                },
                zai: {
                    enabled: true, // Z.AI GLM-4.6 model
                    weight: 0.2,
                    apiKey: process.env.ZAI_API_KEY,
                    model: process.env.ZAI_MODEL || 'glm-4.6', // Must be lowercase!
                    ...config.models?.zai
                },
                openrouter: {
                    enabled: true, // Enabled by default for OSS models
                    weight: 0.15,
                    apiKey: process.env.OPENROUTER_API_KEY,
                    model: process.env.OPENROUTER_MODEL || 'mistralai/devstral-2512:free',
                    ...config.models?.openrouter
                }
            },

            // Approval thresholds
            thresholds: {
                // Minimum score required for approval
                minScore: config.thresholds?.minScore || 75,

                // Minimum consensus required (agreement between agents)
                minConsensus: config.thresholds?.minConsensus || 0.7,

                // Minimum number of agents that must participate
                minAgents: config.thresholds?.minAgents || 2,

                // Individual agent minimum scores
                agentMinScores: {
                    claude: 70,
                    gpt: 70,
                    grok: 65,
                    gemini: 70,
                    llama: 65,
                    zai: 70,
                    openrouter: 65,
                    ...config.thresholds?.agentMinScores
                },

                // Automatic rejection thresholds
                autoReject: {
                    maxScore: 40,
                    minConsensus: 0.3,
                    criticalIssues: 3
                },

                ...config.thresholds
            },

            // Analysis settings
            analysis: {
                timeout: 60000, // 60 seconds per agent (increased for slower models like Z.AI)
                retries: 2,
                parallel: true,
                ...config.analysis
            },

            // Debate settings
            debate: {
                enabled: config.debate?.enabled !== false, // Enabled by default
                maxRounds: config.debate?.maxRounds || 2,
                minConsensusImprovement: config.debate?.minConsensusImprovement || 0.1,
                debateThreshold: config.debate?.debateThreshold || 0.15,
                ...config.debate
            },

            ...config
        };

        this.agents = new Map();
        this.agentFactory = new AgentFactory();
        this.debateOrchestrator = null;
        this.initializeAgents();
    }

    /**
     * Initialize AI model agents
     */
    initializeAgents() {
        // Use agent factory to create agents from configuration
        this.agents = this.agentFactory.createAgentsFromConfig(this.config.models);

        // If no agents were created from config, try auto-detection
        if (this.agents.size === 0) {
            this.autoInitializeAgents();
        }

        // Rebalance weights
        this.rebalanceWeights();

        // Initialize debate orchestrator if enabled
        if (this.config.debate?.enabled && this.agents.size >= 2) {
            this.debateOrchestrator = new DebateOrchestrator(this.agents, this.config.debate);
        }
    }

    /**
     * Auto-initialize agents based on available API keys
     */
    async autoInitializeAgents() {
        try {
            const autoAgents = await this.agentFactory.autoCreateAgents();

            if (autoAgents.size > 0) {
                this.agents = autoAgents;

                // Update config with auto-detected agents
                autoAgents.forEach((agent, name) => {
                    if (!this.config.models[name]) {
                        this.config.models[name] = {
                            enabled: true,
                            weight: 1 / autoAgents.size,
                            ...this.agentFactory.getDefaultConfig(name)
                        };
                    }
                });

                console.log(`[INFO] Auto-initialized ${this.agents.size} agents: ${Array.from(this.agents.keys()).join(', ')}`);
            } else {
                console.warn('[WARN] No AI agents available. Please configure API keys.');
                console.log('[INFO] Available agent types:', this.agentFactory.getAvailableAgentTypes().join(', '));
            }
        } catch (error) {
            console.error('[ERROR] Auto-initialization failed:', error.message);
        }
    }

    /**
     * Analyze code with AI Council
     */
    async analyzeCode(code, context = {}) {
        const startTime = Date.now();

        try {
            // Check if we have enough agents
            if (this.agents.size < this.config.thresholds.minAgents) {
                throw new Error(`Insufficient agents: ${this.agents.size} available, ${this.config.thresholds.minAgents} required`);
            }

            // Run analysis with all available agents
            let agentResults = await this.runAgentAnalysis(code, context);

            // Facilitate debate if enabled and multiple agents available
            let debateResult = null;
            if (this.debateOrchestrator && agentResults.length >= 2) {
                debateResult = await this.debateOrchestrator.facilitateDebate(code, context, agentResults);
                if (debateResult.debated) {
                    agentResults = debateResult.results;
                }
            }

            // Calculate council decision
            const decision = this.calculateCouncilDecision(agentResults, debateResult);

            // Store results if storage is available
            if (context.storage && context.storage.enabled) {
                try {
                    await this.storeAnalysisResults(code, context, agentResults, decision);
                } catch (error) {
                    // Don't fail analysis if storage fails
                    console.warn('[WARN] Failed to store analysis results:', error.message);
                }
            }

            const result = {
                ...decision,
                agentResults: agentResults,
                executionTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                metadata: {
                    agentCount: agentResults.length,
                    codeLength: code.length,
                    language: context.language,
                    filePath: context.filePath
                }
            };

            this.logDecision(result);
            return result;

        } catch (error) {
            console.error('❌ AI Council analysis failed:', error.message);
            throw error;
        }
    }

    /**
     * Run analysis with all available agents
     */
    async runAgentAnalysis(code, context) {
        const agentPromises = Array.from(this.agents.entries()).map(async ([name, agent]) => {
            try {
                const startTime = Date.now();
                const result = await Promise.race([
                    agent.analyze(code, context),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), this.config.analysis.timeout)
                    )
                ]);

                result.executionTime = Date.now() - startTime;
                result.agentName = name;

                return result;

            } catch (error) {
                // Return error result
                return {
                    agentName: name,
                    score: 0,
                    confidence: 0,
                    issues: [{
                        severity: 'high',
                        type: 'agent_error',
                        message: `${name} analysis failed: ${error.message}`
                    }],
                    reasoning: `Agent failed to complete analysis: ${error.message}`,
                    executionTime: this.config.analysis.timeout,
                    error: true
                };
            }
        });

        if (this.config.analysis.parallel) {
            return await Promise.all(agentPromises);
        } else {
            // Sequential execution
            const results = [];
            for (const promise of agentPromises) {
                results.push(await promise);
            }
            return results;
        }
    }

    /**
     * Calculate council decision based on agent results
     */
    calculateCouncilDecision(agentResults, debateResult = null) {
        const validResults = agentResults.filter(r => !r.error && r.score > 0);

        // Adaptive minimum agents based on available agents
        const availableAgents = this.agents.size;
        const adaptiveMinAgents = Math.min(this.config.thresholds.minAgents, Math.max(1, availableAgents));

        if (validResults.length < adaptiveMinAgents) {
            return {
                approved: false,
                status: 'INSUFFICIENT_AGENTS',
                finalScore: 0,
                consensus: 0,
                reasoning: `Only ${validResults.length} agents provided valid results, ${adaptiveMinAgents} required (adapted from ${availableAgents} available)`
            };
        }

        // Calculate weighted average score with adaptive weights
        let totalWeight = validResults.reduce((sum, r) => {
            const agentConfig = this.config.models[r.agentName];
            return sum + (agentConfig?.weight || 0.2);
        }, 0);

        // If total weight is 0 or very small, distribute equally
        if (totalWeight < 0.1) {
            totalWeight = validResults.length;
            validResults.forEach(r => {
                const agentConfig = this.config.models[r.agentName];
                if (agentConfig) agentConfig.weight = 1 / validResults.length;
            });
        }

        const weightedScore = validResults.reduce((sum, r) => {
            const agentConfig = this.config.models[r.agentName];
            const weight = agentConfig?.weight || (1 / validResults.length);
            return sum + (r.score * weight * r.confidence);
        }, 0);

        const finalScore = Math.round(weightedScore / totalWeight);

        // Calculate consensus (agreement between agents) - adaptive for single agent
        let consensus = 1.0; // Default high consensus for single agent

        if (validResults.length > 1) {
            const scores = validResults.map(r => r.score);
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
            const stdDev = Math.sqrt(variance);
            consensus = Math.max(0, 1 - (stdDev / 50)); // Normalize to 0-1
        } else if (validResults.length === 1) {
            // For single agent, consensus is based on confidence
            consensus = validResults[0].confidence || 0.8;
        }

        // Check individual agent minimum scores (adaptive)
        const agentFailures = validResults.filter(r => {
            const minScore = this.config.thresholds.agentMinScores?.[r.agentName] ||
                this.config.thresholds.defaultAgentMinScore ||
                50; // Lower default for flexibility
            return r.score < minScore;
        });

        // Count critical issues
        const criticalIssues = validResults.reduce((count, r) => {
            return count + (r.issues?.filter(i => i.severity === 'critical' || i.severity === 'high')?.length || 0);
        }, 0);

        // Determine approval status
        let approved = false;
        let status = 'REJECTED';
        let reasoning = '';

        // Check for automatic rejection
        if (finalScore <= this.config.thresholds.autoReject.maxScore) {
            status = 'AUTO_REJECTED';
            reasoning = `Score too low: ${finalScore} <= ${this.config.thresholds.autoReject.maxScore}`;
        } else if (consensus < this.config.thresholds.autoReject.minConsensus) {
            status = 'AUTO_REJECTED';
            reasoning = `Consensus too low: ${(consensus * 100).toFixed(1)}% < ${(this.config.thresholds.autoReject.minConsensus * 100)}%`;
        } else if (criticalIssues >= this.config.thresholds.autoReject.criticalIssues) {
            status = 'AUTO_REJECTED';
            reasoning = `Too many critical issues: ${criticalIssues} >= ${this.config.thresholds.autoReject.criticalIssues}`;
        } else if (agentFailures.length > 0) {
            status = 'AGENT_REJECTION';
            reasoning = `Agents failed minimum scores: ${agentFailures.map(r => `${r.agentName}(${r.score})`).join(', ')}`;
        } else {
            // Use adaptive thresholds based on agent count
            const adaptiveThresholds = this.getAdaptiveThresholds(validResults.length);

            if (finalScore >= adaptiveThresholds.minScore && consensus >= adaptiveThresholds.minConsensus) {
                approved = true;
                status = 'APPROVED';
                reasoning = `Passed adaptive thresholds: Score ${finalScore}/${adaptiveThresholds.minScore}, Consensus ${(consensus * 100).toFixed(1)}% (${validResults.length} agent${validResults.length > 1 ? 's' : ''})`;
            } else {
                status = 'REJECTED';
                if (finalScore < adaptiveThresholds.minScore) {
                    reasoning = `Score below adaptive threshold: ${finalScore} < ${adaptiveThresholds.minScore} (${validResults.length} agent${validResults.length > 1 ? 's' : ''})`;
                } else if (consensus < adaptiveThresholds.minConsensus) {
                    reasoning = `Consensus below adaptive threshold: ${(consensus * 100).toFixed(1)}% < ${(adaptiveThresholds.minConsensus * 100)}% (${validResults.length} agent${validResults.length > 1 ? 's' : ''})`;
                }
            }
        }

        // Generate detailed rejection feedback if rejected
        const rejectionDetails = !approved ? this.generateRejectionDetails(
            validResults,
            finalScore,
            consensus,
            status,
            agentFailures,
            criticalIssues,
            debateResult
        ) : null;

        return {
            approved,
            status,
            finalScore,
            consensus,
            reasoning,
            rejectionDetails, // Detailed explanation of what's wrong
            agentFailures: agentFailures.map(r => ({
                agent: r.agentName,
                score: r.score,
                required: this.config.thresholds.agentMinScores[r.agentName]
            })),
            criticalIssues,
            participatingAgents: validResults.length,
            debateResult: debateResult ? {
                debated: debateResult.debated,
                rounds: debateResult.rounds,
                consensusImprovement: debateResult.consensus - (debateResult.initialConsensus || consensus)
            } : null,
            thresholds: {
                minScore: this.config.thresholds.minScore,
                minConsensus: this.config.thresholds.minConsensus,
                minAgents: this.config.thresholds.minAgents
            }
        };
    }

    /**
     * Generate detailed rejection feedback explaining what's wrong
     */
    generateRejectionDetails(agentResults, finalScore, consensus, status, agentFailures, criticalIssues, debateResult) {
        const details = {
            summary: '',
            primaryIssues: [],
            specificProblems: [],
            agentPerspectives: [],
            recommendations: [],
            whatNeedsFixing: []
        };

        // Build summary
        details.summary = this.buildRejectionSummary(status, finalScore, consensus, criticalIssues);

        // Collect all issues from agents
        const allIssues = [];
        agentResults.forEach(result => {
            if (result.issues && Array.isArray(result.issues)) {
                result.issues.forEach(issue => {
                    allIssues.push({
                        ...issue,
                        reportedBy: result.agentName,
                        agentScore: result.score
                    });
                });
            }
        });

        // Categorize issues
        const critical = allIssues.filter(i => i.severity === 'critical' || i.severity === 'high');
        const medium = allIssues.filter(i => i.severity === 'medium');
        const low = allIssues.filter(i => i.severity === 'low' || i.severity === 'info');

        // Primary issues (top 5 most critical)
        details.primaryIssues = critical
            .slice(0, 5)
            .map(issue => ({
                severity: issue.severity,
                type: issue.type,
                message: issue.message,
                line: issue.line,
                suggestion: issue.suggestion,
                reportedBy: issue.reportedBy
            }));

        // Specific problems grouped by type
        const problemsByType = {};
        allIssues.forEach(issue => {
            const type = issue.type || 'general';
            if (!problemsByType[type]) {
                problemsByType[type] = [];
            }
            problemsByType[type].push({
                message: issue.message,
                severity: issue.severity,
                line: issue.line,
                suggestion: issue.suggestion
            });
        });

        details.specificProblems = Object.entries(problemsByType).map(([type, problems]) => ({
            category: type,
            count: problems.length,
            problems: problems.slice(0, 3) // Top 3 per category
        }));

        // Agent perspectives
        details.agentPerspectives = agentResults.map(result => ({
            agent: result.agentName,
            score: result.score,
            confidence: result.confidence,
            mainConcern: this.extractMainConcern(result),
            keyIssues: result.issues?.slice(0, 2).map(i => i.message) || []
        }));

        // What needs fixing (actionable items)
        details.whatNeedsFixing = [
            ...critical.slice(0, 3).map(issue => ({
                priority: 'HIGH',
                issue: issue.message,
                fix: issue.suggestion || 'Review and address this critical issue',
                line: issue.line
            })),
            ...medium.slice(0, 2).map(issue => ({
                priority: 'MEDIUM',
                issue: issue.message,
                fix: issue.suggestion || 'Consider addressing this issue',
                line: issue.line
            }))
        ];

        // Recommendations
        details.recommendations = this.generateActionableRecommendations(
            agentResults,
            allIssues,
            finalScore,
            status
        );

        return details;
    }

    /**
     * Build rejection summary
     */
    buildRejectionSummary(status, finalScore, consensus, criticalIssues) {
        const reasons = [];

        if (finalScore < 50) {
            reasons.push(`The code scored very low (${finalScore}/100), indicating significant quality issues.`);
        }

        if (criticalIssues > 0) {
            reasons.push(`Found ${criticalIssues} critical issue(s) that must be addressed.`);
        }

        if (consensus < 0.5) {
            reasons.push(`Low consensus (${(consensus * 100).toFixed(0)}%) among AI agents suggests the code has inconsistent quality.`);
        }

        switch (status) {
            case 'AUTO_REJECTED':
                reasons.push('The code was automatically rejected due to failing multiple quality thresholds.');
                break;
            case 'AGENT_REJECTION':
                reasons.push('Multiple AI agents identified significant issues that prevent approval.');
                break;
            default:
                reasons.push('The code does not meet the minimum quality standards for approval.');
        }

        return reasons.join(' ') + ' Please review the detailed issues below and address them before resubmitting.';
    }

    /**
     * Extract main concern from agent result
     */
    extractMainConcern(result) {
        if (!result.issues || result.issues.length === 0) {
            return result.reasoning?.substring(0, 150) || 'No specific concerns identified';
        }

        const critical = result.issues.find(i => i.severity === 'critical' || i.severity === 'high');
        if (critical) {
            return critical.message;
        }

        return result.issues[0].message;
    }

    /**
     * Generate actionable recommendations
     */
    generateActionableRecommendations(agentResults, allIssues, finalScore, status) {
        const recommendations = [];

        // Score-based recommendations
        if (finalScore < 40) {
            recommendations.push({
                priority: 'CRITICAL',
                category: 'Overall Quality',
                action: 'Consider a significant refactor. The code has fundamental issues that need addressing.',
                impact: 'High'
            });
        } else if (finalScore < 60) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Overall Quality',
                action: 'Address major issues before proceeding. Focus on critical and high-severity issues first.',
                impact: 'High'
            });
        }

        // Issue-based recommendations
        const securityIssues = allIssues.filter(i => i.type === 'security');
        if (securityIssues.length > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                category: 'Security',
                action: `Fix ${securityIssues.length} security issue(s) immediately. Security vulnerabilities must be addressed before deployment.`,
                impact: 'Critical'
            });
        }

        const performanceIssues = allIssues.filter(i => i.type === 'performance');
        if (performanceIssues.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Performance',
                action: `Address ${performanceIssues.length} performance issue(s) to improve code efficiency.`,
                impact: 'Medium-High'
            });
        }

        // Consensus-based recommendations
        const avgScore = agentResults.reduce((sum, r) => sum + r.score, 0) / agentResults.length;
        const scoreVariance = agentResults.reduce((sum, r) => sum + Math.pow(r.score - avgScore, 2), 0) / agentResults.length;

        if (scoreVariance > 400) { // High variance
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Code Quality',
                action: 'AI agents have significantly different opinions. Review the code carefully to understand why opinions differ.',
                impact: 'Medium'
            });
        }

        return recommendations;
    }

    /**
     * Get adaptive thresholds based on number of agents
     */
    getAdaptiveThresholds(agentCount) {
        if (!this.config.thresholds.adaptive?.enabled) {
            return {
                minScore: this.config.thresholds.minScore,
                minConsensus: this.config.thresholds.minConsensus
            };
        }

        if (agentCount === 1) {
            return {
                minScore: this.config.thresholds.adaptive.singleAgent?.minScore || this.config.thresholds.minScore,
                minConsensus: this.config.thresholds.adaptive.singleAgent?.minConsensus || 0.7
            };
        } else {
            return {
                minScore: this.config.thresholds.adaptive.multiAgent?.minScore || this.config.thresholds.minScore,
                minConsensus: this.config.thresholds.adaptive.multiAgent?.minConsensus || this.config.thresholds.minConsensus
            };
        }
    }

    /**
     * Log council decision
     */
    logDecision(result) {
        // Decision logging is handled by display functions
    }

    /**
     * Test all agent connections
     */
    async testAgentConnections() {
        console.log('🧪 Testing AI agent connections...\n');

        const results = {};

        for (const [name, agent] of this.agents.entries()) {
            try {
                console.log(`Testing ${name}...`);
                const connected = await agent.testConnection();
                results[name] = {
                    connected,
                    model: agent.getModelInfo()
                };
                console.log(`${connected ? '✅' : '❌'} ${name}: ${connected ? 'Connected' : 'Failed'}`);
            } catch (error) {
                results[name] = {
                    connected: false,
                    error: error.message
                };
                console.log(`❌ ${name}: ${error.message}`);
            }
        }

        const connectedCount = Object.values(results).filter(r => r.connected).length;
        console.log(`\n📊 Connection Summary: ${connectedCount}/${this.agents.size} agents connected`);

        return results;
    }

    /**
     * Get council configuration
     */
    getConfig() {
        return {
            ...this.config,
            agents: Array.from(this.agents.entries()).map(([name, agent]) => ({
                name,
                ...agent.getModelInfo()
            }))
        };
    }

    /**
     * Update thresholds
     */
    updateThresholds(newThresholds) {
        this.config.thresholds = { ...this.config.thresholds, ...newThresholds };
        console.log('🎯 Thresholds updated:', this.config.thresholds);
    }

    /**
     * Add or update an agent
     */
    addAgent(name, agentInstance, weight = null) {
        this.agents.set(name, agentInstance);

        // Add to config if not exists
        if (!this.config.models[name]) {
            this.config.models[name] = {
                enabled: true,
                weight: weight || (1 / (this.agents.size)), // Equal distribution by default
                apiKey: null
            };
        }

        // Rebalance weights if needed
        this.rebalanceWeights();

        console.log(`🤖 Agent ${name} added to council (${this.agents.size} total agents)`);
    }

    /**
     * Rebalance agent weights to sum to 1.0
     */
    rebalanceWeights() {
        const enabledAgents = Array.from(this.agents.keys()).filter(name =>
            this.config.models[name]?.enabled !== false
        );

        if (enabledAgents.length === 0) return;

        // Calculate current total weight
        let totalWeight = enabledAgents.reduce((sum, name) => {
            return sum + (this.config.models[name]?.weight || 0);
        }, 0);

        // If total is 0 or very different from 1, redistribute equally
        if (totalWeight < 0.1 || Math.abs(totalWeight - 1.0) > 0.2) {
            const equalWeight = 1.0 / enabledAgents.length;
            enabledAgents.forEach(name => {
                if (this.config.models[name]) {
                    this.config.models[name].weight = equalWeight;
                }
            });
        } else {
            // Normalize existing weights to sum to 1.0
            enabledAgents.forEach(name => {
                if (this.config.models[name]) {
                    this.config.models[name].weight = this.config.models[name].weight / totalWeight;
                }
            });
        }
    }

    /**
     * Remove an agent
     */
    removeAgent(name) {
        if (this.agents.delete(name)) {
            console.log(`🗑️  Agent ${name} removed from council`);
            return true;
        }
        return false;
    }

    /**
     * Store analysis results in storage
     */
    async storeAnalysisResults(code, context, agentResults, decision) {
        if (!context.storage || !context.storage.enabled) {
            return;
        }

        try {
            // Store code submission
            const submission = {
                file_path: context.filePath || 'unknown',
                code_content: code,
                language: context.language || 'unknown',
                project_id: 'default',
                is_ai_generated: context.isAIGenerated !== false,
                lines_of_code: code.split('\n').length,
                metadata: {
                    framework: context.framework,
                    timestamp: new Date().toISOString(),
                    source: context.source || 'cli'
                }
                // Note: created_at is automatically set by the database
            };

            const storedSubmission = await context.storage.insert('code_submissions', submission);

            // Store agent ratings
            for (const result of agentResults) {
                await context.storage.insert('agent_ratings', {
                    submission_id: storedSubmission.id,
                    agent_name: result.agentName,
                    score: result.score,
                    confidence: result.confidence || 0.8,
                    issues: result.issues || [],
                    reasoning: result.reasoning || '',
                    execution_time_ms: result.executionTime || 0
                });
            }

            // Store final assessment
            await context.storage.insert('code_assessments', {
                submission_id: storedSubmission.id,
                final_score: decision.finalScore,
                status: decision.status,
                consensus_score: decision.consensus,
                agent_agreement: agentResults.reduce((acc, r) => {
                    acc[r.agentName] = { score: r.score, confidence: r.confidence };
                    return acc;
                }, {}),
                recommendations: decision.recommendations || {},
                auto_approved: decision.approved === true
            });
        } catch (error) {
            console.warn('[WARN] Failed to store analysis results:', error.message);
            // Don't throw - storage is optional
        }
    }

    /**
     * Get council statistics
     */
    getStatistics() {
        return {
            totalAgents: this.agents.size,
            enabledAgents: Array.from(this.agents.keys()),
            thresholds: this.config.thresholds,
            lastAnalysis: this.lastAnalysis || null
        };
    }
}

module.exports = { AICouncilManager };