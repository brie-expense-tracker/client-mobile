import { ApiService } from '../core/apiService';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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
				console.log('⚠️ Notifications require a physical device');
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
				console.log('❌ Notification permissions not granted');
				return null;
			}

			// Set up Android channels and iOS categories
			await this.setupNotificationChannels();

			// Get the project ID
			const projectId =
				Constants?.expoConfig?.extra?.eas?.projectId ??
				Constants?.easConfig?.projectId;
			if (!projectId) {
				console.log('❌ Project ID not found');
				return null;
			}

			// Get the push token
			const tokenData = await Notifications.getExpoPushTokenAsync({
				projectId,
			});

			this.expoPushToken = tokenData.data;
			console.log('✅ Push token obtained:', this.expoPushToken);

			// Update the token on the backend
			if (this.expoPushToken) {
				await this.updatePushToken(this.expoPushToken);
			}

			return this.expoPushToken;
		} catch (error) {
			console.error('❌ Error initializing notifications:', error);
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

			console.log('✅ Notification channels and categories set up');
		} catch (error) {
			console.error('❌ Error setting up notification channels:', error);
		}
	}

	// Get push token
	getPushToken(): string | null {
		return this.expoPushToken;
	}

	// Update push token on backend
	async updatePushToken(token: string): Promise<boolean> {
		try {
			const response = await ApiService.put('/api/notifications/push-token', {
				expoPushToken: token,
			});

			if (response.success) {
				console.log('✅ Push token updated on backend');
				return true;
			} else {
				console.error('❌ Failed to update push token:', response.error);
				return false;
			}
		} catch (error) {
			console.error('❌ Error updating push token:', error);
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

			const response = await ApiService.get<NotificationResponse>(
				`/notifications?${params}`
			);

			if (response.success && response.data) {
				return response.data;
			} else {
				console.error('❌ Failed to get notifications:', response.error);
				return null;
			}
		} catch (error) {
			console.error('❌ Error getting notifications:', error);
			return null;
		}
	}

	// Get unread count
	async getUnreadCount(): Promise<number> {
		try {
			const response = await ApiService.get<UnreadCountResponse>(
				'/notifications/unread-count'
			);

			if (response.success && response.data) {
				return response.data.count;
			} else {
				console.error('❌ Failed to get unread count:', response.error);
				return 0;
			}
		} catch (error) {
			console.error('❌ Error getting unread count:', error);
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
				console.log('✅ Notification marked as read');
				return true;
			} else {
				console.error(
					'❌ Failed to mark notification as read:',
					response.error
				);
				return false;
			}
		} catch (error) {
			console.error('❌ Error marking notification as read:', error);
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
				console.log('✅ All notifications marked as read');
				return true;
			} else {
				console.error(
					'❌ Failed to mark all notifications as read:',
					response.error
				);
				return false;
			}
		} catch (error) {
			console.error('❌ Error marking all notifications as read:', error);
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
				console.log('✅ Notification deleted');
				return true;
			} else {
				console.error('❌ Failed to delete notification:', response.error);
				return false;
			}
		} catch (error) {
			console.error('❌ Error deleting notification:', error);
			return false;
		}
	}

	// Delete all notifications
	async deleteAllNotifications(): Promise<boolean> {
		try {
			const response = await ApiService.delete('/api/notifications');

			if (response.success) {
				console.log('✅ All notifications deleted');
				return true;
			} else {
				console.error('❌ Failed to delete all notifications:', response.error);
				return false;
			}
		} catch (error) {
			console.error('❌ Error deleting all notifications:', error);
			return false;
		}
	}

	// Send a test notification
	async sendTestNotification(): Promise<boolean> {
		if (!this.expoPushToken) {
			console.error('❌ No push token available');
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
				console.log('✅ Test notification sent successfully');
				return true;
			} else {
				console.error('❌ Failed to send test notification:', result);
				return false;
			}
		} catch (error) {
			console.error('❌ Error sending test notification:', error);
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

			console.log('✅ Local notification scheduled:', identifier);
			return identifier;
		} catch (error) {
			console.error('❌ Error scheduling local notification:', error);
			return null;
		}
	}

	// Cancel a scheduled notification
	async cancelScheduledNotification(identifier: string): Promise<boolean> {
		try {
			await Notifications.cancelScheduledNotificationAsync(identifier);
			console.log('✅ Scheduled notification cancelled:', identifier);
			return true;
		} catch (error) {
			console.error('❌ Error cancelling scheduled notification:', error);
			return false;
		}
	}

	// Cancel all scheduled notifications
	async cancelAllScheduledNotifications(): Promise<boolean> {
		try {
			await Notifications.cancelAllScheduledNotificationsAsync();
			console.log('✅ All scheduled notifications cancelled');
			return true;
		} catch (error) {
			console.error('❌ Error cancelling all scheduled notifications:', error);
			return false;
		}
	}

	// Get badge count
	async getBadgeCount(): Promise<number> {
		try {
			return await Notifications.getBadgeCountAsync();
		} catch (error) {
			console.error('❌ Error getting badge count:', error);
			return 0;
		}
	}

	// Set badge count
	async setBadgeCount(count: number): Promise<boolean> {
		try {
			await Notifications.setBadgeCountAsync(count);
			return true;
		} catch (error) {
			console.error('❌ Error setting badge count:', error);
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
				'/notifications/consent'
			);
			if (response.success && response.data?.consent) {
				this.consentSettings = response.data.consent;
				return this.consentSettings;
			}
		} catch (error) {
			console.log('❌ Failed to fetch consent settings, using defaults');
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
				'/notifications/consent',
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
			console.error('❌ Error updating consent settings:', error);
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
			console.log(
				`❌ Notification blocked: ${type} not allowed by consent settings`
			);
			return false;
		}

		// Send the notification
		return this.sendNotification(title, message, type, data);
	}
}

// Export a singleton instance
export const notificationService = new NotificationService();
