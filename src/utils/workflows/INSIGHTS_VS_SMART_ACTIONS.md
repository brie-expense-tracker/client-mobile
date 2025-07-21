# AI Insights vs Smart Actions

This document explains the clear separation between AI Insights and Smart Actions in the Brie mobile app.

## Overview

The app now clearly separates two distinct types of AI-generated content:

1. **AI Insights** - Strategic observations and recommendations
2. **Smart Actions** - Tactical, actionable tasks

## AI Insights (Strategy)

### Definition

AI-generated observations, recommendations, or analysis based on user data. Insights explain financial behavior and offer strategic direction.

### Examples

- "You're on track to hit your Japan trip goal in 3 months if you keep saving $200/month."
- "Your dining out spending increased 25% this month compared to last month."
- "Your emergency fund covers 2.5 months of expenses, which is below the recommended 3-6 months."

### Characteristics

- **Strategic**: Focus on understanding and analysis
- **Observational**: Explain what's happening and why
- **Directional**: Provide guidance on financial behavior
- **Contextual**: Include historical comparisons and trends

### Data Structure

```typescript
interface AIInsight {
	title: string; // "Emergency Fund Needs Attention"
	message: string; // "Your emergency fund covers 2.5 months..."
	detailedExplanation: string; // Full analysis with context
	insightType: 'budgeting' | 'savings' | 'spending' | 'income' | 'general';
	priority: 'low' | 'medium' | 'high';
	isActionable: boolean; // Whether this insight can generate actions
	metadata: {
		// Financial data context
		totalIncome: number;
		totalExpenses: number;
		netIncome: number;
		// ... more financial metrics
	};
}
```

## Smart Actions (Tactics)

### Definition

Concrete tasks derived from insights that users can act on. These help users progress toward the insight's outcome.

### Examples

- "Skip dining out once this week and move $40 to your Travel savings."
- "Create a new budget category for 'Entertainment' with a $200 monthly limit."
- "Set a reminder to review your budget every Sunday at 6 PM."

### Characteristics

- **Tactical**: Specific, measurable tasks
- **Actionable**: Users can complete them immediately
- **Time-bound**: Have clear completion criteria
- **Progressive**: Build toward larger financial goals

### Data Structure

```typescript
interface IntelligentAction {
	type:
		| 'create_budget'
		| 'create_goal'
		| 'set_reminder'
		| 'update_preferences'
		| 'detect_completion';
	title: string; // "Reduce Takeout Spending by 30%"
	description: string; // "Skip dining out once this week..."
	parameters: Record<string, any>; // Action-specific parameters
	priority: 'low' | 'medium' | 'high';
	requiresConfirmation: boolean;
	detectionType?: string; // For auto-detection actions
	detectionCriteria?: {
		// Specific completion criteria
		threshold?: number;
		timeframe?: string;
		// ... more criteria
	};
}
```

## How They Work Together

```
User Data ➜ AI Model ➜ Insight(s)
                         ↳ Smart Action(s)
```

1. **User Data**: Transactions, budgets, goals, profile
2. **AI Analysis**: Processes data to identify patterns and opportunities
3. **Insights Generated**: Strategic observations and recommendations
4. **Actions Derived**: Each insight can generate 1-3 smart actions

### Example Flow

1. **Data**: User spends $600 on dining out this month
2. **Insight**: "Your dining out spending increased 25% this month and represents 15% of your total expenses."
3. **Smart Actions**:
   - "Create a 'Dining Out' budget category with $400 monthly limit"
   - "Skip dining out once this week and save $40"
   - "Set a reminder to review dining expenses every Friday"

## UI Implementation

### Dashboard Layout

The dashboard shows AI Insights, and when users click on an insight, they see the smart actions for that insight:

```
┌─────────────────────────────────┐
│ AI Insights                     │
│ ┌─────────────────────────────┐ │
│ │ Weekly Insight              │ │
│ │ "You're on track to hit..." │ │
│ │ [Click to see Smart Actions]│ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Smart Actions Screen
When user clicks on an insight, they see:

```
┌─────────────────────────────────┐
│ Smart Actions                   │
│ ┌─────────────────────────────┐ │
│ │ AI Insight:                  │ │
│ │ "You're on track to hit..." │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Budget Task                 │ │
│ │ "Create Entertainment..."   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Reminder Task               │ │
│ │ "Set weekly budget review"  │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Components

- `InsightsSummary`: Displays AI insights on dashboard (strategic focus)
- `SmartActionsSummary`: Displays actionable tasks (tactical focus)
- `InsightSmartActionsScreen`: Shows smart actions for a specific insight
- `AIInsightsSummary`: Legacy component (being phased out)

## Benefits of Separation

1. **Clear Mental Model**: Users understand the difference between strategy and tactics
2. **Better UX**: Each section serves a distinct purpose
3. **Improved Engagement**: Users can focus on either insights or actions
4. **Scalability**: Easier to optimize each type independently
5. **Analytics**: Better tracking of what drives user engagement

## Future Enhancements

1. **Insight Categories**: Group insights by type (spending, saving, income)
2. **Action Progress**: Track completion rates for smart actions
3. **Insight-Action Linking**: Show which actions came from which insights
4. **Personalization**: Adapt insight/action frequency based on user preferences
5. **Progressive Disclosure**: Show more detail as users engage more

## Technical Notes

- Insights are stored in the `AIInsight` model
- Actions are stored in the `Action` model
- Both respect user's AI insights preferences
- Actions can be auto-detected or manually completed
- Insights can be marked as read/unread
- Both support priority levels and categorization
