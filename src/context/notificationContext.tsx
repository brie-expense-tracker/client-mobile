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
	NotificationConsent,
} from '../services';

interface NotificationFilter {
	type?: NotificationData['type'];
	read?: boolean;
	priority?: NotificationData['priority'];
}

interface NotificationContextType {
	expoPushToken: string | null;
	notification: Notifications.Notification | null;
	error: Error | null;
	notifications: NotificationData[];
	unreadCount: number;
	loading: boolean;
	hasMore: boolean;
	currentPage: number;
	filter: NotificationFilter;
	initialize: () => Promise<void>;
	getNotifications: (page?: number, limit?: number) => Promise<void>;
	loadMoreNotifications: () => Promise<void>;
	refreshNotifications: () => Promise<void>;
	setFilter: (filter: Partial<NotificationFilter>) => void;
	clearFilter: () => void;
	markAsRead: (notificationId: string) => Promise<void>;
	markAllAsRead: () => Promise<void>;
	deleteNotification: (notificationId: string) => Promise<void>;
	deleteAllNotifications: () => Promise<void>;
	sendTestNotification: () => Promise<void>;
	refreshUnreadCount: () => Promise<void>;
	// New consent management methods
	getConsentSettings: () => Promise<NotificationConsent>;
	updateConsentSettings: (
		consent: Partial<NotificationConsent>
	) => Promise<boolean>;
	isNotificationAllowed: (
		type: NotificationData['type'],
		category?: string
	) => Promise<boolean>;
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
	const [hasMore, setHasMore] = useState<boolean>(true);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [filter, setFilter] = useState<NotificationFilter>({});

	const notificationListener = useRef<Notifications.EventSubscription | null>(
		null
	);
	const responseListener = useRef<Notifications.EventSubscription | null>(null);

	// Throttling for unread count refresh
	const lastUnreadCountRefresh = useRef<number>(0);
	const UNREAD_COUNT_THROTTLE_MS = 30000; // 30 seconds
	const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// Refresh unread count function with throttling
	const refreshUnreadCount = useCallback(async (force: boolean = false) => {
		const now = Date.now();
		if (
			!force &&
			now - lastUnreadCountRefresh.current < UNREAD_COUNT_THROTTLE_MS
		) {
			console.log('⏳ [NotificationContext] Throttling unread count refresh');
			return;
		}

		lastUnreadCountRefresh.current = now;
		try {
			const count = await notificationService.getUnreadCount();
			setUnreadCount(count);
		} catch (err) {
			console.error('Failed to refresh unread count:', err);
		}
	}, []);

	// Set up periodic refresh with intelligent intervals
	const startPeriodicRefresh = useCallback(() => {
		if (refreshIntervalRef.current) {
			clearInterval(refreshIntervalRef.current);
		}

		// Refresh every 2 minutes when app is active
		refreshIntervalRef.current = setInterval(() => {
			refreshUnreadCount();
		}, 120000); // 2 minutes
	}, [refreshUnreadCount]);

	// Stop periodic refresh
	const stopPeriodicRefresh = useCallback(() => {
		if (refreshIntervalRef.current) {
			clearInterval(refreshIntervalRef.current);
			refreshIntervalRef.current = null;
		}
	}, []);

	// Initialize notification service
	const initialize = useCallback(async () => {
		try {
			setError(null);
			const token = await notificationService.initialize();
			setExpoPushToken(token);
			// Set up notification listeners
			notificationListener.current =
				Notifications.addNotificationReceivedListener((notification) => {
					setNotification(notification);
					refreshUnreadCount(true); // Force refresh when new notification arrives
				});
			responseListener.current =
				Notifications.addNotificationResponseReceivedListener((response) => {
					// Handle the notification response here
				});

			// Start periodic refresh
			startPeriodicRefresh();
		} catch (err) {
			setError(
				err instanceof Error
					? err
					: new Error('Failed to initialize notifications')
			);
		}
	}, [refreshUnreadCount, startPeriodicRefresh]);

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
					setCurrentPage(page);
					setHasMore(response.notifications.length === limit);
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

	const loadMoreNotifications = useCallback(async () => {
		if (!hasMore || loading) return;

		try {
			setLoading(true);
			const nextPage = currentPage + 1;
			const response = await notificationService.getNotifications(nextPage, 20);
			if (response) {
				setNotifications((prev) => [...prev, ...response.notifications]);
				setCurrentPage(nextPage);
				setHasMore(response.notifications.length === 20);
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err
					: new Error('Failed to load more notifications')
			);
		} finally {
			setLoading(false);
		}
	}, [hasMore, loading, currentPage]);

	const refreshNotifications = useCallback(async () => {
		setCurrentPage(1);
		setHasMore(true);
		await getNotifications(1, 20);
	}, [getNotifications]);

	const setFilterCallback = useCallback(
		(newFilter: Partial<NotificationFilter>) => {
			setFilter((prev) => ({ ...prev, ...newFilter }));
			setCurrentPage(1);
			setHasMore(true);
			// Refresh notifications with new filter
			getNotifications(1, 20);
		},
		[getNotifications]
	);

	const clearFilter = useCallback(() => {
		setFilter({});
		setCurrentPage(1);
		setHasMore(true);
		// Refresh notifications without filter
		getNotifications(1, 20);
	}, [getNotifications]);

	const markAsRead = useCallback(
		async (notificationId: string) => {
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
		},
		[refreshUnreadCount]
	);

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

	const deleteNotification = useCallback(
		async (notificationId: string) => {
			try {
				await notificationService.deleteNotification(notificationId);
				setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
				refreshUnreadCount();
			} catch (err) {
				setError(
					err instanceof Error
						? err
						: new Error('Failed to delete notification')
				);
			}
		},
		[refreshUnreadCount]
	);

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

	// Get consent settings
	const getConsentSettings = useCallback(async () => {
		try {
			return await notificationService.getConsentSettings();
		} catch (err) {
			console.error('Error getting consent settings:', err);
			throw err;
		}
	}, []);

	// Update consent settings
	const updateConsentSettings = useCallback(
		async (consent: Partial<NotificationConsent>) => {
			try {
				return await notificationService.updateConsentSettings(consent);
			} catch (err) {
				console.error('Error updating consent settings:', err);
				throw err;
			}
		},
		[]
	);

	// Check if notification is allowed
	const isNotificationAllowed = useCallback(
		async (type: NotificationData['type'], category?: string) => {
			try {
				return await notificationService.isNotificationAllowed(type, category);
			} catch (err) {
				console.error('Error checking notification permission:', err);
				return false;
			}
		},
		[]
	);

	useEffect(() => {
		initialize();
		return () => {
			if (notificationListener.current) {
				notificationListener.current.remove();
			}
			if (responseListener.current) {
				responseListener.current.remove();
			}
			// Clean up periodic refresh
			stopPeriodicRefresh();
		};
	}, [initialize, stopPeriodicRefresh]);

	useEffect(() => {
		if (expoPushToken) {
			getNotifications();
			refreshUnreadCount(true); // Force initial refresh
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
				hasMore,
				currentPage,
				filter,
				initialize,
				getNotifications,
				loadMoreNotifications,
				refreshNotifications,
				setFilter: setFilterCallback,
				clearFilter,
				markAsRead,
				markAllAsRead,
				deleteNotification,
				deleteAllNotifications,
				sendTestNotification,
				refreshUnreadCount,
				// New consent management methods
				getConsentSettings,
				updateConsentSettings,
				isNotificationAllowed,
			}}
		>
			{children}
		</NotificationContext.Provider>
	);
};
