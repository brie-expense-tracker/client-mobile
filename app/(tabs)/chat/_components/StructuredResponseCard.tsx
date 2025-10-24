import React from 'react';
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatResponse } from '../../../../src/services/assistant/responseSchema';

interface StructuredResponseCardProps {
	response: ChatResponse;
	onActionPress: (action: string, params?: any) => void;
}

export default function StructuredResponseCard({
	response,
	onActionPress,
}: StructuredResponseCardProps) {
	const renderCard = (card: any, index: number) => {
		switch (card.type) {
			case 'balance':
				return (
					<View key={index} style={styles.card}>
						<View style={styles.cardHeader}>
							<Ionicons name="wallet" size={20} color="#3b82f6" />
							<Text style={styles.cardTitle}>Account Balance</Text>
						</View>
						<View style={styles.cardContent}>
							<Text style={styles.balanceAmount}>
								${card.data.totalBalance?.toFixed(2) || '0.00'}
							</Text>
							<Text style={styles.balanceSubtext}>
								Available across {card.data.accounts?.length || 0} budgets
							</Text>
						</View>
					</View>
				);

			case 'budget':
				return (
					<View key={index} style={styles.card}>
						<View style={styles.cardHeader}>
							<Ionicons name="pie-chart" size={20} color="#3b82f6" />
							<Text style={styles.cardTitle}>Budget Status</Text>
						</View>
						<View style={styles.cardContent}>
							{card.data.pressured ? (
								<View style={styles.pressuredBudget}>
									<Text style={styles.pressuredText}>
										{card.data.pressured.name} at{' '}
										{card.data.pressured.percentage}%
									</Text>
									<Text style={styles.remainingText}>
										${card.data.pressured.remaining.toFixed(2)} remaining
									</Text>
								</View>
							) : (
								<Text style={styles.healthyText}>
									All budgets in good shape
								</Text>
							)}
						</View>
					</View>
				);

			case 'subscriptions':
				return (
					<View key={index} style={styles.card}>
						<View style={styles.cardHeader}>
							<Ionicons name="repeat" size={20} color="#3b82f6" />
							<Text style={styles.cardTitle}>Subscriptions</Text>
						</View>
						<View style={styles.cardContent}>
							<Text style={styles.subscriptionCount}>
								{card.data.subscriptions?.length || 0} active
							</Text>
							<Text style={styles.subscriptionTotal}>
								${card.data.totalMonthly?.toFixed(2) || '0.00'}/month
							</Text>
							{card.data.risky?.length > 0 && (
								<Text style={styles.riskyText}>
									{card.data.risky.length} risky subscription(s)
								</Text>
							)}
						</View>
					</View>
				);

			case 'forecast':
				return (
					<View key={index} style={styles.card}>
						<View style={styles.cardHeader}>
							<Ionicons name="trending-up" size={20} color="#3b82f6" />
							<Text style={styles.cardTitle}>Spending Forecast</Text>
						</View>
						<View style={styles.cardContent}>
							<Text style={styles.forecastAmount}>
								${card.data.next30Days?.toFixed(2) || '0.00'}
							</Text>
							<Text style={styles.forecastSubtext}>
								Next 30 days • {card.data.confidence} confidence
							</Text>
						</View>
					</View>
				);

			default:
				return null;
		}
	};

	const renderActions = () => {
		if (!response.actions || response.actions.length === 0) return null;

		return (
			<View style={styles.actionsContainer}>
				<Text style={styles.actionsTitle}>Quick Actions</Text>
				<View style={styles.actionsList}>
					{response.actions.map((action, index) => (
						<TouchableOpacity
							key={index}
							style={styles.actionButton}
							onPress={() => onActionPress(action.action, action.params)}
						>
							<Text style={styles.actionButtonText}>{action.label}</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>
		);
	};

	return (
		<View style={styles.container}>
			{/* Main message */}
			<View style={styles.messageContainer}>
				<Text style={styles.messageText}>{response.message}</Text>
				{response.details && (
					<Text style={styles.detailsText}>{response.details}</Text>
				)}
			</View>

			{/* Cards */}
			{response.cards && response.cards.length > 0 && (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.cardsContainer}
					contentContainerStyle={styles.cardsContent}
				>
					{response.cards.map((card, index) => renderCard(card, index))}
				</ScrollView>
			)}

			{/* Actions */}
			{renderActions()}

			{/* Sources */}
			{response.sources && response.sources.length > 0 && (
				<View style={styles.sourcesContainer}>
					<Text style={styles.sourcesText}>
						Sources: {response.sources.map((s) => s.kind).join(', ')}
					</Text>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: 'white',
		borderRadius: 12,
		padding: 16,
		marginVertical: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	messageContainer: {
		marginBottom: 16,
	},
	messageText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1f2937',
		marginBottom: 8,
	},
	detailsText: {
		fontSize: 14,
		color: '#6b7280',
		fontStyle: 'italic',
	},
	cardsContainer: {
		marginBottom: 16,
	},
	cardsContent: {
		paddingRight: 16,
	},
	card: {
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		padding: 12,
		marginRight: 12,
		minWidth: 140,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	cardTitle: {
		fontSize: 12,
		fontWeight: '600',
		color: '#374151',
		marginLeft: 6,
	},
	cardContent: {
		alignItems: 'center',
	},
	balanceAmount: {
		fontSize: 18,
		fontWeight: '700',
		color: '#059669',
		marginBottom: 4,
	},
	balanceSubtext: {
		fontSize: 11,
		color: '#6b7280',
		textAlign: 'center',
	},
	pressuredBudget: {
		alignItems: 'center',
	},
	pressuredText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#dc2626',
		marginBottom: 4,
		textAlign: 'center',
	},
	remainingText: {
		fontSize: 12,
		color: '#6b7280',
	},
	healthyText: {
		fontSize: 12,
		color: '#059669',
		textAlign: 'center',
		fontWeight: '500',
	},
	subscriptionCount: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1f2937',
		marginBottom: 4,
	},
	subscriptionTotal: {
		fontSize: 12,
		color: '#6b7280',
		marginBottom: 4,
	},
	riskyText: {
		fontSize: 11,
		color: '#dc2626',
		fontStyle: 'italic',
	},
	forecastAmount: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 4,
	},
	forecastSubtext: {
		fontSize: 11,
		color: '#6b7280',
		textAlign: 'center',
	},
	actionsContainer: {
		marginTop: 8,
	},
	actionsTitle: {
		fontSize: 12,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 8,
	},
	actionsList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	actionButton: {
		backgroundColor: '#3b82f6',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
	},
	actionButtonText: {
		color: 'white',
		fontSize: 12,
		fontWeight: '500',
	},
	sourcesContainer: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
	},
	sourcesText: {
		fontSize: 10,
		color: '#9ca3af',
		fontStyle: 'italic',
	},
});
