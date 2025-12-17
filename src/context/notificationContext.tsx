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
import useAuth from './AuthContext';
import { useOnboarding } from './OnboardingContext';
import { createLogger } from '../utils/sublogger';

const notificationContextLog = createLogger('NotificationContext');

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
	// Safety check for children prop - don't inspect it, just render it
	if (!children) {
		notificationContextLog.error(
			'NotificationProvider: children prop is undefined'
		);
		return null;
	}
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
	// Track loading state with ref to prevent infinite loops in useCallback dependencies
	const isLoadingRef = useRef<boolean>(false);

	// Refresh unread count function with throttling
	const refreshUnreadCount = useCallback(async (force: boolean = false) => {
		const now = Date.now();
		if (
			!force &&
			now - lastUnreadCountRefresh.current < UNREAD_COUNT_THROTTLE_MS
		) {
			notificationContextLog.debug('Throttling unread count refresh');
			return;
		}

		lastUnreadCountRefresh.current = now;
		try {
			const count = await notificationService.getUnreadCount();
			setUnreadCount(count);
		} catch (err: any) {
			// Don't log errors for missing user account - this is expected after account deletion
			if (err?.message?.includes('User account not found')) {
				notificationContextLog.debug(
					'ℹ️ [Notifications] User account not found, skipping count refresh'
				);
				setUnreadCount(0);
			} else {
				notificationContextLog.error('Failed to refresh unread count', err);
			}
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

	const hasInitializedRef = useRef(false);

	// Initialize notification service
	const initialize = useCallback(async () => {
		if (hasInitializedRef.current) {
			notificationContextLog.debug('Notifications already initialized, skipping');
			return;
		}

		try {
			setError(null);
			const token = await notificationService.initialize();
			setExpoPushToken(token);
			hasInitializedRef.current = true;

			// Set up notification service listeners (includes navigation logic)
			notificationService.setupNotificationListeners();

			// Set up notification listeners for context state management
			notificationListener.current =
				Notifications.addNotificationReceivedListener((notification) => {
					setNotification(notification);
					refreshUnreadCount(true); // Force refresh when new notification arrives
				});
			responseListener.current =
				Notifications.addNotificationResponseReceivedListener((response) => {
					notificationContextLog.debug('Notification response received', {
						response,
					});
					// The notification service will handle the navigation logic
					// We just need to ensure the notification is marked as read if needed
					if (response.notification.request.content.data?.id) {
						// Mark as read if the notification has an ID
						markAsRead(response.notification.request.content.data.id);
					}
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
	}, [refreshUnreadCount, startPeriodicRefresh, markAsRead]);

	const getNotifications = useCallback(
		async (page: number = 1, limit: number = 20) => {
			// Prevent multiple simultaneous requests using ref to avoid dependency issues
			if (isLoadingRef.current) {
				notificationContextLog.debug('Request already in progress, skipping');
				return;
			}

			try {
				isLoadingRef.current = true;
				setLoading(true);
				setError(null);
				const response = await notificationService.getNotifications(
					page,
					limit
				);
				if (response) {
					// Use safe array length to prevent crashes
					const notificationCount = response.notifications?.length || 0;
					setNotifications(response.notifications || []);
					setCurrentPage(page);
					setHasMore(notificationCount === limit);
					notificationContextLog.debug(
						`Loaded ${notificationCount} notifications for page ${page}`
					);
				}
			} catch (err: any) {
				// Don't log errors for missing user account - this is expected after account deletion
				if (err?.message?.includes('User account not found')) {
					notificationContextLog.debug(
						'User account not found, skipping notifications fetch'
					);
					setNotifications([]);
					setHasMore(false);
				} else {
					notificationContextLog.error('Error getting notifications', err);
					setError(
						err instanceof Error
							? err
							: new Error('Failed to get notifications')
					);
				}
			} finally {
				isLoadingRef.current = false;
				setLoading(false);
			}
		},
		[] // Empty deps - use ref for loading state to prevent infinite loops
	);

	const loadMoreNotifications = useCallback(async () => {
		if (!hasMore || isLoadingRef.current) {
			notificationContextLog.debug('Load more blocked', { hasMore, loading: isLoadingRef.current });
			return;
		}

		try {
			isLoadingRef.current = true;
			setLoading(true);
			setError(null);
			const nextPage = currentPage + 1;
			notificationContextLog.debug(`Loading page ${nextPage}`);
			const response = await notificationService.getNotifications(nextPage, 20);
			if (response) {
				// Use safe array operations to prevent crashes
				const newNotifications = response.notifications || [];
				const newNotificationCount = newNotifications.length;

				setNotifications((prev) => [...prev, ...newNotifications]);
				setCurrentPage(nextPage);
				setHasMore(newNotificationCount === 20);
				notificationContextLog.debug(
					`Loaded ${newNotificationCount} more notifications`
				);
			}
		} catch (err) {
			notificationContextLog.error(
				'❌ [Notifications] Error loading more notifications:',
				err
			);
			setError(
				err instanceof Error
					? err
					: new Error('Failed to load more notifications')
			);
		} finally {
			isLoadingRef.current = false;
			setLoading(false);
		}
	}, [hasMore, currentPage]); // Removed loading from deps, using ref instead

	const refreshNotifications = useCallback(async () => {
		// Prevent refresh if already loading
		if (isLoadingRef.current) {
			notificationContextLog.debug('Refresh blocked - already loading');
			return;
		}

		notificationContextLog.debug('Refreshing notifications');
		setCurrentPage(1);
		setHasMore(true);
		await getNotifications(1, 20);
	}, [getNotifications]); // Removed loading from deps, using ref instead

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
			notificationContextLog.error('Error getting consent settings:', err);
			throw err;
		}
	}, []);

	// Update consent settings
	const updateConsentSettings = useCallback(
		async (consent: Partial<NotificationConsent>) => {
			try {
				return await notificationService.updateConsentSettings(consent);
			} catch (err) {
				notificationContextLog.error('Error updating consent settings:', err);
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
				notificationContextLog.error(
					'Error checking notification permission:',
					err
				);
				return false;
			}
		},
		[]
	);

	// Defer notification initialization until user is authenticated
	const { user, isAuthenticated } = useAuth();
	const { onboardingVersion } = useOnboarding();

	useEffect(() => {
		// Only initialize notifications when user is authenticated AND has a real MongoDB ID (not 'temp')
		// AND has completed onboarding (to avoid requesting permissions during onboarding)
		// And only initialize once
		const isVersionComplete =
			onboardingVersion !== null
				? onboardingVersion >= 1
				: (user?.onboardingVersion ?? 0) >= 1;

		if (
			isAuthenticated &&
			user &&
			user._id !== 'temp' &&
			isVersionComplete &&
			!hasInitializedRef.current
		) {
			notificationContextLog.debug(
				'User authenticated and onboarding complete, initializing notifications'
			);
			hasInitializedRef.current = true;
			initialize();
		} else if (user && user._id === 'temp') {
			notificationContextLog.debug(
				'Waiting for MongoDB user creation before initializing'
			);
		} else if (!isVersionComplete) {
			notificationContextLog.debug(
				'Waiting for onboarding completion before initializing notifications'
			);
		}

		return () => {
			if (notificationListener.current) {
				notificationListener.current.remove();
			}
			if (responseListener.current) {
				responseListener.current.remove();
			}
			// Clean up periodic refresh
			stopPeriodicRefresh();
			// Reset on cleanup
			hasInitializedRef.current = false;
		};
	}, [initialize, stopPeriodicRefresh, isAuthenticated, user, onboardingVersion]);

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
