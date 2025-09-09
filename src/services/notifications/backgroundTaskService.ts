// notifications/backgroundTaskService.ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { isProduction } from '../../config/environment';

export const BG_PUSH_TASK = 'BG_PUSH_TASK';

// Define the task at module scope
TaskManager.defineTask(BG_PUSH_TASK, ({ data, error }) => {
	if (error) {
		console.warn('[BackgroundTask] Task error:', error);
		return;
	}

	// Handle background push notification
	console.log('[BackgroundTask] Processing background push:', data);

	return {
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: false,
		shouldSetBadge: false,
	};
});

let didRegister = false;

export async function ensureBgPushRegistered(): Promise<void> {
	if (didRegister) {
		console.log('[BackgroundTask] Already registered, skipping');
		return;
	}

	// Hard stop in dev & simulators
	if (!isProduction) {
		console.log(
			'[BackgroundTask] Skipping background task registration - not in production environment'
		);
		return;
	}

	if (!Device.isDevice) {
		console.log(
			'[BackgroundTask] Skipping background task registration - not on physical device'
		);
		return;
	}

	if (Platform.OS === 'web') {
		console.log(
			'[BackgroundTask] Skipping background task registration - not supported on web'
		);
		return;
	}

	try {
		const registered = await TaskManager.isTaskRegisteredAsync(BG_PUSH_TASK);
		if (!registered) {
			await Notifications.registerTaskAsync(BG_PUSH_TASK);
			console.log('[BackgroundTask] Background task registered successfully');
		} else {
			console.log('[BackgroundTask] Background task already registered');
		}
		didRegister = true;
	} catch (error) {
		console.warn('[BackgroundTask] Failed to register background task:', error);
	}
}
