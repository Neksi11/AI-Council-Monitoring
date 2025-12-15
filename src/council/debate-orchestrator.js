/**
 * DebateOrchestrator - Facilitates AI agent debates for better consensus
 * Allows agents to discuss, challenge each other, and reach informed decisions
 */

class DebateOrchestrator {
    constructor(agents, config = {}) {
        this.agents = agents;
        this.config = {
            maxRounds: config.maxRounds || 2,
            minConsensusImprovement: config.minConsensusImprovement || 0.1,
            enableDebate: config.enableDebate !== false,
            debateThreshold: config.debateThreshold || 0.15, // Debate if consensus < threshold
            ...config
        };
    }

    /**
     * Facilitate a debate among agents about code quality
     */
    async facilitateDebate(code, context, initialResults) {
        if (!this.config.enableDebate || this.agents.size < 2) {
            return {
                debated: false,
                results: initialResults,
                consensus: this.calculateConsensus(initialResults),
                debateLog: []
            };
        }

        const initialConsensus = this.calculateConsensus(initialResults);

        // Only debate if consensus is low or scores vary significantly
        if (initialConsensus >= (1 - this.config.debateThreshold)) {
            return {
                debated: false,
                results: initialResults,
                consensus: initialConsensus,
                debateLog: ['Consensus already high, skipping debate']
            };
        }

        const debateLog = [];
        let currentResults = [...initialResults];
        let round = 0;

        while (round < this.config.maxRounds) {
            round++;
            const roundResults = await this.runDebateRound(code, context, currentResults, round);
            debateLog.push(...roundResults.log);

            // Update results with new insights
            currentResults = this.mergeDebateResults(currentResults, roundResults.insights);

            const newConsensus = this.calculateConsensus(currentResults);
            const consensusImprovement = newConsensus - initialConsensus;

            // If consensus improved significantly, continue; otherwise stop
            if (consensusImprovement < this.config.minConsensusImprovement && round > 1) {
                debateLog.push(`Consensus improvement minimal, ending debate after round ${round}`);
                break;
            }
        }

        return {
            debated: true,
            results: currentResults,
            consensus: this.calculateConsensus(currentResults),
            debateLog,
            rounds: round
        };
    }

    /**
     * Run a single debate round
     */
    async runDebateRound(code, context, currentResults, roundNumber) {
        const log = [];
        const insights = [];

        // Identify agents with significantly different scores
        const scores = currentResults.map(r => r.score);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const stdDev = Math.sqrt(
            scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length
        );

        // Find outliers
        const outliers = currentResults.filter(r =>
            Math.abs(r.score - avgScore) > stdDev * 1.5
        );

        if (outliers.length === 0) {
            log.push('No significant disagreements found in this round');
            return { log, insights: [] };
        }

        log.push(`Found ${outliers.length} agent(s) with divergent opinions`);

        // For each outlier, have other agents challenge their assessment
        for (const outlier of outliers) {
            const challengers = currentResults.filter(r =>
                r.agentName !== outlier.agentName &&
                Math.abs(r.score - avgScore) < Math.abs(outlier.score - avgScore)
            );

            if (challengers.length === 0) continue;

            // Create debate prompt
            const debatePrompt = this.buildDebatePrompt(
                code,
                context,
                outlier,
                challengers,
                roundNumber
            );

            // Get the outlier agent to reconsider
            const outlierAgent = this.agents.get(outlier.agentName);
            if (outlierAgent) {
                try {
                    const reconsideration = await this.getReconsideration(
                        outlierAgent,
                        debatePrompt,
                        outlier
                    );

                    if (reconsideration) {
                        insights.push({
                            agent: outlier.agentName,
                            originalScore: outlier.score,
                            newScore: reconsideration.score,
                            reasoning: reconsideration.reasoning,
                            changed: Math.abs(reconsideration.score - outlier.score) > 5
                        });
                    }
                } catch (error) {
                    // Silently handle reconsideration failures
                }
            }
        }

        return { log, insights };
    }

    /**
     * Build debate prompt for an agent to reconsider
     */
    buildDebatePrompt(code, context, outlier, challengers, roundNumber) {
        const challengerSummary = challengers.map(c =>
            `${c.agentName} scored ${c.score}/100: "${c.reasoning?.substring(0, 200) || 'No reasoning provided'}..."`
        ).join('\n');

        return `You are participating in an AI Council debate about code quality.

## Current Situation:
You initially scored this code ${outlier.score}/100 with the reasoning: "${outlier.reasoning?.substring(0, 300) || 'No reasoning provided'}..."

## Other Council Members' Perspectives:
${challengerSummary}

## Your Task:
Please reconsider your assessment. Consider:
1. Did you miss something important that others noticed?
2. Are you being too harsh or too lenient?
3. What specific aspects of the code should you re-evaluate?

Provide your reconsidered assessment in JSON format:
\`\`\`json
{
  "score": 85,
  "confidence": 0.9,
  "reasoning": "After considering other perspectives, I've adjusted my assessment because...",
  "changed": true,
  "keyInsights": ["What you learned from the debate"]
}
\`\`\`

Be honest and thoughtful. If you still believe your original assessment is correct, maintain it but provide stronger reasoning. If you see merit in others' perspectives, adjust accordingly.`;
    }

    /**
     * Get an agent's reconsideration after debate
     */
    async getReconsideration(agent, debatePrompt, originalResult) {
        try {
            // Use a simplified analysis that focuses on reconsideration
            const response = await agent.analyze(debatePrompt, {
                isDebate: true,
                originalScore: originalResult.score
            });

            // Parse the response
            const reconsideration = this.parseReconsiderationResponse(response);

            return {
                score: reconsideration.score || originalResult.score,
                reasoning: reconsideration.reasoning || originalResult.reasoning,
                changed: reconsideration.changed || false,
                keyInsights: reconsideration.keyInsights || []
            };
        } catch (error) {
            console.warn(`Failed to get reconsideration: ${error.message}`);
            return null;
        }
    }

    /**
     * Parse reconsideration response
     */
    parseReconsiderationResponse(response) {
        try {
            // If response is already an object (from analyze method), use it directly
            if (typeof response === 'object' && response !== null) {
                return {
                    score: response.score || null,
                    reasoning: response.reasoning || '',
                    changed: response.changed || false,
                    keyInsights: response.keyInsights || []
                };
            }

            // If response is a string, try to extract JSON
            if (typeof response === 'string') {
                // Remove markdown code blocks if present
                let jsonStr = response.trim();
                if (jsonStr.startsWith('```')) {
                    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '');
                    jsonStr = jsonStr.replace(/\n?```\s*$/, '');
                }

                // Find JSON object
                const jsonStart = jsonStr.indexOf('{');
                const jsonEnd = jsonStr.lastIndexOf('}');

                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                    jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
                    return JSON.parse(jsonStr);
                }

                // Fallback: extract score from text
                const scoreMatch = jsonStr.match(/score[:\s]*(\d+)/i);
                return {
                    score: scoreMatch ? parseInt(scoreMatch[1]) : null,
                    reasoning: jsonStr.substring(0, 500),
                    changed: false
                };
            }

            return { score: null, reasoning: '', changed: false };
        } catch (error) {
            return {
                score: null,
                reasoning: String(response).substring(0, 500),
                changed: false
            };
        }
    }

    /**
     * Merge debate insights into results
     */
    mergeDebateResults(originalResults, insights) {
        const updatedResults = [...originalResults];

        for (const insight of insights) {
            const index = updatedResults.findIndex(r => r.agentName === insight.agent);
            if (index !== -1 && insight.changed) {
                updatedResults[index] = {
                    ...updatedResults[index],
                    score: insight.newScore,
                    reasoning: insight.reasoning,
                    debated: true,
                    debateRound: insight.round
                };
            } else if (index !== -1) {
                // Even if score didn't change, update reasoning
                updatedResults[index] = {
                    ...updatedResults[index],
                    reasoning: insight.reasoning,
                    debated: true
                };
            }
        }

        return updatedResults;
    }

    /**
     * Calculate consensus among results
     */
    calculateConsensus(results) {
        if (results.length === 0) return 0;
        if (results.length === 1) return results[0].confidence || 0.8;

        const scores = results.map(r => r.score);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);

        // Consensus is higher when standard deviation is lower
        // Normalize to 0-1 scale (50 is max reasonable std dev for 0-100 scores)
        return Math.max(0, Math.min(1, 1 - (stdDev / 50)));
    }
}

module.exports = { DebateOrchestrator };

