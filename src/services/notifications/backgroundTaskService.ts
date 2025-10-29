// notifications/backgroundTaskService.ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { isProduction } from '../../config/environment';
import { createLogger } from '../../utils/sublogger';

const bgTaskLog = createLogger('BackgroundTask');

export const BG_PUSH_TASK = 'BG_PUSH_TASK';

// Define the task at module scope
TaskManager.defineTask(BG_PUSH_TASK, ({ data, error }) => {
	if (error) {
		bgTaskLog.warn('Task error', error);
		return;
	}

	// Handle background push notification
	bgTaskLog.debug('Processing background push', { data });

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
		bgTaskLog.debug('Already registered, skipping');
		return;
	}

	// Hard stop in dev & simulators
	if (!isProduction) {
		bgTaskLog.debug(
			'Skipping background task registration - not in production environment'
		);
		return;
	}

	if (!Device.isDevice) {
		bgTaskLog.debug(
			'Skipping background task registration - not on physical device'
		);
		return;
	}

	if (Platform.OS === 'web') {
		bgTaskLog.debug(
			'Skipping background task registration - not supported on web'
		);
		return;
	}

	try {
		const registered = await TaskManager.isTaskRegisteredAsync(BG_PUSH_TASK);
		if (!registered) {
			await Notifications.registerTaskAsync(BG_PUSH_TASK);
			bgTaskLog.info('Background task registered successfully');
		} else {
			bgTaskLog.debug('Background task already registered');
		}
		didRegister = true;
	} catch (error) {
		bgTaskLog.warn('Failed to register background task', error);
	}
}
