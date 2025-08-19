import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	Modal,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SubscriptionTier {
	tier: string;
	price: number;
	tokenLimit: number;
	requestLimit: number;
	conversationLimit: number;
	features: string[];
}

interface PaywallModalProps {
	visible: boolean;
	onClose: () => void;
	onUpgrade: (tier: string) => void;
	currentUsage: {
		currentTokens: number;
		tokenLimit: number;
		currentRequests: number;
		requestLimit: number;
		currentConversations: number;
		conversationLimit: number;
		subscriptionTier: string;
		estimatedCost: number;
	};
	reason: string;
}

const PaywallModal: React.FC<PaywallModalProps> = ({
	visible,
	onClose,
	onUpgrade,
	currentUsage,
	reason,
}) => {
	const [selectedTier, setSelectedTier] = useState<string>('basic');
	const [loading, setLoading] = useState(false);
	const [pricing, setPricing] = useState<Record<string, SubscriptionTier>>({});

	useEffect(() => {
		fetchPricing();
	}, []);

	const fetchPricing = async () => {
		try {
			// This would typically fetch from your API
			// For now, using mock data
			setPricing({
				free: {
					tier: 'free',
					price: 0,
					tokenLimit: 10000,
					requestLimit: 50,
					conversationLimit: 20,
					features: [
						'Basic AI assistance',
						'Standard insights',
						'Email support',
					],
				},
				basic: {
					tier: 'basic',
					price: 9.99,
					tokenLimit: 50000,
					requestLimit: 200,
					conversationLimit: 100,
					features: [
						'Advanced AI insights',
						'Conversation history',
						'Priority support',
						'Custom prompts',
					],
				},
				premium: {
					tier: 'premium',
					price: 19.99,
					tokenLimit: 200000,
					requestLimit: 1000,
					conversationLimit: 500,
					features: [
						'Unlimited AI conversations',
						'Advanced analytics',
						'Priority support',
						'Custom prompts',
						'API access',
					],
				},
				enterprise: {
					tier: 'enterprise',
					price: 99.99,
					tokenLimit: 1000000,
					requestLimit: 10000,
					conversationLimit: 5000,
					features: [
						'Unlimited everything',
						'Dedicated support',
						'Custom integrations',
						'White-label options',
						'SLA guarantees',
					],
				},
			});
		} catch (error) {
			console.error('Error fetching pricing:', error);
		}
	};

	const handleUpgrade = async () => {
		if (selectedTier === 'free') {
			Alert.alert('Invalid Selection', 'Please select a paid tier to upgrade.');
			return;
		}

		setLoading(true);
		try {
			await onUpgrade(selectedTier);
			onClose();
		} catch (error) {
			Alert.alert(
				'Upgrade Failed',
				'There was an error processing your upgrade. Please try again.'
			);
		} finally {
			setLoading(false);
		}
	};

	const getReasonMessage = () => {
		switch (reason) {
			case 'premium_features':
				return "You're getting great value from AI assistance! Upgrade to unlock advanced insights, unlimited conversations, and premium features.";
			case 'token_limit_exceeded':
				return "You've reached your monthly AI token limit. Upgrade to continue using AI assistance.";
			case 'request_limit_exceeded':
				return "You've reached your monthly request limit. Upgrade for unlimited AI conversations.";
			case 'conversation_limit_exceeded':
				return "You've reached your monthly conversation limit. Upgrade for unlimited AI conversations.";
			case 'rate_limit_exceeded':
				return "You're making requests too quickly. Upgrade for higher rate limits.";
			default:
				return "You've reached a usage limit. Upgrade to continue using AI assistance.";
		}
	};

	const getReasonIcon = () => {
		switch (reason) {
			case 'premium_features':
				return 'sparkles';
			default:
				return 'warning';
		}
	};

	const getReasonColor = () => {
		switch (reason) {
			case 'premium_features':
				return '#8b5cf6';
			default:
				return '#FF6B6B';
		}
	};

	const getReasonBackground = () => {
		switch (reason) {
			case 'premium_features':
				return '#f8f7ff';
			default:
				return '#FFF5F5';
		}
	};

	const formatNumber = (num: number) => {
		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		} else if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return num.toString();
	};

	const getUsagePercentage = (current: number, limit: number) => {
		return Math.min((current / limit) * 100, 100);
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<View style={styles.container}>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Ionicons name="close" size={24} color="#666" />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>
						{reason === 'premium_features'
							? 'Unlock Premium Features'
							: 'Upgrade Your Plan'}
					</Text>
					<View style={styles.placeholder} />
				</View>

				<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
					{/* Reason for paywall */}
					<View
						style={[
							styles.reasonSection,
							{
								backgroundColor: getReasonBackground(),
								borderColor: getReasonColor(),
							},
						]}
					>
						<Ionicons
							name={getReasonIcon() as any}
							size={24}
							color={getReasonColor()}
						/>
						<Text
							style={[
								styles.reasonText,
								{
									color: reason === 'premium_features' ? '#7c3aed' : '#D32F2F',
								},
							]}
						>
							{getReasonMessage()}
						</Text>
					</View>

					{/* Premium Features Preview - only show for premium_features reason */}
					{reason === 'premium_features' && (
						<View style={styles.premiumPreviewSection}>
							<Text style={styles.sectionTitle}>What You'll Unlock</Text>
							<View style={styles.premiumFeaturesGrid}>
								<View style={styles.premiumFeature}>
									<Ionicons name="infinite" size={20} color="#8b5cf6" />
									<Text style={styles.premiumFeatureText}>
										Unlimited AI conversations
									</Text>
								</View>
								<View style={styles.premiumFeature}>
									<Ionicons name="analytics" size={20} color="#8b5cf6" />
									<Text style={styles.premiumFeatureText}>
										Advanced financial insights
									</Text>
								</View>
								<View style={styles.premiumFeature}>
									<Ionicons name="trending-up" size={20} color="#8b5cf6" />
									<Text style={styles.premiumFeatureText}>
										Predictive spending analysis
									</Text>
								</View>
								<View style={styles.premiumFeature}>
									<Ionicons name="bulb" size={20} color="#8b5cf6" />
									<Text style={styles.premiumFeatureText}>
										Personalized recommendations
									</Text>
								</View>
							</View>
						</View>
					)}

					{/* Current Usage - only show for limit-related reasons */}
					{reason !== 'premium_features' && (
						<View style={styles.usageSection}>
							<Text style={styles.sectionTitle}>Current Usage</Text>
							<View style={styles.usageGrid}>
								<View style={styles.usageItem}>
									<Text style={styles.usageLabel}>Tokens</Text>
									<View style={styles.progressBar}>
										<View
											style={[
												styles.progressFill,
												{
													width: `${getUsagePercentage(
														currentUsage.currentTokens,
														currentUsage.tokenLimit
													)}%`,
												},
											]}
										/>
									</View>
									<Text style={styles.usageText}>
										{formatNumber(currentUsage.currentTokens)} /{' '}
										{formatNumber(currentUsage.tokenLimit)}
									</Text>
								</View>
								<View style={styles.usageItem}>
									<Text style={styles.usageLabel}>Requests</Text>
									<View style={styles.progressBar}>
										<View
											style={[
												styles.progressFill,
												{
													width: `${getUsagePercentage(
														currentUsage.currentRequests,
														currentUsage.requestLimit
													)}%`,
												},
											]}
										/>
									</View>
									<Text style={styles.usageText}>
										{currentUsage.currentRequests} / {currentUsage.requestLimit}
									</Text>
								</View>
								<View style={styles.usageItem}>
									<Text style={styles.usageLabel}>Conversations</Text>
									<View style={styles.progressBar}>
										<View
											style={[
												styles.progressFill,
												{
													width: `${getUsagePercentage(
														currentUsage.currentConversations,
														currentUsage.conversationLimit
													)}%`,
												},
											]}
										/>
									</View>
									<Text style={styles.usageText}>
										{currentUsage.currentConversations} /{' '}
										{currentUsage.conversationLimit}
									</Text>
								</View>
							</View>
						</View>
					)}

					{/* Subscription Tiers */}
					<View style={styles.tiersSection}>
						<Text style={styles.sectionTitle}>
							{reason === 'premium_features'
								? 'Choose Your Plan'
								: 'Choose Your Plan'}
						</Text>
						{Object.entries(pricing).map(([key, tier]) => (
							<TouchableOpacity
								key={key}
								style={[
									styles.tierCard,
									selectedTier === key && styles.selectedTier,
								]}
								onPress={() => setSelectedTier(key)}
								disabled={key === 'free'}
							>
								<View style={styles.tierHeader}>
									<View style={styles.tierInfo}>
										<Text style={styles.tierName}>
											{key.charAt(0).toUpperCase() + key.slice(1)}
										</Text>
										<Text style={styles.tierPrice}>${tier.price}/month</Text>
									</View>
									{selectedTier === key && (
										<View style={styles.selectedIndicator}>
											<Ionicons
												name="checkmark-circle"
												size={24}
												color="#4CAF50"
											/>
										</View>
									)}
								</View>

								<View style={styles.tierLimits}>
									<Text style={styles.limitText}>
										{formatNumber(tier.tokenLimit)} tokens/month
									</Text>
									<Text style={styles.limitText}>
										{formatNumber(tier.requestLimit)} requests/month
									</Text>
									<Text style={styles.limitText}>
										{formatNumber(tier.conversationLimit)} conversations/month
									</Text>
								</View>

								<View style={styles.tierFeatures}>
									{tier.features.map((feature, index) => (
										<View key={index} style={styles.featureItem}>
											<Ionicons name="checkmark" size={16} color="#4CAF50" />
											<Text style={styles.featureText}>{feature}</Text>
										</View>
									))}
								</View>
							</TouchableOpacity>
						))}
					</View>

					{/* Upgrade Button */}
					<TouchableOpacity
						style={[
							styles.upgradeButton,
							selectedTier === 'free' && styles.upgradeButtonDisabled,
						]}
						onPress={handleUpgrade}
						disabled={selectedTier === 'free' || loading}
					>
						{loading ? (
							<ActivityIndicator color="white" />
						) : (
							<Text style={styles.upgradeButtonText}>
								{reason === 'premium_features'
									? `Upgrade to ${
											selectedTier.charAt(0).toUpperCase() +
											selectedTier.slice(1)
									  }`
									: `Upgrade to ${
											selectedTier.charAt(0).toUpperCase() +
											selectedTier.slice(1)
									  }`}
							</Text>
						)}
					</TouchableOpacity>

					{/* Terms */}
					<Text style={styles.termsText}>
						By upgrading, you agree to our terms of service and privacy policy.
						Subscriptions auto-renew unless cancelled.
					</Text>
				</ScrollView>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'white',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingTop: 60,
		paddingBottom: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E5E5',
	},
	closeButton: {
		padding: 8,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	placeholder: {
		width: 40,
	},
	content: {
		flex: 1,
		paddingHorizontal: 20,
	},
	reasonSection: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderRadius: 12,
		marginTop: 20,
		marginBottom: 24,
		borderWidth: 1,
	},
	reasonText: {
		marginLeft: 12,
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
	},
	usageSection: {
		marginBottom: 24,
	},
	premiumPreviewSection: {
		marginBottom: 24,
		padding: 16,
		backgroundColor: '#F8F7FF',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E0D7FF',
	},
	premiumFeaturesGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-around',
		gap: 12,
	},
	premiumFeature: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0E7FF',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 10,
		alignSelf: 'flex-start',
	},
	premiumFeatureText: {
		marginLeft: 10,
		fontSize: 14,
		color: '#5D3FD3',
		fontWeight: '500',
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 16,
	},
	usageGrid: {
		gap: 16,
	},
	usageItem: {
		backgroundColor: '#F8F9FA',
		padding: 16,
		borderRadius: 12,
	},
	usageLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#666',
		marginBottom: 8,
	},
	progressBar: {
		height: 6,
		backgroundColor: '#E5E5E5',
		borderRadius: 3,
		marginBottom: 8,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		backgroundColor: '#4CAF50',
		borderRadius: 3,
	},
	usageText: {
		fontSize: 12,
		color: '#666',
		textAlign: 'center',
	},
	tiersSection: {
		marginBottom: 24,
	},
	tierCard: {
		backgroundColor: '#F8F9FA',
		borderRadius: 16,
		padding: 20,
		marginBottom: 16,
		borderWidth: 2,
		borderColor: 'transparent',
	},
	selectedTier: {
		borderColor: '#4CAF50',
		backgroundColor: '#F1F8E9',
	},
	tierHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	tierInfo: {
		flex: 1,
	},
	tierName: {
		fontSize: 20,
		fontWeight: '700',
		color: '#333',
		marginBottom: 4,
	},
	tierPrice: {
		fontSize: 24,
		fontWeight: '600',
		color: '#4CAF50',
	},
	selectedIndicator: {
		marginLeft: 16,
	},
	tierLimits: {
		marginBottom: 16,
	},
	limitText: {
		fontSize: 14,
		color: '#666',
		marginBottom: 4,
	},
	tierFeatures: {
		gap: 8,
	},
	featureItem: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	featureText: {
		marginLeft: 8,
		fontSize: 14,
		color: '#333',
	},
	upgradeButton: {
		backgroundColor: '#4CAF50',
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		alignItems: 'center',
		marginBottom: 16,
	},
	upgradeButtonDisabled: {
		backgroundColor: '#E5E5E5',
	},
	upgradeButtonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600',
	},
	termsText: {
		fontSize: 12,
		color: '#999',
		textAlign: 'center',
		lineHeight: 16,
		marginBottom: 40,
	},
});

export default PaywallModal;
