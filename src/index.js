#!/usr/bin/env node

/**
 * AI-COUNCIL - Main Entry Point
 * AI Code Assurance System with Intelligent Agent Council
 */

const { CouncilOrchestrator } = require('./council/orchestrator');
const { FileWatcher } = require('./capture/file-watcher');
const { PatternStore } = require('./storage/pattern-store');
const { HubStorage } = require('./storage/hub-storage');
const { ConfigManager } = require('./config/config-manager');

// Optional: Supabase for cloud storage
let SupabaseClient;
try {
  SupabaseClient = require('./storage/supabase-client').SupabaseClient;
} catch (e) {
  SupabaseClient = null;
}

class AICouncil {
  constructor(config = {}) {
    this.configManager = new ConfigManager(config);
    this.config = null;
    this.storage = null;
    this.orchestrator = null;
    this.watcher = null;
  }

  /**
   * Initialize AI-COUNCIL system
   */
  async initialize(configPath = null) {
    try {
      console.log('[INFO] Initializing AI-COUNCIL...');

      // Load configuration
      this.config = await this.configManager.load(configPath);

      // Initialize storage - prefer HubStorage (local), fallback to Supabase if configured
      const supabaseConfig = this.config.supabase || {};
      const useSupabase = supabaseConfig.url && supabaseConfig.key && SupabaseClient;

      if (useSupabase) {
        // Use Supabase if configured
        this.storage = new SupabaseClient(supabaseConfig);
        try {
          await this.storage.initialize();
        } catch (error) {
          // Fallback to Hub storage on Supabase failure
          this.storage = new HubStorage();
          await this.storage.initialize();
        }
      } else {
        // Use local Hub storage by default
        this.storage = new HubStorage();
        await this.storage.initialize();
      }

      // Initialize orchestrator with config and storage
      const orchestratorConfig = {
        ...this.config,
        storage: this.storage
      };
      this.orchestrator = new CouncilOrchestrator(orchestratorConfig);

      const agentCount = this.orchestrator.aiCouncil?.agents?.size || 0;
      console.log(`[INFO] Agent council ready with ${agentCount} agent(s)`);

      console.log('[INFO] AI-COUNCIL initialized successfully');
      return true;
    } catch (error) {
      console.error('[ERROR] Initialization failed:', error.message);
      return false;
    }
  }

  /**
   * Analyze a single file
   */
  async analyzeFile(filePath, options = {}) {
    try {
      if (!this.orchestrator) {
        await this.initialize();
      }

      console.log(`[ANALYZING] ${filePath}`);

      // Read file content
      const fs = require('fs').promises;
      const path = require('path');
      const code = await fs.readFile(filePath, 'utf8');

      // Determine language from file extension
      const ext = path.extname(filePath).toLowerCase();
      const languageMap = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.py': 'python',
        '.java': 'java'
      };
      const language = languageMap[ext] || 'javascript';

      // Evaluate code through orchestrator
      const result = await this.orchestrator.evaluateCode(code, {
        filePath,
        language,
        ...options
      });

      // Format result for display
      const formattedResult = {
        filePath,
        finalScore: result.finalScore,
        status: result.status,
        agentRatings: (result.agentResults || []).map(agent => ({
          agent: agent.agentName || agent.name || 'unknown',
          score: agent.score || 0,
          confidence: agent.confidence || 0,
          issues: agent.issues || [],
          reasoning: agent.reasoning || ''
        })),
        agentResults: result.agentResults || [],
        recommendations: result.recommendations,
        consensus: result.consensus || 0,
        executionTime: result.executionTime || 0,
        rejectionDetails: result.rejectionDetails || null,
        debateResult: result.debateResult || null
      };

      this.displayResults(formattedResult);
      return formattedResult;
    } catch (error) {
      console.error('[ERROR] Analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Start file watching
   */
  async startWatching(directories = null) {
    try {
      if (!this.orchestrator) {
        await this.initialize();
      }

      const watchDirs = directories || this.config.monitoring?.directories || ['./src'];

      this.watcher = new FileWatcher(this.configManager);
      await this.watcher.start(watchDirs, this.orchestrator);

      return this.watcher;
    } catch (error) {
      console.error('[ERROR] Failed to start watcher:', error.message);
      throw error;
    }
  }

  /**
   * Stop file watching
   */
  async stopWatching() {
    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = null;
    }
  }

  /**
   * Display analysis results
   */
  displayResults(result) {
    console.log(`\n[RESULT] ${result.filePath}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Score: ${result.finalScore}/100`);
    console.log(`  Consensus: ${(result.consensus * 100).toFixed(1)}%`);

    // Show debate info if available
    if (result.debateResult?.debated) {
      console.log(`  Debate: ${result.debateResult.rounds} round(s) completed`);
    }

    // Display individual agent results (filter out failed agents)
    if (result.agentResults && result.agentResults.length > 0) {
      const successfulAgents = result.agentResults.filter(r => !r.error && r.score > 0 && r.confidence > 0.1);
      if (successfulAgents.length > 0) {
        console.log(`  Agents: ${successfulAgents.map(r => `${r.agentName || r.name}: ${r.score}/100`).join(', ')}`);
      }
    }

    // Display detailed rejection feedback if rejected
    if (result.status !== 'APPROVED' && result.rejectionDetails) {
      this.displayRejectionDetails(result.rejectionDetails);
    } else if (result.status === 'APPROVED') {
      console.log(`  [PASS] Code meets quality standards\n`);
    } else {
      console.log(`  [FAIL] Code does not meet quality standards`);
      if (result.reasoning) {
        console.log(`  Reason: ${result.reasoning}\n`);
      }
    }
  }

  /**
   * Display detailed rejection feedback
   */
  displayRejectionDetails(details) {
    console.log(`\n[REJECTION] Code Quality Issues Detected\n`);

    // Summary
    console.log(`Summary: ${details.summary}\n`);

    // Primary Issues (filter out API/connection errors)
    if (details.primaryIssues && details.primaryIssues.length > 0) {
      const realIssues = details.primaryIssues.filter(issue =>
        !issue.message?.includes('AI model analysis failed') &&
        !issue.message?.includes('Connection error') &&
        !issue.type?.includes('analysis_error') &&
        !issue.type?.includes('agent_error')
      );
      if (realIssues.length > 0) {
        console.log(`Primary Issues (Must Fix):`);
        realIssues.forEach((issue, idx) => {
          const lineInfo = issue.line ? ` (Line ${issue.line})` : '';
          console.log(`  ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.message}${lineInfo}`);
          if (issue.suggestion) {
            console.log(`     Fix: ${issue.suggestion}`);
          }
          console.log(`     Reported by: ${issue.reportedBy}`);
        });
        console.log();
      }
    }

    // What Needs Fixing (filter out API/connection errors)
    if (details.whatNeedsFixing && details.whatNeedsFixing.length > 0) {
      const realFixes = details.whatNeedsFixing.filter(item =>
        !item.issue?.includes('AI model analysis failed') &&
        !item.issue?.includes('Connection error')
      );
      if (realFixes.length > 0) {
        console.log(`What Needs Fixing:`);
        realFixes.forEach((item, idx) => {
          console.log(`  ${idx + 1}. [${item.priority}] ${item.issue}`);
          console.log(`     -> ${item.fix}`);
          if (item.line) {
            console.log(`     Line: ${item.line}`);
          }
        });
        console.log();
      }
    }

    // Recommendations
    if (details.recommendations && details.recommendations.length > 0) {
      console.log(`Recommendations:`);
      details.recommendations.forEach((rec, idx) => {
        console.log(`  ${idx + 1}. [${rec.priority}] ${rec.category}`);
        console.log(`     Action: ${rec.action}`);
        console.log(`     Impact: ${rec.impact}`);
      });
      console.log();
    }
  }


  getConfidenceText(confidence) {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  }

  /**
   * Initialize project (for CLI init command)
   */
  async initProject(options = {}) {
    return await this.configManager.init(options);
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {}
    };

    // Check storage
    if (this.storage) {
      try {
        const storageHealth = await this.storage.healthCheck();
        if (storageHealth.enabled === false) {
          health.components.storage = 'not_configured';
          health.components.storageMessage = 'Supabase not configured in .env file';
        } else {
          health.components.storage = storageHealth.connected ? 'ok' : 'error';
          if (storageHealth.connected) {
            health.components.storageMessage = 'Supabase connected';
          } else {
            health.components.storageMessage = storageHealth.error || 'Connection failed';
          }
        }
      } catch (error) {
        // If storage is not enabled, it's not an error
        if (this.storage.enabled === false) {
          health.components.storage = 'not_configured';
          health.components.storageMessage = 'Supabase credentials not found';
        } else {
          health.components.storage = 'error';
          health.components.storageMessage = error.message;
        }
      }
    } else {
      health.components.storage = 'not_configured';
      health.components.storageMessage = 'Storage not initialized';
    }

    // Check orchestrator
    if (this.orchestrator && this.orchestrator.aiCouncil) {
      const agentCount = this.orchestrator.aiCouncil.agents?.size || 0;
      health.components.agents = agentCount > 0 ? 'ok' : 'error';
      health.components.agentCount = agentCount;
    } else {
      health.components.agents = 'not_initialized';
    }

    // Overall status - don't count "not_configured" as an error
    const hasErrors = Object.values(health.components).some(status => status === 'error');
    const hasNotConfigured = Object.values(health.components).some(status => status === 'not_configured');

    if (hasErrors) {
      health.status = 'degraded';
    } else if (hasNotConfigured && !hasErrors) {
      health.status = 'healthy'; // Still healthy if only missing optional components
    }

    return health;
  }

  /**
   * Get statistics
   */
  async getStats() {
    const stats = {
      council: {},
      database: {}
    };

    if (this.orchestrator) {
      try {
        const councilStats = await this.orchestrator.getStatistics();
        stats.council = councilStats;
      } catch (error) {
        // Ignore errors
      }
    }

    if (this.storage && this.storage.enabled) {
      try {
        const dbStats = await this.storage.getStats();
        stats.database = dbStats;
      } catch (error) {
        // Ignore errors
      }
    }

    return stats;
  }

  /**
   * Get configuration
   */
  getConfig() {
    return this.config || this.configManager.get();
  }

  /**
   * Update configuration
   */
  async updateConfig(updates) {
    this.configManager.update(updates);
    await this.configManager.save();
    return this.configManager.get();
  }

  /**
   * Start file watching with Hub storage integration
   */
  async startWatching(directories) {
    if (!this.orchestrator) {
      await this.initialize();
    }

    const { FileWatcher } = require('./capture/file-watcher');

    this.watcher = new FileWatcher({
      directories: Array.isArray(directories) ? directories : [directories],
      debounceDelay: this.config?.monitoring?.debounceDelay || 1000
    });

    // Start watcher with orchestrator and Hub storage
    await this.watcher.start(
      directories,
      this.orchestrator,
      this.storage // Pass Hub storage for saving results
    );

    return true;
  }

  /**
   * Stop file watching
   */
  async stopWatching() {
    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = null;
    }
    return true;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.watcher) {
      await this.stopWatching();
    }
    return true;
  }
}

module.exports = { AICouncil };

// If run directly
if (require.main === module) {
  const council = new AICouncil();
  council.initialize().then(() => {
    console.log('[OK] AI-COUNCIL ready for use!');
  }).catch(error => {
    console.error('[ERROR] Failed to start AI-COUNCIL:', error);
    process.exit(1);
  });
}