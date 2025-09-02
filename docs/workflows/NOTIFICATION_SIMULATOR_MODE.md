# Notification Service - Simulator Mode

## Overview

The notification service has been updated to handle simulator environments gracefully. When running on a simulator, the service operates in "mock mode" to avoid native module errors while still providing a testing interface.

## Problem Solved

The original error `Cannot find native module 'ExpoPushTokenManager'` occurs because:

- Push notifications require native device capabilities
- Simulators don't have access to these native modules
- The `expo-notifications` package tries to access native code even when not needed

## Solution

The notification service now includes:

1. **Simulator Detection**: Automatically detects when running in a simulator environment
2. **Mock Implementation**: Provides mock responses for all notification methods
3. **Console Logging**: Logs notification events to the console for debugging
4. **Graceful Degradation**: Continues to work without blocking the app

## How It Works

### Simulator Detection

```typescript
const isSimulator = () => {
	try {
		return !Device.isDevice || __DEV__;
	} catch (error) {
		return true; // Assume simulator if we can't check
	}
};
```

### Mock Behavior

- **Push Tokens**: Returns `null` (expected in simulator)
- **Local Notifications**: Logs to console instead of scheduling
- **Badge Count**: Returns `0` and ignores set operations
- **Listeners**: Returns empty subscription objects
- **Permissions**: Skips permission requests

## Usage

### Basic Usage

The notification service works the same way in both simulator and device environments:

```typescript
import { notificationService } from '../services/notificationService';

// Initialize (works in both environments)
await notificationService.initialize();

// Schedule notification (logs in simulator, schedules on device)
const id = await notificationService.scheduleLocalNotification(
	'Title',
	'Message',
	{ data: 'test' }
);

// Get notifications from backend (works in both environments)
const notifications = await notificationService.getNotifications();
```

### Testing in Simulator

Use the `NotificationDemo` component to test functionality:

```typescript
import { NotificationDemo } from '../components/NotificationDemo';

// Add to your screen
<NotificationDemo />;
```

### Console Output

In simulator mode, notifications are logged to the console:

```
[SIMULATOR NOTIFICATION] Demo Notification: This is a test notification from the simulator! { type: 'demo', timestamp: 1234567890 }
```

## Configuration

The notification configuration automatically handles simulator environments:

```typescript
// In notificationConfig.ts
export const NOTIFICATION_CONFIG = {
	ENABLED: __DEV__ ? false : true, // Disabled in development
	DEV_FALLBACK: {
		enableNotifications: true,
		weeklySummary: true,
		overspendingAlert: false,
		aiSuggestion: true,
		budgetMilestones: false,
	},
};
```

## Testing

Run the test suite to verify simulator mode:

```bash
npm test -- notificationService.test.ts
```

## Migration from Previous Version

No changes needed to existing code. The service automatically detects the environment and adapts accordingly.

## Troubleshooting

### Still Getting Native Module Errors?

1. Make sure you're using the latest version of the notification service
2. Check that `__DEV__` is properly set in your environment
3. Verify that `expo-device` is properly installed

### Notifications Not Working on Device?

1. Ensure you're testing on a physical device
2. Check that notifications are enabled in device settings
3. Verify that the app has notification permissions

### Backend Integration Issues?

The service still communicates with the backend normally in simulator mode. Only local notification features are mocked.

## Best Practices

1. **Always Test on Device**: Use simulator for development, but test notifications on physical devices
2. **Check Console Logs**: In simulator mode, check console for notification logs
3. **Use Demo Component**: Use `NotificationDemo` for quick testing
4. **Handle Gracefully**: Your app should handle both `null` tokens and successful registrations

## Example Integration

```typescript
// In your app initialization
const initializeApp = async () => {
	try {
		// Initialize notification service
		const notificationInitialized = await notificationService.initialize();

		if (notificationInitialized) {
			console.log('Notification service ready');
		} else {
			console.log('Notification service not available (simulator mode)');
		}

		// Continue with app initialization
	} catch (error) {
		console.error('App initialization error:', error);
	}
};
```

This approach ensures your app works seamlessly in both simulator and device environments while providing a clear testing interface for notification functionality.
