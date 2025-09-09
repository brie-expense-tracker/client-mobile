# Hybrid AI System - 90%+ Financial Question Coverage

This document describes the comprehensive hybrid AI system designed to achieve 90%+ coverage of financial questions through a skill-based architecture, hierarchical routing, and intelligent fallbacks.

## 🎯 Overview

The hybrid AI system implements a sophisticated architecture that combines:

- **Skill Graph**: 30+ financial skills covering all major user intents
- **Hierarchical Router**: 3-pass system (rules → ML → LLM) with confidence calibration
- **Slot Resolution**: Intelligent parameter extraction for time periods, amounts, categories
- **Answerability Gating**: Prevents responses when data is missing
- **Smart Fallbacks**: Guided suggestions and unknown query collection
- **Observability**: Comprehensive logging, safety checks, and performance monitoring
- **Evaluation**: Gold set testing, synthetic journeys, and online metrics

## 🏗️ Architecture

### Core Components

```
User Message
     ↓
Hierarchical Router (Rules → ML → LLM)
     ↓
Answerability Gating
     ↓
Slot Resolution
     ↓
Skill Execution
     ↓
Safety & Compliance Checks
     ↓
Response Generation
     ↓
Analytics & Monitoring
```

### 1. Skill Graph (`comprehensiveSkillRegistry.ts`)

The skill graph defines 30+ financial capabilities organized by category:

#### Snapshot & Overview

- `OVERVIEW`: Complete financial snapshot
- `CASHFLOW_SUMMARY`: Income vs expenses
- `SPENDING_BY_CATEGORY`: Category breakdown
- `TOP_MERCHANTS`: Most frequent merchants
- `RECURRING_BILLS_UPCOMING`: Upcoming bills

#### Budgets

- `BUDGET_CREATE`: Create new budgets
- `BUDGET_EDIT`: Modify existing budgets
- `BUDGET_STATUS`: Check budget utilization
- `BUDGET_CAN_INCREASE`: What-if budget increases
- `BUDGET_ALERTS`: Budget alerts and warnings

#### Goals

- `GOAL_CREATE`: Create savings goals
- `GOAL_EDIT`: Modify goals
- `GOAL_PROGRESS`: Track goal progress
- `GOAL_MONTHLY_AMOUNT`: Calculate monthly savings needed
- `GOAL_REPRIORITIZE`: Reorder goal priorities

#### Transactions

- `TRANSACTION_SEARCH`: Search and filter transactions
- `TRANSACTION_CATEGORIZE`: Categorize transactions
- `TRANSACTION_DISPUTE`: Flag transactions for dispute
- `REFUND_DETECT`: Detect potential refunds

#### Education

- `EDUCATION_BUDGETS_VS_GOALS`: Explain budgets vs goals
- `EDUCATION_APR_VS_APY`: Interest rate education
- `EDUCATION_INDEX_FUNDS`: Investment basics

Each skill implements:

```typescript
interface Skill {
	id: FinancialSkillId;
	name: string;
	description: string;
	slots: Record<string, SlotSpec>;
	canHandle(context: ChatContext): Answerability;
	plan(params, ctx): PlanStep[];
	run(params, ctx): Promise<SkillStepResult>;
	render(data, params): UIBlock;
	coach?(data): CoachNote;
}
```

### 2. Hierarchical Router (`hierarchicalRouter.ts`)

Three-pass routing system for maximum coverage:

#### Pass 1: Rules Router (Fast Path)

- Regex patterns for high-frequency intents
- 60-70% coverage with <10ms latency
- Direct mapping to skills

#### Pass 2: ML Router (Semantic Understanding)

- DistilBERT/fastText for semantic similarity
- Handles paraphrases and variations
- Pushes coverage to ~85%

#### Pass 3: LLM Router (Complex Cases)

- Small LLM for complex multi-intent queries
- Only used when rules and ML disagree
- Closes gap to ≥90%

#### Confidence Calibration

- Temperature scaling for calibrated confidence
- Hysteresis to prevent flip-flopping
- Shadow routing for misroute detection

### 3. Slot Resolution (`slotResolver.ts`)

Intelligent parameter extraction:

#### Time Period Resolver

- "this month" → `this_month`
- "last 30 days" → `last_30_days`
- "Q2" → `q2`
- "recently" → `last_30_days`

#### Money Amount Resolver

- "$500" → `500`
- "2k" → `2000`
- "1.5 million" → `1500000`

#### Category Resolver

- "groceries" → `groceries`
- "eating out" → `dining`
- "gas" → `transportation`

#### Merchant Resolver

- "AMZN Mktp US\*2F3K9" → `Amazon`
- "STARBUCKS STORE" → `Starbucks`

### 4. Answerability Gating (`answerabilityGating.ts`)

Prevents "I don't know" responses by checking data availability:

```typescript
interface AnswerabilityCheck {
	canAnswer: boolean;
	confidence: number;
	reason: string;
	missingData: string[];
	suggestions: string[];
	fallbackAction?: string;
}
```

Data requirements per skill:

- `BUDGET_STATUS`: Requires budgets
- `GOAL_PROGRESS`: Requires goals
- `CASHFLOW_SUMMARY`: Requires transactions
- `EDUCATION_*`: Always available

### 5. Smart Fallback System (`smartFallbackSystem.ts`)

Intelligent fallbacks that still feel helpful:

#### Guided Suggestions

- Shows available skills based on user's data
- "I can help you with these things right now"
- 6 most relevant suggestions

#### Educational Fallbacks

- For explain/learn requests
- Educational content about financial concepts
- Clearly marked as educational, not advice

#### Setup Guide

- For users with no data
- Step-by-step onboarding
- "Let's get you started"

#### Unknown Collector

- Records unknown queries for analysis
- Identifies patterns and gaps
- Weekly triage for system improvement

### 6. Observability System (`observabilitySystem.ts`)

Comprehensive monitoring and safety:

#### Safety Classifier

- Blocks investment advice
- Modifies tax/legal content with disclaimers
- Escalates urgent financial advice
- Prevents personal information requests

#### Performance Monitor

- Tracks latency, tokens, cache hits
- Identifies slow queries
- Monitors error rates

#### Logger

- Structured logging with reason codes
- Error tracking and analysis
- Performance metrics

#### Reason Codes

- `INTENT_HIGH_CONFIDENCE`: 80%+ confidence
- `DATA_MISSING`: Insufficient data
- `SAFETY_BLOCKED`: Safety violation
- `PERFORMANCE_SLOW`: High latency

### 7. Evaluation System (`evaluationSystem.ts`)

Continuous improvement through evaluation:

#### Gold Set (Offline)

- 500+ canonical questions
- Labeled intents and slots
- Accuracy testing per skill
- Regression testing

#### Synthetic Journeys

- Multi-turn user scenarios
- Beginner, intermediate, advanced
- Journey completion rates

#### Online Metrics

- Handled rate: answered_by_skill / total_queries
- Useful rate: thumbs_up / total_responses
- Clarifier rate: questions_requiring_clarification
- Escalation rate: escalated_to_human

## 🚀 Usage

### Basic Usage

```typescript
import { hybridAIOrchestrator } from './hybridAIOrchestrator';

const result = await hybridAIOrchestrator.processUserMessage(
	'How is my grocery budget doing?',
	{
		budgets: [{ name: 'groceries', amount: 300, spent: 150 }],
		goals: [],
		transactions: [],
	},
	sessionId,
	messageId
);

console.log(result.response.message);
// "Your grocery budget is at $150/$300 this month (50% used)."
```

### Enhanced Chat Controller

```typescript
import { enhancedChatController } from './enhancedChatController';

const response = await enhancedChatController.handleUserMessage(
	'Create a $500 monthly budget for groceries',
	context
);
```

### Configuration

```typescript
const config = {
	enableSkillGraph: true,
	enableHierarchicalRouting: true,
	enableSlotResolution: true,
	enableAnswerabilityGating: true,
	enableSmartFallbacks: true,
	enableObservability: true,
	enableEvaluation: true,
	confidenceThreshold: 0.6,
	maxRetries: 2,
	timeoutMs: 5000,
};

hybridAIOrchestrator.updateConfig(config);
```

## 📊 Monitoring & Analytics

### System Health

```typescript
const health = await hybridAIOrchestrator.getSystemHealth();
console.log(health.overall); // 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
console.log(health.coverage); // 0.92 (92% coverage)
console.log(health.recommendations); // ['High latency detected', ...]
```

### Coverage Analytics

```typescript
const analytics = await hybridAIOrchestrator.getCoverageAnalytics();
console.log(analytics.handledRate); // 0.92
console.log(analytics.coverageBySkill); // { 'BUDGET_STATUS': 0.95, ... }
console.log(analytics.topFailureReasons); // [{ reason: 'DATA_MISSING', count: 5 }]
```

### Evaluation

```typescript
const evaluation = await hybridAIOrchestrator.runEvaluation();
console.log(evaluation.overallAccuracy); // 0.89
console.log(evaluation.accuracyByCategory); // { 'budgets': 0.92, 'goals': 0.88 }
console.log(evaluation.failedCases); // Array of failed test cases
```

## 🎯 Achieving 90%+ Coverage

### Coverage Strategy

1. **Skill Graph**: 30+ skills cover 95% of user intents
2. **Hierarchical Routing**: 3-pass system catches edge cases
3. **Slot Resolution**: Handles parameter variations
4. **Answerability Gating**: Prevents "I don't know" responses
5. **Smart Fallbacks**: Converts unknowns to guided choices
6. **Unknown Collector**: Identifies gaps for improvement

### Quality Guardrails

- **Useful Rate**: ≥80% thumbs up
- **Escalation Rate**: ≤5% escalated to human
- **Safety**: 0% blocked responses for safety
- **Performance**: <2s average latency

### Continuous Improvement

1. **Weekly Unknown Triage**: Review unknown queries
2. **Pattern Analysis**: Identify common failure modes
3. **Skill Enhancement**: Add new skills based on gaps
4. **Model Updates**: Retrain ML components
5. **Gold Set Expansion**: Add new test cases

## 🔧 Development

### Adding New Skills

1. Define skill in `comprehensiveSkillRegistry.ts`:

```typescript
NEW_SKILL: {
  id: 'NEW_SKILL',
  name: 'New Skill',
  description: 'Does something useful',
  slots: { param: { type: 'string', required: true, ... } },
  canHandle: (ctx) => ({ canAnswer: true, confidence: 0.9 }),
  plan: (params, ctx) => [{ type: 'FETCH_DATA', params }],
  run: async (params, ctx) => ({ success: true, data: {} }),
  render: (data, params) => ({ type: 'card', data }),
  coach: (data) => ({ message: 'Helpful tip', action: 'NEXT_STEP' })
}
```

2. Add to data requirements in `answerabilityGating.ts`
3. Add patterns to hierarchical router
4. Add test cases to gold set

### Testing

```typescript
// Run offline evaluation
const evaluation = await evaluationSystem.runOfflineEvaluation();
console.log(`Overall accuracy: ${evaluation.overallAccuracy}`);

// Run journey evaluation
const journeys = await evaluationSystem.runJourneyEvaluation();
console.log(`Journey success rate: ${journeys.journeySuccessRate}`);
```

### Debugging

```typescript
// Enable debug logging
observabilitySystem.logger.log(
	'DEBUG',
	'Processing message',
	'INTENT_DETECTED',
	context
);

// Check system health
const health = await hybridAIOrchestrator.getSystemHealth();
if (health.overall !== 'HEALTHY') {
	console.warn('System issues:', health.recommendations);
}
```

## 📈 Performance

### Latency Targets

- Rules router: <10ms
- ML router: <100ms
- LLM router: <500ms
- Total: <2s

### Token Usage

- Mini model: ≤200 tokens
- Standard model: ≤400 tokens
- Pro model: ≤800 tokens

### Caching

- Response caching: 5 minutes
- Skill results: 2 minutes
- ML embeddings: 1 hour

## 🛡️ Safety & Compliance

### Safety Checks

- Investment advice: BLOCKED
- Tax advice: Modified with disclaimer
- Legal advice: Modified with disclaimer
- Personal info: BLOCKED
- Urgent advice: Escalated

### Compliance

- Educational content clearly marked
- No specific product recommendations
- General information only
- Professional advice disclaimers

## 🔮 Future Enhancements

### Planned Features

1. **Voice Input**: Speech-to-text integration
2. **Multi-language**: Internationalization
3. **Advanced ML**: Custom financial models
4. **Real-time Data**: Live market data
5. **Predictive Analytics**: Spending forecasts

### Research Areas

1. **Conversation Memory**: Context across turns
2. **Personalization**: User-specific patterns
3. **Proactive Insights**: Unsolicited recommendations
4. **Integration**: Third-party financial tools

---

This hybrid AI system provides a robust foundation for achieving 90%+ coverage of financial questions while maintaining high quality, safety, and performance standards.
