/**
 * PerformanceAgent - Analyzes code for performance issues and optimization opportunities
 */

const { BaseAgent } = require('./base-agent');

class PerformanceAgent extends BaseAgent {
  constructor() {
    super('Performance', 0.20);
    
    // Performance anti-patterns
    this.antiPatterns = {
      nestedLoops: /for\s*\([^}]*\{[^}]*for\s*\(/g,
      inefficientQueries: [
        /SELECT\s+\*\s+FROM/gi,
        /\.find\(\)\s*\.map\(/g,
        /\.filter\(\)\s*\.filter\(/g,
        /\.forEach\(\)\s*\.forEach\(/g,
      ],
      memoryLeaks: [
        /setInterval\s*\(/g,
        /setTimeout\s*\(/g,
        /addEventListener\s*\(/g,
        /new\s+Array\s*\(\s*\d{4,}/g, // Large array allocation
      ],
      synchronousOperations: [
        /fs\.readFileSync/g,
        /fs\.writeFileSync/g,
        /\.sync\(/g,
        /XMLHttpRequest/g,
      ],
      inefficientDataStructures: [
        /\.indexOf\s*\(/g, // Array.indexOf in loops
        /\.includes\s*\(/g, // Array.includes in loops
        /Object\.keys\s*\([^)]*\)\.length/g,
      ],
    };

    // Performance optimizations
    this.optimizations = {
      asyncOperations: [
        /async\s+function/g,
        /await\s+/g,
        /Promise\./g,
        /\.then\s*\(/g,
      ],
      efficientDataStructures: [
        /new\s+Set\s*\(/g,
        /new\s+Map\s*\(/g,
        /\.has\s*\(/g,
        /\.get\s*\(/g,
      ],
      caching: [
        /cache/gi,
        /memoize/gi,
        /localStorage/g,
        /sessionStorage/g,
      ],
      lazyLoading: [
        /lazy/gi,
        /dynamic\s+import/g,
        /import\s*\(/g,
      ],
    };

    // Time complexity patterns
    this.complexityPatterns = {
      'O(n²)': [
        /for\s*\([^}]*\{[^}]*for\s*\(/g, // Nested loops
        /\.forEach\([^}]*\.forEach\(/g,
      ],
      'O(n³)': [
        /for\s*\([^}]*\{[^}]*for\s*\([^}]*\{[^}]*for\s*\(/g, // Triple nested
      ],
      'O(n log n)': [
        /\.sort\s*\(/g,
      ],
      'O(n)': [
        /\.map\s*\(/g,
        /\.filter\s*\(/g,
        /\.reduce\s*\(/g,
        /for\s*\(/g,
      ],
    };
  }

  async analyze(code, context) {
    const startTime = Date.now();
    let score = 100;
    const issues = [];

    try {
      // Check for nested loops and O(n²) complexity
      const nestedLoopIssues = this.checkNestedLoops(code);
      issues.push(...nestedLoopIssues);
      score -= nestedLoopIssues.length * 15;

      // Check for inefficient database queries
      const queryIssues = this.checkInefficinetQueries(code);
      issues.push(...queryIssues);
      score -= queryIssues.length * 12;

      // Check for potential memory leaks
      const memoryIssues = this.checkMemoryLeaks(code);
      issues.push(...memoryIssues);
      score -= memoryIssues.length * 10;

      // Check for synchronous operations
      const syncIssues = this.checkSynchronousOperations(code);
      issues.push(...syncIssues);
      score -= syncIssues.length * 8;

      // Check for inefficient data structure usage
      const dataStructureIssues = this.checkDataStructures(code);
      issues.push(...dataStructureIssues);
      score -= dataStructureIssues.length * 6;

      // Check time complexity
      const complexityIssues = this.analyzeTimeComplexity(code);
      issues.push(...complexityIssues);
      score -= complexityIssues.length * 8;

      // Bonus for performance optimizations
      const optimizationBonus = this.checkOptimizations(code);
      score += optimizationBonus;

      const confidence = this.calculatePerformanceConfidence(code, context);
      const reasoning = this.generateReasoning(issues, optimizationBonus);

      const result = this.createResult(score, issues, reasoning, confidence);
      result.executionTime = Date.now() - startTime;

      return result;

    } catch (error) {
      return this.createResult(50, [{
        severity: 'medium',
        type: 'analysis_error',
        message: `Performance analysis failed: ${error.message}`,
      }], 'Analysis encountered an error', 0.1);
    }
  }

  checkNestedLoops(code) {
    const issues = [];
    const nestedLoopPattern = this.antiPatterns.nestedLoops;
    
    const matches = this.findPatterns(code, [nestedLoopPattern]);
    matches.forEach(match => {
      issues.push({
        severity: 'high',
        type: 'nested_loops',
        message: 'Nested loops detected - O(n²) time complexity',
        line: match.line,
        column: match.column,
        suggestion: 'Consider using hash maps, sets, or optimizing the algorithm to reduce complexity',
        context: match.context,
      });
    });

    return issues;
  }

  checkInefficinetQueries(code) {
    const issues = [];
    
    this.antiPatterns.inefficientQueries.forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      matches.forEach(match => {
        let message = 'Inefficient query pattern detected';
        let suggestion = 'Optimize query for better performance';

        if (pattern.source.includes('SELECT.*FROM')) {
          message = 'SELECT * query detected';
          suggestion = 'Select only required columns instead of using SELECT *';
        } else if (pattern.source.includes('find.*map')) {
          message = 'Chained find().map() detected';
          suggestion = 'Consider using a single operation or caching the find result';
        } else if (pattern.source.includes('filter.*filter')) {
          message = 'Chained filter operations detected';
          suggestion = 'Combine filter conditions into a single operation';
        }

        issues.push({
          severity: 'medium',
          type: 'inefficient_query',
          message,
          line: match.line,
          column: match.column,
          suggestion,
          context: match.context,
        });
      });
    });

    return issues;
  }

  checkMemoryLeaks(code) {
    const issues = [];
    
    this.antiPatterns.memoryLeaks.forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      matches.forEach(match => {
        let message = 'Potential memory leak detected';
        let suggestion = 'Ensure proper cleanup';
        let severity = 'medium';

        if (pattern.source.includes('setInterval')) {
          message = 'setInterval without clearInterval detected';
          suggestion = 'Store interval ID and call clearInterval in cleanup';
          severity = 'high';
        } else if (pattern.source.includes('addEventListener')) {
          message = 'Event listener without removal detected';
          suggestion = 'Add removeEventListener in cleanup or use AbortController';
        } else if (pattern.source.includes('new Array')) {
          message = 'Large array allocation detected';
          suggestion = 'Consider streaming or chunking for large datasets';
        }

        issues.push({
          severity,
          type: 'memory_leak',
          message,
          line: match.line,
          column: match.column,
          suggestion,
          context: match.context,
        });
      });
    });

    return issues;
  }

  checkSynchronousOperations(code) {
    const issues = [];
    
    this.antiPatterns.synchronousOperations.forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      matches.forEach(match => {
        let message = 'Synchronous operation detected';
        let suggestion = 'Use asynchronous alternative';

        if (pattern.source.includes('readFileSync')) {
          message = 'Synchronous file read detected';
          suggestion = 'Use fs.readFile or fs.promises.readFile instead';
        } else if (pattern.source.includes('writeFileSync')) {
          message = 'Synchronous file write detected';
          suggestion = 'Use fs.writeFile or fs.promises.writeFile instead';
        } else if (pattern.source.includes('XMLHttpRequest')) {
          message = 'XMLHttpRequest detected';
          suggestion = 'Use fetch API or axios for better performance';
        }

        issues.push({
          severity: 'medium',
          type: 'synchronous_operation',
          message,
          line: match.line,
          column: match.column,
          suggestion,
          context: match.context,
        });
      });
    });

    return issues;
  }

  checkDataStructures(code) {
    const issues = [];
    
    // Check for Array.indexOf in loops (potential O(n²))
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('for') || line.includes('while')) {
        // Check next few lines for indexOf usage
        const nextLines = lines.slice(index, index + 10);
        nextLines.forEach((nextLine, offset) => {
          if (nextLine.includes('.indexOf(') || nextLine.includes('.includes(')) {
            issues.push({
              severity: 'medium',
              type: 'inefficient_data_structure',
              message: 'Array.indexOf/includes in loop detected',
              line: index + offset + 1,
              suggestion: 'Use Set.has() or Map.get() for O(1) lookups instead of O(n) array operations',
            });
          }
        });
      }
    });

    return issues;
  }

  analyzeTimeComplexity(code) {
    const issues = [];
    const complexityAnalysis = {};

    // Analyze different complexity patterns
    Object.entries(this.complexityPatterns).forEach(([complexity, patterns]) => {
      patterns.forEach(pattern => {
        const matches = this.findPatterns(code, [pattern]);
        if (matches.length > 0) {
          complexityAnalysis[complexity] = (complexityAnalysis[complexity] || 0) + matches.length;
        }
      });
    });

    // Report high complexity issues
    if (complexityAnalysis['O(n³)'] > 0) {
      issues.push({
        severity: 'high',
        type: 'time_complexity',
        message: 'O(n³) time complexity detected (triple nested loops)',
        suggestion: 'Refactor algorithm to reduce complexity - consider hash maps or different approach',
      });
    }

    if (complexityAnalysis['O(n²)'] > 2) {
      issues.push({
        severity: 'medium',
        type: 'time_complexity',
        message: `Multiple O(n²) operations detected (${complexityAnalysis['O(n²)']} instances)`,
        suggestion: 'Consider optimizing nested operations or using more efficient algorithms',
      });
    }

    return issues;
  }

  checkOptimizations(code) {
    let bonus = 0;

    // Check for async operations
    Object.values(this.optimizations.asyncOperations).forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      bonus += matches.length * 2;
    });

    // Check for efficient data structures
    Object.values(this.optimizations.efficientDataStructures).forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      bonus += matches.length * 3;
    });

    // Check for caching
    Object.values(this.optimizations.caching).forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      bonus += matches.length * 4;
    });

    // Check for lazy loading
    Object.values(this.optimizations.lazyLoading).forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      bonus += matches.length * 3;
    });

    return Math.min(bonus, 20); // Cap bonus at 20 points
  }

  calculatePerformanceConfidence(code, context) {
    let confidence = this.calculateConfidence(code, context);

    // Increase confidence for performance-critical files
    if (context.filePath) {
      const performanceFiles = ['performance', 'optimization', 'cache', 'worker', 'async'];
      if (performanceFiles.some(keyword => context.filePath.toLowerCase().includes(keyword))) {
        confidence += 0.2;
      }
    }

    // Increase confidence for files with performance-related imports
    const performanceImports = ['lodash', 'ramda', 'worker_threads', 'cluster'];
    if (performanceImports.some(lib => code.includes(lib))) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  generateReasoning(issues, bonus) {
    const severityCounts = {
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
    };

    let reasoning = 'Performance analysis completed. ';

    if (severityCounts.high > 0) {
      reasoning += `Found ${severityCounts.high} high-impact performance issue(s). `;
    }
    if (severityCounts.medium > 0) {
      reasoning += `Found ${severityCounts.medium} medium-impact performance issue(s). `;
    }
    if (severityCounts.low > 0) {
      reasoning += `Found ${severityCounts.low} low-impact performance issue(s). `;
    }

    if (bonus > 0) {
      reasoning += `Bonus points for performance optimizations (+${bonus}). `;
    }

    if (issues.length === 0) {
      reasoning += 'No obvious performance issues detected. ';
    }

    reasoning += 'Consider profiling with real data for comprehensive performance analysis.';

    return reasoning;
  }
}

module.exports = { PerformanceAgent };