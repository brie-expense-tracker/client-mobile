import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Modal,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getRevenueCatUI } from '../services/subscriptions/revenueCatUIImports';
import useSubscription from '../context/SubscriptionContext';
import { useBriePro } from '../hooks/useBriePro';
import * as Haptics from 'expo-haptics';

interface CustomerCenterProps {
	visible: boolean;
	onClose: () => void;
}

/**
 * Customer Center Component
 * Provides access to subscription management, billing, and account settings
 * Uses RevenueCat's built-in Customer Center UI when available
 */
export default function CustomerCenter({
	visible,
	onClose,
}: CustomerCenterProps) {
	const { customerInfo, isLoading, restorePurchases, refreshSubscription } =
		useSubscription();
	const { isPro, expirationDate, willRenew } = useBriePro();
	const [restoring, setRestoring] = useState(false);

	const handleRestore = async () => {
		try {
			setRestoring(true);
			await restorePurchases();
			await refreshSubscription();

			if (isPro) {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
				Alert.alert(
					'Purchases Restored',
					'Your subscription has been successfully restored.',
					[{ text: 'OK' }]
				);
			} else {
				Alert.alert(
					'No Purchases Found',
					"We couldn't find any active subscriptions to restore.",
					[{ text: 'OK' }]
				);
			}
		} catch (error: any) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			Alert.alert(
				'Restore Failed',
				error.message || 'Unable to restore purchases. Please try again.',
				[{ text: 'OK' }]
			);
		} finally {
			setRestoring(false);
		}
	};

	// Use RevenueCat's Customer Center UI if customer info is available and UI components are linked
	if (customerInfo) {
		const {
			PurchasesCustomerInfo: CustomerInfoComponent,
			isUIAvailable: uiAvailable,
		} = getRevenueCatUI();

		if (uiAvailable && CustomerInfoComponent) {
			return (
				<Modal
					visible={visible}
					animationType="slide"
					presentationStyle="pageSheet"
					onRequestClose={onClose}
				>
					<View style={styles.container}>
						<View style={styles.header}>
							<Text style={styles.headerTitle}>Subscription</Text>
							<TouchableOpacity
								onPress={onClose}
								style={styles.closeButton}
								accessibilityLabel="Close"
							>
								<Ionicons name="close" size={24} color="#000" />
							</TouchableOpacity>
						</View>
						<View style={styles.content}>
							<CustomerInfoComponent
								customerInfo={customerInfo}
								onPurchaseCompleted={(updatedCustomerInfo: any) => {
									refreshSubscription();
									Haptics.notificationAsync(
										Haptics.NotificationFeedbackType.Success
									);
									Alert.alert(
										'Subscription Updated',
										'Your subscription has been updated successfully.',
										[{ text: 'OK' }]
									);
								}}
								onPurchaseError={(error: any) => {
									if (!error.userCancelled) {
										Alert.alert('Purchase Failed', error.message);
									}
								}}
								onRestoreCompleted={(updatedCustomerInfo: any) => {
									refreshSubscription();
									Haptics.notificationAsync(
										Haptics.NotificationFeedbackType.Success
									);
									Alert.alert(
										'Purchases Restored',
										'Your purchases have been restored successfully.',
										[{ text: 'OK' }]
									);
								}}
								onRestoreError={(error: any) => {
									Alert.alert('Restore Failed', error.message);
								}}
							/>
						</View>
					</View>
				</Modal>
			);
		}
	}

	// Fallback UI if customer info is not available
	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.headerTitle}>Subscription</Text>
					<TouchableOpacity
						onPress={onClose}
						style={styles.closeButton}
						accessibilityLabel="Close"
					>
						<Ionicons name="close" size={24} color="#000" />
					</TouchableOpacity>
				</View>

				{isLoading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#4F46E5" />
						<Text style={styles.loadingText}>Loading subscription info...</Text>
					</View>
				) : (
					<View style={styles.content}>
						<View style={styles.statusCard}>
							{isPro ? (
								<>
									<View style={styles.statusHeader}>
										<Ionicons
											name="checkmark-circle"
											size={32}
											color="#10B981"
										/>
										<Text style={styles.statusTitle}>Active Subscription</Text>
									</View>
									<Text style={styles.statusText}>
										You have an active Brie Pro subscription.
									</Text>
									{expirationDate && (
										<Text style={styles.statusSubtext}>
											{willRenew
												? `Renews on ${expirationDate.toLocaleDateString()}`
												: `Expires on ${expirationDate.toLocaleDateString()}`}
										</Text>
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
										<Text style={styles.statusTitle}>
											No Active Subscription
										</Text>
									</View>
									<Text style={styles.statusText}>
										You don&apos;t have an active subscription.
									</Text>
								</>
							)}
						</View>

						<TouchableOpacity
							onPress={handleRestore}
							disabled={restoring}
							style={[
								styles.restoreButton,
								restoring && styles.restoreButtonDisabled,
							]}
						>
							{restoring ? (
								<ActivityIndicator color="#4F46E5" />
							) : (
								<>
									<Ionicons name="refresh" size={20} color="#4F46E5" />
									<Text style={styles.restoreButtonText}>
										Restore Purchases
									</Text>
								</>
							)}
						</TouchableOpacity>

						<View style={styles.infoBox}>
							<Ionicons
								name="information-circle-outline"
								size={20}
								color="#6B7280"
							/>
							<Text style={styles.infoText}>
								To manage your subscription, cancel, or update payment methods,
								please use the App Store or Google Play settings.
							</Text>
						</View>
					</View>
				)}
			</SafeAreaView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
	},
	closeButton: {
		padding: 4,
	},
	content: {
		flex: 1,
		padding: 16,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		gap: 12,
	},
	loadingText: {
		color: '#6B7280',
		fontSize: 14,
	},
	statusCard: {
		backgroundColor: '#F9FAFB',
		borderRadius: 12,
		padding: 20,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	statusHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 12,
	},
	statusTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
	},
	statusText: {
		fontSize: 14,
		color: '#374151',
		marginBottom: 8,
	},
	statusSubtext: {
		fontSize: 13,
		color: '#6B7280',
		fontWeight: '500',
	},
	restoreButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 14,
		paddingHorizontal: 20,
		backgroundColor: '#EEF2FF',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#C7D2FE',
		marginBottom: 16,
	},
	restoreButtonDisabled: {
		opacity: 0.6,
	},
	restoreButtonText: {
		color: '#4F46E5',
		fontWeight: '600',
		fontSize: 16,
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
