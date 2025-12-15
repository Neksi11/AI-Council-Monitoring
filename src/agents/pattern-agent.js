/**
 * PatternAgent - Analyzes code patterns and consistency with production codebase
 */

const { BaseAgent } = require('./base-agent');

class PatternAgent extends BaseAgent {
  constructor() {
    super('Pattern', 0.20);
    
    // Common architectural patterns
    this.architecturalPatterns = {
      mvc: [
        /class.*Controller/g,
        /class.*Model/g,
        /class.*View/g,
        /router\./g,
      ],
      repository: [
        /class.*Repository/g,
        /interface.*Repository/g,
        /\.findBy/g,
        /\.save\(/g,
      ],
      factory: [
        /class.*Factory/g,
        /create[A-Z]/g,
        /new\s+\w+\(/g,
      ],
      singleton: [
        /getInstance/g,
        /static.*instance/g,
        /private.*constructor/g,
      ],
      observer: [
        /addEventListener/g,
        /subscribe/g,
        /notify/g,
        /emit\(/g,
      ],
    };

    // Code style patterns
    this.stylePatterns = {
      imports: {
        es6: /import\s+.*from/g,
        commonjs: /require\s*\(/g,
        destructuring: /import\s*\{.*\}/g,
      },
      functions: {
        arrow: /=>\s*[{(]/g,
        traditional: /function\s+\w+/g,
        async: /async\s+function/g,
      },
      classes: {
        es6Class: /class\s+\w+/g,
        constructor: /constructor\s*\(/g,
        methods: /\w+\s*\([^)]*\)\s*\{/g,
      },
      errorHandling: {
        tryCatch: /try\s*\{[\s\S]*catch/g,
        promises: /\.catch\(/g,
        asyncAwait: /try\s*\{[\s\S]*await[\s\S]*catch/g,
      },
    };

    // Anti-patterns to detect
    this.antiPatterns = {
      godClass: /class\s+\w+\s*\{[\s\S]{2000,}\}/g, // Very large classes
      longParameterList: /function\s+\w+\s*\(([^)]{100,})\)/g,
      deepNesting: /\{\s*[\s\S]*?\{\s*[\s\S]*?\{\s*[\s\S]*?\{\s*[\s\S]*?\{/g,
      magicNumbers: /\b(?!0|1|2|10|100|1000)\d{3,}\b/g,
      duplicateCode: [], // Will be populated during analysis
    };

    // Best practices patterns
    this.bestPractices = {
      solidPrinciples: [
        /interface\s+\w+/g, // Interface segregation
        /extends\s+\w+/g, // Inheritance
        /implements\s+\w+/g, // Interface implementation
      ],
      dryPrinciple: [
        /function\s+\w+/g, // Function extraction
        /const\s+\w+\s*=/g, // Constants
        /import.*from/g, // Module reuse
      ],
      testability: [
        /describe\s*\(/g,
        /it\s*\(/g,
        /test\s*\(/g,
        /expect\s*\(/g,
      ],
    };

    // Learned patterns storage (will be populated from database)
    this.learnedPatterns = {
      good: [],
      bad: [],
    };
  }

  async analyze(code, context) {
    const startTime = Date.now();
    let score = 100;
    const issues = [];

    try {
      // Extract code patterns
      const extractedPatterns = this.extractPatterns(code);

      // Check architectural consistency
      const archIssues = this.checkArchitecturalPatterns(code, extractedPatterns);
      issues.push(...archIssues);
      score -= archIssues.length * 8;

      // Check style consistency
      const styleIssues = this.checkStyleConsistency(code, extractedPatterns);
      issues.push(...styleIssues);
      score -= styleIssues.length * 5;

      // Check for anti-patterns
      const antiPatternIssues = this.checkAntiPatterns(code);
      issues.push(...antiPatternIssues);
      score -= antiPatternIssues.length * 10;

      // Check against learned patterns
      const learnedPatternIssues = await this.checkLearnedPatterns(code, extractedPatterns);
      issues.push(...learnedPatternIssues);
      score -= learnedPatternIssues.length * 6;

      // Bonus for best practices
      const bestPracticeBonus = this.checkBestPractices(code);
      score += bestPracticeBonus;

      // Bonus for consistent patterns
      const consistencyBonus = this.calculateConsistencyBonus(extractedPatterns);
      score += consistencyBonus;

      const confidence = this.calculatePatternConfidence(code, context, extractedPatterns);
      const reasoning = this.generateReasoning(issues, extractedPatterns, bestPracticeBonus);

      const result = this.createResult(score, issues, reasoning, confidence);
      result.executionTime = Date.now() - startTime;
      result.patterns = extractedPatterns;

      return result;

    } catch (error) {
      return this.createResult(50, [{
        severity: 'medium',
        type: 'analysis_error',
        message: `Pattern analysis failed: ${error.message}`,
      }], 'Analysis encountered an error', 0.1);
    }
  }

  extractPatterns(code) {
    const patterns = {
      architectural: {},
      style: {},
      structure: {},
    };

    // Extract architectural patterns
    Object.entries(this.architecturalPatterns).forEach(([pattern, regexes]) => {
      patterns.architectural[pattern] = 0;
      regexes.forEach(regex => {
        const matches = code.match(regex) || [];
        patterns.architectural[pattern] += matches.length;
      });
    });

    // Extract style patterns
    Object.entries(this.stylePatterns).forEach(([category, subPatterns]) => {
      patterns.style[category] = {};
      Object.entries(subPatterns).forEach(([pattern, regex]) => {
        const matches = code.match(regex) || [];
        patterns.style[category][pattern] = matches.length;
      });
    });

    // Extract structural information
    patterns.structure = {
      classes: (code.match(/class\s+\w+/g) || []).length,
      functions: (code.match(/function\s+\w+/g) || []).length,
      arrowFunctions: (code.match(/=>\s*[{(]/g) || []).length,
      imports: (code.match(/import.*from|require\s*\(/g) || []).length,
      exports: (code.match(/export\s+|module\.exports/g) || []).length,
    };

    return patterns;
  }

  checkArchitecturalPatterns(code, patterns) {
    const issues = [];

    // Check for mixed architectural patterns
    const archPatterns = patterns.architectural;
    const usedPatterns = Object.entries(archPatterns).filter(([_, count]) => count > 0);

    if (usedPatterns.length > 2) {
      issues.push({
        severity: 'medium',
        type: 'mixed_architecture',
        message: `Multiple architectural patterns detected: ${usedPatterns.map(([p]) => p).join(', ')}`,
        suggestion: 'Consider sticking to a single architectural pattern for consistency',
      });
    }

    // Check for incomplete pattern implementation
    if (archPatterns.mvc > 0) {
      const hasController = archPatterns.mvc > 0 && code.includes('Controller');
      const hasModel = code.includes('Model');
      const hasView = code.includes('View');

      if (hasController && (!hasModel || !hasView)) {
        issues.push({
          severity: 'medium',
          type: 'incomplete_pattern',
          message: 'Incomplete MVC pattern implementation',
          suggestion: 'Ensure all MVC components (Model, View, Controller) are properly implemented',
        });
      }
    }

    return issues;
  }

  checkStyleConsistency(code, patterns) {
    const issues = [];
    const style = patterns.style;

    // Check import style consistency
    if (style.imports) {
      const es6Imports = style.imports.es6 || 0;
      const commonjsImports = style.imports.commonjs || 0;

      if (es6Imports > 0 && commonjsImports > 0) {
        issues.push({
          severity: 'low',
          type: 'inconsistent_imports',
          message: 'Mixed import styles detected (ES6 and CommonJS)',
          suggestion: 'Use consistent import style throughout the file',
        });
      }
    }

    // Check function style consistency
    if (style.functions) {
      const arrowFunctions = style.functions.arrow || 0;
      const traditionalFunctions = style.functions.traditional || 0;

      if (arrowFunctions > 0 && traditionalFunctions > 0) {
        const ratio = arrowFunctions / (arrowFunctions + traditionalFunctions);
        if (ratio > 0.2 && ratio < 0.8) { // Mixed usage
          issues.push({
            severity: 'low',
            type: 'inconsistent_functions',
            message: 'Mixed function declaration styles',
            suggestion: 'Consider using consistent function declaration style',
          });
        }
      }
    }

    return issues;
  }

  checkAntiPatterns(code) {
    const issues = [];

    // Check for god classes
    const godClassMatches = this.findPatterns(code, [this.antiPatterns.godClass]);
    godClassMatches.forEach(match => {
      issues.push({
        severity: 'high',
        type: 'god_class',
        message: 'Very large class detected (potential God Class anti-pattern)',
        line: match.line,
        suggestion: 'Break down large classes into smaller, focused classes',
      });
    });

    // Check for long parameter lists
    const longParamMatches = this.findPatterns(code, [this.antiPatterns.longParameterList]);
    longParamMatches.forEach(match => {
      issues.push({
        severity: 'medium',
        type: 'long_parameter_list',
        message: 'Function with very long parameter list',
        line: match.line,
        suggestion: 'Use parameter objects or builder pattern to reduce parameter count',
      });
    });

    // Check for deep nesting
    const deepNestingMatches = this.findPatterns(code, [this.antiPatterns.deepNesting]);
    deepNestingMatches.forEach(match => {
      issues.push({
        severity: 'medium',
        type: 'deep_nesting',
        message: 'Deep nesting detected (5+ levels)',
        line: match.line,
        suggestion: 'Extract methods or use early returns to reduce nesting',
      });
    });

    // Check for duplicate code patterns
    const duplicateIssues = this.checkDuplicateCode(code);
    issues.push(...duplicateIssues);

    return issues;
  }

  checkDuplicateCode(code) {
    const issues = [];
    const lines = code.split('\n');
    const lineGroups = {};

    // Group similar lines (simplified duplicate detection)
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.length > 20) { // Only check substantial lines
        const normalized = trimmed.replace(/\s+/g, ' ').replace(/['"]/g, '');
        if (!lineGroups[normalized]) {
          lineGroups[normalized] = [];
        }
        lineGroups[normalized].push(index + 1);
      }
    });

    // Find duplicates
    Object.entries(lineGroups).forEach(([line, lineNumbers]) => {
      if (lineNumbers.length > 1) {
        issues.push({
          severity: 'low',
          type: 'duplicate_code',
          message: `Duplicate code detected on lines: ${lineNumbers.join(', ')}`,
          suggestion: 'Extract common code into a reusable function or constant',
        });
      }
    });

    return issues;
  }

  async checkLearnedPatterns(code, extractedPatterns) {
    const issues = [];
    
    // This would normally check against patterns stored in the database
    // For now, we'll implement basic pattern matching
    
    // Check for common good patterns
    const hasErrorHandling = code.includes('try') && code.includes('catch');
    const hasInputValidation = /validate|sanitize|check/i.test(code);
    const hasLogging = /console\.|logger\.|log\./i.test(code);

    if (!hasErrorHandling && code.includes('async')) {
      issues.push({
        severity: 'medium',
        type: 'missing_pattern',
        message: 'Async function without error handling',
        suggestion: 'Add try-catch blocks for async operations',
      });
    }

    if (code.includes('req.') && !hasInputValidation) {
      issues.push({
        severity: 'medium',
        type: 'missing_pattern',
        message: 'Request handling without input validation',
        suggestion: 'Add input validation for request parameters',
      });
    }

    return issues;
  }

  checkBestPractices(code) {
    let bonus = 0;

    // Check SOLID principles
    this.bestPractices.solidPrinciples.forEach(pattern => {
      const matches = code.match(pattern) || [];
      bonus += matches.length * 2;
    });

    // Check DRY principle
    this.bestPractices.dryPrinciple.forEach(pattern => {
      const matches = code.match(pattern) || [];
      bonus += matches.length * 1;
    });

    // Check testability
    this.bestPractices.testability.forEach(pattern => {
      const matches = code.match(pattern) || [];
      bonus += matches.length * 3;
    });

    return Math.min(bonus, 15); // Cap bonus at 15 points
  }

  calculateConsistencyBonus(patterns) {
    let bonus = 0;

    // Bonus for consistent import style
    const imports = patterns.style.imports || {};
    const totalImports = Object.values(imports).reduce((sum, count) => sum + count, 0);
    if (totalImports > 0) {
      const maxImportStyle = Math.max(...Object.values(imports));
      const consistency = maxImportStyle / totalImports;
      if (consistency > 0.8) bonus += 3;
    }

    // Bonus for consistent function style
    const functions = patterns.style.functions || {};
    const totalFunctions = Object.values(functions).reduce((sum, count) => sum + count, 0);
    if (totalFunctions > 0) {
      const maxFunctionStyle = Math.max(...Object.values(functions));
      const consistency = maxFunctionStyle / totalFunctions;
      if (consistency > 0.8) bonus += 3;
    }

    return bonus;
  }

  calculatePatternConfidence(code, context, patterns) {
    let confidence = this.calculateConfidence(code, context);

    // Increase confidence for files with clear patterns
    const totalPatterns = Object.values(patterns.architectural).reduce((sum, count) => sum + count, 0);
    if (totalPatterns > 0) confidence += 0.1;

    // Increase confidence for structured code
    if (patterns.structure.classes > 0 || patterns.structure.functions > 0) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  generateReasoning(issues, patterns, bonus) {
    const severityCounts = {
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
    };

    let reasoning = 'Pattern analysis completed. ';

    // Report architectural patterns
    const archPatterns = Object.entries(patterns.architectural)
      .filter(([_, count]) => count > 0)
      .map(([pattern]) => pattern);
    
    if (archPatterns.length > 0) {
      reasoning += `Detected patterns: ${archPatterns.join(', ')}. `;
    }

    if (severityCounts.high > 0) {
      reasoning += `Found ${severityCounts.high} high-priority pattern issue(s). `;
    }
    if (severityCounts.medium > 0) {
      reasoning += `Found ${severityCounts.medium} medium-priority pattern issue(s). `;
    }
    if (severityCounts.low > 0) {
      reasoning += `Found ${severityCounts.low} low-priority pattern issue(s). `;
    }

    if (bonus > 0) {
      reasoning += `Bonus points for good patterns and consistency (+${bonus}). `;
    }

    if (issues.length === 0) {
      reasoning += 'Code follows consistent patterns and best practices. ';
    }

    return reasoning;
  }

  // Method to learn from approved/rejected code (will be called by learning engine)
  async learnFromFeedback(code, patterns, wasApproved) {
    if (wasApproved) {
      this.learnedPatterns.good.push({
        patterns,
        code: code.substring(0, 200), // Store snippet
        timestamp: new Date().toISOString(),
      });
    } else {
      this.learnedPatterns.bad.push({
        patterns,
        code: code.substring(0, 200),
        timestamp: new Date().toISOString(),
      });
    }

    // In a real implementation, this would save to database
    // await this.storage.saveLearnedPattern(patterns, wasApproved);
  }
}

module.exports = { PatternAgent };