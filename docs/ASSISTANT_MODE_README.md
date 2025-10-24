# Assistant Mode System

## Overview

The Assistant Mode system replaces the old "AI Insights" toggle with a more intuitive and granular control system for how the AI assistant behaves and uses user data.

## Modes

### 1. Private Mode

- **Purpose**: Maximum privacy, no data usage
- **Behavior**:
  - Plain chat only
  - No personalization
  - No contextual insights
  - No proactive cards

### 2. Personalized Mode (Default)

- **Purpose**: Data-driven responses when requested
- **Behavior**:
  - Uses user data only when explicitly asked
  - No proactive suggestions
  - Clean, predictable cost
  - Enhanced responses for budget/goal/spending questions

### 3. Proactive Mode

- **Purpose**: Smart, contextual assistance
- **Behavior**:
  - All Personalized features plus:
  - Automatic contextual insights panel
  - Proactive suggestions during conversations
  - Smart cards and recommendations

## Advanced Settings

When not in Private mode, users can fine-tune:

- **Use Budgets & Goals**: Include budget and goal data in responses
- **Use Recent Transactions**: Include spending history for insights
- **Show Proactive Cards**: Display helpful suggestions (auto-enabled in Proactive mode)
- **Cost Saver**: Use faster, more economical AI responses
- **Privacy Hard-Stop**: Never include raw numbers, only summaries

## Implementation

### Core Files

- `src/state/assistantConfig.ts` - Configuration logic and helpers
- `src/lib/eventBus.ts` - Event system for instant updates
- `src/context/profileContext.tsx` - Profile management with new preferences
- `app/(stack)/settings/assistant/index.tsx` - New settings screen
- `app/(tabs)/chat/index.tsx` - Updated chat screen

### Key Functions

- `isPersonalizationOn(config)` - Check if personalization is enabled
- `allowProactive(config)` - Check if proactive features are enabled
- `shouldEnrichPrompts(config, input)` - Determine if prompts should be enriched
- `toAssistantConfig(prefs, legacy)` - Convert preferences to config (with migration)

## Migration

The system automatically migrates from the old `aiInsights` format:

- `enabled: false` → `mode: 'private'`
- `enabled: true` → `mode: 'personalized'` (user can upgrade to `proactive`)

## Event System

Uses an event bus for instant UI updates:

- `EVT_ASSISTANT_CONFIG_CHANGED` - Emitted when settings change
- `EVT_AI_INSIGHTS_CHANGED` - Legacy support for old system

## Benefits

1. **Clearer UX**: Users understand exactly what each mode does
2. **Granular Control**: Fine-tune data usage and features
3. **Privacy-First**: Easy to understand privacy implications
4. **Cost Control**: Built-in cost saving options
5. **Instant Updates**: Real-time UI changes via event system
6. **Backward Compatible**: Seamless migration from old system

## Usage Example

```typescript
// Check if personalization is enabled
if (isPersonalizationOn(config)) {
	// Load user data for personalization
}

// Check if proactive features should be shown
if (allowProactive(config)) {
	// Show contextual insights panel
}

// Determine if prompts should be enriched
if (shouldEnrichPrompts(config, userInput)) {
	// Add contextual data to AI prompts
}
```
