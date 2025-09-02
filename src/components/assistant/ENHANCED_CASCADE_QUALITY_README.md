# Enhanced Cascade Quality System

## Overview

The Enhanced Cascade Quality System implements a 3-tier validation pipeline: **Writer → Checker → (optional) Improver** with rule-validators before and after the critic to ensure high-quality, safe financial advice.

## Architecture

```
User Query → Mini Writer → Rule Validators → Mini Critic → (optional) Pro Improver
                ↓              ↓              ↓              ↓
            Generate      Numeric &      Validate      Strategic
            Response      Claim Checks   Quality       Planning
```

## Key Components

### 1. Rule Validators (Before Critic)

#### Numeric Guardrails
- **Amounts non-negative**: Ensures all monetary values are positive
- **Sums match FactPack**: Validates totals against actual data
- **Dates inside window**: Checks date references are within valid range
- **Budget limits respected**: Prevents suggesting overspending

#### Claim Type Validation
- **Forbidden phrasing detection**: Blocks risky language patterns
- **Risk level assessment**: Categorizes claims as low/medium/high risk
- **Pattern matching**: Uses regex patterns to catch dangerous advice

### 2. Mini Critic (Enhanced)

#### Quality Checks
- **Fact consistency**: Ensures claims match available data
- **Ambiguity detection**: Identifies unclear or vague responses
- **Hallucination guards**: Catches AI-generated false information
- **Forbidden pattern detection**: Blocks investment advice and guarantees

#### Escalation Triggers
- **Rule validation failures**: Any guardrail violation
- **Unresolved ambiguity**: Critic flags unclear responses
- **Hallucination detection**: AI claims data not in FactPack
- **High-stakes tasks**: Rebuilding savings plans, investment strategies

### 3. Pro Improver (Conditional)

#### When Activated
- **Strategic planning requests**: User asks for plans/strategies
- **Escalation triggers**: Any validation failure requiring expert handling
- **High-stakes scenarios**: Retirement planning, debt payoff strategies

#### Enhanced Capabilities
- **Strict token limits**: Maximum 800 tokens for cost control
- **Trimmed facts**: Uses only essential data (max 3 facts)
- **Expert-level responses**: Strategic financial planning and advice

## Implementation Details

### Enhanced Critic Service

```typescript
import { EnhancedCriticService } from './enhancedCriticService';

const critic = new EnhancedCriticService(factPack);
const validation = await critic.validateResponse(message, query, context);

if (validation.escalationTriggered) {
  console.log('Escalating to Pro:', validation.escalationReason);
  // Use Pro model for complex scenarios
}
```

### Rule Validation Results

```typescript
interface RuleValidationResult {
  passed: boolean;
  guardFailed?: string;  // Specific guard that failed
  issues: string[];      // List of validation issues
  confidence: number;    // Confidence score (0-1)
  shouldEscalateToPro: boolean;
}
```

### Analytics Integration

The system logs detailed validation data for analytics clustering:

```typescript
logChat({
  // ... standard metrics
  criticPassed: validation.isValid,
  guardFailed: validation.ruleValidation.guardFailed,
  escalationTriggered: validation.escalationTriggered,
  escalationReason: validation.escalationReason,
  numericGuardrails: validation.numericGuardrails,
  claimTypes: validation.claimTypes
});
```

## Guard Failure Modes

### Numeric Guardrails
- `numeric_negative_amounts`: Negative monetary values detected
- `numeric_sum_mismatch`: Totals don't match FactPack data
- `numeric_date_out_of_window`: Date references outside valid range
- `numeric_budget_limit_exceeded`: Suggests spending beyond limits

### Claim Type Validation
- `claim_forbidden_phrasing`: Contains risky investment language
- `basic_validation_failed`: Fallback validation failure

### Escalation Reasons
- `Rule validation failed: {guard_name}`: Specific guard failure
- `Critic flags unresolved ambiguity`: Unclear response detected
- `Hallucination guard tripped`: AI claims false data
- `High-stakes task detected`: Complex financial planning request
- `User asks strategic planning`: Explicit strategy request

## Usage Examples

### Basic Validation

```typescript
const message = "Your grocery budget has $200 remaining out of $500 total.";
const result = await critic.validateResponse(message, query, context);

// Result: { isValid: true, escalationTriggered: false }
```

### Failed Validation with Escalation

```typescript
const message = "This investment guarantees 100% returns!";
const result = await critic.validateResponse(message, query, context);

// Result: { 
//   isValid: false, 
//   escalationTriggered: true,
//   escalationReason: "Rule validation failed: claim_forbidden_phrasing"
// }
```

### High-Stakes Task Escalation

```typescript
const query = "Help me rebuild my 6-month savings plan";
const result = await critic.validateResponse(message, query, context);

// Result: { 
//   escalationTriggered: true,
//   escalationReason: "High-stakes task detected"
// }
```

## Testing

Run the test suite to verify all validation rules:

```bash
npm test -- enhancedCriticService.test.ts
```

Tests cover:
- Numeric guardrail validation
- Claim type detection
- Escalation logic
- High-stakes task detection
- Ambiguity and hallucination detection

## Monitoring and Analytics

### Console Logging
- Guard failure identification: `Guard failed: numeric_sum_mismatch`
- Escalation decisions: `Escalating to Pro model: Rule validation failed`
- Validation confidence scores

### Analytics Dashboard
- Guard failure clustering by type
- Escalation frequency and reasons
- Validation success rates
- Cost impact of Pro model usage

## Benefits

### Quality Assurance
- **Prevents financial misinformation**: Catches incorrect numbers and claims
- **Blocks risky advice**: Filters out investment guarantees and promises
- **Ensures data consistency**: Validates against actual FactPack data

### Cost Optimization
- **Smart escalation**: Only uses Pro model when necessary
- **Efficient validation**: Rule-validators run before expensive AI calls
- **Token management**: Strict limits on Pro model usage

### User Experience
- **Accurate responses**: Validated against real financial data
- **Safe advice**: No risky investment recommendations
- **Clear escalation**: Transparent when Pro model is needed

## Future Enhancements

### Additional Guardrails
- **Regulatory compliance**: SEC/FINRA rule checking
- **Tax implications**: Tax-related advice validation
- **Market data**: Real-time market information validation

### Advanced Escalation
- **Multi-tier escalation**: Mini → Std → Pro progression
- **Domain experts**: Specialized models for specific financial areas
- **Human review**: Escalation to human financial advisors

### Enhanced Analytics
- **Failure pattern analysis**: Identify common validation issues
- **User behavior tracking**: Understand escalation triggers
- **Performance optimization**: Continuous improvement of validation rules
