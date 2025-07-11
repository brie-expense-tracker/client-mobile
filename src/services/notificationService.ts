import { ApiService } from './apiService';
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
		| 'reminder';
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

class NotificationService {
	private expoPushToken: string | null = null;

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

	// Get push token
	getPushToken(): string | null {
		return this.expoPushToken;
	}

	// Update push token on backend
	async updatePushToken(token: string): Promise<boolean> {
		try {
			const response = await ApiService.put('/notifications/push-token', {
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
				`/notifications/${notificationId}/read`,
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
			const response = await ApiService.put('/notifications/mark-all-read', {});

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
				`/notifications/${notificationId}`
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
			const response = await ApiService.delete('/notifications');

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
}

// Export a singleton instance
export const notificationService = new NotificationService();
