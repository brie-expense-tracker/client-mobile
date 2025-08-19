import React, { useState, useEffect } from 'react';
import {
	SafeAreaView,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface LoginSession {
	id: string;
	device: string;
	location: string;
	ipAddress: string;
	timestamp: string;
	status: 'success' | 'failed' | 'suspicious';
}

export default function LoginHistoryScreen() {
	const router = useRouter();
	const [loginHistory, setLoginHistory] = useState<LoginSession[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// TODO: Implement actual API call when server endpoint is available
	// For now, show empty state since we can't use mock data without server connection

	useEffect(() => {
		fetchLoginHistory();
	}, []);

	const fetchLoginHistory = async () => {
		try {
			// TODO: Replace with actual API call when server endpoint is available
			// const response = await ApiService.get('/login-history');
			// if (response.success && response.data) {
			//   setLoginHistory(response.data);
			// }

			// For now, show empty state since we can't use mock data without server connection
			setLoginHistory([]);
			setLoading(false);
		} catch (error) {
			console.error('Error fetching login history:', error);
			setLoading(false);
		}
	};

	const onRefresh = async () => {
		setRefreshing(true);
		await fetchLoginHistory();
		setRefreshing(false);
	};

	const formatTimestamp = (timestamp: string) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffInHours = Math.floor(
			(now.getTime() - date.getTime()) / (1000 * 60 * 60)
		);

		if (diffInHours < 1) {
			return 'Just now';
		} else if (diffInHours < 24) {
			return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
		} else {
			const diffInDays = Math.floor(diffInHours / 24);
			return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'success':
				return { name: 'checkmark-circle', color: '#4CAF50' };
			case 'failed':
				return { name: 'close-circle', color: '#F44336' };
			case 'suspicious':
				return { name: 'warning', color: '#FF9800' };
			default:
				return { name: 'help-circle', color: '#9E9E9E' };
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case 'success':
				return 'Successful';
			case 'failed':
				return 'Failed';
			case 'suspicious':
				return 'Suspicious';
			default:
				return 'Unknown';
		}
	};

	if (loading) {
		return (
			<View style={styles.mainContainer}>
				<SafeAreaView style={styles.safeArea}>
					<View style={styles.header}>
						<TouchableOpacity
							style={styles.backButton}
							onPress={() => router.back()}
						>
							<Ionicons name="chevron-back" size={24} color="#333" />
						</TouchableOpacity>
						<Text style={styles.headerTitle}>Login History</Text>
						<View style={styles.placeholder} />
					</View>
					<View style={styles.loadingContainer}>
						<Text style={styles.loadingText}>Loading login history...</Text>
					</View>
				</SafeAreaView>
			</View>
		);
	}

	return (
		<View style={styles.mainContainer}>
			<SafeAreaView style={styles.safeArea}>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="chevron-back" size={24} color="#333" />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Login History</Text>
					<View style={styles.placeholder} />
				</View>

				{/* Content */}
				<ScrollView
					style={styles.content}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
					}
				>
					<View style={styles.infoContainer}>
						<Ionicons
							name="information-circle-outline"
							size={20}
							color="#666"
						/>
						<Text style={styles.infoText}>
							This shows your recent login activity. Review for any suspicious
							activity.
						</Text>
					</View>

					{loginHistory.map((session) => {
						const statusIcon = getStatusIcon(session.status);
						return (
							<View key={session.id} style={styles.sessionCard}>
								<View style={styles.sessionHeader}>
									<View style={styles.deviceInfo}>
										<Ionicons
											name="phone-portrait-outline"
											size={20}
											color="#555"
										/>
										<Text style={styles.deviceText}>{session.device}</Text>
									</View>
									<View style={styles.statusContainer}>
										<Ionicons
											name={statusIcon.name as any}
											size={16}
											color={statusIcon.color}
										/>
										<Text
											style={[styles.statusText, { color: statusIcon.color }]}
										>
											{getStatusText(session.status)}
										</Text>
									</View>
								</View>

								<View style={styles.sessionDetails}>
									<View style={styles.detailRow}>
										<Ionicons name="location-outline" size={16} color="#666" />
										<Text style={styles.detailText}>{session.location}</Text>
									</View>
									<View style={styles.detailRow}>
										<Ionicons name="globe-outline" size={16} color="#666" />
										<Text style={styles.detailText}>{session.ipAddress}</Text>
									</View>
									<View style={styles.detailRow}>
										<Ionicons name="time-outline" size={16} color="#666" />
										<Text style={styles.detailText}>
											{formatTimestamp(session.timestamp)}
										</Text>
									</View>
								</View>
							</View>
						);
					})}

					{loginHistory.length === 0 && (
						<View style={styles.emptyContainer}>
							<Ionicons name="time-outline" size={48} color="#ccc" />
							<Text style={styles.emptyText}>No login history available</Text>
						</View>
					)}
				</ScrollView>
			</SafeAreaView>
		</View>
	);
}

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	safeArea: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	backButton: {
		padding: 4,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	placeholder: {
		width: 32,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 16,
		color: '#666',
	},
	content: {
		flex: 1,
		padding: 16,
	},
	infoContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#F0F8FF',
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
	},
	infoText: {
		fontSize: 14,
		color: '#666',
		marginLeft: 8,
		flex: 1,
		lineHeight: 20,
	},
	sessionCard: {
		backgroundColor: '#f9f9f9',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	sessionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	deviceInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	deviceText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginLeft: 8,
	},
	statusContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	statusText: {
		fontSize: 12,
		fontWeight: '600',
		marginLeft: 4,
	},
	sessionDetails: {
		gap: 8,
	},
	detailRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	detailText: {
		fontSize: 14,
		color: '#666',
		marginLeft: 8,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 60,
	},
	emptyText: {
		fontSize: 16,
		color: '#999',
		marginTop: 16,
	},
});
