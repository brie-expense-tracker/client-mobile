# Goal and Budget Navigation with Modal

This document explains how to navigate to the goals and budgets screens and automatically open their respective creation modals.

## Overview

The app now supports automatically opening the goal and budget creation modals when navigating to their respective screens. This is achieved through URL query parameters and route handling.

## How to Use

### 1. Using the Navigation Utility (Recommended)

Import and use the navigation utility functions:

```typescript
import {
	navigateToGoalsWithModal,
	navigateToBudgetsWithModal,
} from '../src/utils/navigationUtils';

// Navigate to goals screen and open modal
navigateToGoalsWithModal();

// Navigate to budgets screen and open modal
navigateToBudgetsWithModal();
```

### 2. Direct Router Navigation

You can also navigate directly using the router with query parameters:

```typescript
import { router } from 'expo-router';

// Navigate to goals screen and open modal
router.replace('/budgets/goals?openModal=true');

// Navigate to budgets screen and open modal
router.replace('/budgets?openModal=true');

// Navigate to goals screen without opening modal
router.replace('/budgets/goals');

// Navigate to budgets screen without opening modal
router.replace('/budgets');
```

## Implementation Details

### Files Modified

1. **`client-mobile/app/(tabs)/budgets/goals.tsx`**

   - Added `useLocalSearchParams` import
   - Added auto-open modal logic using `useEffect`
   - Checks for `openModal=true` query parameter

2. **`client-mobile/app/(tabs)/budgets/index.tsx`**

   - Added `useLocalSearchParams` and `useRouter` imports
   - Added auto-open modal logic using `useEffect`
   - Checks for `openModal=true` query parameter
   - Sets `openModal=false` when modal is closed

3. **`client-mobile/app/(tabs)/budgets/_layout.tsx`**

   - Added auto-switch to budgets tab when `openModal=true` is present
   - Uses `useLocalSearchParams` to read query parameters

4. **`client-mobile/app/(tabs)/transaction/index.tsx`**

   - Updated to use the new navigation utilities
   - Goals and Budgets buttons now open their respective modals automatically

5. **`client-mobile/src/utils/navigationUtils.ts`** (New)
   - Created navigation utility functions
   - Provides clean API for common navigation patterns

### How It Works

1. When navigating with `?openModal=true`, the budget layout automatically switches to the appropriate tab (budgets or goals)
2. The respective screen component detects the query parameter and automatically calls `showModal()`
3. A small delay (100ms) ensures the component is fully mounted before opening the modal
4. The modal opens with the standard animation and user can create a new goal or budget
5. When the modal is closed (either by canceling or successfully adding/editing), the URL parameter is automatically set to `openModal=false`
6. This prevents the modal from auto-opening again if the user navigates back to the screen

## Available Navigation Functions

```typescript
import {
	navigateToGoalsWithModal,
	navigateToGoals,
	navigateToBudgetsWithModal,
	navigateToBudgets,
	navigateToTransaction,
	navigateToDashboard,
	navigateToInsights,
	navigateToSettings,
} from '../src/utils/navigationUtils';
```

## Example Usage

```typescript
// In a component
import {
	navigateToGoalsWithModal,
	navigateToBudgetsWithModal,
} from '../src/utils/navigationUtils';

const MyComponent = () => {
	const handleAddGoal = () => {
		navigateToGoalsWithModal();
	};

	const handleAddBudget = () => {
		navigateToBudgetsWithModal();
	};

	return (
		<View>
			<Button onPress={handleAddGoal} title="Add Goal" />
			<Button onPress={handleAddBudget} title="Add Budget" />
		</View>
	);
};
```

## Testing

To test the functionality:

### Goals Modal

1. Navigate to the transaction screen
2. Tap the "Add Goal" button in the Goals carousel
3. The app should navigate to the goals screen and automatically open the goal creation modal
4. You can create a new goal using the modal

### Budgets Modal

1. Navigate to the transaction screen
2. Tap the "Add Budget" button in the Budgets carousel
3. The app should navigate to the budgets screen and automatically open the budget creation modal
4. You can create a new budget using the modal

## Notes

- The modal will only auto-open when navigating with the `openModal=true` parameter
- Normal navigation to `/budgets/goals` or `/budgets` will not open the modal
- When the modal is closed, the URL parameter is automatically set to `openModal=false` to prevent re-opening
- The implementation includes proper cleanup and error handling
- The navigation utility provides a consistent API across the app
