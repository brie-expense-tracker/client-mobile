# Enhanced Intent & Routing System

## Overview

The Enhanced Intent & Routing System implements advanced intent detection with confidence calibration, multi-label support, hysteresis, and shadow routing to reduce misroutes and make the AI assistant feel "smart."

## Key Features

### 1. Multi-Label Intents with Scores

- **Primary Intent**: The most confident intent for routing
- **Secondary Intents**: Additional detected intents with confidence scores
- **Context-Aware Scoring**: Boosts confidence based on available financial data

### 2. Calibrated Confidence

- **Temperature Scaling**: Applies softmax with temperature parameter for calibration
- **Bias & Scale**: Adjusts confidence scores based on empirical accuracy
- **Human-Readable Levels**: Low, Medium, High confidence indicators

### 3. Hysteresis on Confidence

- **Enter Threshold**: 0.6 confidence needed to enter grounded path
- **Exit Threshold**: 0.55 confidence needed to remain in grounded path
- **Stability Time**: Minimum 5 seconds to prevent flip-flopping
- **Variance Analysis**: Applies hysteresis when confidence is stable

### 4. Shadow Routing

- **Background Computation**: Calculates alternative routes without user exposure
- **Misroute Detection**: Logs confidence deltas to surface routing issues
- **Alternative Responses**: Generates responses for secondary intents

### 5. Explicit UNKNOWN Intent

- **Clarifying Questions**: Always returns helpful clarification
- **1-Tap Choices**: Quick selection of common financial intents
- **Smart Fallback**: Prevents system from guessing user intent

## Architecture

### Core Components

#### EnhancedIntentMapper

```typescript
class EnhancedIntentMapper {
	// Multi-label intent detection
	async detectMultiLabelIntents(
		query: string,
		context?: FinancialContext
	): Promise<IntentScore[]>;

	// Routing decisions with hysteresis
	async makeRouteDecision(
		query: string,
		context?: FinancialContext
	): Promise<RouteDecision>;

	// Confidence calibration
	private calibrateConfidence(rawScore: number): number;

	// Hysteresis logic
	private shouldApplyHysteresis(currentConfidence: number): boolean;

	// Shadow routing
	private async computeShadowRoute(
		query: string,
		primaryIntent: Intent,
		context?: FinancialContext
	);
}
```

#### IntentScore Interface

```typescript
interface IntentScore {
	intent: Intent;
	p: number; // Raw probability from model
	calibratedP: number; // Calibrated probability (0-1)
	confidence: 'low' | 'medium' | 'high';
}
```

#### RouteDecision Interface

```typescript
interface RouteDecision {
	primary: IntentScore;
	secondary?: IntentScore[];
	calibrated: boolean;
	routeType: 'grounded' | 'llm' | 'unknown';
	shadowRoute?: {
		alternativeIntent: Intent;
		alternativeResponse: ChatResponse;
		delta: number;
	};
}
```

### Intent Types

```typescript
type Intent =
	| 'GET_BALANCE'
	| 'GET_BUDGET_STATUS'
	| 'LIST_SUBSCRIPTIONS'
	| 'FORECAST_SPEND'
	| 'CREATE_BUDGET'
	| 'GET_GOAL_PROGRESS'
	| 'GET_SPENDING_BREAKDOWN'
	| 'CATEGORIZE_TX'
	| 'GENERAL_QA'
	| 'UNKNOWN';
```

## Usage

### Basic Intent Detection

```typescript
import { enhancedIntentMapper } from './enhancedIntentMapper';

// Detect multiple intents
const intents = await enhancedIntentMapper.detectMultiLabelIntents(
	'How much have I spent and what will I spend next month?'
);

// Get routing decision
const decision = await enhancedIntentMapper.makeRouteDecision(
	'Show me my budget status'
);
```

### Integration with Chat Controller

```typescript
// Enhanced intent detection before chat processing
const routeDecision = await enhancedIntentMapper.makeRouteDecision(
	query,
	chatContext
);

// Handle UNKNOWN intent
if (routeDecision.primary.intent === 'UNKNOWN') {
	// Show clarifying questions
	return;
}

// Proceed with normal chat flow
const chatResponse = await handleUserMessage(query, chatContext);
```

### UI Components

#### UnknownIntentClarifier

- Displays clarifying questions for UNKNOWN intents
- Provides 1-tap choices for common financial intents
- Integrates with secondary intent selection

#### IntentConfidenceDisplay

- Shows primary intent with confidence score
- Lists secondary intents with clickable selection
- Displays route type and calibration status
- Optional shadow route information

## Configuration

### Calibration Parameters

```typescript
interface CalibrationParams {
	temperature: number; // Default: 0.3
	bias: number; // Default: 0.1
	scale: number; // Default: 1.2
}
```

### Hysteresis Configuration

```typescript
interface HysteresisConfig {
	enterThreshold: number; // Default: 0.6
	exitThreshold: number; // Default: 0.55
	minStableTime: number; // Default: 5000ms
}
```

## Performance Considerations

### Confidence History

- Maintains last 10 confidence decisions
- Used for variance analysis and stability detection
- Automatic cleanup to prevent memory bloat

### Shadow Routing

- Computed asynchronously to avoid blocking user experience
- Only generates alternative responses when confidence delta is significant
- Integrates with existing response generation pipeline

### Context-Aware Scoring

- Applies boosts based on available financial data
- Prevents over-confidence when data is sparse
- Balances pattern matching with data availability

## Monitoring & Analytics

### System Statistics

```typescript
const stats = enhancedIntentMapper.getSystemStats();
// Returns: calibrationParams, hysteresisConfig, lastRouteTime,
//          confidenceHistoryLength, averageConfidence
```

### Analytics Integration

- Tracks primary vs secondary intent selection
- Monitors confidence calibration accuracy
- Logs shadow route deltas for misroute detection
- Records route type distribution

### Feedback Loop

```typescript
// Update calibration based on user feedback
enhancedIntentMapper.updateCalibration({
	expectedIntent: 'GET_BUDGET_STATUS',
	actualIntent: 'GET_BALANCE',
	confidence: 0.7,
});
```

## Testing

### Unit Tests

- Multi-label intent detection
- Confidence calibration accuracy
- Hysteresis logic validation
- Shadow route computation

### Integration Tests

- End-to-end routing flow
- UI component interaction
- Chat controller integration
- Performance under load

## Future Enhancements

### Machine Learning Integration

- **Online Learning**: Update patterns based on user feedback
- **Confidence Refinement**: Use actual accuracy to improve calibration
- **Intent Evolution**: Learn new intent patterns over time

### Advanced Hysteresis

- **Context-Aware Thresholds**: Adjust based on conversation state
- **User Preference Learning**: Adapt to individual user patterns
- **Dynamic Stability Detection**: Real-time confidence variance analysis

### Enhanced Shadow Routing

- **Multi-Intent Comparison**: Compare multiple alternative routes
- **Response Quality Metrics**: Evaluate alternative response quality
- **A/B Testing**: Experiment with different routing strategies

## Troubleshooting

### Common Issues

#### Low Confidence Scores

- Check calibration parameters
- Verify financial context availability
- Review intent pattern definitions

#### Frequent Route Switching

- Adjust hysteresis thresholds
- Increase minimum stability time
- Check confidence variance patterns

#### Shadow Route Failures

- Verify response generation pipeline
- Check alternative intent availability
- Review error handling in shadow computation

### Debug Mode

```typescript
// Enable detailed logging
const decision = await enhancedIntentMapper.makeRouteDecision(query, context);
console.log('Route Decision:', {
	primary: decision.primary,
	secondary: decision.secondary,
	routeType: decision.routeType,
	shadowRoute: decision.shadowRoute,
});
```

## Migration Guide

### From Legacy Intent System

1. Replace `detectIntent()` calls with `makeRouteDecision()`
2. Update intent type imports to use new `Intent` type
3. Integrate UI components for enhanced intent display
4. Update analytics to track new metrics

### Backward Compatibility

- Legacy `detectIntent()` function maintained for compatibility
- Existing intent types mapped to new system
- Gradual migration path available

## Contributing

### Adding New Intents

1. Define intent patterns in `detectMultiLabelIntents()`
2. Add context boost logic in `applyContextBoost()`
3. Update intent type definition
4. Add test coverage

### Improving Confidence Calibration

1. Collect empirical accuracy data
2. Adjust temperature, bias, and scale parameters
3. Validate against held-out test set
4. Monitor production performance

### Enhancing Hysteresis

1. Analyze conversation flow patterns
2. Adjust thresholds based on user experience
3. Implement context-aware stability detection
4. Test with diverse user scenarios
