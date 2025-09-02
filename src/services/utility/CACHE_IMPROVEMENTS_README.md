# Smart Cache Service Improvements

## Overview

The SmartCacheService has been enhanced with intelligent cache categories, TTL management, and automatic invalidation flags to prevent users from seeing stale data.

## Key Improvements

### 1. Cache Categories with Specific TTLs

```typescript
export type CacheCategory =
	| 'NARRATION'
	| 'FAQ'
	| 'HOWTO'
	| 'INSIGHT'
	| 'FORECAST'
	| 'CATEGORIZATION';

const TTL_BY_CATEGORY: Record<CacheCategory, number> = {
	NARRATION: 2 * 60 * 1000, // 2 minutes - very short for dynamic content
	FAQ: 7 * 24 * 60 * 60 * 1000, // 7 days - longer for static content
	HOWTO: 30 * 24 * 60 * 60 * 1000, // 30 days - longest for educational content
	INSIGHT: 24 * 60 * 60 * 1000, // 24 hours - medium for analytical content
	FORECAST: 6 * 60 * 60 * 1000, // 6 hours - shorter for time-sensitive data
	CATEGORIZATION: 12 * 60 * 60 * 1000, // 12 hours - medium for classification
};
```

### 2. Intelligent Cache Invalidation

The service now automatically invalidates cache based on data changes:

- **NEW_TX**: Invalidates narration cache when new transactions are added
- **BUDGET_CHANGE**: Invalidates forecast cache when budgets are modified
- **GOAL_UPDATE**: Invalidates insight cache when goals are updated
- **CATEGORY_UPDATE**: Invalidates categorization cache when categories change

### 3. Easy-to-Use Cache Invalidation Utilities

```typescript
import { setCacheInvalidationFlags } from '../services/utility/cacheInvalidationUtils';

// Automatically invalidate cache when data changes
setCacheInvalidationFlags.onNewTransaction();
setCacheInvalidationFlags.onBudgetChange();
setCacheInvalidationFlags.onGoalUpdate();
setCacheInvalidationFlags.onCategoryUpdate();
```

## Usage Examples

### Basic Caching

```typescript
import SmartCacheService from '../services/utility/smartCacheService';

const cacheService = SmartCacheService.getInstance();

// Cache a response with category
await cacheService.cacheResponse(
	"What's my spending trend this month?",
	spendingAnalysis,
	userId,
	'INSIGHT',
	0.95
);

// Retrieve cached response
const cached = await cacheService.getCachedResponse(
	"What's my spending trend this month?",
	userId,
	'INSIGHT'
);
```

### Automatic Invalidation

The cache is automatically invalidated when:

1. **Transactions are added/updated/deleted** → Invalidates narration cache
2. **Budgets are created/updated/deleted** → Invalidates forecast cache
3. **Goals are modified** → Invalidates insight cache
4. **Categories are updated** → Invalidates categorization cache

### Manual Cache Management

```typescript
import { invalidateCacheCategories } from '../services/utility/cacheInvalidationUtils';

// Invalidate specific categories
await invalidateCacheCategories.narration();
await invalidateCacheCategories.forecast();
await invalidateCacheCategories.all();

// Get cache statistics
const stats = getCacheStats();
console.log('Cache breakdown:', stats.categoryBreakdown);
```

## Integration Points

The cache invalidation has been integrated into:

- **TransactionContext**: Automatically invalidates cache on transaction changes
- **BudgetContext**: Automatically invalidates cache on budget changes
- **GoalContext**: Automatically invalidates cache on goal changes

## Benefits

1. **No More Stale Data**: Cache is automatically invalidated when relevant data changes
2. **Performance**: Still provides fast responses for unchanged data
3. **Smart TTLs**: Different content types have appropriate expiration times
4. **Easy Integration**: Simple function calls trigger appropriate cache invalidation
5. **Category Breakdown**: Monitor cache usage by content type

## Best Practices

1. **Use Appropriate Categories**: Choose the right category for your content type
2. **Set Confidence Scores**: Only cache high-confidence responses (default threshold: 0.7)
3. **Monitor Cache Stats**: Use `getCacheStats()` to track cache performance
4. **Automatic Cleanup**: The service automatically cleans up expired entries
5. **Integration**: Use the provided utility functions rather than calling the service directly

## Migration Notes

- **Old category names** (`'categorization'`, `'insight'`, `'advice'`, `'forecast'`) have been replaced with new ones
- **Timestamp field** has been renamed to `createdAt` for clarity
- **TTL logic** now uses category-specific values instead of a single global expiry
- **Cache invalidation** is now automatic and intelligent
