# Structured Responses for AI Assistant

This document describes the new structured response system that replaces the one-shot chat approach with actionable, structured answers.

## Overview

The structured response system transforms AI responses into JSON "contracts" that the UI understands and can render as interactive elements with cards, actions, and inline data.

## Response Schema

```typescript
export type ChatResponse = {
	message: string; // brief, friendly summary
	details?: string; // optional deeper explanation
	cards?: Array<{
		// inline UI elements
		type: 'balance' | 'budget' | 'subscriptions' | 'forecast';
		data: any;
	}>;
	actions?: Array<{
		// buttons that call app functions
		label: string;
		action: 'OPEN_BUDGETS' | 'CREATE_RULE' | 'ADJUST_LIMIT' | 'VIEW_RECURRING';
		params?: any;
	}>;
	sources?: Array<{ kind: 'cache' | 'localML' | 'db' | 'gpt'; note?: string }>;
	cost?: { model: 'mini' | 'std' | 'pro'; estTokens: number };
};
```

## Response Composers

The system includes pre-built composer functions for common response types:

### `composeBudgetStatus(ans, ctx)`

Creates budget overview responses with spending percentages and category breakdowns.

**Example:**

```typescript
const response = composeBudgetStatus(budgetData, context);
// Returns structured response with budget cards and adjust limit actions
```

### `composeSpendingInsight(insight, ctx)`

Creates spending analysis responses with forecast data and actionable insights.

### `composeGoalProgress(goal, ctx)`

Creates goal progress responses with completion percentages and target information.

### `composeGenericResponse(text, context?)`

Creates generic responses for non-specific queries.

## Usage in Components

### 1. MessageBubble Integration

The `MessageBubble` component now handles structured responses:

```typescript
<MessageBubble
	m={message}
	onAction={handleStructuredAction}
	// ... other props
/>
```

### 2. Action Handling

Actions are handled by the `handleStructuredAction` function:

```typescript
const handleStructuredAction = useCallback(
	(action: string, params?: any) => {
		switch (action) {
			case 'OPEN_BUDGETS':
				router.push('/(tabs)/budgets/');
				break;
			case 'ADJUST_LIMIT':
				router.push(`/(tabs)/budgets/editBudget?category=${params.cat}`);
				break;
			// ... other actions
		}
	},
	[router]
);
```

### 3. Response Composition

AI responses are automatically converted to structured format:

```typescript
const structuredResponse = composeStructuredResponse(aiResponse, userQuestion);
const aiMessage: Message = {
	type: 'structured',
	structuredResponse: structuredResponse,
	// ... other properties
};
```

## UI Components

### StructuredResponse Component

Renders structured responses with:

- Main message text
- Optional details
- Horizontal scrollable cards
- Action buttons
- Source indicators and cost information

### Card Types

1. **Budget Cards**: Show spending vs. limit with percentages
2. **Balance Cards**: Display current vs. target amounts
3. **Forecast Cards**: Present predictions and analysis

### Action Buttons

Interactive buttons that trigger app navigation:

- `OPEN_BUDGETS`: Navigate to budget overview
- `ADJUST_LIMIT`: Edit specific budget categories
- `CREATE_RULE`: Set up recurring expense rules
- `VIEW_RECURRING`: View recurring expenses

## Benefits

1. **Actionable**: Every response includes relevant actions users can take
2. **Visual**: Cards provide quick data visualization
3. **Consistent**: Standardized response format across all AI interactions
4. **Efficient**: Reduces need for follow-up questions
5. **Trackable**: Source and cost information for transparency

## Migration from One-Shot Chat

The system automatically converts existing AI responses to structured format:

1. **Text Analysis**: Analyzes user questions for intent
2. **Context Matching**: Maps responses to appropriate composer functions
3. **Data Enrichment**: Adds relevant cards and actions based on user data
4. **Fallback Handling**: Gracefully falls back to generic responses when needed

## Testing

Use the `StructuredResponseDemo` component to test different response types:

```typescript
import StructuredResponseDemo from './components/StructuredResponseDemo';

// In your test screen
<StructuredResponseDemo />;
```

## Future Enhancements

- **Custom Card Types**: Add new card types for different data visualizations
- **Advanced Actions**: Support for more complex app interactions
- **Response Templates**: Pre-built response templates for common scenarios
- **A/B Testing**: Test different response formats for user engagement
