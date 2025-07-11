import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useRef,
	ReactNode,
	useCallback,
} from 'react';
import * as Notifications from 'expo-notifications';
import {
	notificationService,
	NotificationData,
	NotificationResponse,
} from '../services/notificationService';

interface NotificationContextType {
	expoPushToken: string | null;
	notification: Notifications.Notification | null;
	error: Error | null;
	notifications: NotificationData[];
	unreadCount: number;
	loading: boolean;
	initialize: () => Promise<void>;
	getNotifications: (page?: number, limit?: number) => Promise<void>;
	markAsRead: (notificationId: string) => Promise<void>;
	markAllAsRead: () => Promise<void>;
	deleteNotification: (notificationId: string) => Promise<void>;
	deleteAllNotifications: () => Promise<void>;
	sendTestNotification: () => Promise<void>;
	refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
	undefined
);

export const useNotification = () => {
	const context = useContext(NotificationContext);
	if (context === undefined) {
		throw new Error(
			'useNotification must be used within a NotificationProvider'
		);
	}
	return context;
};

interface NotificationProviderProps {
	children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
	children,
}) => {
	const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
	const [notification, setNotification] =
		useState<Notifications.Notification | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [notifications, setNotifications] = useState<NotificationData[]>([]);
	const [unreadCount, setUnreadCount] = useState<number>(0);
	const [loading, setLoading] = useState<boolean>(false);

	const notificationListener = useRef<Notifications.EventSubscription | null>(
		null
	);
	const responseListener = useRef<Notifications.EventSubscription | null>(null);

	// Initialize notification service
	const initialize = useCallback(async () => {
		try {
			setError(null);
			const token = await notificationService.initialize();
			setExpoPushToken(token);
			// Set up notification listeners
			notificationListener.current =
				Notifications.addNotificationReceivedListener((notification) => {
					console.log('🔔 Notification Received: ', notification);
					setNotification(notification);
					refreshUnreadCount();
				});
			responseListener.current =
				Notifications.addNotificationResponseReceivedListener((response) => {
					console.log(
						'🔔 Notification Response: ',
						JSON.stringify(response, null, 2),
						JSON.stringify(response.notification.request.content.data, null, 2)
					);
					// Handle the notification response here
				});
		} catch (err) {
			setError(
				err instanceof Error
					? err
					: new Error('Failed to initialize notifications')
			);
		}
	}, []);

	const getNotifications = useCallback(
		async (page: number = 1, limit: number = 20) => {
			try {
				setLoading(true);
				const response = await notificationService.getNotifications(
					page,
					limit
				);
				if (response) {
					setNotifications(response.notifications);
				}
			} catch (err) {
				setError(
					err instanceof Error ? err : new Error('Failed to get notifications')
				);
			} finally {
				setLoading(false);
			}
		},
		[]
	);

	const markAsRead = useCallback(async (notificationId: string) => {
		try {
			await notificationService.markAsRead(notificationId);
			setNotifications((prev) =>
				prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
			);
			refreshUnreadCount();
		} catch (err) {
			setError(
				err instanceof Error
					? err
					: new Error('Failed to mark notification as read')
			);
		}
	}, []);

	const markAllAsRead = useCallback(async () => {
		try {
			await notificationService.markAllAsRead();
			setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
			setUnreadCount(0);
		} catch (err) {
			setError(
				err instanceof Error
					? err
					: new Error('Failed to mark all notifications as read')
			);
		}
	}, []);

	const deleteNotification = useCallback(async (notificationId: string) => {
		try {
			await notificationService.deleteNotification(notificationId);
			setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
			refreshUnreadCount();
		} catch (err) {
			setError(
				err instanceof Error ? err : new Error('Failed to delete notification')
			);
		}
	}, []);

	const deleteAllNotifications = useCallback(async () => {
		try {
			await notificationService.deleteAllNotifications();
			setNotifications([]);
			setUnreadCount(0);
		} catch (err) {
			setError(
				err instanceof Error
					? err
					: new Error('Failed to delete all notifications')
			);
		}
	}, []);

	const sendTestNotification = useCallback(async () => {
		try {
			await notificationService.sendTestNotification();
		} catch (err) {
			setError(
				err instanceof Error
					? err
					: new Error('Failed to send test notification')
			);
		}
	}, []);

	const refreshUnreadCount = useCallback(async () => {
		try {
			const count = await notificationService.getUnreadCount();
			setUnreadCount(count);
		} catch (err) {
			console.error('Failed to refresh unread count:', err);
		}
	}, []);

	useEffect(() => {
		initialize();
		return () => {
			if (notificationListener.current) {
				notificationListener.current.remove();
			}
			if (responseListener.current) {
				responseListener.current.remove();
			}
		};
	}, [initialize]);

	useEffect(() => {
		if (expoPushToken) {
			getNotifications();
			refreshUnreadCount();
		}
	}, [expoPushToken, getNotifications, refreshUnreadCount]);

	return (
		<NotificationContext.Provider
			value={{
				expoPushToken,
				notification,
				error,
				notifications,
				unreadCount,
				loading,
				initialize,
				getNotifications,
				markAsRead,
				markAllAsRead,
				deleteNotification,
				deleteAllNotifications,
				sendTestNotification,
				refreshUnreadCount,
			}}
		>
			{children}
		</NotificationContext.Provider>
	);
};
