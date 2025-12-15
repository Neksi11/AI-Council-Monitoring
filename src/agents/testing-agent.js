/**
 * TestingAgent - Analyzes code for testability and testing best practices
 */

const { BaseAgent } = require('./base-agent');

class TestingAgent extends BaseAgent {
  constructor() {
    super('Testing', 0.15);
    
    // Testing framework patterns
    this.testingFrameworks = {
      jest: [
        /describe\s*\(/g,
        /it\s*\(/g,
        /test\s*\(/g,
        /expect\s*\(/g,
        /jest\./g,
      ],
      mocha: [
        /describe\s*\(/g,
        /it\s*\(/g,
        /before\s*\(/g,
        /after\s*\(/g,
        /chai\./g,
      ],
      jasmine: [
        /describe\s*\(/g,
        /it\s*\(/g,
        /spyOn\s*\(/g,
        /jasmine\./g,
      ],
      vitest: [
        /describe\s*\(/g,
        /it\s*\(/g,
        /vi\./g,
        /vitest/g,
      ],
    };

    // Testability indicators
    this.testabilityPatterns = {
      pureFunctions: [
        /function\s+\w+\s*\([^)]*\)\s*\{[^}]*return[^}]*\}/g,
        /const\s+\w+\s*=\s*\([^)]*\)\s*=>/g,
      ],
      dependency_injection: [
        /constructor\s*\([^)]*\w+[^)]*\)/g,
        /function\s+\w+\s*\([^)]*\w+[^)]*\)/g,
      ],
      mockable: [
        /interface\s+\w+/g,
        /abstract\s+class/g,
        /\.prototype\./g,
      ],
      errorHandling: [
        /try\s*\{[\s\S]*catch/g,
        /throw\s+/g,
        /\.catch\s*\(/g,
      ],
    };

    // Testing anti-patterns
    this.antiPatterns = {
      hardcodedValues: [
        /new\s+Date\s*\(/g,
        /Math\.random\s*\(/g,
        /Date\.now\s*\(/g,
        /process\.env\./g,
      ],
      globalState: [
        /global\./g,
        /window\./g,
        /document\./g,
        /localStorage/g,
        /sessionStorage/g,
      ],
      sideEffects: [
        /console\./g,
        /fs\./g,
        /fetch\s*\(/g,
        /XMLHttpRequest/g,
      ],
      tightCoupling: [
        /new\s+\w+\s*\(/g, // Direct instantiation
        /require\s*\(\s*['"]/g, // Direct requires
      ],
    };

    // Test quality patterns
    this.testQualityPatterns = {
      assertions: [
        /expect\s*\(/g,
        /assert\s*\(/g,
        /should\./g,
        /\.to\./g,
      ],
      mocking: [
        /mock/gi,
        /stub/gi,
        /spy/gi,
        /fake/gi,
      ],
      setup_teardown: [
        /beforeEach\s*\(/g,
        /afterEach\s*\(/g,
        /setUp/g,
        /tearDown/g,
      ],
      edgeCases: [
        /null/g,
        /undefined/g,
        /empty/gi,
        /invalid/gi,
        /error/gi,
      ],
    };
  }

  async analyze(code, context) {
    const startTime = Date.now();
    let score = 100;
    const issues = [];

    try {
      // Determine if this is a test file
      const isTestFile = this.isTestFile(context.filePath || '');

      if (isTestFile) {
        // Analyze test file quality
        const testQualityIssues = this.analyzeTestQuality(code);
        issues.push(...testQualityIssues);
        score -= testQualityIssues.length * 8;
      } else {
        // Analyze production code testability
        const testabilityIssues = this.analyzeTestability(code);
        issues.push(...testabilityIssues);
        score -= testabilityIssues.length * 6;
      }

      // Check for testing anti-patterns (applies to both)
      const antiPatternIssues = this.checkAntiPatterns(code);
      issues.push(...antiPatternIssues);
      score -= antiPatternIssues.length * 8;

      // Check error handling (important for testing)
      const errorHandlingIssues = this.checkErrorHandling(code);
      issues.push(...errorHandlingIssues);
      score -= errorHandlingIssues.length * 5;

      // Bonus for good testing practices
      const testingBonus = this.checkTestingBestPractices(code, isTestFile);
      score += testingBonus;

      const confidence = this.calculateTestingConfidence(code, context, isTestFile);
      const reasoning = this.generateReasoning(issues, isTestFile, testingBonus);

      const result = this.createResult(score, issues, reasoning, confidence);
      result.executionTime = Date.now() - startTime;
      result.isTestFile = isTestFile;

      return result;

    } catch (error) {
      return this.createResult(50, [{
        severity: 'medium',
        type: 'analysis_error',
        message: `Testing analysis failed: ${error.message}`,
      }], 'Analysis encountered an error', 0.1);
    }
  }

  isTestFile(filePath) {
    const testPatterns = [
      /\.test\./,
      /\.spec\./,
      /__tests__/,
      /test\//,
      /tests\//,
      /spec\//,
    ];
    
    return testPatterns.some(pattern => pattern.test(filePath));
  }

  analyzeTestQuality(code) {
    const issues = [];

    // Check for test structure
    const hasDescribe = /describe\s*\(/g.test(code);
    const hasIt = /it\s*\(/g.test(code);
    const hasTest = /test\s*\(/g.test(code);

    if (!hasDescribe && !hasTest) {
      issues.push({
        severity: 'high',
        type: 'test_structure',
        message: 'No test structure found (describe/test blocks)',
        suggestion: 'Organize tests using describe() and it()/test() blocks',
      });
    }

    if (!hasIt && !hasTest) {
      issues.push({
        severity: 'high',
        type: 'test_cases',
        message: 'No test cases found',
        suggestion: 'Add test cases using it() or test() functions',
      });
    }

    // Check for assertions
    const assertionPatterns = this.testQualityPatterns.assertions;
    let hasAssertions = false;
    assertionPatterns.forEach(pattern => {
      if (pattern.test(code)) {
        hasAssertions = true;
      }
    });

    if (!hasAssertions) {
      issues.push({
        severity: 'high',
        type: 'no_assertions',
        message: 'No assertions found in test file',
        suggestion: 'Add assertions using expect(), assert(), or similar',
      });
    }

    // Check for test isolation
    const hasSetup = /beforeEach|setUp/g.test(code);
    const hasTeardown = /afterEach|tearDown/g.test(code);
    const hasGlobalState = this.antiPatterns.globalState.some(pattern => pattern.test(code));

    if (hasGlobalState && !hasSetup && !hasTeardown) {
      issues.push({
        severity: 'medium',
        type: 'test_isolation',
        message: 'Tests may not be properly isolated',
        suggestion: 'Use beforeEach/afterEach for test setup and cleanup',
      });
    }

    // Check for descriptive test names
    const testNameRegex = /(it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = testNameRegex.exec(code)) !== null) {
      const testName = match[2];
      if (testName.length < 10 || !/should|when|given|expect/i.test(testName)) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        issues.push({
          severity: 'low',
          type: 'test_naming',
          message: `Test name could be more descriptive: "${testName}"`,
          line: lineNumber,
          suggestion: 'Use descriptive test names that explain what should happen',
        });
      }
    }

    return issues;
  }

  analyzeTestability(code) {
    const issues = [];

    // Check for pure functions
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;
    let match;
    let pureFunctionCount = 0;
    let totalFunctionCount = 0;

    while ((match = functionRegex.exec(code)) !== null) {
      totalFunctionCount++;
      const functionName = match[1];
      const functionBody = match[2];
      
      // Simple heuristic for pure functions
      const hasSideEffects = this.antiPatterns.sideEffects.some(pattern => pattern.test(functionBody));
      const hasReturn = /return\s+/.test(functionBody);
      
      if (!hasSideEffects && hasReturn) {
        pureFunctionCount++;
      } else if (hasSideEffects) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        issues.push({
          severity: 'medium',
          type: 'side_effects',
          message: `Function '${functionName}' has side effects, reducing testability`,
          line: lineNumber,
          suggestion: 'Extract side effects or use dependency injection for better testability',
        });
      }
    }

    // Check testability ratio
    if (totalFunctionCount > 0) {
      const pureRatio = pureFunctionCount / totalFunctionCount;
      if (pureRatio < 0.3) {
        issues.push({
          severity: 'medium',
          type: 'low_testability',
          message: `Low ratio of pure functions (${Math.round(pureRatio * 100)}%)`,
          suggestion: 'Increase the number of pure functions for better testability',
        });
      }
    }

    // Check for dependency injection
    const hasConstructorInjection = /constructor\s*\([^)]+\)/g.test(code);
    const hasParameterInjection = /function\s+\w+\s*\([^)]+\)/g.test(code);
    const hasDirectInstantiation = /new\s+\w+\s*\(/g.test(code);

    if (hasDirectInstantiation && !hasConstructorInjection && !hasParameterInjection) {
      issues.push({
        severity: 'medium',
        type: 'tight_coupling',
        message: 'Direct instantiation detected without dependency injection',
        suggestion: 'Use dependency injection for better testability and mocking',
      });
    }

    return issues;
  }

  checkAntiPatterns(code) {
    const issues = [];

    // Check for hardcoded values
    this.antiPatterns.hardcodedValues.forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      matches.forEach(match => {
        let message = 'Hardcoded value detected';
        let suggestion = 'Make value configurable or injectable';

        if (pattern.source.includes('Date')) {
          message = 'Hardcoded date/time detected';
          suggestion = 'Inject date/time dependencies for testability';
        } else if (pattern.source.includes('random')) {
          message = 'Random value generation detected';
          suggestion = 'Inject random number generator for predictable tests';
        }

        issues.push({
          severity: 'medium',
          type: 'hardcoded_value',
          message,
          line: match.line,
          suggestion,
        });
      });
    });

    // Check for global state access
    this.antiPatterns.globalState.forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      matches.forEach(match => {
        issues.push({
          severity: 'medium',
          type: 'global_state',
          message: 'Global state access detected',
          line: match.line,
          suggestion: 'Avoid global state or make it injectable for testing',
        });
      });
    });

    return issues;
  }

  checkErrorHandling(code) {
    const issues = [];

    // Check for async functions without error handling
    const asyncFunctionRegex = /async\s+function\s+(\w+)|const\s+(\w+)\s*=\s*async/g;
    let match;

    while ((match = asyncFunctionRegex.exec(code)) !== null) {
      const functionName = match[1] || match[2];
      const functionStart = match.index;
      
      // Look for try-catch in the function
      const restOfCode = code.substring(functionStart);
      const functionEnd = this.findFunctionEnd(restOfCode);
      const functionBody = restOfCode.substring(0, functionEnd);

      if (!functionBody.includes('try') || !functionBody.includes('catch')) {
        const lineNumber = code.substring(0, functionStart).split('\n').length;
        issues.push({
          severity: 'medium',
          type: 'missing_error_handling',
          message: `Async function '${functionName}' lacks error handling`,
          line: lineNumber,
          suggestion: 'Add try-catch blocks for async operations',
        });
      }
    }

    return issues;
  }

  findFunctionEnd(code) {
    let braceCount = 0;
    let inFunction = false;
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      
      if (char === '{') {
        braceCount++;
        inFunction = true;
      } else if (char === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
          return i + 1;
        }
      }
    }
    
    return code.length;
  }

  checkTestingBestPractices(code, isTestFile) {
    let bonus = 0;

    if (isTestFile) {
      // Bonus for test file best practices
      
      // Check for mocking
      this.testQualityPatterns.mocking.forEach(pattern => {
        const matches = code.match(pattern) || [];
        bonus += matches.length * 2;
      });

      // Check for setup/teardown
      this.testQualityPatterns.setup_teardown.forEach(pattern => {
        const matches = code.match(pattern) || [];
        bonus += matches.length * 3;
      });

      // Check for edge case testing
      this.testQualityPatterns.edgeCases.forEach(pattern => {
        const matches = code.match(pattern) || [];
        bonus += Math.min(matches.length, 5) * 1; // Cap edge case bonus
      });

    } else {
      // Bonus for production code testability
      
      // Check for pure functions
      this.testabilityPatterns.pureFunctions.forEach(pattern => {
        const matches = code.match(pattern) || [];
        bonus += matches.length * 2;
      });

      // Check for dependency injection
      this.testabilityPatterns.dependency_injection.forEach(pattern => {
        const matches = code.match(pattern) || [];
        bonus += matches.length * 1;
      });

      // Check for error handling
      this.testabilityPatterns.errorHandling.forEach(pattern => {
        const matches = code.match(pattern) || [];
        bonus += matches.length * 1;
      });
    }

    return Math.min(bonus, 20); // Cap bonus at 20 points
  }

  calculateTestingConfidence(code, context, isTestFile) {
    let confidence = this.calculateConfidence(code, context);

    // Increase confidence for test files
    if (isTestFile) {
      confidence += 0.2;
    }

    // Increase confidence for files with testing imports
    const testingImports = ['jest', 'mocha', 'chai', 'sinon', 'vitest'];
    if (testingImports.some(lib => code.includes(lib))) {
      confidence += 0.1;
    }

    // Increase confidence for structured code
    if (code.includes('describe') || code.includes('test') || code.includes('it')) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  generateReasoning(issues, isTestFile, bonus) {
    const severityCounts = {
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
    };

    let reasoning = isTestFile ? 'Test quality analysis completed. ' : 'Testability analysis completed. ';

    if (severityCounts.high > 0) {
      reasoning += `Found ${severityCounts.high} high-priority testing issue(s). `;
    }
    if (severityCounts.medium > 0) {
      reasoning += `Found ${severityCounts.medium} medium-priority testing issue(s). `;
    }
    if (severityCounts.low > 0) {
      reasoning += `Found ${severityCounts.low} low-priority testing issue(s). `;
    }

    if (bonus > 0) {
      reasoning += `Bonus points for testing best practices (+${bonus}). `;
    }

    if (issues.length === 0) {
      reasoning += isTestFile ? 
        'Test file follows good testing practices. ' : 
        'Code is well-structured for testing. ';
    }

    if (!isTestFile) {
      reasoning += 'Consider adding comprehensive tests for this code. ';
    }

    return reasoning;
  }
}

module.exports = { TestingAgent };