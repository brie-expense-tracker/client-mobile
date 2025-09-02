# End-to-End Chat Flow Controller

This implementation provides a unified chat controller that orchestrates the complete flow from user message to AI response, gluing together all the components: intent detection, grounding, model selection, narration, critic validation, and analytics.

## 🎯 Overview

The `ChatController` implements the exact flow specified in the requirements:

```typescript
export async function handleUserMessage(q: string, ctx) {
	const intent = detectIntent(q);
	const grounded = await tryGrounded(intent, { query: q }, ctx);

	const model = pickModel(intent, q);
	const facts = grounded?.payload ?? { note: 'no facts' };

	// Compose facts → ask model for narration (or template if no LLM allowed)
	const narration = grounded
		? await llm.narrate(model, narrationPrompt(facts, ctx.userProfile))
		: null;

	// Critic pass (mini), else fallback
	const vetted = narration ? await llm.critic('mini', narration) : null;

	const response = vetted?.ok
		? postProcessToResponse(vetted.text, facts) // parse proposed actions + build cards
		: grounded // grounded but model failed → templated composer
		? composeFromFactsWithoutLLM(intent, facts)
		: helpfulFallback(q, ctx);

	analytics.logChat(/* … */);
	return response; // ChatResponse
}
```

## 🏗️ Architecture

### Core Components

1. **ChatController** - Main orchestrator class
2. **Intent Detection** - Maps user queries to intents
3. **Grounding Service** - Extracts local data and facts
4. **Model Selection** - Picks appropriate AI model (mini/std/pro)
5. **Narration Generation** - Creates AI responses using hybrid optimization
6. **Critic Validation** - Mini model validates responses
7. **Response Composition** - Builds structured responses with actions/cards
8. **Analytics** - Tracks quality metrics and user satisfaction

### Flow Diagram

```
User Message → Intent Detection → Grounding → Model Selection
     ↓
Narration Generation → Critic Validation → Response Composition
     ↓
Analytics Logging → Structured Response
```

## 🚀 Implementation Details

### Step 1: Intent Detection

```typescript
const intent = detectIntent(query);
```

- Maps user queries to predefined intents
- Enables consistent response patterns
- Supports: GET_BALANCE, FORECAST_SPEND, GET_BUDGET_STATUS, etc.

### Step 2: Grounding

```typescript
const grounded = await this.tryGrounded(intent, { query }, context);
```

- Attempts to extract relevant local data
- Uses GroundingService for fact extraction
- Provides confidence scores for data quality

### Step 3: Model Selection

```typescript
const model = pickModel(intent, query);
```

- Routes to appropriate model tier:
  - **mini**: ≤200 tokens, general queries
  - **std**: ≤400 tokens, specific intents
  - **pro**: ≤800 tokens, strategy/planning only

### Step 4: Narration Generation

```typescript
const narration = await this.generateNarration(
	model,
	facts,
	context.userProfile,
	query
);
```

- Uses hybrid cost optimization for efficiency
- Falls back to template-based responses if LLM unavailable
- Integrates with routeModel for cost control

### Step 5: Critic Validation

```typescript
const vetted = await this.criticValidation('mini', narration, facts);
```

- Mini model validates response quality
- Checks for forbidden patterns (investment advice, etc.)
- Ensures fact consistency and response adequacy

### Step 6: Response Composition

```typescript
if (vetted?.ok && narration) {
	response = await this.postProcessToResponse(vetted.text, facts, intent);
} else if (grounded && grounded.confidence > threshold) {
	response = await this.composeFromFactsWithoutLLM(intent, facts, query);
} else {
	response = helpfulFallback(query, context);
}
```

- **Validated Narration**: Uses AI-generated response
- **Grounded Facts**: Composes from local data without LLM
- **Helpful Fallback**: Generic assistance when all else fails

### Step 7: Analytics Logging

```typescript
logChat({
	intent,
	usedGrounding: !!grounded,
	model,
	tokensIn,
	tokensOut,
	hadActions: !!response.actions?.length,
	hadCard: !!response.cards?.length,
	fallback: !grounded || grounded.confidence <= threshold,
	// ... other metrics
});
```

- Tracks response quality and performance
- Enables monitoring and improvement
- No PII collection

## 📱 Usage

### Basic Implementation

```typescript
import { handleUserMessage, ChatContext } from './chatController';

const context: ChatContext = {
	userProfile: { monthlyIncome: 5000, financialGoal: 'save' },
	budgets: [{ name: 'Groceries', amount: 500, spent: 300 }],
	goals: [{ name: 'Vacation', target: 2000, current: 800 }],
	transactions: [{ amount: 50, date: new Date(), type: 'expense' }],
	currentUsage: {
		subscriptionTier: 'free',
		currentTokens: 100,
		tokenLimit: 1000,
	},
};

const response = await handleUserMessage('What is my budget status?', context);
```

### Advanced Configuration

```typescript
import { ChatController } from './chatController';

const controller = new ChatController(context, {
	enableLLM: true,
	enableCritic: true,
	enableAnalytics: true,
	maxRetries: 3,
	fallbackThreshold: 0.7,
});

const response = await controller.handleUserMessage(query, context);
```

### Configuration Options

- **enableLLM**: Enable/disable AI model usage
- **enableCritic**: Enable/disable response validation
- **enableAnalytics**: Enable/disable telemetry
- **maxRetries**: Maximum retry attempts
- **fallbackThreshold**: Confidence threshold for fallbacks

## 🔄 Response Flow Examples

### Example 1: Successful Grounding + Narration + Validation

```
User: "What is my budget status?"
Intent: GET_BUDGET_STATUS
Grounding: ✅ Success (confidence: 0.9)
Model: mini
Narration: "Based on your budgets, you have spent $450 out of $700 total."
Critic: ✅ Passed
Response: Structured response with actions and cards
Source: validated_narration
```

### Example 2: Grounding Success + Narration Failure

```
User: "Show me my spending trends"
Intent: FORECAST_SPEND
Grounding: ✅ Success (confidence: 0.8)
Model: std
Narration: ❌ Failed (LLM unavailable)
Critic: N/A
Response: Composed from grounded facts
Source: grounded_facts
```

### Example 3: Complete Failure

```
User: "What should I invest in?"
Intent: GENERAL_QA
Grounding: ❌ Failed
Model: N/A
Narration: N/A
Critic: N/A
Response: Helpful fallback
Source: helpful_fallback
```

## 🧪 Testing

### Run Test Suite

```bash
npm test -- chatController.test.ts
```

### Test Coverage

- End-to-end flow scenarios
- Fallback mechanisms
- Error handling
- Configuration management
- Response source determination

## 📊 Analytics Integration

### Automatic Metrics

- Intent distribution
- Grounding success rates
- Model usage patterns
- Response quality indicators
- Performance metrics

### Quality Monitoring

- Fallback rates
- User satisfaction
- Response relevance
- Error patterns

## 🔒 Error Handling

### Graceful Degradation

1. **Chat Controller Fails**: Falls back to old AI flow
2. **Grounding Fails**: Uses helpful fallback
3. **Narration Fails**: Composes from facts
4. **Critic Fails**: Uses grounded facts
5. **All Fail**: Generic assistance

### Error Recovery

- Automatic retry mechanisms
- Fallback response generation
- Error logging and analytics
- User-friendly error messages

## 🚀 Performance Optimizations

### Cost Efficiency

- Hybrid model selection
- Token usage optimization
- Grounding layer prioritization
- Cached response utilization

### Response Speed

- Parallel processing where possible
- Early termination on failures
- Optimized fact extraction
- Efficient model routing

## 🔧 Configuration Management

### Runtime Updates

```typescript
controller.updateConfig({
	enableLLM: false, // Disable AI during maintenance
	fallbackThreshold: 0.8, // More strict quality requirements
});
```

### Environment-Specific Settings

```typescript
const config = {
	enableLLM: process.env.NODE_ENV === 'production',
	enableCritic: true,
	enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
	maxRetries: process.env.NODE_ENV === 'development' ? 1 : 3,
	fallbackThreshold: 0.6,
};
```

## 📈 Monitoring & Debugging

### Console Logging

All steps logged with 🔍 prefix:

```
🔍 [ChatController] Processing query: What is my budget status?
🔍 [ChatController] Detected intent: GET_BUDGET_STATUS
🔍 [ChatController] Grounding result: { success: true, confidence: 0.9 }
🔍 [ChatController] Selected model: mini
🔍 [ChatController] Facts extracted: { hasFacts: true, factCount: 3 }
🔍 [ChatController] Narration generated: { length: 45, model: mini }
🔍 [ChatController] Critic validation: { passed: true, issues: 0 }
🔍 [ChatController] Using validated narration response
🔍 [ChatController] Response composed: { messageLength: 45, hasActions: true, responseTime: 1200ms }
```

### Response Source Tracking

- **validated_narration**: AI response passed critic
- **grounded_facts**: Composed from local data
- **failed_critic**: AI response failed validation
- **helpful_fallback**: Generic assistance
- **error_fallback**: Error recovery

## 🎯 Success Metrics

### Quality Targets

- **Grounding Success**: >80% of queries
- **Critic Pass Rate**: >90% of AI responses
- **Fallback Rate**: <20% of total responses
- **Response Time**: <2000ms average

### Business Impact

- Unified chat experience
- Consistent response quality
- Efficient resource usage
- Actionable insights for improvement

This end-to-end flow controller provides a robust, efficient, and maintainable chat system that gracefully handles all scenarios while maintaining high quality and performance standards.
