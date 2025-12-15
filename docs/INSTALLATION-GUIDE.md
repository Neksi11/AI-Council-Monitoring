# AI-COUNCIL Installation Guide 🚀

## Quick Start (Local Development)

Since AI-COUNCIL is still in development, here's how to set it up locally:

### 1. Clone/Download the Project
You already have the project files in: `C:\Users\Neksi\Desktop\project-AICouncil\`

### 2. Install Dependencies
```cmd
cd C:\Users\Neksi\Desktop\project-AICouncil
npm install
```

### 3. Set Up API Keys

#### Option A: Interactive Setup (Recommended)
```cmd
node setup.js
```
This will guide you through setting up API keys and testing the system.

#### Option B: Manual .env File
1. Copy `.env.example` to `.env`
2. Edit `.env` and add your API keys:
```env
ANTHROPIC_API_KEY=your-claude-key-here
OPENAI_API_KEY=your-openai-key-here
GOOGLE_API_KEY=your-gemini-key-here
```

#### Option C: Environment Variables
**Windows Command Prompt:**
```cmd
set ANTHROPIC_API_KEY=your-claude-key
set OPENAI_API_KEY=your-openai-key
set GOOGLE_API_KEY=your-gemini-key
```

**Windows PowerShell:**
```powershell
$env:ANTHROPIC_API_KEY="your-claude-key"
$env:OPENAI_API_KEY="your-openai-key"
$env:GOOGLE_API_KEY="your-gemini-key"
```

### 4. Get API Keys

| Provider | Where to Get | Free Tier |
|----------|--------------|-----------|
| **Claude (Anthropic)** | [console.anthropic.com](https://console.anthropic.com/) | $5 free credit |
| **GPT (OpenAI)** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | $5 free credit |
| **Gemini (Google)** | [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey) | Free tier available |
| **Grok (xAI)** | Coming soon | TBA |

### 5. Test the System
```cmd
node test-ai-council.js
```

## Usage Commands

### Using Node.js (Current Method)
```cmd
# Initialize project
node bin/ai-council init

# Analyze a file
node bin/ai-council analyze test-example.js

# Start monitoring
node bin/ai-council watch

# Check status
node bin/ai-council status
```

### Using Batch Script (Windows)
```cmd
# After setup, you can use the batch script
ai-council init
ai-council analyze test-example.js
ai-council watch
```

## Example Workflow

1. **Set up API keys:**
   ```cmd
   node setup.js
   ```

2. **Initialize a project:**
   ```cmd
   node bin/ai-council init
   ```

3. **Test with example file:**
   ```cmd
   node bin/ai-council analyze test-example.js
   ```

4. **Start monitoring:**
   ```cmd
   node bin/ai-council watch
   ```

## Troubleshooting

### "npm install -g ai-council" doesn't work
- **Reason:** Package not published to NPM yet (still in development)
- **Solution:** Use local installation as shown above

### API Key Issues
- **Check .env file:** Make sure keys are set correctly
- **Check environment:** Run `echo %ANTHROPIC_API_KEY%` to verify
- **Test connection:** Run `node test-ai-council.js`

### Dependencies Issues
```cmd
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Permission Issues
- Run Command Prompt as Administrator
- Or use PowerShell with execution policy: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## What You Need

### Minimum Requirements
- **Node.js 18+**
- **At least 1 AI API key** (Claude, GPT, or Gemini)
- **Internet connection** for AI model calls

### Recommended Setup
- **2+ AI API keys** for better consensus
- **Supabase account** for data storage (optional)
- **VS Code** for future extension integration

## Next Steps

1. **Get API Keys:** Start with Claude or GPT (both have free tiers)
2. **Run Setup:** `node setup.js`
3. **Test System:** `node test-ai-council.js`
4. **Initialize Project:** `node bin/ai-council init`
5. **Start Monitoring:** `node bin/ai-council watch`

## Future: Global Installation

Once development is complete, we'll publish to NPM and you'll be able to:
```cmd
npm install -g ai-council
ai-council init
ai-council watch
```

But for now, the local method works perfectly! 🎉