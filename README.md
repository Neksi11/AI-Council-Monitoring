![Project Banner](image/Github%20Image.png)

# AI-COUNCIL

**AI Code Quality Assurance System** - Automated code review using multiple AI agents working together.

AI-COUNCIL analyzes your code using 4 AI models (Groq, Gemini, Z.AI, OpenRouter) that collaborate to provide comprehensive feedback on security, performance, and best practices.

---

## 🚀 Quick Start (3 Simple Steps)

The entire setup takes less than 2 minutes!

### Step 1: Install
```bash
npm install -g ai-council
```

### Step 2: Initialize
```bash
cd your-project
ai-council init
```
This will:
- Create a `Hub/` folder for local storage
- Create a `.env` template for API keys
- Guide you through configuration

### Step 3: Start Monitoring
```bash
ai-council watch
```
That's it! AI-COUNCIL will now automatically analyze your code changes in real-time.

---

## ✨ Key Features

### 🤖 4 AI Agents Working Together
| Agent | Model | Purpose |
|-------|-------|---------|
| **Groq** | llama-3.3-70b-versatile | Fast, comprehensive analysis |
| **Gemini** | gemini-2.5-flash | Multi-perspective review |
| **Z.AI** | glm-4.6 | Deep reasoning analysis |
| **OpenRouter** | devstral-2512:free | Open-source model insights |

### 📊 Real-Time Code Analysis
- Monitors your code as you save files
- Detects **28+ security vulnerabilities**
- Identifies **code quality issues**
- Shows issues with **line numbers**

### 🔗 AI Assistant Integration
AI-COUNCIL automatically generates a `.ai-council-context.md` file that your AI coding assistant (Gemini, Copilot, Claude) can read to help fix issues!

Just tell your AI:
> "Read `.ai-council-context.md` and fix the critical issues"

### 📁 Local Storage (No Database Required)
All data is stored locally in the `Hub/` folder:
```
Hub/
├── config/      # Configuration files
├── context/     # Project context
├── watch/       # Analysis results
├── results/     # Historical data
├── issues/      # AI-readable issue reports
└── patterns/    # Learned patterns
```

---

## 📋 Commands

| Command | Description |
|---------|-------------|
| `ai-council init` | Initialize AI-COUNCIL in your project |
| `ai-council status` | Show system status and active agents |
| `ai-council analyze <file>` | Analyze a specific file |
| `ai-council watch` | Start real-time file monitoring |
| `ai-council watch -d ./src` | Watch specific directory |
| `ai-council stats` | Show analysis history |
| `ai-council clean` | Clean old analysis results |

---

## 🔑 API Keys

AI-COUNCIL requires at least **ONE** API key. We recommend starting with **Groq** (free tier available).

| Provider | Free Tier | Get API Key |
|----------|-----------|-------------|
| **Groq** ⭐ | Yes (Recommended) | [console.groq.com](https://console.groq.com) |
| **Google Gemini** | Yes | [makersuite.google.com](https://makersuite.google.com) |
| **OpenRouter** | Yes | [openrouter.ai](https://openrouter.ai) |
| **Z.AI** | Limited | [z.ai](https://z.ai) |
| OpenAI | Paid | [platform.openai.com](https://platform.openai.com) |
| Anthropic | Paid | [console.anthropic.com](https://console.anthropic.com) |

Add your keys to `.env`:
```env
# At least one required
GROQ_API_KEY=your-key-here
GOOGLE_API_KEY=your-key-here
OPENROUTER_API_KEY=your-key-here
ZAI_API_KEY=your-key-here
```

---

## 🔍 What It Detects

### Security Issues
- SQL Injection vulnerabilities
- Hardcoded credentials/secrets
- XSS vulnerabilities
- Insecure authentication
- Missing input validation
- Weak encryption
- PCI compliance violations

### Code Quality Issues
- Missing error handling
- Performance problems
- Code duplication
- Unused variables
- Poor naming conventions
- Missing documentation

### Best Practices
- Framework-specific issues
- Design pattern violations
- Maintainability concerns
- Scalability problems

---

## 📝 Example Output

```
[ANALYZING] src/auth-service.js (javascript)
[Grok] Analyzing code...
[Gemini] Analyzing code...
[Zai] Analyzing code...
[OpenRouter OSS] Analyzing code...

[RESULT] src/auth-service.js
  Status: AUTO_REJECTED
  Score: 18/100
  Consensus: 87.5%
  [FAIL] Code does not meet quality standards
  Agents: grok: 20, gemini: 30, zai: 25, openrouter: 35

[ISSUES DETECTED]
  Critical (19):
    1. Hardcoded JWT secret (line 10)
    2. Weak password hashing (line 24)
    3. SQL injection vulnerability (line 43)
    4. Token never expires (line 63)
    5. No authorization check (line 89)
  Important (7):
    1. Inefficient user storage (line 12)
    2. Lack of input validation (line 22)
    3. Insecure password reset (line 93)

[REPORT] Issues report saved to: Hub/issues/auth-service_issues.md
```

---

## 🤝 AI Assistant Integration

AI-COUNCIL creates files that your AI coding assistant can read:

### Automatic Context File
After each analysis, AI-COUNCIL creates `.ai-council-context.md` in your project root:

```markdown
# AI-COUNCIL Context

> **AI Assistants: Please read this file and help fix the issues below.**

## Critical Issues to Fix (19)

1. **Hardcoded JWT secret** (line 10)
   - Type: security
   - Fix: Use environment variable process.env.JWT_SECRET

2. **SQL injection vulnerability** (line 43)
   - Type: security
   - Fix: Use parameterized queries
...

## Instructions for AI Assistants
1. Open the file: `src/auth-service.js`
2. Fix Critical Issues first
3. Verify with: `ai-council analyze src/auth-service.js`
```

### How to Use with Your AI
Simply tell your AI assistant:
- "Read `.ai-council-context.md` and fix the issues"
- "There's an AI-COUNCIL report in my project, help me fix it"
- "Check Hub/issues/CURRENT_ISSUES.md and fix the critical bugs"

---

## 🌍 Supported Languages

| Language | Extensions |
|----------|------------|
| JavaScript | `.js`, `.jsx` |
| TypeScript | `.ts`, `.tsx` |
| Python | `.py` |
| Java | `.java` |
| Go | `.go` |
| Rust | `.rs` |
| PHP | `.php` |
| Ruby | `.rb` |
| C/C++ | `.c`, `.cpp` |
| C# | `.cs` |

---

## ⚙️ Configuration

### Environment Variables
```env
# AI Model Keys
GROQ_API_KEY=your-groq-key
GOOGLE_API_KEY=your-google-key
GOOGLE_MODEL=gemini-2.5-flash
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=mistralai/devstral-2512:free
ZAI_API_KEY=your-zai-key
ZAI_BASE_URL=https://api.z.ai/api/coding/paas/v4
ZAI_MODEL=glm-4.6
```

### Hub Settings
Configuration is stored in `Hub/config/settings.json`:
```json
{
  "version": "1.0.0",
  "projectName": "my-project"
}
```

---

## 📊 How It Works

```
                    ┌─────────────────┐
                    │   Your Code     │
                    │   (save file)   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   File Watcher  │
                    │   (detects)     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │  Groq   │         │ Gemini  │         │  Z.AI   │
   │  Agent  │         │  Agent  │         │  Agent  │
   └────┬────┘         └────┬────┘         └────┬────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │    Council      │
                    │   (consensus)   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
         ┌─────────┐   ┌─────────┐   ┌─────────┐
         │Terminal │   │  Hub/   │   │.ai-council│
         │ Output  │   │ Storage │   │-context.md│
         └─────────┘   └─────────┘   └──────────┘
```

1. **File Watcher** detects when you save a file
2. **4 AI Agents** analyze the code simultaneously
3. **Council** calculates consensus and final score
4. **Results** are displayed and saved for your AI assistant

---

## 🔧 Requirements

- Node.js >= 18.0.0
- npm >= 8.0.0
- At least one AI API key

---

## 📄 License

MIT

---

## 🙋 Support

- **Issues:** [GitHub Issues](https://github.com/ai-council/ai-council/issues)
- **Documentation:** [GitHub Wiki](https://github.com/ai-council/ai-council/wiki)

---

**Made with ❤️ by the AI-COUNCIL Team**