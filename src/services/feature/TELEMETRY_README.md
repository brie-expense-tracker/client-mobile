# Telemetry You'll Actually Use (No PII)

This implementation provides lightweight, actionable telemetry to identify why chats feel dull and enable fast fixes without collecting any personally identifiable information.

## 🎯 What It Tracks

### Core Chat Metrics

- **Intent**: What the user was asking for
- **Grounding**: Whether response used local data vs. AI
- **Model**: Which AI model was used (mini/std/pro)
- **Tokens**: Input/output token usage
- **Response Time**: How long responses take

### Quality Indicators

- **Actions**: Whether response included actionable items
- **Cards**: Whether response included visual cards
- **Fallback**: Whether response fell back to cached/generic content
- **User Satisfaction**: 👍/👎 feedback with reasons

### Performance Metrics

- **Response Time**: Milliseconds to generate response
- **Grounding Confidence**: How confident the system is in its data
- **Message Length**: Response character count
- **Financial Data**: Whether user has budgets/goals/transactions

## 🚀 How It Works

### 1. Automatic Event Logging

Every chat response automatically logs:

```typescript
logChat({
	intent: 'GET_BALANCE',
	usedGrounding: true,
	model: 'mini',
	tokensIn: 150,
	tokensOut: 200,
	hadActions: true,
	hadCard: false,
	fallback: false,
	responseTimeMs: 1200,
	groundingConfidence: 0.8,
	messageLength: 200,
	hasFinancialData: true,
});
```

### 2. User Feedback Collection

Each AI message shows thumbs up/down buttons:

- **👍 Thumbs Up**: Logs positive feedback immediately
- **👎 Thumbs Down**: Shows micro-prompt for reason:
  - "Too vague"
  - "Wrong numbers"
  - "Not timely"
  - "Other"

### 3. Real-time Monitoring

Analytics dashboard shows:

- Session summary with key metrics
- Quality issues that need attention
- Events requiring immediate review
- Intent distribution patterns

## 📊 Key Insights You'll Get

### Quality Issues Identified

- **High fallback rate** (>30%): Responses not using local data
- **Low satisfaction rate** (<70%): Users consistently unhappy
- **Low grounding usage** (<50%): Too many AI-generated responses

### Events Needing Attention

- User dissatisfaction (thumbs down)
- Fallback responses used
- Low confidence responses (<50% confidence)

### Performance Trends

- Average response times
- Token efficiency
- Model usage distribution

## 🛠️ Implementation

### Analytics Service

```typescript
import { logChat, logUserSatisfaction } from './analyticsService';

// Log chat event
logChat({
	intent: detectedIntent,
	usedGrounding: !!aiResponse?.wasGrounded,
	model: aiResponse?.modelUsed || 'unknown',
	// ... other metrics
});

// Log user satisfaction
logUserSatisfaction(messageId, 'thumbs_down', {
	tag: 'too_vague',
	description: 'Too vague',
});
```

### Message Feedback Component

```typescript
<MessageFeedback
	messageId={message.id}
	onFeedback={(satisfaction) => {
		console.log('User feedback:', satisfaction);
	}}
/>
```

### Analytics Dashboard

```typescript
<AnalyticsDashboard />
```

## 📈 What You Can Fix

### Based on Telemetry Data

1. **High Fallback Rate**

   - Improve grounding layer coverage
   - Add more local data sources
   - Optimize intent detection

2. **Low Satisfaction Rate**

   - Review thumbs down reasons
   - Improve response quality
   - Fix specific user pain points

3. **Slow Response Times**

   - Optimize model selection
   - Improve grounding efficiency
   - Cache frequently requested data

4. **Low Grounding Usage**
   - Expand local data coverage
   - Improve fact extraction
   - Better context understanding

## 🔒 Privacy & Compliance

### No PII Collected

- No user names, emails, or personal details
- No financial amounts or account numbers
- No conversation content or user messages
- Only metadata about response quality

### Data Retention

- Analytics data stored locally only
- Cleared when app is closed
- No persistent storage or cloud sync
- User can clear data anytime

### Compliance Ready

- GDPR compliant (no personal data)
- CCPA compliant (no personal information)
- Financial services compliant
- Enterprise security ready

## 🧪 Testing

### Run Test Suite

```bash
npm test -- analyticsService.test.ts
```

### Test Coverage

- Event logging accuracy
- User feedback capture
- Quality issue detection
- Performance metrics
- Data export/clear functions

## 📱 UI Components

### Message Feedback

- Thumbs up/down buttons on every AI response
- Micro-prompt modal for dissatisfaction reasons
- Visual feedback for selected options

### Analytics Dashboard

- Toggle button in top-right corner
- Real-time metrics updates
- Quality issue alerts
- Export/clear data actions

## 🚀 Production Integration

### Analytics Backend

```typescript
// In production, replace console.log with:
private sendToAnalytics(event: ChatAnalyticsEvent): void {
  analytics.track('chat_response', event);
}

private sendSatisfactionUpdate(
  messageId: string,
  satisfaction: 'thumbs_up' | 'thumbs_down',
  reason?: DissatisfactionReason
): void {
  analytics.track('user_satisfaction', { messageId, satisfaction, reason });
}
```

### Monitoring & Alerts

- Set up alerts for quality issues
- Monitor satisfaction trends
- Track performance metrics
- Alert on high fallback rates

## 💡 Best Practices

### What to Monitor

1. **Daily**: Satisfaction rate, response times
2. **Weekly**: Intent distribution, quality issues
3. **Monthly**: Performance trends, user feedback patterns

### When to Act

- Satisfaction rate drops below 70%
- Fallback rate exceeds 30%
- Response times increase by 50%
- New dissatisfaction reasons emerge

### How to Improve

1. **Immediate**: Fix identified quality issues
2. **Short-term**: Optimize grounding layer
3. **Long-term**: Improve AI model selection

## 🔍 Debugging

### Console Logging

All events logged to console with 📊 prefix:

```
📊 [Analytics] Chat Event: {
  intent: 'GET_BALANCE',
  model: 'mini',
  tokens: '150→200',
  quality: { grounding: true, actions: true, cards: false, fallback: false },
  satisfaction: undefined,
  responseTime: '1200ms'
}
```

### Data Export

Use dashboard to export analytics data for debugging:

```typescript
const data = analyticsService.exportAnalytics();
console.log('Analytics Export:', data);
```

## 🎯 Success Metrics

### Quality Improvements

- **Target**: 90%+ satisfaction rate
- **Target**: <20% fallback rate
- **Target**: <1000ms average response time
- **Target**: 80%+ grounding usage

### Business Impact

- Faster issue identification
- Improved user experience
- Reduced support tickets
- Better product decisions

This telemetry system gives you the data you need to make chats engaging and useful, without compromising user privacy or collecting unnecessary information.
