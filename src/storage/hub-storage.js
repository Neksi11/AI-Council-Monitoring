/**
 * HubStorage - Local file-based storage system for AI-COUNCIL
 * Replaces database dependency with local file storage in a "Hub" folder
 */

const fs = require('fs').promises;
const path = require('path');

class HubStorage {
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.hubPath = path.join(projectRoot, 'Hub');
        this.paths = {
            hub: this.hubPath,
            context: path.join(this.hubPath, 'context'),
            watch: path.join(this.hubPath, 'watch'),
            results: path.join(this.hubPath, 'results'),
            patterns: path.join(this.hubPath, 'patterns'),
            config: path.join(this.hubPath, 'config'),
            issues: path.join(this.hubPath, 'issues')
        };
        this.enabled = true;
    }

    /**
     * Initialize Hub folder structure
     */
    async initialize() {
        try {
            // Create all required directories
            for (const [name, dirPath] of Object.entries(this.paths)) {
                await fs.mkdir(dirPath, { recursive: true });
            }

            // Create default config if not exists
            const configPath = path.join(this.paths.config, 'settings.json');
            if (!await this.fileExists(configPath)) {
                await this.writeJSON(configPath, {
                    created: new Date().toISOString(),
                    version: '1.0.0',
                    projectName: path.basename(this.projectRoot)
                });
            }

            return true;
        } catch (error) {
            console.error('[HubStorage] Initialization failed:', error.message);
            return false;
        }
    }

    /**
     * Store project context
     */
    async storeContext(context) {
        const contextPath = path.join(this.paths.context, 'project.json');
        await this.writeJSON(contextPath, {
            ...context,
            lastUpdated: new Date().toISOString()
        });
        return true;
    }

    /**
     * Get project context
     */
    async getContext() {
        const contextPath = path.join(this.paths.context, 'project.json');
        return await this.readJSON(contextPath);
    }

    /**
     * Store watch result (compact format to save disk space)
     */
    async storeWatchResult(filePath, result) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = path.basename(filePath, path.extname(filePath));

        // Create compact summary (instead of full result)
        const compactResult = {
            file: filePath,
            timestamp: new Date().toISOString(),
            score: result.finalScore || 0,
            status: result.status || 'UNKNOWN',
            consensus: result.consensus || 0,
            agents: (result.agentResults || []).map(a => ({
                name: a.agentName || a.name || 'unknown',
                score: a.score || 0
            })),
            issueCount: {
                critical: (result.recommendations?.critical || []).length,
                important: (result.recommendations?.important || []).length,
                suggestions: (result.recommendations?.suggestions || []).length
            },
            topIssues: (result.rejectionDetails?.primaryIssues || [])
                .slice(0, 3)
                .map(i => ({
                    severity: i.severity,
                    message: i.message?.substring(0, 100)
                })),
            executionTime: result.executionTime || 0
        };

        // Save compact version
        const resultPath = path.join(
            this.paths.watch,
            `${fileName}_${timestamp}.json`
        );
        await this.writeJSON(resultPath, compactResult);

        // Update latest (also compact)
        const latestPath = path.join(this.paths.watch, `${fileName}_latest.json`);
        await this.writeJSON(latestPath, compactResult);

        return resultPath;
    }

    /**
     * Store analysis result
     */
    async storeResult(submissionId, result) {
        const resultPath = path.join(
            this.paths.results,
            `${submissionId}.json`
        );

        await this.writeJSON(resultPath, {
            id: submissionId,
            timestamp: new Date().toISOString(),
            ...result
        });

        return { id: submissionId, path: resultPath };
    }

    /**
     * Get all watch results
     */
    async getWatchResults(limit = 50) {
        try {
            const files = await fs.readdir(this.paths.watch);
            const results = [];

            for (const file of files.slice(-limit)) {
                if (file.endsWith('.json') && !file.includes('_latest')) {
                    const data = await this.readJSON(path.join(this.paths.watch, file));
                    if (data) results.push(data);
                }
            }

            return results.sort((a, b) =>
                new Date(b.timestamp) - new Date(a.timestamp)
            );
        } catch (error) {
            return [];
        }
    }

    /**
     * Store learned pattern
     */
    async storePattern(pattern) {
        const patternId = `pattern_${Date.now()}`;
        const patternPath = path.join(this.paths.patterns, `${patternId}.json`);

        await this.writeJSON(patternPath, {
            id: patternId,
            timestamp: new Date().toISOString(),
            ...pattern
        });

        return patternId;
    }

    /**
     * Get all patterns
     */
    async getPatterns() {
        try {
            const files = await fs.readdir(this.paths.patterns);
            const patterns = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const data = await this.readJSON(path.join(this.paths.patterns, file));
                    if (data) patterns.push(data);
                }
            }

            return patterns;
        } catch (error) {
            return [];
        }
    }

    /**
     * Get statistics
     */
    async getStats() {
        try {
            const watchResults = await this.getWatchResults(1000);

            const stats = {
                totalAnalyses: watchResults.length,
                approved: 0,
                rejected: 0,
                reviewNeeded: 0,
                averageScore: 0,
                lastAnalysis: null
            };

            if (watchResults.length > 0) {
                let totalScore = 0;

                for (const result of watchResults) {
                    totalScore += result.result?.finalScore || 0;

                    switch (result.result?.status) {
                        case 'APPROVED':
                            stats.approved++;
                            break;
                        case 'REJECTED':
                        case 'AUTO_REJECTED':
                        case 'AGENT_REJECTION':
                            stats.rejected++;
                            break;
                        default:
                            stats.reviewNeeded++;
                    }
                }

                stats.averageScore = Math.round(totalScore / watchResults.length);
                stats.lastAnalysis = watchResults[0]?.timestamp;
            }

            return stats;
        } catch (error) {
            return {
                totalAnalyses: 0,
                approved: 0,
                rejected: 0,
                reviewNeeded: 0,
                averageScore: 0,
                lastAnalysis: null
            };
        }
    }

    /**
     * Clean old results (keep last N)
     */
    async cleanup(keepLast = 100) {
        try {
            const files = await fs.readdir(this.paths.watch);
            const toDelete = files
                .filter(f => !f.includes('_latest'))
                .slice(0, -keepLast);

            for (const file of toDelete) {
                await fs.unlink(path.join(this.paths.watch, file)).catch(() => { });
            }

            return toDelete.length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            // Check if Hub folder exists
            await fs.access(this.hubPath);
            return { connected: true, enabled: true };
        } catch (error) {
            return { connected: false, enabled: false, error: error.message };
        }
    }

    // Utility methods
    async writeJSON(filePath, data) {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    }

    async readJSON(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            return null;
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    // Compatibility methods for existing code
    async insert(table, data) {
        const id = `${table}_${Date.now()}`;
        const filePath = path.join(this.paths.results, `${id}.json`);
        await this.writeJSON(filePath, { id, ...data });
        return { id };
    }

    async select(table, query = {}, options = {}) {
        // Simple implementation - returns all from results
        try {
            const files = await fs.readdir(this.paths.results);
            const results = [];

            for (const file of files.slice(0, options.limit || 100)) {
                if (file.startsWith(table) && file.endsWith('.json')) {
                    const data = await this.readJSON(path.join(this.paths.results, file));
                    if (data) results.push(data);
                }
            }

            return results;
        } catch (error) {
            return [];
        }
    }

    async selectOne(table, query) {
        const results = await this.select(table, query, { limit: 1 });
        return results[0] || null;
    }

    async update(table, query, data) {
        // Simplified - not fully implemented
        return true;
    }
}

module.exports = { HubStorage };
