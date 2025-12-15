┌─────────────────────────────────────────────────────────────────┐
│                    USER INSTALLATION                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: npm install -g ai-council                              │
│  ─────────────────────────────────────                          │
│  • Installs globally on user's system                           │
│  • Makes 'ai-council' command available                         │
│  • Installs all dependencies (openai, chalk, etc.)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: cd my-project && ai-council init                       │
│  ────────────────────────────────────────                       │
│  • Creates Hub/ folder structure                                │
│  • Creates .env template with API key placeholders              │
│  • Shows which API keys are configured                          │
│  • Guides user to get free API keys                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2.5: ai-council config --keys  (Optional)                 │
│  ─────────────────────────────────────                          │
│  • Interactive API key setup                                    │
│  • Prompts for each provider                                    │
│  • Saves to .env file                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: ai-council watch                                       │
│  ─────────────────────────────                                  │
│  • Starts file watcher (chokidar)                               │
│  • Monitors .js, .ts, .py, .java, etc.                          │
│  • Real-time analysis on file save                              │
└─────────────────────────────────────────────────────────────────┘

==========================================================================

==========================================================================

┌─────────────────────────────────────────────────────────────────┐
│                    USER SAVES A FILE                            │
│                    (e.g., auth-service.js)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FILE WATCHER                                 │
│  ─────────────────────────────                                  │
│  • Detects file change                                          │
│  • Debounces rapid changes (500ms)                              │
│  • Reads file content                                           │
│  • Detects language from extension                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI COUNCIL MANAGER                           │
│  ──────────────────────────────                                 │
│  • Sends code to ALL 4 agents simultaneously                    │
│  • Each agent analyzes independently                            │
│  • Timeout: 60 seconds per agent                                │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    Groq     │       │   Gemini    │       │    Z.AI     │
│   Agent     │       │   Agent     │       │   Agent     │
│             │       │             │       │             │
│ Score: 20   │       │ Score: 30   │       │ Score: 25   │
│ Issues: 15  │       │ Issues: 12  │       │ Issues: 18  │
└─────────────┘       └─────────────┘       └─────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DEBATE ORCHESTRATOR                          │
│  ───────────────────────────────                                │
│  • Calculates consensus (how much agents agree)                 │
│  • If low consensus: Agents debate and reconsider               │
│  • Combines all issues found                                    │
│  • Calculates final score (weighted average)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DECISION ENGINE                              │
│  ───────────────────────────                                    │
│  Score >= 75 AND Consensus >= 70% → APPROVED                    │
│  Score <= 30                       → AUTO_REJECTED              │
│  Otherwise                         → REVIEW_NEEDED              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OUTPUT & STORAGE                             │
│  ─────────────────────────                                      │
│  1. Terminal Output:                                            │
│     [RESULT] auth-service.js                                    │
│       Status: AUTO_REJECTED                                     │
│       Score: 18/100                                             │
│       [ISSUES DETECTED]                                         │
│         Critical (19): Hardcoded JWT, SQL Injection...          │
│                                                                 │
│  2. Hub Storage:                                                │
│     → Hub/watch/auth-service_latest.json (compact)              │
│                                                                 │
│  3. Issue Reports:                                              │
│     → Hub/issues/auth-service_issues.md                         │
│     → Hub/issues/CURRENT_ISSUES.md                              │
│                                                                 │
│  4. AI Context:                                                 │
│     → .ai-council-context.md (for AI assistants)                │
└─────────────────────────────────────────────────────────────────┘