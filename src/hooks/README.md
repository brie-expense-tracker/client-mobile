# Unified Data Fetching Pattern

This document outlines the refactored data fetching architecture that unifies the patterns used across budgets, goals, and recurring expenses.

## Overview

The previous implementation had three different data fetching approaches:

1. **Budgets**: Used a comprehensive context with detailed state management
2. **Goals**: Used a simple context with basic CRUD operations
3. **Recurring Expenses**: Used a service-based approach with complex status tracking

The new unified pattern combines the best practices from all three approaches into a single, consistent architecture.

## Architecture

### Core Hook: `useDataFetching`

A generic hook that provides:

- **State Management**: Loading states, error handling, data caching
- **CRUD Operations**: Add, update, delete with optimistic updates
- **Auto-refresh**: On focus and mount
- **Data Transformation**: Customizable data processing
- **Error Handling**: Comprehensive error management

### Specialized Hooks

Each domain has a specialized hook that extends the core functionality:

- `useBudgets()` - Budget-specific logic with period filtering and summaries
- `useGoals()` - Goal-specific logic with deadline calculations and progress tracking
- `useRecurringExpenses()` - Recurring expense-specific logic with status tracking

## Key Improvements

### 1. **Consistent State Management**

```typescript
// Before: Different patterns across files
const { budgets, isLoading, hasLoaded, refetch } = useBudget();
const { goals, addGoal, updateGoal, deleteGoal } = useGoal();
const { expenses, expenseStatuses, summaryStats } = useRecurringExpense();

// After: Unified pattern
const {
	data,
	isLoading,
	hasLoaded,
	error,
	lastRefreshed,
	refetch,
	addItem,
	updateItem,
	deleteItem,
	clearError,
} = useDataFetching(options);
```

### 2. **Optimistic Updates**

All CRUD operations now include optimistic updates for better UX:

```typescript
const addItem = async (item: T): Promise<T> => {
	const newItem = await addFunction(item);
	// Optimistic update - UI updates immediately
	setData((prev) => [...prev, newItem]);
	return newItem;
};
```

### 3. **Data Transformation**

Centralized data processing with memoization:

```typescript
const transformBudgetData = (budgets: Budget[]) => {
	return budgets.map((budget) => ({
		...budget,
		spent: budget.spent || 0,
		spentPercentage:
			budget.amount > 0 ? (budget.spent || 0) / budget.amount : 0,
		shouldAlert: budget.amount > 0 && (budget.spent || 0) / budget.amount > 0.9,
	}));
};
```

### 4. **Comprehensive Error Handling**

```typescript
try {
	setError(null);
	const result = await fetchFunction();
	setData(result);
} catch (err) {
	setError(err instanceof Error ? err.message : 'Failed to fetch data');
	console.error('[useDataFetching] Error:', err);
}
```

### 5. **Automatic Refresh**

Consistent refresh behavior across all screens:

```typescript
// Auto-refresh on mount
useEffect(() => {
	if (autoRefresh && !hasLoaded) {
		refetch();
	}
}, [autoRefresh, hasLoaded, refetch]);

// Refresh on focus
useFocusEffect(
	useCallback(() => {
		if (refreshOnFocus && hasLoaded) {
			refetch();
		}
	}, [refreshOnFocus, hasLoaded, refetch])
);
```

## Usage Examples

### Basic Usage

```typescript
const { data, isLoading, refetch } = useDataFetching({
	fetchFunction: () => ApiService.get('/items'),
	autoRefresh: true,
	refreshOnFocus: true,
});
```

### With CRUD Operations

```typescript
const { data, isLoading, addItem, updateItem, deleteItem } = useDataFetching({
	fetchFunction: fetchItems,
	addFunction: addItem,
	updateFunction: updateItem,
	deleteFunction: deleteItem,
});
```

### With Data Transformation

```typescript
const { data } = useDataFetching({
	fetchFunction: fetchBudgets,
	transformData: (budgets) =>
		budgets.map((budget) => ({
			...budget,
			spent: budget.spent || 0,
			percentage: ((budget.spent || 0) / budget.amount) * 100,
		})),
});
```

## Benefits

### 1. **Consistency**

- All screens now use the same data fetching pattern
- Consistent loading states and error handling
- Uniform refresh behavior

### 2. **Performance**

- Memoized data transformations
- Optimistic updates for better UX
- Reduced re-renders through proper state management

### 3. **Maintainability**

- Single source of truth for data fetching logic
- Easy to add new features or modify existing ones
- Clear separation of concerns

### 4. **Developer Experience**

- Type-safe operations
- Consistent API across all hooks
- Better error messages and debugging

### 5. **User Experience**

- Immediate UI updates with optimistic updates
- Consistent loading states
- Automatic refresh on screen focus

## Migration Guide

### From Context-based to Hook-based

**Before:**

```typescript
const { budgets, addBudget, updateBudget, deleteBudget } = useBudget();
```

**After:**

```typescript
const {
	data: budgets,
	addItem: addBudget,
	updateItem: updateBudget,
	deleteItem: deleteBudget,
} = useBudgets();
```

### From Service-based to Hook-based

**Before:**

```typescript
const { expenses, expenseStatuses, summaryStats } = useRecurringExpense();
```

**After:**

```typescript
const {
	data: expenses,
	summaryStats,
	markAsPaid,
	getPaymentHistory,
} = useRecurringExpenses();
```

## Future Enhancements

1. **Caching**: Add intelligent caching with TTL
2. **Offline Support**: Queue operations when offline
3. **Real-time Updates**: WebSocket integration
4. **Pagination**: Support for large datasets
5. **Background Sync**: Periodic data synchronization

## Best Practices

1. **Always use the specialized hooks** for domain-specific logic
2. **Handle errors gracefully** in UI components
3. **Use optimistic updates** for better UX
4. **Transform data at the hook level** rather than in components
5. **Keep transformations pure** and memoized
6. **Provide meaningful error messages** to users
