/**
 * PatternStore - Manages code patterns for learning system
 */

const crypto = require('crypto');

class PatternStore {
    constructor(supabaseClient) {
        this.db = supabaseClient;
    }

    /**
     * Store a new code pattern
     */
    async storePattern(pattern, language, context = {}) {
        try {
            const patternHash = this.generatePatternHash(pattern.code);
            
            // Check if pattern already exists
            const existing = await this.db.selectOne('production_patterns', {
                pattern_hash: patternHash
            });

            if (existing) {
                // Update frequency and last seen
                return await this.db.update(
                    'production_patterns',
                    { pattern_hash: patternHash },
                    {
                        frequency: existing.frequency + 1,
                        last_seen: new Date().toISOString(),
                        learned_from: [...(existing.learned_from || []), context.submissionId].filter(Boolean)
                    }
                );
            } else {
                // Create new pattern
                return await this.db.insert('production_patterns', {
                    pattern_type: pattern.type || 'function',
                    code_pattern: pattern.code,
                    language: language,
                    pattern_hash: patternHash,
                    frequency: 1,
                    avg_rating: context.rating || 0,
                    success_rate: 1.0,
                    context_tags: pattern.tags || [],
                    learned_from: context.submissionId ? [context.submissionId] : []
                });
            }
        } catch (error) {
            console.error('❌ Failed to store pattern:', error.message);
            throw error;
        }
    }

    /**
     * Find similar patterns
     */
    async findSimilarPatterns(codePattern, language, threshold = 0.7) {
        try {
            // Get all patterns for the language
            const patterns = await this.db.select('production_patterns', {
                language: language
            });

            const similarities = patterns.map(pattern => ({
                ...pattern,
                similarity: this.calculateSimilarity(codePattern, pattern.code_pattern)
            })).filter(p => p.similarity >= threshold);

            // Sort by similarity descending
            return similarities.sort((a, b) => b.similarity - a.similarity);
        } catch (error) {
            console.error('❌ Failed to find similar patterns:', error.message);
            return [];
        }
    }

    /**
     * Get patterns by type
     */
    async getPatternsByType(type, language = null) {
        try {
            const filters = { pattern_type: type };
            if (language) filters.language = language;

            return await this.db.select('production_patterns', filters, {
                order: { column: 'frequency', ascending: false }
            });
        } catch (error) {
            console.error('❌ Failed to get patterns by type:', error.message);
            return [];
        }
    }

    /**
     * Update pattern rating
     */
    async updatePatternRating(patternId, rating) {
        try {
            const pattern = await this.db.selectOne('production_patterns', { id: patternId });
            if (!pattern) return null;

            // Calculate new average rating
            const totalRatings = pattern.frequency;
            const currentTotal = (pattern.avg_rating || 0) * (totalRatings - 1);
            const newAverage = (currentTotal + rating) / totalRatings;

            return await this.db.update(
                'production_patterns',
                { id: patternId },
                { avg_rating: Math.round(newAverage) }
            );
        } catch (error) {
            console.error('❌ Failed to update pattern rating:', error.message);
            throw error;
        }
    }

    /**
     * Get top patterns for a language
     */
    async getTopPatterns(language, limit = 10) {
        try {
            return await this.db.select('production_patterns', 
                { language: language },
                {
                    order: { column: 'avg_rating', ascending: false },
                    limit: limit
                }
            );
        } catch (error) {
            console.error('❌ Failed to get top patterns:', error.message);
            return [];
        }
    }

    /**
     * Extract patterns from code
     */
    extractPatterns(code, language) {
        const patterns = [];

        try {
            // Extract function patterns
            const functionPatterns = this.extractFunctionPatterns(code, language);
            patterns.push(...functionPatterns);

            // Extract class patterns
            const classPatterns = this.extractClassPatterns(code, language);
            patterns.push(...classPatterns);

            // Extract import patterns
            const importPatterns = this.extractImportPatterns(code, language);
            patterns.push(...importPatterns);

            // Extract error handling patterns
            const errorPatterns = this.extractErrorHandlingPatterns(code, language);
            patterns.push(...errorPatterns);

            return patterns;
        } catch (error) {
            console.error('❌ Pattern extraction failed:', error.message);
            return [];
        }
    }

    /**
     * Extract function patterns
     */
    extractFunctionPatterns(code, language) {
        const patterns = [];
        
        if (language === 'javascript' || language === 'typescript') {
            // Match function declarations and expressions
            const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\([^)]*\)\s*{)|(\w+)\s*:\s*(?:async\s+)?\([^)]*\)\s*=>)/g;
            let match;

            while ((match = functionRegex.exec(code)) !== null) {
                const functionName = match[1] || match[2] || match[3];
                const functionCode = this.extractFunctionBody(code, match.index);
                
                if (functionCode && functionCode.length > 10) {
                    patterns.push({
                        type: 'function',
                        code: functionCode,
                        name: functionName,
                        tags: ['function', language]
                    });
                }
            }
        }

        return patterns;
    }

    /**
     * Extract class patterns
     */
    extractClassPatterns(code, language) {
        const patterns = [];

        if (language === 'javascript' || language === 'typescript') {
            const classRegex = /class\s+(\w+)(?:\s+extends\s+\w+)?\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g;
            let match;

            while ((match = classRegex.exec(code)) !== null) {
                patterns.push({
                    type: 'class',
                    code: match[0],
                    name: match[1],
                    tags: ['class', language]
                });
            }
        }

        return patterns;
    }

    /**
     * Extract import patterns
     */
    extractImportPatterns(code, language) {
        const patterns = [];

        if (language === 'javascript' || language === 'typescript') {
            const importRegex = /import\s+.*?from\s+['"][^'"]+['"];?/g;
            const matches = code.match(importRegex) || [];

            matches.forEach(importStatement => {
                patterns.push({
                    type: 'import',
                    code: importStatement,
                    tags: ['import', language]
                });
            });
        }

        return patterns;
    }

    /**
     * Extract error handling patterns
     */
    extractErrorHandlingPatterns(code, language) {
        const patterns = [];

        // Try-catch patterns
        const tryCatchRegex = /try\s*{[^{}]*(?:{[^{}]*}[^{}]*)*}\s*catch\s*\([^)]*\)\s*{[^{}]*(?:{[^{}]*}[^{}]*)*}/g;
        const matches = code.match(tryCatchRegex) || [];

        matches.forEach(pattern => {
            patterns.push({
                type: 'error_handling',
                code: pattern,
                tags: ['try-catch', 'error-handling', language]
            });
        });

        return patterns;
    }

    /**
     * Extract function body from code starting at index
     */
    extractFunctionBody(code, startIndex) {
        let braceCount = 0;
        let inFunction = false;
        let functionStart = startIndex;
        
        for (let i = startIndex; i < code.length; i++) {
            const char = code[i];
            
            if (char === '{') {
                if (!inFunction) {
                    inFunction = true;
                    functionStart = i;
                }
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0 && inFunction) {
                    return code.substring(functionStart, i + 1);
                }
            }
        }
        
        return null;
    }

    /**
     * Calculate similarity between two code patterns
     */
    calculateSimilarity(pattern1, pattern2) {
        // Simple Levenshtein distance-based similarity
        const distance = this.levenshteinDistance(
            this.normalizeCode(pattern1),
            this.normalizeCode(pattern2)
        );
        
        const maxLength = Math.max(pattern1.length, pattern2.length);
        return maxLength === 0 ? 1 : 1 - (distance / maxLength);
    }

    /**
     * Normalize code for comparison
     */
    normalizeCode(code) {
        return code
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .replace(/\/\*.*?\*\//g, '')    // Remove comments
            .replace(/\/\/.*$/gm, '')       // Remove line comments
            .trim()
            .toLowerCase();
    }

    /**
     * Calculate Levenshtein distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Generate hash for pattern deduplication
     */
    generatePatternHash(code) {
        const normalized = this.normalizeCode(code);
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }

    /**
     * Clean up old patterns
     */
    async cleanupOldPatterns(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const deleted = await this.db.delete('production_patterns', {
                last_seen: { lt: cutoffDate.toISOString() },
                frequency: { lt: 3 } // Only delete patterns with low frequency
            });

            console.log(`🧹 Cleaned up ${deleted?.length || 0} old patterns`);
            return deleted;
        } catch (error) {
            console.error('❌ Pattern cleanup failed:', error.message);
            throw error;
        }
    }

    /**
     * Get pattern statistics
     */
    async getPatternStats() {
        try {
            const stats = await this.db.query(`
                SELECT 
                    language,
                    pattern_type,
                    COUNT(*) as count,
                    AVG(avg_rating) as avg_rating,
                    AVG(frequency) as avg_frequency
                FROM production_patterns 
                GROUP BY language, pattern_type
                ORDER BY language, pattern_type
            `);

            return stats || [];
        } catch (error) {
            console.error('❌ Failed to get pattern stats:', error.message);
            return [];
        }
    }
}

module.exports = { PatternStore };