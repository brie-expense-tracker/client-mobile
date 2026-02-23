import React, { useState, useMemo, useEffect } from 'react';
import { logger } from '../../../src/utils/logger';
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	RefreshControl,
	TextInput,
	Modal,
	ScrollView,
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
import { debounce } from '@/src/utils/debounce';
import {
	Page,
	LoadingState,
	EmptyState,
	palette,
	space,
	radius,
	type,
	shadow,
} from '../../../src/ui';

// Helper function to get notification type icon and color
const getNotificationTypeInfo = (type?: string) => {
	switch (type) {
		case 'budget':
			return { icon: 'wallet-outline', color: '#ef4444' };
		case 'goal':
			return { icon: 'trophy-outline', color: '#10b981' };
		case 'transaction':
			return { icon: 'card-outline', color: '#3b82f6' };
		case 'ai_insight':
			return { icon: 'bulb-outline', color: '#8b5cf6' };
		case 'system':
			return { icon: 'settings-outline', color: '#6b7280' };
		case 'reminder':
			return { icon: 'time-outline', color: '#f59e0b' };
		case 'marketing':
			return { icon: 'megaphone-outline', color: '#ec4899' };
		case 'promotional':
			return { icon: 'gift-outline', color: '#f97316' };
		default:
			return { icon: 'notifications-outline', color: '#6b7280' };
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
					router.push('/(stack)/settings');
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
				<Animated.View style={trashIconStyle}>
					<TouchableOpacity onPress={() => onDelete(item.id!, resetAnimation)}>
						<Ionicons name="trash-outline" size={18} color={palette.primaryTextOn} />
					</TouchableOpacity>
				</Animated.View>
			</View>
			<GestureDetector gesture={panGesture}>
				<Animated.View
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
								<Text style={[styles.title, { color: palette.text }]}>
									{item.title}
								</Text>
							</View>
							{!item.read && <View style={styles.unreadDot} />}
						</View>
						<Text style={[styles.message, { color: palette.text }]}>
							{item.message}
						</Text>
						<View style={styles.footerContainer}>
							<Text style={[styles.timestamp, { color: palette.textMuted }]}>
								{item.timeAgo || 'Just now'}
							</Text>
							{item.priority && (
								<View
									style={[
										styles.priorityBadge,
										{ backgroundColor: typeInfo.color },
									]}
								>
									<Text style={styles.priorityText}>
										{item.priority.toUpperCase()}
									</Text>
								</View>
							)}
						</View>
						</TouchableOpacity>
					</View>
				</Animated.View>
			</GestureDetector>
		</View>
	);
};

export default function NotificationsScreen() {
	const [refreshing, setRefreshing] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
	const [showFilterModal, setShowFilterModal] = useState(false);
	const [selectedType, setSelectedType] = useState<
		NotificationData['type'] | undefined
	>();
	const [showUnreadOnly, setShowUnreadOnly] = useState(false);

	// Debounced search to prevent excessive filtering
	const debouncedSetSearch = useMemo(
		() =>
			debounce((query: string) => {
				setDebouncedSearchQuery(query);
			}, 300),
		[]
	);

	// Update debounced search when searchQuery changes
	useEffect(() => {
		debouncedSetSearch(searchQuery);
		return () => {
			debouncedSetSearch.cancel();
		};
	}, [searchQuery, debouncedSetSearch]);

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
		setFilter = () => {},
		clearFilter = () => {},
		loadMoreNotifications = async () => {},
		hasMore = false,
	} = notificationContext || {};

	// Filter and search notifications
	const filteredNotifications = useMemo(() => {
		// Use safe array operations to prevent crashes
		let filtered = Array.isArray(notifications) ? notifications : [];

		// Apply search filter using debounced query
		if (debouncedSearchQuery.trim()) {
			const query = debouncedSearchQuery.toLowerCase();
			filtered = filtered.filter(
				(notification) =>
					notification?.title?.toLowerCase()?.includes(query) ||
					notification?.message?.toLowerCase()?.includes(query)
			);
		}

		// Apply type filter
		if (selectedType) {
			filtered = filtered.filter(
				(notification) => notification?.type === selectedType
			);
		}

		// Apply unread filter
		if (showUnreadOnly) {
			filtered = filtered.filter((notification) => !notification?.read);
		}

		return filtered;
	}, [notifications, debouncedSearchQuery, selectedType, showUnreadOnly]);

	// Apply filters to context
	React.useEffect(() => {
		if (setFilter) {
			setFilter({
				type: selectedType,
				read: showUnreadOnly ? false : undefined,
			});
		}
	}, [selectedType, showUnreadOnly, setFilter]);

	// Early return if context is not available
	if (!notificationContext) {
		return (
			<Page>
				<LoadingState label="Loading notifications..." />
			</Page>
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

	const clearFilters = () => {
		setSearchQuery('');
		setSelectedType(undefined);
		setShowUnreadOnly(false);
		if (clearFilter) {
			clearFilter();
		}
	};

	if (loading && (!notifications || notifications.length === 0)) {
		return (
			<Page>
				<LoadingState label="Loading notifications..." />
			</Page>
		);
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<Page>
				{/* Header with search and filters */}
				<View style={styles.headerContainer}>
					<View style={styles.searchContainer}>
						<Ionicons
							name="search-outline"
							size={18}
							color={palette.textMuted}
							style={styles.searchIcon}
						/>
						<TextInput
							style={styles.searchInput}
							placeholder="Search notifications..."
							placeholderTextColor={palette.textSubtle}
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity
								onPress={() => setSearchQuery('')}
								style={styles.clearSearchButton}
							>
								<Ionicons name="close-circle" size={18} color={palette.textMuted} />
							</TouchableOpacity>
						)}
					</View>

					<View style={styles.headerActions}>
						<TouchableOpacity
							onPress={() => setShowFilterModal(true)}
							style={styles.iconButton}
							activeOpacity={0.7}
						>
							<Ionicons name="filter-outline" size={18} color={palette.text} />
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => router.push('/(stack)/settings/notification')}
							style={styles.iconButton}
							activeOpacity={0.7}
						>
							<Ionicons name="settings-outline" size={18} color={palette.text} />
						</TouchableOpacity>

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

				{/* Active filters display */}
				{(selectedType || showUnreadOnly) && (
					<View style={styles.activeFiltersContainer}>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.activeFiltersScrollContent}
						>
							{selectedType && (
								<View style={styles.filterChip}>
									<Text style={styles.filterChipText}>
										{selectedType.charAt(0).toUpperCase() +
											selectedType.slice(1).replace('_', ' ')}
									</Text>
									<TouchableOpacity
										onPress={() => setSelectedType(undefined)}
										style={styles.filterChipClose}
									>
										<Ionicons name="close" size={14} color={palette.primary} />
									</TouchableOpacity>
								</View>
							)}
							{showUnreadOnly && (
								<View style={styles.filterChip}>
									<Text style={styles.filterChipText}>Unread Only</Text>
									<TouchableOpacity
										onPress={() => setShowUnreadOnly(false)}
										style={styles.filterChipClose}
									>
										<Ionicons name="close" size={14} color={palette.primary} />
									</TouchableOpacity>
								</View>
							)}
							<TouchableOpacity
								onPress={clearFilters}
								style={styles.clearFiltersButton}
								activeOpacity={0.7}
							>
								<Text style={styles.clearFiltersText}>Clear All</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>
				)}

				<FlatList
					data={filteredNotifications}
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
					contentContainerStyle={styles.listContainer}
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
							title={
								searchQuery || selectedType || showUnreadOnly
									? 'No matching notifications'
									: 'No notifications'
							}
							subtitle={
								searchQuery || selectedType || showUnreadOnly
									? 'Try adjusting your filters'
									: "You're all caught up!"
							}
							ctaLabel={
								searchQuery || selectedType || showUnreadOnly
									? 'Clear Filters'
									: undefined
							}
							onPress={
								searchQuery || selectedType || showUnreadOnly
									? clearFilters
									: undefined
							}
						/>
					)}
					ListFooterComponent={() =>
						loading && filteredNotifications.length > 0 ? (
							<View style={styles.loadingFooter}>
								<ActivityIndicator size="small" color={palette.primary} />
							</View>
						) : null
					}
				/>

				{error && (
					<View style={styles.errorContainer}>
						<Text style={styles.errorText}>
							Error: {error?.toString() || 'Unknown error'}
						</Text>
					</View>
				)}

				{/* Filter Modal */}
				<Modal
					visible={showFilterModal}
					animationType="slide"
					presentationStyle="pageSheet"
					onRequestClose={() => setShowFilterModal(false)}
				>
					<Page>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								Filter Notifications
							</Text>
							<TouchableOpacity onPress={() => setShowFilterModal(false)}>
								<Ionicons name="close" size={24} color={palette.text} />
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.modalContent}>
							<View style={styles.filterSection}>
								<Text style={styles.filterSectionTitle}>
									Type
								</Text>
								{[
									'budget',
									'goal',
									'transaction',
									'ai_insight',
									'system',
									'reminder',
									'marketing',
									'promotional',
								].map((type) => {
									const typeInfo = getNotificationTypeInfo(type);
									return (
										<TouchableOpacity
											key={type}
											onPress={() =>
												setSelectedType(
													selectedType === type
														? undefined
														: (type as NotificationData['type'])
												)
											}
											style={[
												styles.filterOption,
												selectedType === type && styles.filterOptionSelected,
											]}
										>
											<View style={styles.filterOptionContent}>
												<Ionicons
													name={typeInfo.icon as any}
													size={20}
													color={typeInfo.color}
												/>
												<Text style={styles.filterOptionText}>
													{type.charAt(0).toUpperCase() +
														type.slice(1).replace('_', ' ')}
												</Text>
											</View>
											{selectedType === type && (
												<Ionicons
													name="checkmark"
													size={20}
													color={palette.primary}
												/>
											)}
										</TouchableOpacity>
									);
								})}
							</View>

							<View style={styles.filterSection}>
								<Text style={styles.filterSectionTitle}>
									Status
								</Text>
								<TouchableOpacity
									onPress={() => setShowUnreadOnly(!showUnreadOnly)}
									style={[
										styles.filterOption,
										showUnreadOnly && styles.filterOptionSelected,
									]}
								>
									<View style={styles.filterOptionContent}>
										<Ionicons
											name="mail-unread-outline"
											size={20}
											color={palette.primary}
										/>
										<Text style={styles.filterOptionText}>
											Unread Only
										</Text>
									</View>
									{showUnreadOnly && (
										<Ionicons
											name="checkmark"
											size={20}
											color={palette.primary}
										/>
									)}
								</TouchableOpacity>
							</View>
						</ScrollView>

						<View style={styles.modalFooter}>
							<TouchableOpacity
								onPress={clearFilters}
								style={styles.modalButtonSecondary}
							>
								<Text style={styles.modalButtonTextSecondary}>
									Clear All
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => setShowFilterModal(false)}
								style={styles.modalButton}
							>
								<Text style={styles.modalButtonText}>
									Apply Filters
								</Text>
							</TouchableOpacity>
						</View>
					</Page>
				</Modal>
			</Page>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	headerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: space.lg,
		paddingTop: space.md,
		paddingBottom: space.md,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
		backgroundColor: palette.surface,
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
		backgroundColor: palette.surface,
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
		color: palette.primaryTextOn,
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
		backgroundColor: palette.surface,
		gap: space.md,
	},
	modalButton: {
		flex: 1,
		paddingVertical: space.md + 2,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: palette.primary,
		...shadow.soft,
	},
	modalButtonText: {
		...type.body,
		color: palette.primaryTextOn,
		fontWeight: '600',
	},
	modalButtonSecondary: {
		flex: 1,
		paddingVertical: space.md + 2,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: palette.border,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: palette.surface,
	},
	modalButtonTextSecondary: {
		...type.body,
		color: palette.text,
		fontWeight: '600',
	},
});
