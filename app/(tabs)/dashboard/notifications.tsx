import React, { useState, useMemo, useEffect } from 'react';
import { logger } from '../../../src/utils/logger';
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	SafeAreaView,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	RefreshControl,
	TextInput,
	Modal,
	ScrollView,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
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
	const { colors } = useTheme();
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
					if (entityId) {
						router.push(`/(stack)/budgetDetails?id=${entityId}` as any);
					} else {
						router.push('/(tabs)/wallet/budgets');
					}
					break;
				case 'goal':
					if (entityId) {
						router.push(`/(stack)/goalDetails?id=${entityId}` as any);
					} else {
						router.push('/(tabs)/wallet/goals');
					}
					break;
				case 'transaction':
					if (entityId) {
						router.push(`/(stack)/transactionDetails?id=${entityId}` as any);
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
						<Ionicons name="trash-outline" size={18} color="#fff" />
					</TouchableOpacity>
				</Animated.View>
			</View>
			<GestureDetector gesture={panGesture}>
				<Animated.View
					style={[
						styles.notificationItem,
						animatedStyle,
						!item.read && styles.unreadNotification,
					]}
				>
					<TouchableOpacity
						onPress={handlePress}
						style={styles.notificationContent}
					>
						<View style={styles.notificationHeader}>
							<View style={styles.titleContainer}>
								<Ionicons
									name={typeInfo.icon as any}
									size={16}
									color={typeInfo.color}
									style={styles.typeIcon}
								/>
								<Text style={[styles.title, { color: colors.text }]}>
									{item.title}
								</Text>
							</View>
							{!item.read && <View style={styles.unreadDot} />}
						</View>
						<Text style={[styles.message, { color: colors.text }]}>
							{item.message}
						</Text>
						<View style={styles.footerContainer}>
							<Text style={[styles.timestamp, { color: colors.text }]}>
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
				</Animated.View>
			</GestureDetector>
		</View>
	);
};

export default function NotificationsScreen() {
	const { colors } = useTheme();
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
			<SafeAreaView style={styles.container}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={[styles.loadingText, { color: colors.text }]}>
						Loading notifications...
					</Text>
				</View>
			</SafeAreaView>
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
			<SafeAreaView style={styles.container}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={[styles.loadingText, { color: colors.text }]}>
						Loading notifications...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaView style={styles.container}>
				{/* Header with search and filters */}
				<View style={styles.headerContainer}>
					<View style={styles.searchContainer}>
						<Ionicons
							name="search-outline"
							size={20}
							color={colors.text}
							style={styles.searchIcon}
						/>
						<TextInput
							style={[
								styles.searchInput,
								{ color: colors.text, borderColor: colors.border },
							]}
							placeholder="Search notifications..."
							placeholderTextColor={colors.text + '80'}
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity onPress={() => setSearchQuery('')}>
								<Ionicons name="close-circle" size={20} color={colors.text} />
							</TouchableOpacity>
						)}
					</View>

					<View style={styles.headerActions}>
						<TouchableOpacity
							onPress={() => setShowFilterModal(true)}
							style={[styles.filterButton, { borderColor: colors.border }]}
						>
							<Ionicons name="filter-outline" size={20} color={colors.text} />
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => router.push('/(stack)/settings/notification')}
							style={[styles.actionButton, { borderColor: colors.border }]}
						>
							<Ionicons name="settings-outline" size={20} color={colors.text} />
						</TouchableOpacity>

						{notifications && notifications.length > 0 && (
							<>
								<TouchableOpacity
									onPress={handleMarkAllAsRead}
									style={[styles.actionButton, { borderColor: colors.border }]}
								>
									<Ionicons
										name="checkmark-done-outline"
										size={20}
										color={colors.text}
									/>
								</TouchableOpacity>

								<TouchableOpacity
									onPress={handleClearAll}
									style={[styles.actionButton, { borderColor: colors.border }]}
								>
									<Ionicons
										name="trash-outline"
										size={20}
										color={colors.text}
									/>
								</TouchableOpacity>
							</>
						)}
					</View>
				</View>

				{/* Active filters display */}
				{(selectedType || showUnreadOnly) && (
					<View style={styles.activeFiltersContainer}>
						<ScrollView horizontal showsHorizontalScrollIndicator={false}>
							{selectedType && (
								<View
									style={[
										styles.filterChip,
										{ backgroundColor: colors.primary + '20' },
									]}
								>
									<Text
										style={[styles.filterChipText, { color: colors.primary }]}
									>
										{selectedType}
									</Text>
									<TouchableOpacity onPress={() => setSelectedType(undefined)}>
										<Ionicons name="close" size={16} color={colors.primary} />
									</TouchableOpacity>
								</View>
							)}
							{showUnreadOnly && (
								<View
									style={[
										styles.filterChip,
										{ backgroundColor: colors.primary + '20' },
									]}
								>
									<Text
										style={[styles.filterChipText, { color: colors.primary }]}
									>
										Unread Only
									</Text>
									<TouchableOpacity onPress={() => setShowUnreadOnly(false)}>
										<Ionicons name="close" size={16} color={colors.primary} />
									</TouchableOpacity>
								</View>
							)}
							<TouchableOpacity
								onPress={clearFilters}
								style={styles.clearFiltersButton}
							>
								<Text style={[styles.clearFiltersText, { color: colors.text }]}>
									Clear All
								</Text>
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
							colors={[colors.primary]}
							tintColor={colors.primary}
						/>
					}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.1}
					ListEmptyComponent={() => (
						<View style={styles.emptyContainer}>
							<Ionicons
								name="notifications-outline"
								size={64}
								color={colors.text}
								style={styles.emptyIcon}
							/>
							<Text style={[styles.emptyText, { color: colors.text }]}>
								{searchQuery || selectedType || showUnreadOnly
									? 'No matching notifications'
									: 'No notifications'}
							</Text>
							<Text style={[styles.emptySubtext, { color: colors.text }]}>
								{searchQuery || selectedType || showUnreadOnly
									? 'Try adjusting your filters'
									: "You're all caught up!"}
							</Text>
							{(searchQuery || selectedType || showUnreadOnly) && (
								<TouchableOpacity
									onPress={clearFilters}
									style={styles.clearFiltersButton}
								>
									<Text
										style={[styles.clearFiltersText, { color: colors.primary }]}
									>
										Clear Filters
									</Text>
								</TouchableOpacity>
							)}
						</View>
					)}
					ListFooterComponent={() =>
						loading && filteredNotifications.length > 0 ? (
							<View style={styles.loadingFooter}>
								<ActivityIndicator size="small" color={colors.primary} />
							</View>
						) : null
					}
				/>

				{error && (
					<View style={styles.errorContainer}>
						<Text style={[styles.errorText, { color: '#dc2626' }]}>
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
					<SafeAreaView style={styles.modalContainer}>
						<View style={styles.modalHeader}>
							<Text style={[styles.modalTitle, { color: colors.text }]}>
								Filter Notifications
							</Text>
							<TouchableOpacity onPress={() => setShowFilterModal(false)}>
								<Ionicons name="close" size={24} color={colors.text} />
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.modalContent}>
							<View style={styles.filterSection}>
								<Text
									style={[styles.filterSectionTitle, { color: colors.text }]}
								>
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
												{ borderColor: colors.border },
												selectedType === type && {
													backgroundColor: colors.primary + '20',
												},
											]}
										>
											<View style={styles.filterOptionContent}>
												<Ionicons
													name={typeInfo.icon as any}
													size={20}
													color={typeInfo.color}
												/>
												<Text
													style={[
														styles.filterOptionText,
														{ color: colors.text },
													]}
												>
													{type.charAt(0).toUpperCase() +
														type.slice(1).replace('_', ' ')}
												</Text>
											</View>
											{selectedType === type && (
												<Ionicons
													name="checkmark"
													size={20}
													color={colors.primary}
												/>
											)}
										</TouchableOpacity>
									);
								})}
							</View>

							<View style={styles.filterSection}>
								<Text
									style={[styles.filterSectionTitle, { color: colors.text }]}
								>
									Status
								</Text>
								<TouchableOpacity
									onPress={() => setShowUnreadOnly(!showUnreadOnly)}
									style={[
										styles.filterOption,
										{ borderColor: colors.border },
										showUnreadOnly && {
											backgroundColor: colors.primary + '20',
										},
									]}
								>
									<View style={styles.filterOptionContent}>
										<Ionicons
											name="mail-unread-outline"
											size={20}
											color={colors.primary}
										/>
										<Text
											style={[styles.filterOptionText, { color: colors.text }]}
										>
											Unread Only
										</Text>
									</View>
									{showUnreadOnly && (
										<Ionicons
											name="checkmark"
											size={20}
											color={colors.primary}
										/>
									)}
								</TouchableOpacity>
							</View>
						</ScrollView>

						<View style={styles.modalFooter}>
							<TouchableOpacity
								onPress={clearFilters}
								style={[styles.modalButton, { borderColor: colors.border }]}
							>
								<Text style={[styles.modalButtonText, { color: colors.text }]}>
									Clear All
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => setShowFilterModal(false)}
								style={[
									styles.modalButton,
									{ backgroundColor: colors.primary },
								]}
							>
								<Text style={[styles.modalButtonText, { color: '#fff' }]}>
									Apply Filters
								</Text>
							</TouchableOpacity>
						</View>
					</SafeAreaView>
				</Modal>
			</SafeAreaView>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f9fafb' },
	headerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		gap: 12,
	},
	searchContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 8,
		borderWidth: 1,
		paddingHorizontal: 12,
		paddingVertical: 8,
		gap: 8,
	},
	searchIcon: {
		opacity: 0.6,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		paddingVertical: 0,
	},
	headerActions: {
		flexDirection: 'row',
		gap: 8,
	},
	filterButton: {
		padding: 8,
		borderRadius: 8,
		borderWidth: 1,
		backgroundColor: '#fff',
	},
	actionButton: {
		padding: 8,
		borderRadius: 8,
		borderWidth: 1,
		backgroundColor: '#fff',
	},
	activeFiltersContainer: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	filterChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		marginRight: 8,
		gap: 6,
	},
	filterChipText: {
		fontSize: 12,
		fontWeight: '500',
	},
	clearFiltersButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		justifyContent: 'center',
	},
	clearFiltersText: {
		fontSize: 12,
		fontWeight: '500',
		opacity: 0.7,
	},
	clearAllContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	clearButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	clearButtonText: {
		fontSize: 14,
		fontWeight: '500',
	},
	listContainer: {
		paddingVertical: 8,
		flexGrow: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
	},
	loadingFooter: {
		paddingVertical: 16,
		alignItems: 'center',
	},
	txRowContainer: {
		overflow: 'hidden',
	},
	notificationItem: {
		padding: 16,
		backgroundColor: '#f9fafb',
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	unreadNotification: {
		backgroundColor: '#f0f9ff',
		borderLeftWidth: 4,
		borderLeftColor: '#3b82f6',
	},
	notificationContent: {
		flex: 1,
	},
	notificationHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	titleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 8,
	},
	typeIcon: {
		opacity: 0.8,
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#3b82f6',
	},
	footerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 4,
	},
	priorityBadge: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	priorityText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#fff',
	},
	deleteAction: {
		position: 'absolute',
		right: 0,
		top: 0,
		bottom: 0,
		width: '100%',
		backgroundColor: '#dc2626',
		justifyContent: 'center',
		alignItems: 'flex-end',
		paddingRight: 18,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 64,
	},
	emptyIcon: {
		opacity: 0.5,
		marginBottom: 16,
	},
	emptyText: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 4,
	},
	emptySubtext: {
		fontSize: 14,
		opacity: 0.7,
		marginBottom: 16,
	},
	title: { fontSize: 16, fontWeight: 'bold', flex: 1 },
	message: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
	timestamp: { fontSize: 12, opacity: 0.7 },
	errorContainer: {
		padding: 16,
		backgroundColor: '#fef2f2',
		borderTopWidth: 1,
		borderTopColor: '#fecaca',
	},
	errorText: {
		fontSize: 14,
		fontWeight: '500',
		textAlign: 'center',
	},
	// Modal styles
	modalContainer: {
		flex: 1,
		backgroundColor: '#f9fafb',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
	},
	modalContent: {
		flex: 1,
		paddingHorizontal: 16,
	},
	filterSection: {
		marginVertical: 16,
	},
	filterSectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 12,
	},
	filterOption: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 1,
		marginBottom: 8,
		backgroundColor: '#fff',
	},
	filterOptionContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	filterOptionText: {
		fontSize: 16,
		fontWeight: '500',
	},
	modalFooter: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
		gap: 12,
	},
	modalButton: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 1,
		alignItems: 'center',
	},
	modalButtonText: {
		fontSize: 16,
		fontWeight: '600',
	},
});
