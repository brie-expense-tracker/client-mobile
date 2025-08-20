import React, { useState } from 'react';
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
		} catch (error) {
			console.log('Haptic feedback not available');
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
		if (!item.read && item.id) {
			onMarkAsRead(item.id);
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
							<Text style={[styles.title, { color: colors.text }]}>
								{item.title}
							</Text>
							{!item.read && <View style={styles.unreadDot} />}
						</View>
						<Text style={[styles.message, { color: colors.text }]}>
							{item.message}
						</Text>
						<Text style={[styles.timestamp, { color: colors.text }]}>
							{item.timeAgo || 'Just now'}
						</Text>
					</TouchableOpacity>
				</Animated.View>
			</GestureDetector>
		</View>
	);
};

export default function NotificationsScreen() {
	const { colors } = useTheme();
	const [refreshing, setRefreshing] = useState(false);

	// Get notification context - will throw if not within provider
	const notificationContext = useNotification();

	// Destructure with default values to prevent undefined errors
	const {
		notifications = [],
		unreadCount = 0,
		loading = false,
		error = null,
		getNotifications = async () => {},
		markAsRead = async () => {},
		deleteNotification = async () => {},
		deleteAllNotifications = async () => {},
		refreshUnreadCount = async () => {},
	} = notificationContext || {};

	// Removed useEffect to prevent infinite loop - notifications are fetched by the context

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
				{notifications && notifications.length > 0 && (
					<View style={styles.clearAllContainer}>
						<TouchableOpacity
							onPress={handleClearAll}
							style={styles.clearButton}
						>
							<Text style={[styles.clearButtonText, { color: colors.primary }]}>
								Clear All
							</Text>
						</TouchableOpacity>
					</View>
				)}

				<FlatList
					data={notifications || []}
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
					ListEmptyComponent={() => (
						<View style={styles.emptyContainer}>
							<Ionicons
								name="notifications-outline"
								size={64}
								color={colors.text}
								style={styles.emptyIcon}
							/>
							<Text style={[styles.emptyText, { color: colors.text }]}>
								No notifications
							</Text>
							<Text style={[styles.emptySubtext, { color: colors.text }]}>
								You&apos;re all caught up!
							</Text>
						</View>
					)}
				/>

				{error && (
					<View style={styles.errorContainer}>
						<Text style={[styles.errorText, { color: '#dc2626' }]}>
							Error: {error?.toString() || 'Unknown error'}
						</Text>
					</View>
				)}
			</SafeAreaView>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f9fafb' },
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
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#3b82f6',
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
	},
	title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, flex: 1 },
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
});
