import React from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatResponse } from '../../../../src/components/assistant/responseSchema';
import { sharedStyles } from '../../../../src/components/assistant/sharedStyles';

interface StructuredResponseProps {
	response: ChatResponse;
	onAction?: (action: string, params?: any) => void;
}

export default function StructuredResponse({
	response,
	onAction,
}: StructuredResponseProps) {
	// Safety check for undefined response
	if (!response) {
		return (
			<View style={styles.container}>
				<Text style={styles.message}>Loading response...</Text>
			</View>
		);
	}

	const handleAction = (action: string, params?: any) => {
		if (onAction) {
			onAction(action, params);
		}
	};

	const renderCard = (card: any, index: number) => {
		switch (card.type) {
			case 'budget':
				return (
					<View key={index} style={styles.card}>
						<View style={styles.cardHeader}>
							<Ionicons name="pie-chart" size={16} color="#3b82f6" />
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
										${card.data.pressured.remaining?.toFixed(2) || '0'}{' '}
										remaining
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

			case 'balance':
				return (
					<View key={index} style={styles.card}>
						<View style={styles.cardHeader}>
							<Ionicons name="wallet" size={16} color="#10b981" />
							<Text style={styles.cardTitle}>Account Balance</Text>
						</View>
						<View style={styles.cardContent}>
							<Text style={styles.cardText}>
								${card.data.totalBalance?.toFixed(2) || '0'}
							</Text>
							<Text style={styles.cardSubtext}>
								Available across {card.data.accounts?.length || 0} budgets
							</Text>
						</View>
					</View>
				);

			case 'subscriptions':
				return (
					<View key={index} style={styles.card}>
						<View style={styles.cardHeader}>
							<Ionicons name="repeat" size={16} color="#8b5cf6" />
							<Text style={styles.cardTitle}>Subscriptions</Text>
						</View>
						<View style={styles.cardContent}>
							<Text style={styles.cardText}>
								{card.data.subscriptions?.length || 0} active
							</Text>
							<Text style={styles.cardSubtext}>
								${card.data.totalMonthly?.toFixed(2) || '0'}/month
							</Text>
							{card.data.risky?.length > 0 && (
								<Text style={styles.riskyText}>
									{card.data.risky.length} risky
								</Text>
							)}
						</View>
					</View>
				);

			case 'forecast':
				return (
					<View key={index} style={styles.card}>
						<View style={styles.cardHeader}>
							<Ionicons name="trending-up" size={16} color="#8b5cf6" />
							<Text style={styles.cardTitle}>Spending Forecast</Text>
						</View>
						<View style={styles.cardContent}>
							<Text style={styles.cardText}>
								${card.data.next30Days?.toFixed(2) || '0'}
							</Text>
							<Text style={styles.cardSubtext}>
								Next 30 days • {card.data.confidence} confidence
							</Text>
						</View>
					</View>
				);

			default:
				return null;
		}
	};

	const renderAction = (action: any, index: number) => (
		<TouchableOpacity
			key={index}
			style={[
				styles.actionButton,
				// Make primary actions more prominent
				action.label.includes('Connect') || action.label.includes('Pick')
					? styles.primaryAction
					: styles.secondaryAction,
			]}
			onPress={() => handleAction(action.action, action.params)}
			activeOpacity={0.7}
		>
			<View style={styles.actionContent}>
				<Text
					style={[
						styles.actionLabel,
						action.label.includes('Connect') || action.label.includes('Pick')
							? styles.primaryActionLabel
							: styles.secondaryActionLabel,
					]}
				>
					{action.label}
				</Text>
				{action.label.includes('Connect') && (
					<Text style={styles.actionSubtext}>Link your accounts</Text>
				)}
				{action.label.includes('Pick') && (
					<Text style={styles.actionSubtext}>Choose date range</Text>
				)}
			</View>
			<Ionicons
				name="chevron-forward"
				size={16}
				color={
					action.label.includes('Connect') || action.label.includes('Pick')
						? '#ffffff'
						: '#6b7280'
				}
			/>
		</TouchableOpacity>
	);

	const renderSource = (source: any, index: number) => {
		const getSourceIcon = (kind: string) => {
			switch (kind) {
				case 'cache':
					return 'flash';
				case 'localML':
					return 'hardware-chip';
				case 'db':
					return 'server';
				case 'gpt':
					return 'cloud';
				default:
					return 'information-circle';
			}
		};

		const getSourceColor = (kind: string) => {
			switch (kind) {
				case 'cache':
					return '#10b981';
				case 'localML':
					return '#8b5cf6';
				case 'db':
					return '#3b82f6';
				case 'gpt':
					return '#f59e0b';
				default:
					return '#6b7280';
			}
		};

		return (
			<View key={index} style={styles.sourceTag}>
				<Ionicons
					name={getSourceIcon(source.kind) as any}
					size={12}
					color={getSourceColor(source.kind)}
				/>
				<Text style={styles.sourceText}>
					{source.kind === 'cache'
						? 'Instant'
						: source.kind === 'localML'
						? 'Local AI'
						: source.kind === 'db'
						? 'Your data'
						: source.kind === 'gpt'
						? 'AI powered'
						: source.kind}
				</Text>
				{source.note && <Text style={styles.sourceNote}> • {source.note}</Text>}
			</View>
		);
	};

	// Check if we have budget cards to determine if we should show a contextual message
	const hasBudgetCards =
		response.cards?.some((card) => card.type === 'budget') || false;
	const budgetCard = response.cards?.find((card) => card.type === 'budget');

	// Generate contextual message based on card content instead of duplicating it
	const getContextualMessage = () => {
		if (hasBudgetCards && budgetCard?.data?.pressured) {
			const { name, percentage, remaining } = budgetCard.data.pressured;
			if (percentage >= 90) {
				return `Your ${name} budget is running low!`;
			} else if (percentage >= 75) {
				return `Your ${name} budget needs attention.`;
			} else {
				return `Here's how your ${name} budget is doing:`;
			}
		}
		return response.message;
	};

	return (
		<>
			{/* Contextual message - only show if it's different from card content */}
			{(!hasBudgetCards || getContextualMessage() !== response.message) && (
				<Text style={styles.message}>{getContextualMessage()}</Text>
			)}

			{/* Details if available */}
			{response.details && (
				<Text style={styles.details}>{response.details}</Text>
			)}

			{/* Cards */}
			{response.cards && response.cards.length > 0 && (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.cardsContainer}
					contentContainerStyle={styles.cardsContent}
				>
					{response.cards.map(renderCard)}
				</ScrollView>
			)}

			{/* Actions */}
			{response.actions && response.actions.length > 0 && (
				<View style={styles.actionsContainer}>
					{response.actions.map(renderAction)}
				</View>
			)}

			{/* Sources and cost info */}
			<View style={styles.footer}>
				<View style={styles.sourcesContainer}>
					{response.sources?.map(renderSource) || null}
				</View>

				{response.cost && (
					<View style={styles.costInfo}>
						<Text style={styles.costText}>
							{response.cost.model === 'mini'
								? '⚡'
								: response.cost.model === 'std'
								? '🔹'
								: '💎'}{' '}
							{response.cost.estTokens || 0} tokens
						</Text>
					</View>
				)}
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
		backgroundColor: '#ffffff',
	},
	message: {
		fontSize: 16,
		fontWeight: '500',
		color: '#1f2937',
		marginBottom: 8,
		lineHeight: 22,
	},
	details: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 16,
		lineHeight: 20,
	},
	cardsContainer: {
		marginBottom: 16,
		maxHeight: 100,
	},
	cardsContent: {
		paddingRight: 16,
	},
	card: {
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		padding: 12,
		marginRight: 12,
		minWidth: '100%',
		width: '100%',
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
	cardText: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 2,
	},
	cardSubtext: {
		fontSize: 12,
		color: '#6b7280',
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
	riskyText: {
		fontSize: 11,
		color: '#dc2626',
		fontStyle: 'italic',
	},
	actionsContainer: {
		marginBottom: 16,
		maxHeight: 80,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#f3f4f6',
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	actionLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#374151',
	},
	primaryAction: {
		backgroundColor: '#3b82f6',
		borderColor: '#3b82f6',
	},
	primaryActionLabel: {
		color: '#ffffff',
	},
	secondaryAction: {
		backgroundColor: '#f3f4f6',
		borderColor: '#e5e7eb',
	},
	secondaryActionLabel: {
		color: '#374151',
	},
	actionContent: {
		flex: 1,
	},
	actionSubtext: {
		fontSize: 11,
		color: '#9ca3af',
		marginTop: 2,
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
		maxHeight: 40,
	},
	sourcesContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	sourceTag: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	sourceText: {
		fontSize: 11,
		color: '#6b7280',
		fontWeight: '500',
	},
	sourceNote: {
		fontSize: 11,
		color: '#9ca3af',
	},
	costInfo: {
		backgroundColor: '#f3f4f6',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	costText: {
		fontSize: 11,
		color: '#6b7280',
		fontWeight: '500',
	},
});
