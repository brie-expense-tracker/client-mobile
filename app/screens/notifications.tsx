import React, { useState, useRef } from 'react';
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	SafeAreaView,
	TouchableOpacity,
	Alert,
	Animated,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

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
	onDelete: (id: string) => void;
}) => {
	const { colors } = useTheme();
	const swipeableRef = useRef<Swipeable>(null);

	const renderRightActions = (
		progress: Animated.AnimatedInterpolation<number>
	) => {
		const trans = progress.interpolate({
			inputRange: [0, 1],
			outputRange: [64, 0],
		});

		return (
			<Animated.View
				style={[styles.deleteAction, { transform: [{ translateX: trans }] }]}
			>
				<TouchableOpacity
					style={[
						styles.deleteButton,
						{ backgroundColor: colors.notification },
					]}
					onPress={() => {
						swipeableRef.current?.close();
						onDelete(item.id);
					}}
				>
					<Ionicons name="trash-outline" size={24} color="white" />
				</TouchableOpacity>
			</Animated.View>
		);
	};

	return (
		<Swipeable
			ref={swipeableRef}
			renderRightActions={renderRightActions}
			rightThreshold={40}
		>
			<View style={[styles.notificationItem, { backgroundColor: colors.card }]}>
				<View style={styles.notificationContent}>
					<Text style={[styles.title, { color: colors.text }]}>
						{item.title}
					</Text>
					<Text style={[styles.message, { color: colors.text }]}>
						{item.message}
					</Text>
					<Text style={[styles.timestamp, { color: colors.text }]}>
						{item.timestamp}
					</Text>
				</View>
			</View>
		</Swipeable>
	);
};

export default function NotificationsScreen() {
	const { colors } = useTheme();
	const router = useRouter();
	const [notifications, setNotifications] =
		useState<Notification[]>(mockNotifications);

	const handleDelete = (id: string) => {
		Alert.alert(
			'Delete Notification',
			'Are you sure you want to delete this notification?',
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Delete',
					style: 'destructive',
					onPress: () => {
						setNotifications((prev) =>
							prev.filter((notification) => notification.id !== id)
						);
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
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Clear All',
					style: 'destructive',
					onPress: () => {
						setNotifications([]);
					},
				},
			]
		);
	};

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
		>
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Ionicons name="chevron-back" size={24} color={colors.text} />
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: colors.text }]}>
					Notifications
				</Text>
				{notifications.length > 0 && (
					<TouchableOpacity
						style={styles.clearAllButton}
						onPress={handleClearAll}
					>
						<Text style={[styles.clearAllText, { color: colors.notification }]}>
							Clear All
						</Text>
					</TouchableOpacity>
				)}
			</View>
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
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	backButton: {
		marginRight: 16,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		flex: 1,
	},
	clearAllButton: {
		padding: 8,
	},
	clearAllText: {
		fontSize: 16,
		fontWeight: '600',
	},
	listContainer: {
		padding: 16,
	},
	notificationItem: {
		padding: 16,
		borderRadius: 8,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 3,
	},
	notificationContent: {
		flex: 1,
	},
	deleteAction: {
		justifyContent: 'center',
		alignItems: 'center',
		width: 64,
	},
	deleteButton: {
		width: 64,
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		borderTopRightRadius: 8,
		borderBottomRightRadius: 8,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 32,
	},
	emptyText: {
		fontSize: 16,
		opacity: 0.7,
	},
	title: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 4,
	},
	message: {
		fontSize: 14,
		marginBottom: 8,
	},
	timestamp: {
		fontSize: 12,
		opacity: 0.7,
	},
});
