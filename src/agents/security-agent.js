/**
 * SecurityAgent - Analyzes code for security vulnerabilities
 */

const { BaseAgent } = require('./base-agent');

class SecurityAgent extends BaseAgent {
  constructor() {
    super('Security', 0.25);
    
    // Security vulnerability patterns
    this.vulnerabilityPatterns = {
      sqlInjection: [
        /query\s*\+\s*['"]/gi,
        /execute\s*\(\s*['"]/gi,
        /\$\{.*\}/g, // Template literals in SQL
        /['"].*\+.*['"].*WHERE/gi,
      ],
      xss: [
        /innerHTML\s*=\s*[^;]+$/gm,
        /document\.write\s*\(/gi,
        /eval\s*\(/gi,
        /dangerouslySetInnerHTML/gi,
      ],
      authentication: [
        /password\s*==\s*['"]/gi,
        /auth\s*=\s*true/gi,
        /token\s*=\s*['"]/gi,
        /hardcoded.*password/gi,
      ],
      inputValidation: [
        /req\.body\./g,
        /req\.params\./g,
        /req\.query\./g,
        /process\.argv/g,
      ],
      cryptography: [
        /md5\s*\(/gi,
        /sha1\s*\(/gi,
        /Math\.random\s*\(/gi, // Weak random
        /crypto\.createHash\s*\(\s*['"]md5['"]/gi,
      ],
      fileSystem: [
        /fs\.readFile\s*\(\s*req\./gi,
        /path\.join\s*\(\s*req\./gi,
        /\.\.\/\.\.\//g, // Path traversal
        /exec\s*\(\s*req\./gi,
      ],
    };

    // Security best practices
    this.bestPractices = {
      parameterizedQueries: [
        /\$1|\$2|\$3/g, // PostgreSQL parameters
        /\?\s*,\s*\?/g, // MySQL parameters
        /prepare\s*\(/gi,
      ],
      inputSanitization: [
        /validator\./gi,
        /sanitize/gi,
        /escape/gi,
        /trim\s*\(/gi,
      ],
      authentication: [
        /bcrypt/gi,
        /jwt\./gi,
        /passport/gi,
        /authenticate/gi,
      ],
    };
  }

  async analyze(code, context) {
    const startTime = Date.now();
    let score = 100;
    const issues = [];
    const findings = [];

    try {
      // Check for SQL injection vulnerabilities
      const sqlInjectionIssues = this.checkSQLInjection(code);
      issues.push(...sqlInjectionIssues);
      score -= sqlInjectionIssues.length * 15;

      // Check for XSS vulnerabilities
      const xssIssues = this.checkXSS(code);
      issues.push(...xssIssues);
      score -= xssIssues.length * 12;

      // Check authentication issues
      const authIssues = this.checkAuthentication(code);
      issues.push(...authIssues);
      score -= authIssues.length * 10;

      // Check input validation
      const inputIssues = this.checkInputValidation(code);
      issues.push(...inputIssues);
      score -= inputIssues.length * 8;

      // Check cryptography usage
      const cryptoIssues = this.checkCryptography(code);
      issues.push(...cryptoIssues);
      score -= cryptoIssues.length * 10;

      // Check file system security
      const fsIssues = this.checkFileSystemSecurity(code);
      issues.push(...fsIssues);
      score -= fsIssues.length * 12;

      // Bonus points for security best practices
      const bestPracticeBonus = this.checkBestPractices(code);
      score += bestPracticeBonus;

      // Calculate confidence based on code characteristics
      const confidence = this.calculateSecurityConfidence(code, context);

      const reasoning = this.generateReasoning(issues, bestPracticeBonus);

      const result = this.createResult(score, issues, reasoning, confidence);
      result.executionTime = Date.now() - startTime;

      return result;

    } catch (error) {
      return this.createResult(50, [{
        severity: 'high',
        type: 'analysis_error',
        message: `Security analysis failed: ${error.message}`,
      }], 'Analysis encountered an error', 0.1);
    }
  }

  checkSQLInjection(code) {
    const issues = [];
    const patterns = this.vulnerabilityPatterns.sqlInjection;
    
    patterns.forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      matches.forEach(match => {
        issues.push({
          severity: 'high',
          type: 'sql_injection',
          message: 'Potential SQL injection vulnerability detected',
          line: match.line,
          column: match.column,
          suggestion: 'Use parameterized queries or prepared statements',
          context: match.context,
        });
      });
    });

    return issues;
  }

  checkXSS(code) {
    const issues = [];
    const patterns = this.vulnerabilityPatterns.xss;
    
    patterns.forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      matches.forEach(match => {
        issues.push({
          severity: 'high',
          type: 'xss',
          message: 'Potential XSS vulnerability detected',
          line: match.line,
          column: match.column,
          suggestion: 'Sanitize user input and use safe DOM manipulation methods',
          context: match.context,
        });
      });
    });

    return issues;
  }

  checkAuthentication(code) {
    const issues = [];
    const patterns = this.vulnerabilityPatterns.authentication;
    
    patterns.forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      matches.forEach(match => {
        issues.push({
          severity: 'medium',
          type: 'authentication',
          message: 'Potential authentication vulnerability detected',
          line: match.line,
          column: match.column,
          suggestion: 'Use secure authentication methods and avoid hardcoded credentials',
          context: match.context,
        });
      });
    });

    return issues;
  }

  checkInputValidation(code) {
    const issues = [];
    const inputPatterns = this.vulnerabilityPatterns.inputValidation;
    
    // Check for unvalidated input usage
    inputPatterns.forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      matches.forEach(match => {
        // Check if there's validation nearby (simple heuristic)
        const codeLines = code.split('\n');
        const lineIndex = match.line - 1;
        const contextLines = codeLines.slice(Math.max(0, lineIndex - 2), lineIndex + 3);
        const hasValidation = contextLines.some(line => 
          /validate|sanitize|check|verify|trim|escape/i.test(line)
        );

        if (!hasValidation) {
          issues.push({
            severity: 'medium',
            type: 'input_validation',
            message: 'Unvalidated user input detected',
            line: match.line,
            column: match.column,
            suggestion: 'Validate and sanitize all user inputs',
            context: match.context,
          });
        }
      });
    });

    return issues;
  }

  checkCryptography(code) {
    const issues = [];
    const patterns = this.vulnerabilityPatterns.cryptography;
    
    patterns.forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      matches.forEach(match => {
        let severity = 'medium';
        let message = 'Weak cryptographic practice detected';
        
        if (pattern.source.includes('md5') || pattern.source.includes('sha1')) {
          severity = 'high';
          message = 'Weak hashing algorithm detected (MD5/SHA1)';
        } else if (pattern.source.includes('Math.random')) {
          severity = 'medium';
          message = 'Weak random number generation detected';
        }

        issues.push({
          severity,
          type: 'cryptography',
          message,
          line: match.line,
          column: match.column,
          suggestion: 'Use strong cryptographic algorithms (SHA-256, bcrypt, crypto.randomBytes)',
          context: match.context,
        });
      });
    });

    return issues;
  }

  checkFileSystemSecurity(code) {
    const issues = [];
    const patterns = this.vulnerabilityPatterns.fileSystem;
    
    patterns.forEach(pattern => {
      const matches = this.findPatterns(code, [pattern]);
      matches.forEach(match => {
        issues.push({
          severity: 'high',
          type: 'file_system',
          message: 'Potential file system vulnerability detected',
          line: match.line,
          column: match.column,
          suggestion: 'Validate file paths and avoid user-controlled file operations',
          context: match.context,
        });
      });
    });

    return issues;
  }

  checkBestPractices(code) {
    let bonus = 0;
    
    Object.entries(this.bestPractices).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        const matches = this.findPatterns(code, [pattern]);
        bonus += matches.length * 2; // 2 points per best practice
      });
    });

    return Math.min(bonus, 20); // Cap bonus at 20 points
  }

  calculateSecurityConfidence(code, context) {
    let confidence = this.calculateConfidence(code, context);
    
    // Increase confidence for security-related files
    if (context.filePath) {
      const securityFiles = ['auth', 'security', 'crypto', 'login', 'password'];
      if (securityFiles.some(keyword => context.filePath.toLowerCase().includes(keyword))) {
        confidence += 0.2;
      }
    }

    // Increase confidence for files with security imports
    const securityImports = ['bcrypt', 'crypto', 'helmet', 'express-validator'];
    if (securityImports.some(lib => code.includes(lib))) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  generateReasoning(issues, bestPracticeBonus) {
    const highSeverityCount = issues.filter(i => i.severity === 'high').length;
    const mediumSeverityCount = issues.filter(i => i.severity === 'medium').length;
    const lowSeverityCount = issues.filter(i => i.severity === 'low').length;

    let reasoning = 'Security analysis completed. ';

    if (highSeverityCount > 0) {
      reasoning += `Found ${highSeverityCount} high-severity security issue(s). `;
    }
    if (mediumSeverityCount > 0) {
      reasoning += `Found ${mediumSeverityCount} medium-severity security issue(s). `;
    }
    if (lowSeverityCount > 0) {
      reasoning += `Found ${lowSeverityCount} low-severity security issue(s). `;
    }

    if (bestPracticeBonus > 0) {
      reasoning += `Bonus points awarded for security best practices (+${bestPracticeBonus}). `;
    }

    if (issues.length === 0) {
      reasoning += 'No obvious security vulnerabilities detected. ';
    }

    reasoning += 'Consider implementing additional security measures and regular security audits.';

    return reasoning;
  }
}

module.exports = { SecurityAgent };