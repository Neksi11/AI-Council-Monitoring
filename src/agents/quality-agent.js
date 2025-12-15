/**
 * QualityAgent - Analyzes code quality, readability, and maintainability
 */

const { BaseAgent } = require('./base-agent');

class QualityAgent extends BaseAgent {
  constructor() {
    super('Quality', 0.20);
    
    // Code quality patterns and thresholds
    this.thresholds = {
      maxFunctionLength: 50,
      maxLineLength: 120,
      maxCyclomaticComplexity: 10,
      maxNestingDepth: 4,
      minCommentRatio: 0.1,
    };

    // Code smells patterns
    this.codeSmells = {
      longMethods: /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/g,
      magicNumbers: /\b(?!0|1|2|10|100|1000)\d{2,}\b/g,
      duplicatedCode: [], // Will be populated during analysis
      deepNesting: /\{\s*[\s\S]*?\{\s*[\s\S]*?\{\s*[\s\S]*?\{\s*[\s\S]*?\{/g,
      longParameterList: /function\s+\w+\s*\(([^)]{50,})\)/g,
    };

    // Naming convention patterns
    this.namingPatterns = {
      camelCase: /^[a-z][a-zA-Z0-9]*$/,
      PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
      snake_case: /^[a-z][a-z0-9_]*$/,
      CONSTANT_CASE: /^[A-Z][A-Z0-9_]*$/,
    };

    // Good practices patterns
    this.goodPractices = {
      descriptiveNames: /^(get|set|is|has|can|should|will|create|update|delete|find|search|validate|calculate|process|handle|manage|init|start|stop|open|close|load|save|parse|format|convert|transform|filter|sort|map|reduce)[A-Z]/,
      singleResponsibility: /^(class|function)\s+\w+/gm,
      errorHandling: /(try\s*\{|catch\s*\(|throw\s+|\.catch\()/g,
      documentation: /(\/\*\*[\s\S]*?\*\/|\/\/.*)/g,
    };
  }

  async analyze(code, context) {
    const startTime = Date.now();
    let score = 100;
    const issues = [];

    try {
      // Calculate basic metrics
      const metrics = this.calculateMetrics(code);
      
      // Check function length
      const functionLengthIssues = this.checkFunctionLength(code);
      issues.push(...functionLengthIssues);
      score -= functionLengthIssues.length * 5;

      // Check line length
      const lineLengthIssues = this.checkLineLength(code);
      issues.push(...lineLengthIssues);
      score -= lineLengthIssues.length * 2;

      // Check cyclomatic complexity
      const complexityIssues = this.checkCyclomaticComplexity(code);
      issues.push(...complexityIssues);
      score -= complexityIssues.length * 8;

      // Check nesting depth
      const nestingIssues = this.checkNestingDepth(code);
      issues.push(...nestingIssues);
      score -= nestingIssues.length * 6;

      // Check naming conventions
      const namingIssues = this.checkNamingConventions(code);
      issues.push(...namingIssues);
      score -= namingIssues.length * 4;

      // Check for code smells
      const codeSmellIssues = this.checkCodeSmells(code);
      issues.push(...codeSmellIssues);
      score -= codeSmellIssues.length * 6;

      // Check documentation quality
      const docIssues = this.checkDocumentation(code);
      issues.push(...docIssues);
      score -= docIssues.length * 3;

      // Bonus for good practices
      const goodPracticeBonus = this.checkGoodPractices(code);
      score += goodPracticeBonus;

      const confidence = this.calculateQualityConfidence(code, context, metrics);
      const reasoning = this.generateReasoning(issues, metrics, goodPracticeBonus);

      const result = this.createResult(score, issues, reasoning, confidence);
      result.executionTime = Date.now() - startTime;
      result.metrics = metrics;

      return result;

    } catch (error) {
      return this.createResult(50, [{
        severity: 'medium',
        type: 'analysis_error',
        message: `Quality analysis failed: ${error.message}`,
      }], 'Analysis encountered an error', 0.1);
    }
  }

  calculateMetrics(code) {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const commentLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
    });

    // Count functions
    const functionMatches = code.match(/function\s+\w+|=>\s*\{|:\s*function/g) || [];
    const functionCount = functionMatches.length;

    // Count classes
    const classMatches = code.match(/class\s+\w+/g) || [];
    const classCount = classMatches.length;

    // Calculate average line length
    const avgLineLength = nonEmptyLines.reduce((sum, line) => sum + line.length, 0) / nonEmptyLines.length || 0;

    // Calculate comment ratio
    const commentRatio = commentLines.length / lines.length;

    return {
      totalLines: lines.length,
      codeLines: nonEmptyLines.length,
      commentLines: commentLines.length,
      commentRatio,
      functionCount,
      classCount,
      avgLineLength,
      longestLine: Math.max(...lines.map(line => line.length)),
    };
  }

  checkFunctionLength(code) {
    const issues = [];
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;
    let match;

    while ((match = functionRegex.exec(code)) !== null) {
      const functionName = match[1];
      const functionBody = match[2];
      const lineCount = functionBody.split('\n').length;

      if (lineCount > this.thresholds.maxFunctionLength) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        issues.push({
          severity: 'medium',
          type: 'function_length',
          message: `Function '${functionName}' is too long (${lineCount} lines)`,
          line: lineNumber,
          suggestion: `Consider breaking down into smaller functions (max ${this.thresholds.maxFunctionLength} lines)`,
        });
      }
    }

    return issues;
  }

  checkLineLength(code) {
    const issues = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      if (line.length > this.thresholds.maxLineLength) {
        issues.push({
          severity: 'low',
          type: 'line_length',
          message: `Line too long (${line.length} characters)`,
          line: index + 1,
          suggestion: `Keep lines under ${this.thresholds.maxLineLength} characters`,
        });
      }
    });

    return issues;
  }

  checkCyclomaticComplexity(code) {
    const issues = [];
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?'];
    
    // Simple function extraction
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;
    let match;

    while ((match = functionRegex.exec(code)) !== null) {
      const functionName = match[1];
      const functionBody = match[2];
      
      let complexity = 1; // Base complexity
      complexityKeywords.forEach(keyword => {
        const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'g');
        const matches = functionBody.match(keywordRegex) || [];
        complexity += matches.length;
      });

      if (complexity > this.thresholds.maxCyclomaticComplexity) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        issues.push({
          severity: 'medium',
          type: 'cyclomatic_complexity',
          message: `Function '${functionName}' has high complexity (${complexity})`,
          line: lineNumber,
          suggestion: `Reduce complexity by extracting methods or simplifying logic (max ${this.thresholds.maxCyclomaticComplexity})`,
        });
      }
    }

    return issues;
  }

  checkNestingDepth(code) {
    const issues = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      let depth = 0;
      let inString = false;
      let stringChar = null;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (!inString && (char === '"' || char === "'")) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && line[i-1] !== '\\') {
          inString = false;
          stringChar = null;
        } else if (!inString) {
          if (char === '{' || char === '(') depth++;
          else if (char === '}' || char === ')') depth--;
        }
      }

      if (depth > this.thresholds.maxNestingDepth) {
        issues.push({
          severity: 'medium',
          type: 'nesting_depth',
          message: `Excessive nesting depth (${depth} levels)`,
          line: index + 1,
          suggestion: `Reduce nesting by extracting methods or using early returns (max ${this.thresholds.maxNestingDepth} levels)`,
        });
      }
    });

    return issues;
  }

  checkNamingConventions(code) {
    const issues = [];
    
    // Check variable names
    const variableRegex = /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match;

    while ((match = variableRegex.exec(code)) !== null) {
      const variableName = match[1];
      const lineNumber = code.substring(0, match.index).split('\n').length;

      if (!this.namingPatterns.camelCase.test(variableName) && 
          !this.namingPatterns.CONSTANT_CASE.test(variableName)) {
        issues.push({
          severity: 'low',
          type: 'naming_convention',
          message: `Variable '${variableName}' doesn't follow naming conventions`,
          line: lineNumber,
          suggestion: 'Use camelCase for variables or CONSTANT_CASE for constants',
        });
      }
    }

    // Check function names
    const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    while ((match = functionRegex.exec(code)) !== null) {
      const functionName = match[1];
      const lineNumber = code.substring(0, match.index).split('\n').length;

      if (!this.namingPatterns.camelCase.test(functionName)) {
        issues.push({
          severity: 'low',
          type: 'naming_convention',
          message: `Function '${functionName}' should use camelCase`,
          line: lineNumber,
          suggestion: 'Use camelCase for function names',
        });
      }
    }

    return issues;
  }

  checkCodeSmells(code) {
    const issues = [];

    // Check for magic numbers
    const magicNumberMatches = this.findPatterns(code, [this.codeSmells.magicNumbers]);
    magicNumberMatches.forEach(match => {
      issues.push({
        severity: 'low',
        type: 'magic_number',
        message: `Magic number detected: ${match.match}`,
        line: match.line,
        suggestion: 'Replace magic numbers with named constants',
      });
    });

    // Check for long parameter lists
    const longParamMatches = this.findPatterns(code, [this.codeSmells.longParameterList]);
    longParamMatches.forEach(match => {
      issues.push({
        severity: 'medium',
        type: 'long_parameter_list',
        message: 'Function has too many parameters',
        line: match.line,
        suggestion: 'Consider using an options object or breaking down the function',
      });
    });

    return issues;
  }

  checkDocumentation(code) {
    const issues = [];
    const metrics = this.calculateMetrics(code);

    // Check comment ratio
    if (metrics.commentRatio < this.thresholds.minCommentRatio) {
      issues.push({
        severity: 'low',
        type: 'documentation',
        message: `Low comment ratio (${(metrics.commentRatio * 100).toFixed(1)}%)`,
        suggestion: `Add more comments and documentation (target: ${(this.thresholds.minCommentRatio * 100)}%+)`,
      });
    }

    // Check for function documentation
    const functionRegex = /function\s+(\w+)/g;
    const docRegex = /\/\*\*[\s\S]*?\*\//g;
    
    const functions = [...code.matchAll(functionRegex)];
    const docs = [...code.matchAll(docRegex)];

    if (functions.length > 0 && docs.length === 0) {
      issues.push({
        severity: 'medium',
        type: 'documentation',
        message: 'Functions lack JSDoc documentation',
        suggestion: 'Add JSDoc comments to describe function parameters and return values',
      });
    }

    return issues;
  }

  checkGoodPractices(code) {
    let bonus = 0;

    // Check for descriptive naming
    const descriptiveNames = this.findPatterns(code, [this.goodPractices.descriptiveNames]);
    bonus += descriptiveNames.length * 2;

    // Check for error handling
    const errorHandling = this.findPatterns(code, [this.goodPractices.errorHandling]);
    bonus += errorHandling.length * 3;

    // Check for documentation
    const documentation = this.findPatterns(code, [this.goodPractices.documentation]);
    bonus += Math.min(documentation.length, 10) * 1; // Cap documentation bonus

    return Math.min(bonus, 15); // Cap total bonus at 15 points
  }

  calculateQualityConfidence(code, context, metrics) {
    let confidence = this.calculateConfidence(code, context);

    // Increase confidence for well-structured code
    if (metrics.commentRatio > 0.15) confidence += 0.1;
    if (metrics.avgLineLength < 80) confidence += 0.1;
    if (metrics.functionCount > 0) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  generateReasoning(issues, metrics, bonus) {
    const severityCounts = {
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
    };

    let reasoning = 'Code quality analysis completed. ';

    if (severityCounts.high > 0) {
      reasoning += `Found ${severityCounts.high} high-priority quality issue(s). `;
    }
    if (severityCounts.medium > 0) {
      reasoning += `Found ${severityCounts.medium} medium-priority quality issue(s). `;
    }
    if (severityCounts.low > 0) {
      reasoning += `Found ${severityCounts.low} low-priority quality issue(s). `;
    }

    reasoning += `Code metrics: ${metrics.functionCount} functions, ${metrics.codeLines} lines of code, ${(metrics.commentRatio * 100).toFixed(1)}% comments. `;

    if (bonus > 0) {
      reasoning += `Bonus points for good practices (+${bonus}). `;
    }

    if (issues.length === 0) {
      reasoning += 'Code follows good quality practices. ';
    }

    return reasoning;
  }
}

module.exports = { QualityAgent };