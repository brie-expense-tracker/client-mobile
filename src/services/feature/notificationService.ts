import { ApiService } from '../core/apiService';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
	normalizeNotificationsResponse,
	normalizeUnreadCountResponse,
} from '../notifications/normalizer';
import { createLogger } from '../../utils/sublogger';

const notificationServiceLog = createLogger('NotificationService');

// Use __DEV__ global instead of isDevMode
declare const __DEV__: boolean;

export interface NotificationData {
	id?: string;
	_id?: string;
	title: string;
	message: string;
	type?:
		| 'budget'
		| 'goal'
		| 'transaction'
		| 'ai_insight'
		| 'system'
		| 'reminder'
		| 'marketing'
		| 'promotional';
	priority?: 'low' | 'medium' | 'high';
	read?: boolean;
	timeAgo?: string;
	data?: any;
	scheduledFor?: Date;
	expiresAt?: Date;
	createdAt?: string;
	updatedAt?: string;
}

export interface NotificationResponse {
	notifications: NotificationData[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

export interface UnreadCountResponse {
	count: number;
}

export interface NotificationConsent {
	// Core functionality notifications (always allowed if notifications enabled)
	core: {
		budget: boolean;
		goals: boolean;
		transactions: boolean;
		system: boolean;
	};
	// AI insights (user preference)
	aiInsights: {
		enabled: boolean;
		frequency: 'daily' | 'weekly' | 'monthly' | 'disabled';
		pushNotifications: boolean;
		emailAlerts: boolean;
	};
	// Marketing and promotional (explicit opt-in required)
	marketing: {
		enabled: boolean;
		promotional: boolean;
		newsletter: boolean;
		productUpdates: boolean;
		specialOffers: boolean;
	};
	// Reminders and alerts
	reminders: {
		enabled: boolean;
		weeklySummary: boolean;
		monthlyCheck: boolean;
		overspendingAlerts: boolean;
	};
}

class NotificationService {
	private expoPushToken: string | null = null;
	private consentSettings: NotificationConsent | null = null;

	// Initialize the notification service
	async initialize(): Promise<string | null> {
		try {
			// Check if running on a physical device
			if (!Device.isDevice) {
				notificationServiceLog.warn('Notifications require a physical device');
				return null;
			}

			// Request permissions
			const { status: existingStatus } =
				await Notifications.getPermissionsAsync();
			let finalStatus = existingStatus;

			if (existingStatus !== 'granted') {
				const { status } = await Notifications.requestPermissionsAsync();
				finalStatus = status;
			}

			if (finalStatus !== 'granted') {
				notificationServiceLog.warn('Notification permissions not granted');
				return null;
			}

			// Set up Android channels and iOS categories
			await this.setupNotificationChannels();

			// Get the project ID
			const projectId =
				Constants?.expoConfig?.extra?.eas?.projectId ??
				Constants?.easConfig?.projectId;
			if (!projectId) {
				notificationServiceLog.warn('Project ID not found');
				return null;
			}

			// Get the push token
			const tokenData = await Notifications.getExpoPushTokenAsync({
				projectId,
			});

			this.expoPushToken = tokenData.data;
			notificationServiceLog.info('Push token obtained', {
				token: this.expoPushToken?.substring(0, 20) + '...',
			});

			// Update the token on the backend
			if (this.expoPushToken) {
				await this.updatePushToken(this.expoPushToken);
			}

			return this.expoPushToken;
		} catch (error) {
			notificationServiceLog.error('Error initializing notifications', error);
			return null;
		}
	}

	// Set up Android channels and iOS categories
	private async setupNotificationChannels(): Promise<void> {
		try {
			// Android channels
			if (Platform.OS === 'android') {
				await Notifications.setNotificationChannelAsync('budget-alerts', {
					name: 'Budget Alerts',
					description: 'Notifications about budget limits and spending',
					importance: Notifications.AndroidImportance.HIGH,
					vibrationPattern: [0, 200, 100, 200],
					sound: 'default',
					enableLights: true,
					lightColor: '#FF6B6B',
				});

				await Notifications.setNotificationChannelAsync('goal-updates', {
					name: 'Goal Progress',
					description: 'Updates on your savings and investment goals',
					importance: Notifications.AndroidImportance.DEFAULT,
					vibrationPattern: [0, 100, 100, 100],
					sound: 'default',
				});

				await Notifications.setNotificationChannelAsync('transaction-alerts', {
					name: 'Transaction Alerts',
					description: 'Important updates about your accounts and transactions',
					importance: Notifications.AndroidImportance.HIGH,
					vibrationPattern: [0, 150, 100, 150],
					sound: 'default',
				});

				await Notifications.setNotificationChannelAsync('ai-insights', {
					name: 'AI Insights',
					description: 'Personalized financial advice and spending insights',
					importance: Notifications.AndroidImportance.DEFAULT,
					vibrationPattern: [0, 100, 50, 100],
					sound: 'default',
				});

				await Notifications.setNotificationChannelAsync(
					'system-notifications',
					{
						name: 'System Notifications',
						description: 'Important system updates and security alerts',
						importance: Notifications.AndroidImportance.HIGH,
						vibrationPattern: [0, 300, 100, 300],
						sound: 'default',
						enableLights: true,
						lightColor: '#4ECDC4',
					}
				);

				await Notifications.setNotificationChannelAsync('reminders', {
					name: 'Reminders & Summaries',
					description: 'Weekly summaries and helpful reminders',
					importance: Notifications.AndroidImportance.DEFAULT,
					vibrationPattern: [0, 100, 100, 100],
					sound: 'default',
				});

				await Notifications.setNotificationChannelAsync('marketing', {
					name: 'Marketing & Updates',
					description: 'Product updates and new features',
					importance: Notifications.AndroidImportance.LOW,
					vibrationPattern: [0, 50, 50, 50],
					sound: 'default',
				});

				await Notifications.setNotificationChannelAsync('promotional', {
					name: 'Special Offers',
					description: 'Exclusive deals and promotions',
					importance: Notifications.AndroidImportance.LOW,
					vibrationPattern: [0, 50, 50, 50],
					sound: 'default',
				});
			}

			// iOS categories with action buttons
			if (Platform.OS === 'ios') {
				await Notifications.setNotificationCategoryAsync('BUDGET_ALERT', [
					{
						identifier: 'VIEW_BUDGET',
						buttonTitle: 'View Budget',
						options: { opensAppToForeground: true },
					},
					{
						identifier: 'DISMISS',
						buttonTitle: 'Dismiss',
						options: { isDestructive: false },
					},
				]);

				await Notifications.setNotificationCategoryAsync('GOAL_UPDATE', [
					{
						identifier: 'VIEW_GOAL',
						buttonTitle: 'View Goal',
						options: { opensAppToForeground: true },
					},
					{
						identifier: 'DISMISS',
						buttonTitle: 'Dismiss',
						options: { isDestructive: false },
					},
				]);

				await Notifications.setNotificationCategoryAsync('TRANSACTION_ALERT', [
					{
						identifier: 'VIEW_TRANSACTION',
						buttonTitle: 'View Details',
						options: { opensAppToForeground: true },
					},
					{
						identifier: 'DISMISS',
						buttonTitle: 'Dismiss',
						options: { isDestructive: false },
					},
				]);

				await Notifications.setNotificationCategoryAsync('AI_INSIGHT', [
					{
						identifier: 'VIEW_INSIGHT',
						buttonTitle: 'Read Insight',
						options: { opensAppToForeground: true },
					},
					{
						identifier: 'DISMISS',
						buttonTitle: 'Dismiss',
						options: { isDestructive: false },
					},
				]);

				await Notifications.setNotificationCategoryAsync(
					'SYSTEM_NOTIFICATION',
					[
						{
							identifier: 'VIEW_SYSTEM',
							buttonTitle: 'View Details',
							options: { opensAppToForeground: true },
						},
						{
							identifier: 'DISMISS',
							buttonTitle: 'Dismiss',
							options: { isDestructive: false },
						},
					]
				);

				await Notifications.setNotificationCategoryAsync('REMINDER', [
					{
						identifier: 'VIEW_REMINDER',
						buttonTitle: 'View Summary',
						options: { opensAppToForeground: true },
					},
					{
						identifier: 'DISMISS',
						buttonTitle: 'Dismiss',
						options: { isDestructive: false },
					},
				]);

				await Notifications.setNotificationCategoryAsync('MARKETING', [
					{
						identifier: 'VIEW_UPDATE',
						buttonTitle: 'Learn More',
						options: { opensAppToForeground: true },
					},
					{
						identifier: 'DISMISS',
						buttonTitle: 'Dismiss',
						options: { isDestructive: false },
					},
				]);

				await Notifications.setNotificationCategoryAsync('PROMOTIONAL', [
					{
						identifier: 'VIEW_OFFER',
						buttonTitle: 'View Offer',
						options: { opensAppToForeground: true },
					},
					{
						identifier: 'DISMISS',
						buttonTitle: 'Dismiss',
						options: { isDestructive: false },
					},
				]);
			}

			if (__DEV__) {
				notificationServiceLog.debug(
					'Notification channels and categories set up'
				);
			}
		} catch (error) {
			notificationServiceLog.error(
				'Error setting up notification channels',
				error
			);
		}
	}

	// Get push token
	getPushToken(): string | null {
		return this.expoPushToken;
	}

	// Update push token on backend with minimal retry logic to avoid rate limiting
	async updatePushToken(token: string): Promise<boolean> {
		try {
			const response = await ApiService.put('/api/notifications/push-token', {
				expoPushToken: token,
			});

			if (response.success) {
				if (__DEV__) {
					notificationServiceLog.debug('Push token updated on backend');
				}
				return true;
			} else {
				// Handle authentication errors gracefully
				if (response.error?.includes('User not authenticated')) {
					notificationServiceLog.debug(
						'User not authenticated, skipping push token update'
					);
					return false;
				}

				// For rate limiting, don't retry - just fail silently
				// The token will be retried on next app launch
				if (response.error?.includes('Rate limit')) {
					notificationServiceLog.debug(
						'Rate limited, will retry on next app launch'
					);
					return false;
				}

				notificationServiceLog.error(
					'Failed to update push token',
					response.error
				);
				return false;
			}
		} catch (error) {
			// Handle authentication errors gracefully
			if (
				error instanceof Error &&
				error.message.includes('User not authenticated')
			) {
				notificationServiceLog.debug(
					'User not authenticated, skipping push token update'
				);
				return false;
			}

			// Handle rate limiting errors - no retry, just fail silently
			if (error instanceof Error && error.message.includes('Rate limit')) {
				notificationServiceLog.debug(
					'Rate limited, will retry on next app launch'
				);
				return false;
			}

			notificationServiceLog.error('Error updating push token', error);
			return false;
		}
	}

	// Get notifications from backend
	async getNotifications(
		page: number = 1,
		limit: number = 20,
		unreadOnly: boolean = false
	): Promise<NotificationResponse | null> {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
				unreadOnly: unreadOnly.toString(),
			});

			const response = await ApiService.get<any>(
				`/api/notifications?${params}`
			);

			if (response.success && response.data) {
				// Normalize the response to handle various API shapes
				const normalized = normalizeNotificationsResponse(response.data, page);

				// Convert back to expected NotificationResponse format
				return {
					notifications: normalized.items,
					pagination: {
						page: page,
						limit: limit,
						total: normalized.total || normalized.items.length,
						pages: normalized.total ? Math.ceil(normalized.total / limit) : 1,
					},
				};
			} else {
				// Handle authentication errors gracefully
				if (response.error?.includes('User not authenticated')) {
					notificationServiceLog.debug(
						'User not authenticated, returning null'
					);
					return null;
				}
				notificationServiceLog.error(
					'Failed to get notifications',
					response.error
				);
				return null;
			}
		} catch (error) {
			// Handle authentication errors gracefully
			if (
				error instanceof Error &&
				error.message.includes('User not authenticated')
			) {
				notificationServiceLog.debug('User not authenticated, returning null');
				return null;
			}
			notificationServiceLog.error('Error getting notifications', error);
			return null;
		}
	}

	// Get unread count
	async getUnreadCount(): Promise<number> {
		try {
			const response = await ApiService.get<any>(
				'/api/notifications/unread-count'
			);

			if (response.success && response.data) {
				return normalizeUnreadCountResponse(response.data);
			} else {
				// Handle authentication errors gracefully
				if (response.error?.includes('User not authenticated')) {
					notificationServiceLog.debug(
						'User not authenticated, returning 0 unread count'
					);
					return 0;
				}
				notificationServiceLog.error(
					'Failed to get unread count',
					response.error
				);
				return 0;
			}
		} catch (error) {
			// Handle authentication errors gracefully
			if (
				error instanceof Error &&
				error.message.includes('User not authenticated')
			) {
				notificationServiceLog.debug(
					'User not authenticated, returning 0 unread count'
				);
				return 0;
			}
			notificationServiceLog.error('Error getting unread count', error);
			return 0;
		}
	}

	// Mark notification as read
	async markAsRead(notificationId: string): Promise<boolean> {
		try {
			const response = await ApiService.put(
				`/api/notifications/${notificationId}/read`,
				{}
			);

			if (response.success) {
				notificationServiceLog.debug('Notification marked as read');
				return true;
			} else {
				notificationServiceLog.error(
					'Failed to mark notification as read',
					response.error
				);
				return false;
			}
		} catch (error) {
			notificationServiceLog.error('Error marking notification as read', error);
			return false;
		}
	}

	// Mark all notifications as read
	async markAllAsRead(): Promise<boolean> {
		try {
			const response = await ApiService.put(
				'/api/notifications/mark-all-read',
				{}
			);

			if (response.success) {
				notificationServiceLog.debug('All notifications marked as read');
				return true;
			} else {
				notificationServiceLog.error(
					'Failed to mark all notifications as read',
					response.error
				);
				return false;
			}
		} catch (error) {
			notificationServiceLog.error(
				'Error marking all notifications as read',
				error
			);
			return false;
		}
	}

	// Delete a notification
	async deleteNotification(notificationId: string): Promise<boolean> {
		try {
			const response = await ApiService.delete(
				`/api/notifications/${notificationId}`
			);

			if (response.success) {
				notificationServiceLog.debug('Notification deleted');
				return true;
			} else {
				notificationServiceLog.error(
					'Failed to delete notification',
					response.error
				);
				return false;
			}
		} catch (error) {
			notificationServiceLog.error('Error deleting notification', error);
			return false;
		}
	}

	// Delete all notifications
	async deleteAllNotifications(): Promise<boolean> {
		try {
			const response = await ApiService.delete('/api/notifications');

			if (response.success) {
				notificationServiceLog.debug('All notifications deleted');
				return true;
			} else {
				notificationServiceLog.error(
					'Failed to delete all notifications',
					response.error
				);
				return false;
			}
		} catch (error) {
			notificationServiceLog.error('Error deleting all notifications', error);
			return false;
		}
	}

	// Send a test notification
	async sendTestNotification(): Promise<boolean> {
		if (!this.expoPushToken) {
			notificationServiceLog.warn('No push token available');
			return false;
		}

		try {
			const message = {
				to: this.expoPushToken,
				sound: 'default',
				title: 'Test Notification',
				body: 'This is a test notification from your app!',
				data: { type: 'test', timestamp: Date.now() },
			};

			const response = await fetch('https://exp.host/--/api/v2/push/send', {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Accept-encoding': 'gzip, deflate',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(message),
			});

			const result = await response.json();

			if (response.ok) {
				notificationServiceLog.info('Test notification sent successfully');
				return true;
			} else {
				notificationServiceLog.error(
					'Failed to send test notification',
					result
				);
				return false;
			}
		} catch (error) {
			notificationServiceLog.error('Error sending test notification', error);
			return false;
		}
	}

	// Schedule a local notification
	async scheduleLocalNotification(
		title: string,
		body: string,
		data?: any,
		trigger?: Notifications.NotificationTriggerInput
	): Promise<string | null> {
		try {
			const identifier = await Notifications.scheduleNotificationAsync({
				content: {
					title,
					body,
					data: data || {},
				},
				trigger: trigger || null, // null means send immediately
			});

			notificationServiceLog.debug('Local notification scheduled', {
				identifier,
			});
			return identifier;
		} catch (error) {
			notificationServiceLog.error(
				'Error scheduling local notification',
				error
			);
			return null;
		}
	}

	// Cancel a scheduled notification
	async cancelScheduledNotification(identifier: string): Promise<boolean> {
		try {
			await Notifications.cancelScheduledNotificationAsync(identifier);
			notificationServiceLog.debug('Scheduled notification cancelled', {
				identifier,
			});
			return true;
		} catch (error) {
			notificationServiceLog.error(
				'Error cancelling scheduled notification',
				error
			);
			return false;
		}
	}

	// Cancel all scheduled notifications
	async cancelAllScheduledNotifications(): Promise<boolean> {
		try {
			await Notifications.cancelAllScheduledNotificationsAsync();
			notificationServiceLog.debug('All scheduled notifications cancelled');
			return true;
		} catch (error) {
			notificationServiceLog.error(
				'Error cancelling all scheduled notifications',
				error
			);
			return false;
		}
	}

	// Get badge count
	async getBadgeCount(): Promise<number> {
		try {
			return await Notifications.getBadgeCountAsync();
		} catch (error) {
			notificationServiceLog.error('Error getting badge count', error);
			return 0;
		}
	}

	// Set badge count
	async setBadgeCount(count: number): Promise<boolean> {
		try {
			await Notifications.setBadgeCountAsync(count);
			return true;
		} catch (error) {
			notificationServiceLog.error('Error setting badge count', error);
			return false;
		}
	}

	// Clear badge count
	async clearBadgeCount(): Promise<boolean> {
		return this.setBadgeCount(0);
	}

	// Get consent settings
	async getConsentSettings(): Promise<NotificationConsent> {
		if (this.consentSettings) {
			return this.consentSettings;
		}

		try {
			const response = await ApiService.get<{ consent: NotificationConsent }>(
				'/api/notifications/consent'
			);
			if (response.success && response.data?.consent) {
				this.consentSettings = response.data.consent;
				return this.consentSettings;
			}
		} catch {
			notificationServiceLog.warn(
				'Failed to fetch consent settings, using defaults'
			);
		}

		// Return default consent settings
		this.consentSettings = {
			core: {
				budget: true,
				goals: true,
				transactions: true,
				system: true,
			},
			aiInsights: {
				enabled: true,
				frequency: 'weekly',
				pushNotifications: true,
				emailAlerts: false,
			},
			marketing: {
				enabled: false, // Default to false - requires explicit opt-in
				promotional: false,
				newsletter: false,
				productUpdates: false,
				specialOffers: false,
			},
			reminders: {
				enabled: true,
				weeklySummary: true,
				monthlyCheck: true,
				overspendingAlerts: false,
			},
		};

		return this.consentSettings;
	}

	// Update consent settings
	async updateConsentSettings(
		consent: Partial<NotificationConsent>
	): Promise<boolean> {
		try {
			const response = await ApiService.put<{ success: boolean }>(
				'/api/notifications/consent',
				{ consent }
			);
			if (response.success) {
				// Update local cache with partial update
				if (this.consentSettings) {
					this.consentSettings = {
						...this.consentSettings,
						...consent,
						core: { ...this.consentSettings.core, ...consent.core },
						aiInsights: {
							...this.consentSettings.aiInsights,
							...consent.aiInsights,
						},
						marketing: {
							...this.consentSettings.marketing,
							...consent.marketing,
						},
						reminders: {
							...this.consentSettings.reminders,
							...consent.reminders,
						},
					};
				}
				return true;
			}
			return false;
		} catch (error) {
			notificationServiceLog.error('Error updating consent settings', error);
			return false;
		}
	}

	// Check if a notification type is allowed based on consent
	async isNotificationAllowed(
		type: NotificationData['type'],
		category?: string
	): Promise<boolean> {
		const consent = await this.getConsentSettings();

		// Core notifications are always allowed if notifications are enabled
		if (['budget', 'goal', 'transaction', 'system'].includes(type || '')) {
			return consent.core[type as keyof typeof consent.core] || false;
		}

		// AI insights
		if (type === 'ai_insight') {
			return consent.aiInsights.enabled && consent.aiInsights.pushNotifications;
		}

		// Reminders
		if (type === 'reminder') {
			if (category === 'weekly_summary') return consent.reminders.weeklySummary;
			if (category === 'monthly_check') return consent.reminders.monthlyCheck;
			if (category === 'overspending')
				return consent.reminders.overspendingAlerts;
			return consent.reminders.enabled;
		}

		// Marketing and promotional notifications require explicit opt-in
		if (['marketing', 'promotional'].includes(type || '')) {
			return (
				consent.marketing.enabled &&
				consent.marketing[type as keyof typeof consent.marketing]
			);
		}

		return false;
	}

	// Send notification with consent check
	async sendNotificationWithConsent(
		title: string,
		message: string,
		type: NotificationData['type'],
		data?: any,
		category?: string
	): Promise<boolean> {
		// Check if this notification type is allowed
		const isAllowed = await this.isNotificationAllowed(type, category);
		if (!isAllowed) {
			notificationServiceLog.debug(
				`Notification blocked: ${type} not allowed by consent settings`
			);
			return false;
		}

		// Send the notification
		return this.sendNotification(title, message, type, data);
	}

	// Send a notification (local or push)
	async sendNotification(
		title: string,
		message: string,
		type: NotificationData['type'] = 'system',
		data?: any,
		priority: 'low' | 'medium' | 'high' = 'medium'
	): Promise<boolean> {
		try {
			// Determine the appropriate channel/category based on type
			let channelId: string | undefined;
			let categoryIdentifier: string | undefined;

			switch (type) {
				case 'budget':
					channelId = 'budget-alerts';
					categoryIdentifier = 'BUDGET_ALERT';
					break;
				case 'goal':
					channelId = 'goal-updates';
					categoryIdentifier = 'GOAL_UPDATE';
					break;
				case 'transaction':
					channelId = 'transaction-alerts';
					categoryIdentifier = 'TRANSACTION_ALERT';
					break;
				case 'ai_insight':
					channelId = 'ai-insights';
					categoryIdentifier = 'AI_INSIGHT';
					break;
				case 'system':
					channelId = 'system-notifications';
					categoryIdentifier = 'SYSTEM_NOTIFICATION';
					break;
				case 'reminder':
					channelId = 'reminders';
					categoryIdentifier = 'REMINDER';
					break;
				case 'marketing':
					channelId = 'marketing';
					categoryIdentifier = 'MARKETING';
					break;
				case 'promotional':
					channelId = 'promotional';
					categoryIdentifier = 'PROMOTIONAL';
					break;
			}

			// Schedule local notification
			const identifier = await Notifications.scheduleNotificationAsync({
				content: {
					title,
					body: message,
					data: {
						...data,
						type,
						timestamp: Date.now(),
					},
					categoryIdentifier,
					...(Platform.OS === 'android' && channelId && { channelId }),
				},
				trigger: null, // Send immediately
			});

			notificationServiceLog.debug('Notification sent', { identifier });
			return true;
		} catch (error) {
			notificationServiceLog.error('Error sending notification', error);
			return false;
		}
	}

	// Send push notification through backend
	async sendPushNotification(
		title: string,
		message: string,
		type: NotificationData['type'] = 'system',
		data?: any,
		priority: 'low' | 'medium' | 'high' = 'medium',
		targetUserId?: string
	): Promise<boolean> {
		try {
			const response = await ApiService.post('/api/notifications/send', {
				title,
				message,
				type,
				data,
				priority,
				targetUserId,
			});

			if (response.success) {
				notificationServiceLog.info('Push notification sent successfully');
				return true;
			} else {
				notificationServiceLog.error(
					'Failed to send push notification',
					response.error
				);
				return false;
			}
		} catch (error) {
			notificationServiceLog.error('Error sending push notification', error);
			return false;
		}
	}

	// Set up notification event listeners
	setupNotificationListeners(): void {
		try {
			// Handle notification received while app is in foreground
			Notifications.addNotificationReceivedListener((notification) => {
				notificationServiceLog.debug('Notification received', notification);
				// You can add custom handling here, like updating UI state
			});

			// Handle notification tap/interaction
			Notifications.addNotificationResponseReceivedListener((response) => {
				notificationServiceLog.debug('Notification tapped', response);
				const { actionIdentifier, notification } = response;

				// Handle different action buttons
				switch (actionIdentifier) {
					case 'VIEW_BUDGET':
					case 'VIEW_GOAL':
					case 'VIEW_TRANSACTION':
					case 'VIEW_INSIGHT':
					case 'VIEW_SYSTEM':
					case 'VIEW_REMINDER':
					case 'VIEW_UPDATE':
					case 'VIEW_OFFER':
						// Navigate to relevant screen based on notification data
						this.handleNotificationNavigation(notification);
						break;
					case 'DISMISS':
						// Just dismiss, no action needed
						break;
				}
			});

			if (__DEV__) {
				notificationServiceLog.debug('Notification listeners set up');
			}
		} catch (error) {
			notificationServiceLog.error(
				'Error setting up notification listeners',
				error
			);
		}
	}

	// Handle notification navigation
	private handleNotificationNavigation(
		notification: Notifications.Notification
	): void {
		try {
			const { data } = notification.request.content;
			const type = data?.type;
			const entityId = data?.entityId;
			const route = data?.route;

			notificationServiceLog.debug('Navigating based on notification', {
				type,
				data,
			});

			// Import router dynamically to avoid circular dependencies
			import('expo-router').then(({ router }) => {
				// If a specific route is provided, use it
				if (route) {
					router.push(route);
					return;
				}

				// Otherwise, navigate based on notification type
				switch (type) {
					case 'budget':
						if (entityId) {
							router.push(`/(tabs)/budgets?budgetId=${entityId}`);
						} else {
							router.push('/(tabs)/budgets');
						}
						break;
					case 'goal':
						if (entityId) {
							router.push(`/(tabs)/budgets?goalId=${entityId}`);
						} else {
							router.push('/(tabs)/budgets');
						}
						break;
					case 'transaction':
						if (entityId) {
							router.push(`/(stack)/transactionDetails?id=${entityId}`);
						} else {
							router.push('/(tabs)/transaction');
						}
						break;
					case 'ai_insight':
						router.push('/(tabs)/chat');
						break;
					case 'system':
						router.push('/(stack)/settings');
						break;
					case 'reminder':
						router.push('/(tabs)/dashboard');
						break;
					case 'marketing':
					case 'promotional':
						// For marketing/promotional notifications, just show the notifications screen
						router.push('/(tabs)/dashboard/notifications');
						break;
					default:
						// Navigate to notifications screen
						router.push('/(tabs)/dashboard/notifications');
						break;
				}
			});
		} catch (error) {
			notificationServiceLog.error(
				'Error handling notification navigation',
				error
			);
		}
	}

	// Clean up notification listeners
	removeNotificationListeners(): void {
		try {
			// Note: Expo Notifications doesn't provide a direct way to remove specific listeners
			// The listeners are automatically cleaned up when the component unmounts
			notificationServiceLog.debug('Notification listeners cleaned up');
		} catch (error) {
			notificationServiceLog.error(
				'Error removing notification listeners',
				error
			);
		}
	}

	// Schedule recurring notifications
	async scheduleRecurringNotification(
		title: string,
		body: string,
		trigger: {
			hour: number;
			minute: number;
			weekday?: number; // 1-7, where 1 is Sunday
			day?: number; // 1-31 for monthly
		},
		data?: any,
		type: NotificationData['type'] = 'reminder'
	): Promise<string | null> {
		try {
			// Use the existing scheduleLocalNotification method with proper trigger
			return await this.scheduleLocalNotification(
				title,
				body,
				{
					...data,
					type,
					recurring: true,
					timestamp: Date.now(),
				},
				{
					hour: trigger.hour,
					minute: trigger.minute,
					...(trigger.weekday && { weekday: trigger.weekday }),
					...(trigger.day && { day: trigger.day }),
					repeats: true,
				} as Notifications.NotificationTriggerInput
			);
		} catch (error) {
			notificationServiceLog.error(
				'Error scheduling recurring notification',
				error
			);
			return null;
		}
	}

	// Get scheduled notifications
	async getScheduledNotifications(): Promise<
		Notifications.NotificationRequest[]
	> {
		try {
			return await Notifications.getAllScheduledNotificationsAsync();
		} catch (error) {
			notificationServiceLog.error(
				'Error getting scheduled notifications',
				error
			);
			return [];
		}
	}

	// Send notification with template
	async sendTemplatedNotification(
		template:
			| 'budget_alert'
			| 'goal_milestone'
			| 'weekly_summary'
			| 'monthly_check'
			| 'spending_insight',
		data: Record<string, any>
	): Promise<boolean> {
		try {
			const templates = {
				budget_alert: {
					title: 'Budget Alert',
					body: `You've spent ${data.percentage}% of your ${data.category} budget`,
					type: 'budget' as const,
					priority: 'high' as const,
				},
				goal_milestone: {
					title: 'Goal Milestone Reached!',
					body: `Congratulations! You've reached ${data.percentage}% of your ${data.goalName} goal`,
					type: 'goal' as const,
					priority: 'medium' as const,
				},
				weekly_summary: {
					title: 'Weekly Summary',
					body: `This week you spent $${data.totalSpent} across ${data.transactionCount} transactions`,
					type: 'reminder' as const,
					priority: 'low' as const,
				},
				monthly_check: {
					title: 'Monthly Check-in',
					body: `Time for your monthly financial review. You've saved $${data.savings} this month`,
					type: 'reminder' as const,
					priority: 'medium' as const,
				},
				spending_insight: {
					title: 'Spending Insight',
					body: data.insight,
					type: 'ai_insight' as const,
					priority: 'low' as const,
				},
			};

			const templateData = templates[template];
			if (!templateData) {
				notificationServiceLog.error('Unknown notification template', {
					template,
				});
				return false;
			}

			return await this.sendNotificationWithConsent(
				templateData.title,
				templateData.body,
				templateData.type,
				{ ...data, template },
				template
			);
		} catch (error) {
			notificationServiceLog.error(
				'Error sending templated notification',
				error
			);
			return false;
		}
	}

	// Notification analytics and tracking
	private notificationStats = {
		sent: 0,
		delivered: 0,
		opened: 0,
		dismissed: 0,
		byType: {} as Record<string, number>,
	};

	// Track notification event
	private trackNotificationEvent(
		event: 'sent' | 'delivered' | 'opened' | 'dismissed',
		type?: string
	): void {
		this.notificationStats[event]++;
		if (type) {
			this.notificationStats.byType[type] =
				(this.notificationStats.byType[type] || 0) + 1;
		}
	}

	// Get notification statistics
	getNotificationStats(): typeof this.notificationStats {
		return { ...this.notificationStats };
	}

	// Reset notification statistics
	resetNotificationStats(): void {
		this.notificationStats = {
			sent: 0,
			delivered: 0,
			opened: 0,
			dismissed: 0,
			byType: {},
		};
	}

	// Notification batching to prevent spam
	private notificationQueue: {
		title: string;
		message: string;
		type: NotificationData['type'];
		data?: any;
		timestamp: number;
	}[] = [];

	private batchTimeout: ReturnType<typeof setTimeout> | null = null;
	private readonly BATCH_DELAY = 5000; // 5 seconds
	private readonly MAX_BATCH_SIZE = 3;

	// Add notification to batch
	private async addToBatch(
		title: string,
		message: string,
		type: NotificationData['type'],
		data?: any
	): Promise<void> {
		this.notificationQueue.push({
			title,
			message,
			type,
			data,
			timestamp: Date.now(),
		});

		// Clear existing timeout
		if (this.batchTimeout) {
			clearTimeout(this.batchTimeout);
		}

		// If we've reached max batch size, send immediately
		if (this.notificationQueue.length >= this.MAX_BATCH_SIZE) {
			await this.processBatch();
			return;
		}

		// Set timeout to process batch
		this.batchTimeout = setTimeout(() => {
			this.processBatch();
		}, this.BATCH_DELAY);
	}

	// Process batched notifications
	private async processBatch(): Promise<void> {
		if (this.notificationQueue.length === 0) return;

		const batch = [...this.notificationQueue];
		this.notificationQueue = [];

		if (this.batchTimeout) {
			clearTimeout(this.batchTimeout);
			this.batchTimeout = null;
		}

		// If only one notification, send it normally
		if (batch.length === 1) {
			const notification = batch[0];
			await this.sendNotificationWithConsent(
				notification.title,
				notification.message,
				notification.type,
				notification.data
			);
			return;
		}

		// Group notifications by type
		const grouped = batch.reduce((acc, notification) => {
			const type = notification.type || 'system';
			if (!acc[type]) acc[type] = [];
			acc[type].push(notification);
			return acc;
		}, {} as Record<string, typeof batch>);

		// Send grouped notifications
		for (const [type, notifications] of Object.entries(grouped)) {
			if (notifications.length === 1) {
				const notification = notifications[0];
				await this.sendNotificationWithConsent(
					notification.title,
					notification.message,
					notification.type,
					notification.data
				);
			} else {
				// Send summary notification
				const summaryTitle = `${notifications.length} ${type} notifications`;
				const summaryMessage = `You have ${notifications.length} new ${type} notifications`;
				await this.sendNotificationWithConsent(
					summaryTitle,
					summaryMessage,
					type as NotificationData['type'],
					{ batch: true, count: notifications.length, notifications }
				);
			}
		}
	}

	// Send batched notification
	async sendBatchedNotification(
		title: string,
		message: string,
		type: NotificationData['type'] = 'system',
		data?: any
	): Promise<void> {
		await this.addToBatch(title, message, type, data);
	}

	// Initialize notification service with background task registration
	async initializeWithBackgroundTasks(): Promise<string | null> {
		try {
			// Initialize the basic notification service
			const token = await this.initialize();

			// Set up notification listeners
			this.setupNotificationListeners();

			// Register background tasks if available
			try {
				const { ensureBgPushRegistered } = await import(
					'../notifications/backgroundTaskService'
				);
				await ensureBgPushRegistered();
			} catch (error) {
				notificationServiceLog.warn(
					'Background task service not available',
					error
				);
			}

			return token;
		} catch (error) {
			notificationServiceLog.error(
				'Error initializing with background tasks',
				error
			);
			return null;
		}
	}

	// Get notification history with filtering
	async getNotificationHistory(
		page: number = 1,
		limit: number = 20,
		filters?: {
			type?: NotificationData['type'];
			unreadOnly?: boolean;
			dateFrom?: Date;
			dateTo?: Date;
		}
	): Promise<NotificationResponse | null> {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
				...(filters?.type && { type: filters.type }),
				...(filters?.unreadOnly && {
					unreadOnly: filters.unreadOnly.toString(),
				}),
				...(filters?.dateFrom && { dateFrom: filters.dateFrom.toISOString() }),
				...(filters?.dateTo && { dateTo: filters.dateTo.toISOString() }),
			});

			const response = await ApiService.get<NotificationResponse>(
				`/api/notifications/history?${params}`
			);

			if (response.success && response.data) {
				return response.data;
			} else {
				notificationServiceLog.error(
					'Failed to get notification history',
					response.error
				);
				return null;
			}
		} catch (error) {
			notificationServiceLog.error('Error getting notification history', error);
			return null;
		}
	}

	// Update notification preferences
	async updateNotificationPreferences(preferences: {
		enabled: boolean;
		types: NotificationData['type'][];
		quietHours?: {
			start: string; // HH:MM format
			end: string; // HH:MM format
		};
		frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';
	}): Promise<boolean> {
		try {
			const response = await ApiService.put('/api/notifications/preferences', {
				preferences,
			});

			if (response.success) {
				notificationServiceLog.debug('Notification preferences updated');
				return true;
			} else {
				notificationServiceLog.error(
					'Failed to update notification preferences',
					response.error
				);
				return false;
			}
		} catch (error) {
			notificationServiceLog.error(
				'Error updating notification preferences',
				error
			);
			return false;
		}
	}

	// Check if notifications are in quiet hours
	private isInQuietHours(quietHours?: { start: string; end: string }): boolean {
		if (!quietHours) return false;

		const now = new Date();
		const currentTime = now.getHours() * 60 + now.getMinutes();

		const [startHour, startMinute] = quietHours.start.split(':').map(Number);
		const [endHour, endMinute] = quietHours.end.split(':').map(Number);

		const startTime = startHour * 60 + startMinute;
		const endTime = endHour * 60 + endMinute;

		// Handle quiet hours that span midnight
		if (startTime <= endTime) {
			return currentTime >= startTime && currentTime <= endTime;
		} else {
			return currentTime >= startTime || currentTime <= endTime;
		}
	}

	// Send notification with quiet hours check
	async sendNotificationWithQuietHours(
		title: string,
		message: string,
		type: NotificationData['type'] = 'system',
		data?: any,
		quietHours?: { start: string; end: string }
	): Promise<boolean> {
		// Check if we're in quiet hours
		if (this.isInQuietHours(quietHours)) {
			notificationServiceLog.debug(
				'Notification suppressed during quiet hours'
			);
			return false;
		}

		return this.sendNotificationWithConsent(title, message, type, data);
	}
}

// Export a singleton instance
export const notificationService = new NotificationService();
