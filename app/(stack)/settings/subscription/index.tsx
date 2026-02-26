import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	SafeAreaView,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscription } from '../../../../src/context/SubscriptionContext';

export default function SubscriptionSettingsScreen() {
	const router = useRouter();
	const { isPro, subscriptionStatus } = useSubscription();
	const { expirationDate, willRenew } = subscriptionStatus;

	const handleManageSubscription = () => {
		Alert.alert(
			'Manage Subscription',
			'Manage your subscription through your device\'s App Store or Google Play account settings.',
			[{ text: 'OK' }]
		);
	};

	return (
		<SafeAreaView style={styles.container}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{/* Status Section */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Subscription Status</Text>
						<View style={styles.statusCard}>
							{isPro ? (
								<>
									<View style={styles.statusHeader}>
										<Ionicons
											name="checkmark-circle"
											size={32}
											color="#10B981"
										/>
										<View style={styles.statusHeaderText}>
											<Text style={styles.statusTitle}>Brie Pro Active</Text>
											<Text style={styles.statusSubtitle}>
												You have access to all Pro features
											</Text>
										</View>
									</View>
									{expirationDate && (
										<View style={styles.statusInfo}>
											<Ionicons
												name="calendar-outline"
												size={16}
												color="#6B7280"
											/>
											<Text style={styles.statusInfoText}>
												{willRenew
													? `Renews on ${expirationDate.toLocaleDateString()}`
													: `Expires on ${expirationDate.toLocaleDateString()}`}
											</Text>
										</View>
									)}
								</>
							) : (
								<>
									<View style={styles.statusHeader}>
										<Ionicons
											name="information-circle"
											size={32}
											color="#6B7280"
										/>
										<View style={styles.statusHeaderText}>
											<Text style={styles.statusTitle}>Free Plan</Text>
											<Text style={styles.statusSubtitle}>
												Upgrade to unlock Pro features
											</Text>
										</View>
									</View>
								</>
							)}
						</View>
					</View>

					{/* Actions Section */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Manage Subscription</Text>

						{!isPro && (
							<TouchableOpacity
								style={styles.actionCard}
								onPress={() => router.push('/(stack)/settings/upgrade')}
								activeOpacity={0.7}
							>
								<View style={styles.actionIcon}>
									<Ionicons name="star" size={24} color="#4F46E5" />
								</View>
								<View style={styles.actionContent}>
									<Text style={styles.actionTitle}>Upgrade to Brie Pro</Text>
									<Text style={styles.actionDescription}>
										Unlock premium features and insights
									</Text>
								</View>
								<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
							</TouchableOpacity>
						)}

						<TouchableOpacity
							style={styles.actionCard}
							onPress={handleManageSubscription}
							activeOpacity={0.7}
						>
							<View style={styles.actionIcon}>
								<Ionicons name="settings-outline" size={24} color="#4F46E5" />
							</View>
							<View style={styles.actionContent}>
								<Text style={styles.actionTitle}>Manage Subscription</Text>
								<Text style={styles.actionDescription}>
									View details, update payment, or cancel
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
						</TouchableOpacity>
					</View>

					{/* Info Section */}
					<View style={styles.section}>
						<View style={styles.infoBox}>
							<Ionicons
								name="information-circle-outline"
								size={20}
								color="#6B7280"
							/>
							<Text style={styles.infoText}>
								Subscriptions auto-renew unless cancelled. Manage your
								subscription through your App Store or Google Play
								account settings.
							</Text>
						</View>
					</View>
				</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	scrollContent: {
		paddingBottom: 32,
	},
	section: {
		paddingHorizontal: 16,
		paddingTop: 24,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#6B7280',
		marginBottom: 12,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	statusCard: {
		backgroundColor: '#F9FAFB',
		borderRadius: 12,
		padding: 20,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	statusHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
		marginBottom: 12,
	},
	statusHeaderText: {
		flex: 1,
	},
	statusTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 4,
	},
	statusSubtitle: {
		fontSize: 14,
		color: '#6B7280',
	},
	statusInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
	},
	statusInfoText: {
		fontSize: 13,
		color: '#6B7280',
		fontWeight: '500',
	},
	actionCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	actionIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#EEF2FF',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	actionContent: {
		flex: 1,
	},
	actionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
		marginBottom: 4,
	},
	actionDescription: {
		fontSize: 13,
		color: '#6B7280',
	},
	infoBox: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
		padding: 16,
		backgroundColor: '#F9FAFB',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	infoText: {
		flex: 1,
		fontSize: 13,
		color: '#6B7280',
		lineHeight: 18,
	},
});
