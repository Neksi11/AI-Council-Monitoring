/**
 * BaseAgent - Abstract base class for all AI-COUNCIL agents
 */

class BaseAgent {
  constructor(name, weight = 1.0) {
    if (this.constructor === BaseAgent) {
      throw new Error('BaseAgent is abstract and cannot be instantiated directly');
    }
    
    this.name = name;
    this.weight = weight;
    this.enabled = true;
    this.totalAnalyses = 0;
    this.correctPredictions = 0;
  }

  /**
   * Abstract method - must be implemented by subclasses
   * @param {string} code - Code content to analyze
   * @param {object} context - Analysis context (file path, language, etc.)
   * @returns {Promise<object>} Analysis result
   */
  async analyze(code, context) {
    throw new Error('analyze() method must be implemented by subclass');
  }

  /**
   * Calculate agent accuracy based on historical performance
   * @returns {number} Accuracy score (0-1)
   */
  getAccuracy() {
    if (this.totalAnalyses === 0) return 0.5; // Default neutral accuracy
    return this.correctPredictions / this.totalAnalyses;
  }

  /**
   * Update agent performance metrics
   * @param {boolean} wasCorrect - Whether the prediction was correct
   */
  updatePerformance(wasCorrect) {
    this.totalAnalyses++;
    if (wasCorrect) {
      this.correctPredictions++;
    }
  }

  /**
   * Calculate confidence based on code characteristics
   * @param {string} code - Code content
   * @param {object} context - Analysis context
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(code, context) {
    let confidence = 0.5; // Base confidence

    // Increase confidence for longer code (more context)
    const codeLength = code.length;
    if (codeLength > 1000) confidence += 0.2;
    else if (codeLength > 500) confidence += 0.1;

    // Increase confidence for known file types
    const knownExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java'];
    if (context.filePath && knownExtensions.some(ext => context.filePath.endsWith(ext))) {
      confidence += 0.1;
    }

    // Factor in historical accuracy
    const accuracy = this.getAccuracy();
    confidence = (confidence + accuracy) / 2;

    return Math.min(1.0, Math.max(0.1, confidence));
  }

  /**
   * Create standardized analysis result
   * @param {number} score - Score (0-100)
   * @param {array} issues - Array of issues found
   * @param {string} reasoning - Explanation of the analysis
   * @param {number} confidence - Confidence level (0-1)
   * @returns {object} Standardized result object
   */
  createResult(score, issues = [], reasoning = '', confidence = null) {
    return {
      agent: this.name,
      score: Math.max(0, Math.min(100, Math.round(score))),
      confidence: confidence || this.calculateConfidence('', {}),
      issues: issues.map(issue => ({
        severity: issue.severity || 'medium',
        type: issue.type || 'general',
        message: issue.message,
        line: issue.line || null,
        column: issue.column || null,
        suggestion: issue.suggestion || null,
      })),
      reasoning,
      timestamp: new Date().toISOString(),
      executionTime: null, // Will be set by orchestrator
    };
  }

  /**
   * Extract basic code metrics
   * @param {string} code - Code content
   * @returns {object} Basic metrics
   */
  extractBasicMetrics(code) {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const commentLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
    });

    return {
      totalLines: lines.length,
      codeLines: nonEmptyLines.length,
      commentLines: commentLines.length,
      averageLineLength: nonEmptyLines.reduce((sum, line) => sum + line.length, 0) / nonEmptyLines.length || 0,
      longestLine: Math.max(...lines.map(line => line.length)),
    };
  }

  /**
   * Check if code contains specific patterns
   * @param {string} code - Code content
   * @param {array} patterns - Array of regex patterns or strings
   * @returns {array} Matched patterns with locations
   */
  findPatterns(code, patterns) {
    const matches = [];
    const lines = code.split('\n');

    patterns.forEach(pattern => {
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'gi');
      
      lines.forEach((line, lineIndex) => {
        let match;
        while ((match = regex.exec(line)) !== null) {
          matches.push({
            pattern: pattern.toString(),
            match: match[0],
            line: lineIndex + 1,
            column: match.index + 1,
            context: line.trim(),
          });
        }
      });
    });

    return matches;
  }

  /**
   * Validate analysis result format
   * @param {object} result - Analysis result to validate
   * @returns {boolean} Whether result is valid
   */
  validateResult(result) {
    const required = ['agent', 'score', 'confidence', 'issues', 'reasoning'];
    return required.every(field => result.hasOwnProperty(field)) &&
           typeof result.score === 'number' &&
           result.score >= 0 && result.score <= 100 &&
           typeof result.confidence === 'number' &&
           result.confidence >= 0 && result.confidence <= 1 &&
           Array.isArray(result.issues);
  }

  /**
   * Get agent configuration
   * @returns {object} Agent configuration
   */
  getConfig() {
    return {
      name: this.name,
      weight: this.weight,
      enabled: this.enabled,
      accuracy: this.getAccuracy(),
      totalAnalyses: this.totalAnalyses,
    };
  }

  /**
   * Enable/disable agent
   * @param {boolean} enabled - Whether agent should be enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Update agent weight
   * @param {number} weight - New weight value
   */
  setWeight(weight) {
    this.weight = Math.max(0, Math.min(1, weight));
  }
}

module.exports = { BaseAgent };