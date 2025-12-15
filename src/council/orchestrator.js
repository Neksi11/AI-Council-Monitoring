/**
 * CouncilOrchestrator - Coordinates the AI agent council for code analysis
 */

const { AICouncilManager } = require('./ai-council-manager');
const { SupabaseClient } = require('../storage/supabase-client');
const { PatternStore } = require('../storage/pattern-store');

class CouncilOrchestrator {
    constructor(config = {}) {
        this.config = {
            // Default agent weights
            weights: {
                security: 0.25,
                quality: 0.20,
                performance: 0.20,
                pattern: 0.20,
                testing: 0.15
            },
            // Scoring thresholds
            thresholds: {
                autoApprove: 85,
                autoReject: 40,
                reviewNeeded: 60,
                consensusRequired: 0.7
            },
            // Agent configuration
            agents: {
                security: { enabled: true },
                quality: { enabled: true },
                performance: { enabled: true },
                pattern: { enabled: true },
                testing: { enabled: true }
            },
            ...config
        };

        // Initialize storage (use provided storage or create new one)
        // Only create new storage if not provided and supabase config exists
        if (config.storage) {
            this.storage = config.storage;
        } else if (config.supabase && (config.supabase.url || process.env.SUPABASE_URL)) {
            this.storage = new SupabaseClient(config.supabase);
        } else {
            // Create disabled storage instance
            this.storage = new SupabaseClient({});
        }
        this.patternStore = new PatternStore(this.storage);

        // Initialize AI Council Manager
        this.aiCouncil = new AICouncilManager(config);
    }

    /**
     * Test AI Council connections
     */
    async testConnections() {
        return await this.aiCouncil.testAgentConnections();
    }

    /**
     * Main method to evaluate code through the agent council
     */
    async evaluateCode(code, context = {}) {
        try {
            // Store code submission (non-blocking - continue even if storage fails)
            let submission = { id: null };
            try {
                submission = await this.storeCodeSubmission(code, context);
            } catch (storageError) {
                // Storage failure shouldn't break analysis
                console.warn('[WARN] Storage failed, continuing analysis without storage:', storageError.message);
            }
            
            // Run AI Council analysis
            const councilResult = await this.aiCouncil.analyzeCode(code, {
                ...context,
                storage: this.storage
            });
            
            // Store assessment (non-blocking)
            let assessment = { id: null };
            if (submission.id) {
                try {
                    assessment = await this.storeAssessment(
                        submission.id,
                        councilResult.agentResults,
                        councilResult.finalScore,
                        councilResult.consensus,
                        councilResult.status,
                        this.generateRecommendations(councilResult.agentResults)
                    ) || { id: null };
                } catch (storageError) {
                    // Storage failure shouldn't break analysis
                    console.warn('[WARN] Failed to store assessment:', storageError.message);
                }
            }

            // Trigger learning if approved (non-blocking)
            if (councilResult.approved) {
                this.triggerLearning(code, context, councilResult.agentResults).catch(() => {
                    // Silently fail - learning is optional
                });
            }

            const result = {
                submissionId: submission.id,
                assessmentId: assessment.id,
                approved: councilResult.approved,
                finalScore: councilResult.finalScore,
                consensus: councilResult.consensus,
                status: councilResult.status,
                agentResults: councilResult.agentResults,
                reasoning: councilResult.reasoning,
                rejectionDetails: councilResult.rejectionDetails,
                debateResult: councilResult.debateResult,
                recommendations: this.generateRecommendations(councilResult.agentResults),
                executionTime: councilResult.executionTime,
                metadata: {
                    language: context.language,
                    filePath: context.filePath,
                    linesOfCode: code.split('\n').length,
                    aiCouncilVersion: '2.0'
                }
            };

            return result;

        } catch (error) {
            console.error('[ERROR] Council evaluation failed:', error.message);
            throw new Error(`Council evaluation failed: ${error.message}`);
        }
    }

    /**
     * Run all enabled agents in parallel
     */
    async runAgents(code, context, submissionId) {
        const agentPromises = Object.entries(this.agents).map(async ([name, agent]) => {
            try {
                console.log(`🤖 Running ${name} agent...`);
                const startTime = Date.now();
                
                const rating = await agent.analyze(code, context);
                const executionTime = Date.now() - startTime;

                // Store individual agent rating (non-blocking)
                this.storeAgentRating(submissionId, name, rating, executionTime).catch(() => {
                    // Silently fail - storage is optional
                });

                return {
                    agent: name,
                    ...rating,
                    executionTime
                };
            } catch (error) {
                console.error(`❌ ${name} agent failed:`, error);
                return {
                    agent: name,
                    score: 0,
                    confidence: 0,
                    issues: [{
                        severity: 'error',
                        message: `Agent execution failed: ${error.message}`
                    }],
                    reasoning: `Agent failed to execute: ${error.message}`,
                    executionTime: 0
                };
            }
        });

        return await Promise.all(agentPromises);
    }

    /**
     * Calculate weighted final score
     */
    calculateWeightedScore(agentRatings) {
        let totalScore = 0;
        let totalWeight = 0;

        agentRatings.forEach(rating => {
            const weight = this.config.weights[rating.agent] || 0;
            const confidence = rating.confidence || 1;
            
            totalScore += rating.score * weight * confidence;
            totalWeight += weight * confidence;
        });

        return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    }

    /**
     * Calculate consensus among agents
     */
    calculateConsensus(agentRatings) {
        if (agentRatings.length === 0) return 0;

        const scores = agentRatings.map(r => r.score);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        // Calculate standard deviation
        const variance = scores.reduce((acc, score) => {
            return acc + Math.pow(score - mean, 2);
        }, 0) / scores.length;
        
        const stdDev = Math.sqrt(variance);
        
        // Consensus is higher when standard deviation is lower
        // Normalize to 0-1 scale (100 is max possible std dev)
        return Math.max(0, 1 - (stdDev / 100));
    }

    /**
     * Determine final status based on score and consensus
     */
    determineStatus(finalScore, consensus) {
        const { autoApprove, autoReject, consensusRequired } = this.config.thresholds;

        if (consensus < consensusRequired) {
            return 'REVIEW_NEEDED';
        }

        if (finalScore >= autoApprove) {
            return 'APPROVED';
        }

        if (finalScore <= autoReject) {
            return 'REJECTED';
        }

        return 'REVIEW_NEEDED';
    }

    /**
     * Generate recommendations based on agent feedback
     */
    generateRecommendations(agentRatings) {
        const recommendations = {
            critical: [],
            important: [],
            suggestions: [],
            summary: ''
        };

        // Collect issues by severity
        agentRatings.forEach(rating => {
            if (rating.issues && Array.isArray(rating.issues)) {
                rating.issues.forEach(issue => {
                    const recommendation = {
                        agent: rating.agent,
                        severity: issue.severity,
                        message: issue.message,
                        suggestion: issue.suggestion,
                        line: issue.line,
                        column: issue.column
                    };

                    switch (issue.severity) {
                        case 'critical':
                        case 'high':
                            recommendations.critical.push(recommendation);
                            break;
                        case 'medium':
                            recommendations.important.push(recommendation);
                            break;
                        case 'low':
                        case 'info':
                            recommendations.suggestions.push(recommendation);
                            break;
                    }
                });
            }
        });

        // Generate summary
        const totalIssues = recommendations.critical.length + 
                          recommendations.important.length + 
                          recommendations.suggestions.length;

        if (totalIssues === 0) {
            recommendations.summary = 'Code looks good! No significant issues found.';
        } else {
            const parts = [];
            if (recommendations.critical.length > 0) {
                parts.push(`${recommendations.critical.length} critical issue(s)`);
            }
            if (recommendations.important.length > 0) {
                parts.push(`${recommendations.important.length} important issue(s)`);
            }
            if (recommendations.suggestions.length > 0) {
                parts.push(`${recommendations.suggestions.length} suggestion(s)`);
            }
            recommendations.summary = `Found ${parts.join(', ')}.`;
        }

        return recommendations;
    }

    /**
     * Store code submission in database
     */
    async storeCodeSubmission(code, context) {
        if (!this.storage || !this.storage.enabled) {
            return { id: null };
        }

        try {
            const submission = {
                file_path: context.filePath || 'unknown',
                code_content: code,
                language: context.language || 'unknown',
                project_id: context.projectId || 'default',
                is_ai_generated: context.isAIGenerated !== false,
                lines_of_code: code.split('\n').length,
                complexity_score: this.calculateComplexity(code),
                metadata: {
                    framework: context.framework,
                    timestamp: new Date().toISOString(),
                    source: context.source || 'file-watcher'
                }
                // Note: created_at is automatically set by the database
            };

            return await this.storage.insert('code_submissions', submission);
        } catch (error) {
            console.warn('[WARN] Failed to store code submission:', error.message);
            return { id: null };
        }
    }

    /**
     * Store individual agent rating
     */
    async storeAgentRating(submissionId, agentName, rating, executionTime) {
        if (!this.storage || !this.storage.enabled || !submissionId) {
            return null;
        }

        try {
            const agentRating = {
                submission_id: submissionId,
                agent_name: agentName,
                score: rating.score,
                confidence: rating.confidence,
                issues: rating.issues || [],
                reasoning: rating.reasoning || '',
                execution_time_ms: executionTime
            };

            return await this.storage.insert('agent_ratings', agentRating);
        } catch (error) {
            console.warn(`[WARN] Failed to store rating for ${agentName}:`, error.message);
            return null;
        }
    }

    /**
     * Store final assessment
     */
    async storeAssessment(submissionId, agentRatings, finalScore, consensus, status, recommendations) {
        if (!this.storage || !this.storage.enabled || !submissionId) {
            return null;
        }

        try {
            const assessment = {
                submission_id: submissionId,
                final_score: finalScore,
                status: status,
                consensus_score: consensus,
                agent_agreement: this.calculateAgentAgreement(agentRatings),
                recommendations: recommendations,
                auto_approved: status === 'APPROVED' && consensus >= this.config.thresholds.consensusRequired
            };

            return await this.storage.insert('code_assessments', assessment);
        } catch (error) {
            console.warn('[WARN] Failed to store assessment:', error.message);
            return null;
        }
    }

    /**
     * Calculate agent agreement matrix
     */
    calculateAgentAgreement(agentRatings) {
        const agreement = {};
        
        agentRatings.forEach(rating => {
            agreement[rating.agent] = {
                score: rating.score,
                confidence: rating.confidence,
                issueCount: rating.issues ? rating.issues.length : 0
            };
        });

        return agreement;
    }

    /**
     * Trigger learning process for approved code
     */
    async triggerLearning(code, context, agentRatings) {
        try {
            console.log('🧠 Triggering learning process...');
            
            // Extract patterns from approved code
            if (this.agents.pattern) {
                await this.agents.pattern.learnFromApproval(code, context, agentRatings);
            }

            // Update agent performance metrics
            await this.updateAgentPerformance(agentRatings);

            console.log('✅ Learning process completed');
        } catch (error) {
            console.error('❌ Learning process failed:', error);
        }
    }

    /**
     * Update agent performance tracking
     */
    async updateAgentPerformance(agentRatings) {
        for (const rating of agentRatings) {
            try {
                // Get current performance data
                const performance = await this.storage.selectOne('agent_performance', {
                    agent_name: rating.agent
                });

                if (performance) {
                    // Update existing performance
                    await this.storage.update('agent_performance', 
                        { agent_name: rating.agent },
                        {
                            total_predictions: performance.total_predictions + 1,
                            // Note: correct_predictions would be updated based on user feedback
                            current_weight: this.config.weights[rating.agent],
                            last_updated: new Date().toISOString()
                        }
                    );
                } else {
                    // Create new performance record
                    await this.storage.insert('agent_performance', {
                        agent_name: rating.agent,
                        total_predictions: 1,
                        correct_predictions: 0,
                        current_weight: this.config.weights[rating.agent],
                        learned_patterns: {}
                    });
                }
            } catch (error) {
                console.error(`Failed to update performance for ${rating.agent}:`, error);
            }
        }
    }

    /**
     * Calculate basic code complexity
     */
    calculateComplexity(code) {
        // Simple complexity calculation based on control structures
        const complexityPatterns = [
            /if\s*\(/g,
            /else\s*if\s*\(/g,
            /while\s*\(/g,
            /for\s*\(/g,
            /switch\s*\(/g,
            /catch\s*\(/g,
            /&&/g,
            /\|\|/g
        ];

        let complexity = 1; // Base complexity
        
        complexityPatterns.forEach(pattern => {
            const matches = code.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        });

        return complexity;
    }

    /**
     * Get council statistics
     */
    async getStatistics(timeRange = '7d') {
        try {
            if (!this.storage || !this.storage.enabled) {
                return {
                    total_submissions: 0,
                    avg_score: 0,
                    approved_count: 0,
                    rejected_count: 0,
                    review_count: 0
                };
            }

            // Get all assessments
            const assessments = await this.storage.select('code_assessments', {}, {
                limit: 1000
            });

            if (!assessments || assessments.length === 0) {
                return {
                    total_submissions: 0,
                    avg_score: 0,
                    approved_count: 0,
                    rejected_count: 0,
                    review_count: 0
                };
            }

            // Calculate statistics
            const total = assessments.length;
            const scores = assessments.filter(a => a.final_score !== null && a.final_score !== undefined);
            const avgScore = scores.length > 0 
                ? scores.reduce((sum, a) => sum + (a.final_score || 0), 0) / scores.length 
                : 0;
            
            const approved = assessments.filter(a => a.status === 'APPROVED').length;
            const rejected = assessments.filter(a => a.status === 'REJECTED').length;
            const reviewNeeded = assessments.filter(a => a.status === 'REVIEW_NEEDED').length;

            return {
                total_submissions: total,
                avg_score: Math.round(avgScore * 100) / 100,
                approved_count: approved,
                rejected_count: rejected,
                review_count: reviewNeeded
            };
        } catch (error) {
            // Return empty stats on error
            return {
                total_submissions: 0,
                avg_score: 0,
                approved_count: 0,
                rejected_count: 0,
                review_count: 0
            };
        }
    }

    /**
     * Update agent weights based on performance
     */
    async updateAgentWeights() {
        try {
            const performances = await this.storage.select('agent_performance');
            
            performances.forEach(perf => {
                if (perf.accuracy > 0.8) {
                    // Increase weight for high-performing agents
                    this.config.weights[perf.agent_name] *= 1.1;
                } else if (perf.accuracy < 0.6) {
                    // Decrease weight for low-performing agents
                    this.config.weights[perf.agent_name] *= 0.9;
                }
            });

            // Normalize weights to sum to 1
            const totalWeight = Object.values(this.config.weights).reduce((a, b) => a + b, 0);
            Object.keys(this.config.weights).forEach(agent => {
                this.config.weights[agent] /= totalWeight;
            });

            console.log('🎯 Agent weights updated:', this.config.weights);
        } catch (error) {
            console.error('Failed to update agent weights:', error);
        }
    }
}

module.exports = { CouncilOrchestrator };