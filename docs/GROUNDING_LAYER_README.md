# Grounding Layer Implementation

## Overview

The Grounding Layer is a critical component that prevents AI hallucinations by using structured, deterministic data instead of prose descriptions. It ensures that all financial calculations and responses are based on verifiable facts from the app's data.

## Key Components

### 1. FactPack Schema (`src/components/assistant/factPack.ts`)

The FactPack is a structured JSON schema that contains all financial data in a deterministic format:

```typescript
interface FactPack {
  time_window: {
    start: string;        // ISO date string
    end: string;          // ISO date string
    tz: string;           // IANA timezone
    period: string;       // Human readable (e.g., "Aug 1-25, PDT")
  };
  balances: Array<{...}>;     // Account balances
  budgets: Array<{...}>;      // Budget status with calculated fields
  goals: Array<{...}>;        // Goal progress with calculated fields
  recurring: Array<{...}>;    // Recurring expenses
  recentTransactions: Array<{...}>; // Last 30 days
  spendingPatterns: {...};    // Calculated insights
  userProfile: {...};         // User preferences
  metadata: {...};            // Cache and validation info
}
```

**Key Features:**

- **Explicit time windows** prevent "why don't numbers match?" confusion
- **Deterministic calculations** - AI never computes money from raw transactions
- **Data validation** ensures integrity before use
- **Hash-based caching** for instant responses to repeated queries

### 2. FactPackCalculator (`src/components/assistant/factPack.ts`)

Static utility class that provides deterministic calculations:

```typescript
class FactPackCalculator {
	static calculateUtilization(spent: number, limit: number): number;
	static determineBudgetStatus(spent: number, limit: number): Status;
	static calculateGoalProgress(current: number, target: number): number;
	static determineGoalStatus(
		current: number,
		target: number,
		deadline: string
	): Status;
	static generateHash(factPack: FactPack): string;
	static validateFactPack(factPack: FactPack): ValidationResult;
}
```

**Why this matters:** The AI model should only explain and interpret data, never perform financial calculations. All math is done deterministically by these functions.

### 3. GroundingLayerService (`src/services/feature/groundingLayerService.ts`)

Core service that generates grounded responses using FactPack data:

```typescript
class GroundingLayerService {
	generateFactPack(budgets, goals, transactions, profile): FactPack;
	generateGroundedResponse(userQuestion, factPack, intent): GroundedResponse;
	getCacheStats(): CacheStats;
}
```

**Features:**

- **Semantic caching** with key = (intent, canonicalized_query, FactPack.hash)
- **Instant responses** for repeated questions with same data
- **Fallback to AI** only when grounding confidence is low
- **Cache management** with TTL and size limits

### 4. FactPackDisplay Component (`app/(tabs)/chat/components/FactPackDisplay.tsx`)

UI component that renders structured data directly:

```typescript
interface FactPackDisplayProps {
	factPack: FactPack;
	onRefresh?: () => void;
	showDetails?: boolean;
	compact?: boolean;
}
```

**Benefits:**

- **Transparency** - users see exactly what data the AI used
- **No confusion** - numbers always match between display and AI response
- **Compact mode** for inline display in chat bubbles
- **Full mode** for detailed analysis panel

## How It Works

### 1. Data Flow

```
App Data → FactPackBuilder → FactPack → GroundingLayerService → GroundedResponse
   ↓              ↓           ↓              ↓                    ↓
Budgets      Calculations  Validation    Cache Check         UI Display
Goals        Status        Hash Gen      Response Gen       FactPack Panel
Transactions Patterns      Metadata      Fallback to AI     Chat Bubbles
```

### 2. Response Generation

1. **User asks question** (e.g., "How much budget do I have left?")
2. **Intent detection** determines question type
3. **FactPack generation** creates structured data snapshot
4. **Cache check** - if same question + same data, return instantly
5. **Grounded response** using only FactPack data (no hallucinations)
6. **Fallback to AI** only if grounding confidence < 80%

### 3. Caching Strategy

```typescript
const cacheKey = `${intent}:${canonicalizedQuery}:${factPackHash}`;
```

- **Intent**: Question type (GET_BUDGET_STATUS, etc.)
- **Canonicalized Query**: Normalized, punctuation-free question
- **FactPack Hash**: SHA-256 hash of all financial data

This ensures cache hits for semantically identical questions with the same underlying data.

## Usage Examples

### Basic FactPack Generation

```typescript
const groundingService = new GroundingLayerService();
const factPack = groundingService.generateFactPack(
	budgets,
	goals,
	transactions,
	profile,
	'America/Los_Angeles'
);
```

### Generating Grounded Response

```typescript
const response = await groundingService.generateGroundedResponse(
	'How much budget do I have left?',
	factPack,
	'GET_BUDGET_STATUS'
);

// Response includes:
// - Deterministic answer based on FactPack data
// - Confidence score
// - Data sources
// - Calculation details
```

### Displaying in UI

```typescript
// Compact mode in chat bubble
<FactPackDisplay factPack={factPack} compact={true} />

// Full mode in panel
<FactPackDisplay factPack={factPack} showDetails={true} />
```

## Benefits

### 1. **No Hallucinations**

- AI never invents numbers or calculations
- All responses based on verifiable FactPack data
- Deterministic calculations prevent inconsistencies

### 2. **Instant Responses**

- Cache hits provide sub-100ms responses
- No API calls for repeated questions
- Reduced costs and latency

### 3. **Transparency**

- Users see exactly what data was used
- Time windows are explicit and clear
- No confusion about data freshness

### 4. **Performance**

- Semantic caching reduces redundant processing
- FactPack validation catches data errors early
- Efficient memory usage with TTL-based cleanup

## Testing

Run the test suite to verify grounding layer functionality:

```bash
npm test -- groundingLayerService.test.ts
```

Tests cover:

- FactPack generation and validation
- Deterministic calculations
- Caching behavior
- Response generation for different question types

## Future Enhancements

### 1. **Advanced Caching**

- Redis integration for cross-device cache sharing
- Cache warming for common queries
- Adaptive TTL based on data volatility

### 2. **Enhanced Validation**

- Real-time data integrity checks
- Anomaly detection for suspicious calculations
- Audit trail for all data transformations

### 3. **Smart Fallbacks**

- Confidence-based routing to different AI models
- Hybrid responses combining grounding + AI insights
- Learning from user feedback to improve grounding

### 4. **Data Freshness**

- WebSocket updates for real-time data changes
- Incremental FactPack updates
- Background refresh scheduling

## Best Practices

### 1. **Always Use FactPack**

- Never pass raw app data to AI models
- Always validate FactPack before use
- Include time context in all responses

### 2. **Cache Wisely**

- Set appropriate TTL based on data volatility
- Monitor cache hit rates
- Clear cache when data changes significantly

### 3. **Validate Everything**

- Validate FactPack before generating responses
- Check calculation integrity
- Log validation failures for debugging

### 4. **Monitor Performance**

- Track grounding confidence scores
- Monitor cache hit rates
- Measure response times

## Troubleshooting

### Common Issues

1. **Cache Misses**

   - Check FactPack hash generation
   - Verify canonicalized query logic
   - Ensure cache TTL is appropriate

2. **Low Confidence**

   - Review FactPack data completeness
   - Check intent detection accuracy
   - Verify calculation functions

3. **Validation Errors**
   - Check data types and required fields
   - Verify calculation consistency
   - Review FactPack builder logic

### Debug Mode

Enable debug logging to trace grounding layer behavior:

```typescript
// In development
console.log('FactPack:', factPack);
console.log('Cache key:', cacheKey);
console.log('Grounding confidence:', response.confidence);
```

## Conclusion

The Grounding Layer provides a robust foundation for preventing AI hallucinations while maintaining fast, accurate responses. By using structured data and deterministic calculations, it ensures that users always get reliable financial information based on their actual data, not AI-generated approximations.

The key is to **trust the data, not the AI** - let the AI explain and interpret, but never calculate or invent financial figures.
