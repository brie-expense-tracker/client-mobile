import React, { useState } from 'react';
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	SafeAreaView,
	TouchableOpacity,
	Alert,
	Button,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
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

interface Notification {
	id: string;
	title: string;
	message: string;
	timestamp: string;
}

const mockNotifications: Notification[] = [
	{
		id: '1',
		title: 'New Message',
		message: 'You have received a new message from John',
		timestamp: '2 hours ago',
	},
	{
		id: '2',
		title: 'System Update',
		message: 'Your app has been updated to the latest version',
		timestamp: '1 day ago',
	},
];

const NotificationItem = ({
	item,
	onDelete,
}: {
	item: Notification;
	onDelete: (id: string, resetAnimation: () => void) => void;
}) => {
	const { colors } = useTheme();
	const translateX = useSharedValue(0);
	const TRANSLATE_THRESHOLD = -70;
	const DELETE_WIDTH = 60;
	const hasTriggeredHaptic = useSharedValue(false);
	const iconScale = useSharedValue(1);

	const handleDelete = () => {
		onDelete(item.id, resetAnimation);
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

	return (
		<View style={styles.txRowContainer}>
			<View style={styles.deleteAction}>
				<Animated.View style={trashIconStyle}>
					<TouchableOpacity onPress={() => onDelete(item.id, resetAnimation)}>
						<Ionicons name="trash-outline" size={18} color="#fff" />
					</TouchableOpacity>
				</Animated.View>
			</View>
			<GestureDetector gesture={panGesture}>
				<Animated.View style={[styles.notificationItem, animatedStyle]}>
					<Text style={[styles.title, { color: colors.text }]}>
						{item.title}
					</Text>
					<Text style={[styles.message, { color: colors.text }]}>
						{item.message}
					</Text>
					<Text style={[styles.timestamp, { color: colors.text }]}>
						{item.timestamp}
					</Text>
				</Animated.View>
			</GestureDetector>
		</View>
	);
};

export default function NotificationsScreen() {
	const { notification, expoPushToken, error } = useNotification();
	const { colors } = useTheme();
	const [notifications, setNotifications] =
		useState<Notification[]>(mockNotifications);

	const sendPushNotification = async (expoPushToken: string) => {
		const message = {
			to: expoPushToken,
			sound: 'default',
			title: 'Test Notification',
			body: 'This is a test notification from your app!',
			data: { someData: 'goes here' },
		};

		try {
			await fetch('https://exp.host/--/api/v2/push/send', {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Accept-encoding': 'gzip, deflate',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(message),
			});
			Alert.alert('Success', 'Test notification sent!');
		} catch (error) {
			Alert.alert('Error', 'Failed to send notification');
		}
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
					onPress: () =>
						setNotifications((prev) => prev.filter((n) => n.id !== id)),
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
					onPress: () => setNotifications([]),
				},
			]
		);
	};

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaView style={styles.container}>
				<FlatList
					data={notifications}
					renderItem={({ item }) => (
						<NotificationItem item={item} onDelete={handleDelete} />
					)}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContainer}
					ListEmptyComponent={() => (
						<View style={styles.emptyContainer}>
							<Text style={[styles.emptyText, { color: colors.text }]}>
								No notifications
							</Text>
						</View>
					)}
				/>
				<View style={styles.tokenContainer}>
					<Text style={[styles.tokenText, { color: colors.text }]}>
						Your push token: {expoPushToken || 'Loading...'}
					</Text>
					{error && (
						<Text style={[styles.errorText, { color: '#dc2626' }]}>
							Error: {error.toString()}
						</Text>
					)}
					{expoPushToken && (
						<Button
							title="Send Test Notification"
							onPress={() => sendPushNotification(expoPushToken)}
						/>
					)}
				</View>
			</SafeAreaView>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f9fafb' },
	listContainer: { paddingVertical: 8 },
	txRowContainer: {
		overflow: 'hidden',
	},
	notificationItem: {
		padding: 16,
		backgroundColor: '#f9fafb',
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
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
		paddingVertical: 32,
	},
	emptyText: { fontSize: 16, opacity: 0.7 },
	title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
	message: { fontSize: 14, marginBottom: 8 },
	timestamp: { fontSize: 12, opacity: 0.7 },
	tokenContainer: {
		padding: 16,
		backgroundColor: '#f3f4f6',
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
	},
	tokenText: {
		fontSize: 12,
		fontFamily: 'monospace',
		marginBottom: 8,
	},
	errorText: {
		fontSize: 12,
		fontWeight: 'bold',
	},
});
