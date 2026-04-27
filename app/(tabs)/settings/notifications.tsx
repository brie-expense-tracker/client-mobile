import React, { useState } from 'react';
import { logger } from '../../../src/utils/logger';
import {
	View,
	FlatList,
	StyleSheet,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
	Gesture,
	GestureDetector,
	GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
	runOnJS,
	withSpring,
	Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNotification } from '@/src/context/notificationContext';
import { NotificationData } from '@/src/services';
import { router } from 'expo-router';
import { palette, space, radius, type, shadow } from '../../../src/ui/theme';
import {
	AppScreen,
	AppText,
	AppButton,
} from '../../../src/ui/primitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../../../src/components/ErrorBoundary';

const AnimatedView = Animated.createAnimatedComponent(View);

const loadingStateStyles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: space.lg,
	},
	label: {
		marginTop: space.md,
		...type.body,
		color: palette.text,
	},
});

const emptyStateStyles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: space.xl,
	},
	title: {
		...type.h2,
		color: palette.text,
		marginTop: space.md,
		textAlign: 'center',
	},
	subtitle: {
		...type.body,
		color: palette.textMuted,
		marginTop: space.sm,
		textAlign: 'center',
	},
	cta: {
		marginTop: space.lg,
	},
});

function LoadingState({ label }: { label: string }) {
	return (
		<View style={loadingStateStyles.container}>
			<ActivityIndicator size="large" color={palette.primary} />
			<AppText.Body style={loadingStateStyles.label} color="muted">
				{label}
			</AppText.Body>
		</View>
	);
}

function EmptyState({
	icon,
	title,
	subtitle,
	ctaLabel,
	onPress,
}: {
	icon: string;
	title: string;
	subtitle: string;
	ctaLabel?: string;
	onPress?: () => void;
}) {
	return (
		<View style={emptyStateStyles.container}>
			<Ionicons name={icon as any} size={48} color={palette.textMuted} />
			<AppText.Heading style={emptyStateStyles.title}>{title}</AppText.Heading>
			<AppText.Body color="muted" style={emptyStateStyles.subtitle}>
				{subtitle}
			</AppText.Body>
			{ctaLabel != null && onPress != null && (
				<AppButton
					label={ctaLabel}
					variant="primary"
					onPress={onPress}
					style={emptyStateStyles.cta}
				/>
			)}
		</View>
	);
}

// Helper function to get notification type icon and color
const getNotificationTypeInfo = (type?: string) => {
	switch (type) {
		case 'budget':
			return { icon: 'wallet-outline', color: palette.danger };
		case 'goal':
			return { icon: 'trophy-outline', color: palette.success };
		case 'transaction':
			return { icon: 'card-outline', color: palette.primary };
		case 'ai_insight':
			return { icon: 'bulb-outline', color: palette.primaryStrong };
		case 'system':
			return { icon: 'settings-outline', color: palette.textMuted };
		case 'reminder':
			return { icon: 'time-outline', color: palette.warning };
		case 'marketing':
			return { icon: 'megaphone-outline', color: palette.danger };
		case 'promotional':
			return { icon: 'gift-outline', color: palette.warning };
		default:
			return { icon: 'notifications-outline', color: palette.iconMuted };
	}
};

const NotificationItem = ({
	item,
	onDelete,
	onMarkAsRead,
}: {
	item: NotificationData;
	onDelete: (id: string, resetAnimation: () => void) => void;
	onMarkAsRead: (id: string) => void;
}) => {
	const translateX = useSharedValue(0);
	const TRANSLATE_THRESHOLD = -70;
	const DELETE_WIDTH = 60;
	const hasTriggeredHaptic = useSharedValue(false);
	const iconScale = useSharedValue(1);
	const typeInfo = getNotificationTypeInfo(item.type);

	const handleDelete = () => {
		onDelete(item.id!, resetAnimation);
	};

	const resetAnimation = () => {
		translateX.value = 0;
		hasTriggeredHaptic.value = false;
		iconScale.value = withSpring(1, {
			damping: 15,
			stiffness: 150,
		});
	};

	const triggerHaptic = () => {
		try {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		} catch {
			logger.debug('Haptic feedback not available');
		}
	};

	const panGesture = Gesture.Pan()
		.activeOffsetX([-15, 15])
		.failOffsetY([-10, 10])
		.onUpdate(({ translationX }) => {
			translateX.value = Math.min(0, translationX);

			// Trigger haptic and scale animation when crossing threshold
			if (translateX.value < TRANSLATE_THRESHOLD && !hasTriggeredHaptic.value) {
				hasTriggeredHaptic.value = true;
				iconScale.value = withSpring(1.5, {
					damping: 15,
					stiffness: 150,
				});
				runOnJS(triggerHaptic)();
			} else if (
				translateX.value >= TRANSLATE_THRESHOLD &&
				hasTriggeredHaptic.value
			) {
				hasTriggeredHaptic.value = false;
				iconScale.value = withSpring(1, {
					damping: 15,
					stiffness: 150,
				});
				runOnJS(triggerHaptic)();
			}
		})
		.onEnd(() => {
			if (translateX.value < TRANSLATE_THRESHOLD) {
				translateX.value = withTiming(
					-DELETE_WIDTH,
					{ duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
					() => runOnJS(handleDelete)()
				);
			} else {
				translateX.value = withSpring(0, { damping: 20 });
				iconScale.value = withSpring(1, {
					damping: 15,
					stiffness: 150,
				});
			}
		});

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }],
	}));

	const trashIconStyle = useAnimatedStyle(() => ({
		transform: [{ scale: iconScale.value }],
	}));

	const handlePress = () => {
		// Mark as read if unread
		if (!item.read && item.id) {
			onMarkAsRead(item.id);
		}

		// Navigate based on notification type and data
		handleNotificationNavigation(item);
	};

	const handleNotificationNavigation = (notification: NotificationData) => {
		try {
			const { type, data } = notification;
			const entityId = data?.entityId;
			const route = data?.route;

			logger.debug('🧭 Navigating based on notification tap:', {
				type,
				entityId,
				route,
			});

			// If a specific route is provided, use it
			if (route) {
				router.push(route as any);
				return;
			}

			// Otherwise, navigate based on notification type
			switch (type) {
				case 'budget':
				case 'goal':
					// MVP: wallet removed - redirect to dashboard
					router.push('/(tabs)/dashboard');
					break;
				case 'transaction':
					if (entityId) {
						router.push(`/dashboard/ledger/edit?id=${entityId}` as any);
					} else {
						router.push('/(tabs)/transaction');
					}
					break;
				case 'ai_insight':
					// MVP: chat removed - redirect to dashboard
					router.push('/(tabs)/dashboard');
					break;
				case 'system':
					router.push('/(stack)/settings' as any);
					break;
				case 'reminder':
					router.push('/(tabs)/dashboard');
					break;
				case 'marketing':
				case 'promotional':
					// For marketing/promotional notifications, stay on notifications screen
					break;
				default:
					// Stay on notifications screen for unknown types
					break;
			}
		} catch (error) {
			logger.error('❌ Error handling notification navigation:', error);
		}
	};

	return (
		<View style={styles.txRowContainer}>
			<View style={styles.deleteAction}>
				<AnimatedView style={trashIconStyle}>
					<TouchableOpacity onPress={() => onDelete(item.id!, resetAnimation)}>
						<Ionicons name="trash-outline" size={18} color={palette.text} />
					</TouchableOpacity>
				</AnimatedView>
			</View>
			<GestureDetector gesture={panGesture}>
				<AnimatedView
					style={[
						styles.notificationItemWrapper,
						animatedStyle,
					]}
				>
					<View
						style={[
							styles.notificationItem,
							!item.read && styles.unreadNotification,
						]}
					>
						<TouchableOpacity
							onPress={handlePress}
							style={styles.notificationContent}
							activeOpacity={0.7}
						>
						<View style={styles.notificationHeader}>
							<View style={styles.titleContainer}>
								<Ionicons
									name={typeInfo.icon as any}
									size={16}
									color={typeInfo.color}
									style={styles.typeIcon}
								/>
								<AppText.Heading style={styles.title} numberOfLines={1}>
									{item.title}
								</AppText.Heading>
							</View>
							{!item.read && <View style={styles.unreadDot} />}
						</View>
						<AppText.Body style={styles.message} numberOfLines={3}>
							{item.message}
						</AppText.Body>
						<View style={styles.footerContainer}>
							<AppText.Caption color="muted" style={styles.timestamp}>
								{item.timeAgo || 'Just now'}
							</AppText.Caption>
							{item.priority && (
								<View
									style={[
										styles.priorityBadge,
										{ backgroundColor: typeInfo.color },
									]}
								>
									<AppText.Caption style={styles.priorityText}>
										{item.priority.toUpperCase()}
									</AppText.Caption>
								</View>
							)}
						</View>
						</TouchableOpacity>
					</View>
				</AnimatedView>
			</GestureDetector>
		</View>
	);
};

export default function NotificationsScreen() {
	const insets = useSafeAreaInsets();
	const [refreshing, setRefreshing] = useState(false);

	// Get notification context - will throw if not within provider
	const notificationContext = useNotification();

	// Destructure with default values to prevent undefined errors
	const {
		notifications = [],
		loading = false,
		error = null,
		getNotifications = async () => {},
		markAsRead = async () => {},
		markAllAsRead = async () => {},
		deleteNotification = async () => {},
		deleteAllNotifications = async () => {},
		refreshUnreadCount = async () => {},
		loadMoreNotifications = async () => {},
		hasMore = false,
	} = notificationContext || {};

	// Early return if context is not available
	if (!notificationContext) {
		return (
			<ErrorBoundary>
				<AppScreen scrollable={false} backgroundColor={palette.bg} edges={['left', 'right']}>
					<LoadingState label="Loading notifications..." />
				</AppScreen>
			</ErrorBoundary>
		);
	}

	const onRefresh = async () => {
		setRefreshing(true);
		if (getNotifications) {
			await getNotifications();
		}
		if (refreshUnreadCount) {
			await refreshUnreadCount();
		}
		setRefreshing(false);
	};

	const handleDelete = (id: string, resetAnimation: () => void) => {
		Alert.alert(
			'Delete Notification',
			'Are you sure you want to delete this notification?',
			[
				{
					text: 'Cancel',
					style: 'cancel',
					onPress: resetAnimation,
				},
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						await deleteNotification(id);
						resetAnimation();
					},
				},
			]
		);
	};

	const handleClearAll = () => {
		Alert.alert(
			'Clear All Notifications',
			'Are you sure you want to delete all notifications?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Clear All',
					style: 'destructive',
					onPress: async () => {
						await deleteAllNotifications();
					},
				},
			]
		);
	};

	const handleMarkAsRead = async (id: string) => {
		if (markAsRead) {
			await markAsRead(id);
		}
	};

	const handleMarkAllAsRead = () => {
		Alert.alert(
			'Mark All as Read',
			'Are you sure you want to mark all notifications as read?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Mark All',
					onPress: async () => {
						if (markAllAsRead) {
							await markAllAsRead();
						}
					},
				},
			]
		);
	};

	const handleLoadMore = () => {
		if (hasMore && !loading && loadMoreNotifications) {
			loadMoreNotifications();
		}
	};

	if (loading && (!notifications || notifications.length === 0)) {
		return (
			<ErrorBoundary>
				<AppScreen scrollable={false} backgroundColor={palette.bg} edges={['left', 'right']}>
					<LoadingState label="Loading notifications..." />
				</AppScreen>
			</ErrorBoundary>
		);
	}

	return (
		<ErrorBoundary>
			<GestureHandlerRootView style={{ flex: 1 }}>
				<AppScreen scrollable={false} backgroundColor={palette.bg} paddingTop={0} edges={['left', 'right']}>
					{/* Action row */}
					<View style={styles.headerContainer}>
					<View style={styles.headerActions}>
						{notifications && notifications.length > 0 && (
							<>
								<TouchableOpacity
									onPress={handleMarkAllAsRead}
									style={styles.iconButton}
									activeOpacity={0.7}
								>
									<Ionicons
										name="checkmark-done-outline"
										size={18}
										color={palette.text}
									/>
								</TouchableOpacity>

								<TouchableOpacity
									onPress={handleClearAll}
									style={styles.iconButton}
									activeOpacity={0.7}
								>
									<Ionicons
										name="trash-outline"
										size={18}
										color={palette.text}
									/>
								</TouchableOpacity>
							</>
						)}
					</View>
				</View>

				<FlatList
					data={notifications}
					renderItem={({ item }) => (
						<NotificationItem
							item={item}
							onDelete={handleDelete}
							onMarkAsRead={handleMarkAsRead}
						/>
					)}
					keyExtractor={(item) =>
						item.id || item._id || Math.random().toString()
					}
					contentContainerStyle={[
						styles.listContainer,
						{ paddingBottom: insets.bottom + space.xl },
					]}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							colors={[palette.primary]}
							tintColor={palette.primary}
						/>
					}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.1}
					ListEmptyComponent={() => (
						<EmptyState
							icon="notifications-outline"
							title="No notifications"
							subtitle="You're all caught up!"
						/>
					)}
					ListFooterComponent={() =>
						loading && notifications && notifications.length > 0 ? (
							<View style={styles.loadingFooter}>
								<ActivityIndicator size="small" color={palette.primary} />
							</View>
						) : null
					}
				/>

				{error && (
					<View style={styles.errorContainer}>
						<AppText.Body color="danger" style={styles.errorText}>
							Error: {error?.toString() || 'Unknown error'}
						</AppText.Body>
					</View>
				)}
			</AppScreen>
		</GestureHandlerRootView>
		</ErrorBoundary>
	);
}

const styles = StyleSheet.create({
	headerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: space.lg,
		paddingTop: space.xs,
		paddingBottom: space.sm,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
		backgroundColor: palette.bg,
		gap: space.md,
	},
	searchContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.lg,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.border,
		paddingHorizontal: space.md,
		paddingVertical: space.sm + 2,
		gap: space.sm,
		minHeight: 44,
	},
	searchIcon: {
		opacity: 0.5,
	},
	searchInput: {
		flex: 1,
		...type.body,
		color: palette.text,
		paddingVertical: 0,
		paddingHorizontal: 0,
	},
	clearSearchButton: {
		padding: space.xs,
		marginLeft: -space.xs,
	},
	headerActions: {
		flexDirection: 'row',
		gap: space.xs,
	},
	iconButton: {
		width: 40,
		height: 40,
		borderRadius: radius.sm,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.border,
		backgroundColor: palette.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	activeFiltersContainer: {
		paddingHorizontal: space.lg,
		paddingVertical: space.sm,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
		backgroundColor: palette.bg,
	},
	activeFiltersScrollContent: {
		paddingRight: space.lg,
		alignItems: 'center',
	},
	filterChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: space.md,
		paddingVertical: space.xs + 2,
		borderRadius: radius.pill,
		marginRight: space.sm,
		gap: space.xs,
		backgroundColor: palette.primarySubtle,
		borderWidth: 1,
		borderColor: palette.primaryBorder,
	},
	filterChipText: {
		...type.small,
		color: palette.primary,
		fontWeight: '600',
	},
	filterChipClose: {
		padding: 2,
		marginLeft: -space.xs,
	},
	clearFiltersButton: {
		paddingHorizontal: space.md,
		paddingVertical: space.xs + 2,
		justifyContent: 'center',
		alignItems: 'center',
	},
	clearFiltersText: {
		...type.small,
		color: palette.primary,
		fontWeight: '600',
	},
	listContainer: {
		paddingHorizontal: space.lg,
		paddingTop: space.md,
		paddingBottom: space.xl,
		flexGrow: 1,
	},
	loadingFooter: {
		paddingVertical: space.lg,
		alignItems: 'center',
	},
	txRowContainer: {
		overflow: 'hidden',
		marginBottom: space.md,
	},
	notificationItemWrapper: {
		overflow: 'hidden',
	},
	notificationItem: {
		padding: space.lg,
		backgroundColor: palette.surface,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
		...shadow.soft,
	},
	unreadNotification: {
		backgroundColor: palette.primarySubtle,
		borderLeftWidth: 3,
		borderLeftColor: palette.primary,
		borderColor: palette.primaryBorder,
	},
	notificationContent: {
		flex: 1,
	},
	notificationHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: space.sm,
	},
	titleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: space.sm,
		minWidth: 0,
	},
	typeIcon: {
		opacity: 0.9,
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: palette.primary,
		marginLeft: space.xs,
	},
	footerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: space.sm,
	},
	priorityBadge: {
		paddingHorizontal: space.sm,
		paddingVertical: 3,
		borderRadius: radius.sm,
	},
	priorityText: {
		...type.labelXs,
		color: palette.text,
		fontWeight: '700',
		letterSpacing: 0.3,
	},
	deleteAction: {
		position: 'absolute',
		right: 0,
		top: 0,
		bottom: 0,
		width: '100%',
		backgroundColor: palette.danger,
		justifyContent: 'center',
		alignItems: 'flex-end',
		paddingRight: space.lg,
	},
	title: {
		...type.h2,
		flex: 1,
		color: palette.text,
		flexShrink: 1,
	},
	message: {
		...type.body,
		marginTop: space.xs,
		lineHeight: 20,
		color: palette.textSecondary,
	},
	timestamp: {
		...type.bodyXs,
		color: palette.textMuted,
	},
	errorContainer: {
		padding: space.lg,
		backgroundColor: palette.dangerSubtle,
		borderTopWidth: 1,
		borderTopColor: palette.dangerBorder,
	},
	errorText: {
		...type.body,
		color: palette.danger,
		fontWeight: '500',
		textAlign: 'center',
	},
	// Modal styles
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
		backgroundColor: palette.surface,
	},
	modalTitle: {
		...type.h1,
		color: palette.text,
	},
	modalContent: {
		flex: 1,
		paddingHorizontal: space.lg,
		paddingTop: space.md,
	},
	filterSection: {
		marginBottom: space.xl,
	},
	filterSectionTitle: {
		...type.h2,
		color: palette.text,
		marginBottom: space.md,
	},
	filterOption: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: space.lg,
		paddingVertical: space.md + 2,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: palette.border,
		marginBottom: space.sm,
		backgroundColor: palette.surface,
	},
	filterOptionSelected: {
		backgroundColor: palette.primarySubtle,
		borderColor: palette.primaryBorder,
	},
	filterOptionContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.md,
	},
	filterOptionText: {
		...type.body,
		color: palette.text,
		fontWeight: '500',
	},
	modalFooter: {
		flexDirection: 'row',
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: palette.border,
		backgroundColor: palette.bg,
		gap: space.md,
	},
	modalButtonSecondary: {
		flex: 1,
	},
	modalButtonPrimary: {
		flex: 1,
	},
});
