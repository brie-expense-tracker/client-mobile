# Intent Mapper - Consistent Answer Patterns

The Intent Mapper system ensures that the AI assistant provides consistent, predictable responses for common user intents. This creates a deliberate, interconnected experience that feels like the AI is truly part of the app.

## Overview

Instead of generating completely different responses each time, the Intent Mapper maps common intents to consistent patterns with:

1. **Primary Data** - The main information the user requested
2. **Extra Context** - Additional insights or warnings
3. **Actions** - Quick action buttons that integrate with the app

## Supported Intents

### GET_BALANCE
**User asks:** "How much do I have available?" / "What's my balance?"

**Primary Data:** Numbers by account/budget
**Extra Context:** Short "what changed" vs last week
**Actions:** OPEN_BUDGETS

**Example Response:**
```
You have $450.00 available across 3 budgets
You're up $25.00 from last week

[Balance Card] $450.00 available
[Action] View Budgets
```

### GET_BUDGET_STATUS
**User asks:** "What's my budget status?" / "How much have I used?"

**Primary Data:** % used + pressured category
**Extra Context:** Tip to free up money
**Actions:** ADJUST_LIMIT, OPEN_BUDGETS

**Example Response:**
```
Food is at 85% - $75.00 remaining
Tip: You could free up $120.00 by reducing other categories

[Budget Status Card] Food at 85%
[Actions] Adjust Limit, View All Budgets
```

### LIST_SUBSCRIPTIONS
**User asks:** "Show my subscriptions" / "What recurring expenses do I have?"

**Primary Data:** List with next due dates
**Extra Context:** Risky ones (low utility, high cost)
**Actions:** VIEW_RECURRING, CREATE_RULE

**Example Response:**
```
You have 5 subscriptions totaling $89.99/month
2 risky subscriptions costing $45.99/month

[Subscriptions Card] 5 active, $89.99/month
[Actions] View Recurring, Create Rule
```

### FORECAST_SPEND
**User asks:** "What will I spend next month?" / "Predict my spending"

**Primary Data:** Next 30 days + confidence level
**Extra Context:** Disclaimer about data quality
**Actions:** OPEN_BUDGETS

**Example Response:**
```
You're projected to spend $1,250.00 in the next 30 days
Disclaimer: Based on 15 recent transactions. Confidence: high

[Forecast Card] $1,250.00, Next 30 days • high confidence
[Action] View Budgets
```

### CATEGORIZE_TX
**User asks:** "What category is this?" / "Categorize this transaction"

**Primary Data:** Guess + confidence level
**Extra Context:** 1-tap confirm/override options
**Actions:** CREATE_RULE (confirm/override)

**Example Response:**
```
I suggest categorizing this as Food (85% confident)
Low confidence - you may want to manually categorize

[Actions] Confirm, Override
```

## Implementation Details

### Intent Detection
The system automatically detects intents using keyword matching:
- `detectIntent("How much do I have?")` → `GET_BALANCE`
- `detectIntent("Budget status")` → `GET_BUDGET_STATUS`

### Response Generation
Each intent has a pattern that generates consistent responses:
```typescript
const response = generateIntentResponse('GET_BALANCE', financialContext);
```

### Data Transformation
The system transforms app data to match the expected format:
```typescript
const transformedBudgets = budgets.map(budget => ({
  name: budget.name,
  amount: budget.amount,
  spent: budget.spent || 0,
  remaining: budget.amount - (budget.spent || 0),
  utilization: budget.spent ? (budget.spent / budget.amount) * 100 : 0
}));
```

## UI Components

### StructuredResponseCard
Displays the structured response with:
- Main message and details
- Horizontal scrolling cards
- Action buttons
- Source attribution

### Card Types
- **Balance Card:** Shows total available amount
- **Budget Card:** Shows budget status with pressure indicators
- **Subscriptions Card:** Shows subscription count and monthly cost
- **Forecast Card:** Shows spending prediction with confidence

## Benefits

1. **Consistency** - Users get predictable responses for similar questions
2. **Integration** - Actions directly connect to app functionality
3. **Efficiency** - Faster responses using pre-built patterns
4. **Trust** - Users know what to expect from the AI
5. **Actionable** - Every response includes relevant next steps

## Usage Examples

```typescript
import { detectIntent, generateIntentResponse } from './intentMapper';

// In your message handler
const intent = detectIntent(userQuestion);
if (intent) {
  const response = generateIntentResponse(intent, financialContext);
  // Display structured response with cards and actions
}
```

## Testing

Use the built-in test function:
```typescript
import { testIntentMapper } from './intentMapper';

// Run in development
testIntentMapper();
```

## Future Enhancements

- Add more intent types (e.g., GOAL_PROGRESS, SPENDING_PATTERNS)
- Machine learning-based intent detection
- Personalized response patterns based on user preferences
- Integration with more app actions and screens
