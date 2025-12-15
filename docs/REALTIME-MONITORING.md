# Real-Time AI Code Monitoring

## Overview

AI-COUNCIL now automatically monitors and analyzes AI-generated code files in real-time as they are created or modified by IDE AI agents.

## How It Works

1. **Start Monitoring**: Run `node bin/ai-council watch`
2. **Automatic Detection**: The system watches your project directories for file changes
3. **AI Detection**: Uses heuristics to detect when code is likely AI-generated:
   - New file creation
   - Large code insertions (>300 characters)
   - Multiple function/class definitions
   - Complete module implementations
4. **Real-Time Analysis**: Automatically analyzes detected AI-generated code
5. **Clean Output**: Results displayed in terminal without emojis

## Usage

### Start Real-Time Monitoring

```bash
node bin/ai-council watch
```

This will:
- Monitor `./src` directory by default (configurable)
- Automatically detect AI-generated code
- Analyze files in real-time as they're created/modified
- Display results in clean, professional format

### Configure Directories

```bash
node bin/ai-council watch --directories "./src,./lib,./components"
```

### Example Output

```
[INFO] Starting real-time file monitoring...
[INFO] Watching directories: ./src
[INFO] File watcher ready. Monitoring 15 file(s)
[INFO] Real-time AI code analysis is active
[INFO] Press Ctrl+C to stop

[ANALYZING] src/components/UserForm.js (javascript)

[RESULT] src/components/UserForm.js
  Status: APPROVED
  Score: 87/100
  Consensus: 82.5%
  Agents: claude: 90, gpt: 85, gemini: 88, grok: 82, zai: 90
  [PASS] Code meets quality standards
```

## AI Detection Heuristics

The system automatically detects AI-generated code based on:

1. **File Creation**: New files are always analyzed
2. **Size**: Files with >300 characters
3. **Structure**: Multiple functions/classes in one change
4. **Completeness**: Full implementations (not incremental edits)
5. **Patterns**: Multiple imports, complete modules

## Configuration

Edit `.ai-council.json` to customize:

```json
{
  "monitoring": {
    "directories": ["./src", "./lib"],
    "ignore": ["**/node_modules/**", "**/*.test.js"],
    "debounceDelay": 1000,
    "maxFileSize": 1048576
  }
}
```

## Supported AI Models

- Claude (Anthropic)
- GPT-4 (OpenAI)
- Grok (xAI)
- Gemini (Google)
- Zai GML 4.6

All models work together in a debate system to reach consensus.

## Clean Output Format

All output uses clean, professional formatting:
- `[INFO]` - Informational messages
- `[ANALYZING]` - File being analyzed
- `[RESULT]` - Analysis results
- `[ERROR]` - Error messages
- `[PASS]` - Code approved
- `[FAIL]` - Code rejected

No emojis, clean and professional.

## Stopping

Press `Ctrl+C` to stop monitoring gracefully.

