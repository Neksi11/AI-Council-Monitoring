# AI Council Debate System 💬

## Overview

The AI Council now features an advanced **debate system** where multiple AI agents can discuss, challenge each other's assessments, and reach a more informed consensus about code quality.

## How It Works

### 1. Initial Analysis
- All available AI agents analyze the code independently
- Each agent provides a score, reasoning, and identified issues

### 2. Debate Trigger
The debate system activates when:
- **Multiple agents are available** (2+)
- **Consensus is low** (< 85% agreement)
- **Scores vary significantly** (high standard deviation)

### 3. Debate Rounds
- Agents with divergent opinions are identified
- Other agents challenge their assessments
- Divergent agents reconsider their scores with new perspectives
- Process repeats for up to 2 rounds (configurable)

### 4. Consensus Improvement
- Agents can adjust their scores based on peer feedback
- Final consensus is recalculated
- More informed decision is reached

## Configuration

In `.ai-council.json`:

```json
{
  "debate": {
    "enabled": true,
    "maxRounds": 2,
    "minConsensusImprovement": 0.1,
    "debateThreshold": 0.15
  }
}
```

### Parameters:
- **enabled**: Enable/disable debate system (default: true)
- **maxRounds**: Maximum debate rounds (default: 2)
- **minConsensusImprovement**: Minimum improvement to continue (default: 0.1)
- **debateThreshold**: Consensus threshold to trigger debate (default: 0.15)

## Benefits

1. **Better Consensus**: Agents discuss and reach agreement
2. **More Accurate Scores**: Peer review improves assessment quality
3. **Detailed Reasoning**: Agents explain why they changed their minds
4. **Transparency**: Full debate log shows the discussion process

## Example Output

```
💬 Starting AI Council debate...
💬 Debate Round 1/2
🤔 gpt challenging claude's assessment
✅ claude adjusted score from 65 to 72
💬 Round 1 consensus: 78.5% (improvement: 8.5%)
💬 Debate completed: 1 round(s), consensus improved to 78.5%
```

## Supported AI Models

The debate system works with all AI models:
- ✅ Claude (Anthropic)
- ✅ GPT-4 (OpenAI)
- ✅ Grok (xAI)
- ✅ Gemini (Google)
- ✅ Zai GML 4.6
- ✅ Llama (Local)

## Rejection Details

When code is rejected, you now get:
- **Summary**: Why it was rejected
- **Primary Issues**: Top 5 critical problems
- **What Needs Fixing**: Actionable items with priorities
- **Problems by Category**: Grouped by type (security, performance, etc.)
- **Agent Perspectives**: What each AI agent thinks
- **Actionable Recommendations**: Specific steps to fix

This makes it clear exactly what's wrong and how to fix it!

