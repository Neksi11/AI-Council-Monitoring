# AI-COUNCIL: AI Code Assurance System
## Complete Project Specification

### 🎯 Project Overview
AI-COUNCIL is an intelligent code assurance system that automatically captures AI-generated code from IDEs, evaluates it through a council of specialized AI agents, and learns from production patterns to improve code quality over time.

### 🏗️ System Architecture

#### Core Components
```
AI-COUNCIL/
├── capture/           # Code capture from IDEs
├── agents/           # Specialized rating agents
├── council/          # Agent orchestration & scoring
├── storage/          # Supabase integration & patterns
├── learning/         # Pattern extraction & ML
├── cli/              # Command line interface
└── extension/        # VS Code extension
```

### 📋 Technical Requirements

#### Languages & Frameworks
- **Backend:** Node.js 18+
- **Database:** Supabase (PostgreSQL)
- **IDE Integration:** VS Code Extension API
- **CLI:** Commander.js
- **File Watching:** Chokidar
- **AST Parsing:** @babel/parser, acorn
- **Package Manager:** NPM

#### System Requirements
- Cross-platform (Windows, macOS, Linux)
- Real-time file monitoring
- Parallel agent processing
- Offline capability with sync
- Plugin architecture for custom agents

### 🤖 Agent Council Specification

#### Agent Types & Responsibilities

**1. Security Agent (Weight: 25%)**
- SQL injection detection
- XSS vulnerability scanning
- Authentication flaw identification
- Dependency vulnerability checking
- Input validation analysis

**2. Performance Agent (Weight: 20%)**
- Time complexity analysis (O(n), O(n²), etc.)
- Memory usage pattern detection
- N+1 query identification
- Inefficient loop detection
- Resource leak identification

**3. Code Quality Agent (Weight: 20%)**
- Readability metrics (cyclomatic complexity)
- Naming convention adherence
- Code smell detection (long methods, god classes)
- Documentation quality assessment
- SOLID principles compliance

**4. Pattern Matching Agent (Weight: 20%)**
- Production pattern comparison
- Architecture consistency checking
- Team style guide adherence
- Anti-pattern detection
- Best practice enforcement

**5. Testing Agent (Weight: 15%)**
- Test coverage potential analysis
- Edge case handling assessment
- Error handling quality evaluation
- Testability score calculation
- Mock/stub usage patterns

#### Scoring Algorithm
```javascript
// Weighted scoring with confidence factors
finalScore = Σ(agentScore × agentWeight × agentConfidence)

// Consensus calculation
consensus = 1 - (standardDeviation(agentScores) / 100)

// Status determination
if (finalScore >= 85 && consensus >= 0.8) status = "APPROVED"
else if (finalScore <= 40 || consensus <= 0.5) status = "REJECTED"
else status = "REVIEW_NEEDED"
```

### 🗄️ Database Schema (Supabase)

#### Tables Structure
```sql
-- Code submissions tracking
CREATE TABLE code_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path TEXT NOT NULL,
    code_content TEXT NOT NULL,
    language TEXT NOT NULL,
    project_id UUID NOT NULL,
    is_ai_generated BOOLEAN DEFAULT true,
    lines_of_code INTEGER,
    complexity_score INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Individual agent ratings
CREATE TABLE agent_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES code_submissions(id),
    agent_name TEXT NOT NULL,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    confidence DECIMAL CHECK (confidence >= 0 AND confidence <= 1),
    issues JSONB,
    reasoning TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Final council assessments
CREATE TABLE code_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES code_submissions(id),
    final_score INTEGER CHECK (final_score >= 0 AND final_score <= 100),
    status TEXT CHECK (status IN ('APPROVED', 'REJECTED', 'REVIEW_NEEDED')),
    consensus_score DECIMAL,
    agent_agreement JSONB,
    recommendations JSONB,
    auto_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Production patterns for learning
CREATE TABLE production_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type TEXT NOT NULL, -- 'function', 'class', 'module', 'architecture'
    code_pattern TEXT NOT NULL,
    language TEXT NOT NULL,
    pattern_hash TEXT UNIQUE,
    frequency INTEGER DEFAULT 1,
    avg_rating INTEGER,
    success_rate DECIMAL,
    context_tags TEXT[],
    learned_from UUID[], -- Array of submission IDs
    last_seen TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agent learning and performance tracking
CREATE TABLE agent_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL,
    total_predictions INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    accuracy DECIMAL GENERATED ALWAYS AS (
        CASE WHEN total_predictions > 0 
        THEN correct_predictions::decimal / total_predictions 
        ELSE 0 END
    ) STORED,
    current_weight DECIMAL DEFAULT 1.0,
    learned_patterns JSONB,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Project configurations
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    root_path TEXT NOT NULL,
    language_config JSONB,
    agent_weights JSONB,
    thresholds JSONB,
    team_patterns JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 🔄 Code Capture Methods

#### Method 1: VS Code Extension (Primary)
```javascript
// Real-time capture during coding
vscode.workspace.onDidChangeTextDocument((event) => {
    const change = event.contentChanges[0];
    if (isLikelyAIGenerated(change)) {
        captureAndAnalyze(change.text, event.document);
    }
});

// Full file analysis on save
vscode.workspace.onDidSaveTextDocument((document) => {
    analyzeFullFile(document);
});
```

#### Method 2: File Watcher (Universal Fallback)
```javascript
// Monitor project directories
const watcher = chokidar.watch(['./src/**/*.js', './lib/**/*.py'], {
    ignored: /(^|[\/\\])\../,
    persistent: true
});

watcher.on('change', (path) => {
    analyzeFile(path);
});
```

#### Method 3: Git Hook Integration (Optional)
```bash
# Pre-commit hook for batch analysis
#!/bin/sh
ai-council analyze --staged --auto-fix
```

### 🧠 Learning System Architecture

#### Pattern Extraction Engine
```javascript
class PatternExtractor {
    extractPatterns(code, language) {
        return {
            functions: this.extractFunctions(code),
            classes: this.extractClasses(code),
            imports: this.extractImports(code),
            architecture: this.extractArchitecture(code),
            styles: this.extractStylePatterns(code)
        };
    }
    
    calculateSimilarity(pattern1, pattern2) {
        // Levenshtein distance + semantic analysis
        return similarity_score;
    }
}
```

#### Continuous Learning Loop
```javascript
class LearningEngine {
    async learn(approvedCode, rejectedCode) {
        // Extract and reinforce good patterns
        const goodPatterns = await this.extractPatterns(approvedCode);
        await this.reinforcePatterns(goodPatterns, +1);
        
        // Extract and penalize bad patterns
        const badPatterns = await this.extractPatterns(rejectedCode);
        await this.reinforcePatterns(badPatterns, -1);
        
        // Update agent weights based on accuracy
        await this.updateAgentWeights();
    }
}
```

### 📦 Package Structure & Installation

#### NPM Package Layout
```
ai-council/
├── package.json
├── README.md
├── LICENSE
├── bin/
│   └── ai-council              # CLI executable
├── src/
│   ├── index.js               # Main entry point
│   ├── capture/
│   │   ├── file-watcher.js    # File monitoring
│   │   ├── vscode-hooks.js    # VS Code integration
│   │   └── git-hooks.js       # Git integration
│   ├── agents/
│   │   ├── base-agent.js      # Abstract agent class
│   │   ├── security-agent.js  # Security analysis
│   │   ├── performance-agent.js # Performance analysis
│   │   ├── quality-agent.js   # Code quality analysis
│   │   ├── pattern-agent.js   # Pattern matching
│   │   └── testing-agent.js   # Testing analysis
│   ├── council/
│   │   ├── orchestrator.js    # Agent coordination
│   │   ├── scorer.js          # Score calculation
│   │   └── consensus.js       # Consensus building
│   ├── storage/
│   │   ├── supabase-client.js # Database client
│   │   ├── pattern-store.js   # Pattern management
│   │   └── cache.js           # Local caching
│   ├── learning/
│   │   ├── pattern-extractor.js # Pattern extraction
│   │   ├── similarity-engine.js # Pattern matching
│   │   └── weight-updater.js    # Agent weight updates
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── init.js        # Project initialization
│   │   │   ├── analyze.js     # Code analysis
│   │   │   ├── watch.js       # File watching
│   │   │   └── dashboard.js   # Results dashboard
│   │   └── index.js           # CLI entry point
│   └── utils/
│       ├── ast-parser.js      # AST parsing utilities
│       ├── language-detector.js # Language detection
│       └── config-manager.js   # Configuration management
├── extension/                  # VS Code extension
│   ├── package.json
│   ├── extension.js
│   └── README.md
├── config/
│   ├── default-config.json    # Default configuration
│   └── agent-weights.json     # Default agent weights
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

#### Installation & Setup
```bash
# Global installation
npm install -g ai-council

# Project initialization
cd your-project
ai-council init

# Start monitoring
ai-council watch

# VS Code extension
code --install-extension ai-council-vscode
```

### ⚙️ Configuration System

#### Project Configuration (.ai-council.json)
```json
{
    "project": {
        "name": "my-project",
        "language": "javascript",
        "framework": "react"
    },
    "supabase": {
        "url": "your-supabase-url",
        "key": "your-supabase-key"
    },
    "monitoring": {
        "directories": ["./src", "./lib"],
        "ignore": ["node_modules", "dist", "*.test.js"],
        "file_types": [".js", ".ts", ".jsx", ".tsx", ".py"]
    },
    "agents": {
        "security": { "enabled": true, "weight": 0.25 },
        "performance": { "enabled": true, "weight": 0.20 },
        "quality": { "enabled": true, "weight": 0.20 },
        "pattern": { "enabled": true, "weight": 0.20 },
        "testing": { "enabled": true, "weight": 0.15 }
    },
    "thresholds": {
        "auto_approve": 85,
        "auto_reject": 40,
        "review_needed": 60,
        "consensus_required": 0.7
    },
    "learning": {
        "enabled": true,
        "pattern_extraction": true,
        "weight_adjustment": true,
        "feedback_loop": true
    },
    "notifications": {
        "desktop": true,
        "vscode": true,
        "webhook": null
    }
}
```

### 🚀 Usage Examples

#### CLI Usage
```bash
# Initialize project
ai-council init --language javascript --framework react

# Analyze specific file
ai-council analyze src/components/UserForm.js

# Start file watcher
ai-council watch --verbose

# View project dashboard
ai-council dashboard --port 3000

# Analyze git diff
ai-council analyze --git-diff HEAD~1

# Export patterns
ai-council export-patterns --format json
```

#### Programmatic Usage
```javascript
const AICouncil = require('ai-council');

const council = new AICouncil({
    supabaseUrl: 'your-url',
    supabaseKey: 'your-key'
});

// Analyze code
const result = await council.analyze(code, {
    language: 'javascript',
    context: { framework: 'react' }
});

console.log(`Score: ${result.finalScore}/100`);
console.log(`Status: ${result.status}`);
```

### 📊 Reporting & Analytics

#### Real-time Dashboard Features
- Live code quality metrics
- Agent performance tracking
- Pattern learning progress
- Team coding trends
- Security vulnerability alerts
- Performance bottleneck identification

#### Export Capabilities
- PDF reports for stakeholders
- JSON data for CI/CD integration
- CSV exports for analysis
- Pattern libraries for sharing

### 🔧 Extensibility & Plugins

#### Custom Agent Development
```javascript
class CustomAgent extends BaseAgent {
    constructor() {
        super('CustomAgent', 0.1); // name, weight
    }
    
    async analyze(code, context) {
        // Your custom analysis logic
        return {
            score: 85,
            confidence: 0.9,
            issues: [],
            reasoning: "Custom analysis complete"
        };
    }
}

// Register custom agent
council.registerAgent(new CustomAgent());
```

#### Plugin System
```javascript
// Plugin structure
const myPlugin = {
    name: 'eslint-integration',
    version: '1.0.0',
    agents: [ESLintAgent],
    hooks: {
        beforeAnalysis: (code) => { /* preprocessing */ },
        afterAnalysis: (result) => { /* postprocessing */ }
    }
};

council.use(myPlugin);
```

### 🔒 Security & Privacy

#### Data Protection
- Local-first architecture with optional cloud sync
- Encrypted code storage
- Anonymized pattern sharing
- GDPR compliance ready
- No code sent to external APIs without consent

#### Access Control
- Project-level permissions
- Team member access controls
- API key management
- Audit logging

### 🎯 Success Metrics

#### Quality Metrics
- Code quality improvement over time
- Reduction in security vulnerabilities
- Performance optimization tracking
- Pattern adoption rates

#### Learning Metrics
- Agent accuracy improvement
- Pattern recognition success rate
- False positive reduction
- User satisfaction scores

### 🚀 Deployment Options

#### Development Environment
```bash
# Local development
npm run dev

# Watch mode with hot reload
npm run watch
```

#### Production Deployment
```bash
# Docker deployment
docker build -t ai-council .
docker run -p 3000:3000 ai-council

# Cloud deployment (Vercel/Netlify)
npm run build
npm run deploy
```

### 📈 Roadmap & Future Features

#### Phase 1 (MVP - 4 weeks)
- Basic agent framework
- File watching
- Supabase integration
- CLI interface

#### Phase 2 (Enhanced - 8 weeks)
- VS Code extension
- Advanced pattern learning
- Dashboard UI
- Team collaboration features

#### Phase 3 (Enterprise - 12 weeks)
- Multi-language support
- Advanced ML models
- Enterprise integrations
- Custom deployment options

### 🤝 Contributing Guidelines

#### Development Setup
```bash
git clone https://github.com/your-org/ai-council
cd ai-council
npm install
npm run setup-dev
```

#### Code Standards
- ESLint configuration
- Prettier formatting
- Jest testing framework
- Conventional commits
- TypeScript support (future)

This specification provides the complete blueprint for building AI-COUNCIL from the ground up. The system is designed to be modular, scalable, and maintainable while delivering immediate value to developers.