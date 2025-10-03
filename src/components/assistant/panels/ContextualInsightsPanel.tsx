import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	FlatList,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
	InsightsContextService,
	Insight,
} from '../../../services/insights/insightsContextService';
import { useProfile } from '../../../context/profileContext';
import { useBudgets } from '../../../hooks/useBudgets';
import { useGoals } from '../../../hooks/useGoals';
import { useContext } from 'react';
import { TransactionContext } from '../../../context/transactionContext';

interface ContextualInsightsPanelProps {
	conversationContext?: string;
	onInsightPress?: (insight: Insight) => void;
	onAskAboutInsight?: (insight: Insight) => void;
	showAllInsights?: boolean;
	maxInsights?: number;
}

export default function ContextualInsightsPanel({
	conversationContext = '',
	onInsightPress,
	onAskAboutInsight,
	showAllInsights = false,
	maxInsights = 3,
}: ContextualInsightsPanelProps) {
	const { profile } = useProfile();
	const { budgets } = useBudgets() as { budgets: any[] };
	const { goals } = useGoals() as { goals: any[] };
	const { transactions } = useContext(TransactionContext) as {
		transactions: any[];
	};

	const [insights, setInsights] = useState<Insight[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [lastContext, setLastContext] = useState('');

	const insightsService = InsightsContextService.getInstance();

	useEffect(() => {
		loadInsights();
	}, [profile, budgets, goals, transactions, conversationContext]);

	const loadInsights = async () => {
		if (!profile) return;

		setIsLoading(true);
		try {
			// Load insights from the service
			await insightsService.loadInsights(profile, budgets, goals, transactions);

			// Get relevant insights based on conversation context
			let relevantInsights: Insight[] = [];

			if (showAllInsights) {
				// Show all insights if requested
				relevantInsights = insightsService.getCriticalInsights();
			} else if (conversationContext && conversationContext !== lastContext) {
				// Get insights relevant to current conversation
				relevantInsights = insightsService.getRelevantInsights(
					conversationContext,
					maxInsights
				);
				setLastContext(conversationContext);
			} else {
				// Show critical insights by default
				relevantInsights = insightsService
					.getCriticalInsights()
					.slice(0, maxInsights);
			}

			setInsights(relevantInsights);
		} catch (error) {
			console.error(
				'[ContextualInsightsPanel] Failed to load insights:',
				error
			);
		} finally {
			setIsLoading(false);
		}
	};

	const getInsightIcon = (type: string) => {
		switch (type) {
			case 'warning':
				return 'warning';
			case 'info':
				return 'information-circle';
			case 'suggestion':
				return 'bulb';
			case 'success':
				return 'checkmark-circle';
			case 'critical':
				return 'alert-circle';
			default:
				return 'sparkles';
		}
	};

	const getInsightColor = (type: string) => {
		switch (type) {
			case 'warning':
				return '#f59e0b';
			case 'info':
				return '#3b82f6';
			case 'suggestion':
				return '#10b981';
			case 'success':
				return '#10b981';
			case 'critical':
				return '#ef4444';
			default:
				return '#6b7280';
		}
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'critical':
				return '#ef4444';
			case 'high':
				return '#f59e0b';
			case 'medium':
				return '#3b82f6';
			case 'low':
				return '#10b981';
			default:
				return '#6b7280';
		}
	};

	const renderInsight = ({ item: insight }: { item: Insight }) => (
		<TouchableOpacity
			style={[
				styles.insightCard,
				{ borderLeftColor: getInsightColor(insight.type) },
			]}
			onPress={() => onInsightPress?.(insight)}
			activeOpacity={0.7}
		>
			<View style={styles.insightHeader}>
				<View style={styles.insightIconContainer}>
					<Ionicons
						name={getInsightIcon(insight.type) as any}
						size={16}
						color={getInsightColor(insight.type)}
					/>
				</View>
				<View style={styles.insightContent}>
					<Text style={styles.insightTitle}>{insight.title}</Text>
					<Text style={styles.insightMessage} numberOfLines={2}>
						{insight.message}
					</Text>
				</View>
				<View style={styles.insightActions}>
					{insight.value && (
						<Text
							style={[
								styles.insightValue,
								{ color: getInsightColor(insight.type) },
							]}
						>
							{typeof insight.value === 'number' && insight.value > 0
								? '+'
								: ''}
							{insight.value.toFixed(0)}%
						</Text>
					)}
					{onAskAboutInsight && (
						<TouchableOpacity
							style={styles.askButton}
							onPress={() => onAskAboutInsight(insight)}
						>
							<Ionicons name="chatbubble-outline" size={16} color="#3b82f6" />
						</TouchableOpacity>
					)}
				</View>
			</View>
			{insight.action && insight.actionLabel && (
				<View style={styles.insightFooter}>
					<TouchableOpacity
						style={[
							styles.actionButton,
							{ backgroundColor: getInsightColor(insight.type) },
						]}
						onPress={() => onInsightPress?.(insight)}
					>
						<Text style={styles.actionButtonText}>{insight.actionLabel}</Text>
					</TouchableOpacity>
				</View>
			)}
		</TouchableOpacity>
	);

	if (isLoading) {
		return (
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>Financial Insights</Text>
				</View>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="small" color="#3b82f6" />
					<Text style={styles.loadingText}>Loading insights...</Text>
				</View>
			</View>
		);
	}

	if (insights.length === 0) {
		return null;
	}

	const visibleInsights = isExpanded ? insights : insights.slice(0, 2);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>
					{conversationContext ? 'Relevant Insights' : 'Financial Insights'}
				</Text>
				{insights.length > 2 && (
					<TouchableOpacity
						style={styles.expandButton}
						onPress={() => setIsExpanded(!isExpanded)}
					>
						<Text style={styles.expandButtonText}>
							{isExpanded ? 'Show Less' : `Show All (${insights.length})`}
						</Text>
						<Ionicons
							name={isExpanded ? 'chevron-up' : 'chevron-down'}
							size={16}
							color="#3b82f6"
						/>
					</TouchableOpacity>
				)}
			</View>
			<FlatList
				data={visibleInsights}
				renderItem={renderInsight}
				keyExtractor={(item) => item.id}
				scrollEnabled={false}
				ItemSeparatorComponent={() => <View style={styles.separator} />}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		marginVertical: 8,
		padding: 16,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1e293b',
	},
	expandButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 4,
		paddingHorizontal: 8,
	},
	expandButtonText: {
		fontSize: 14,
		color: '#3b82f6',
		fontWeight: '500',
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
		gap: 8,
	},
	loadingText: {
		fontSize: 14,
		color: '#6b7280',
	},
	insightCard: {
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 12,
		borderLeftWidth: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	insightHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
	},
	insightIconContainer: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#f1f5f9',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 2,
	},
	insightContent: {
		flex: 1,
	},
	insightTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
		marginBottom: 4,
	},
	insightMessage: {
		fontSize: 13,
		color: '#64748b',
		lineHeight: 18,
	},
	insightActions: {
		alignItems: 'flex-end',
		gap: 8,
	},
	insightValue: {
		fontSize: 12,
		fontWeight: '600',
	},
	askButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#eff6ff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	insightFooter: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
	},
	actionButton: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 6,
		alignSelf: 'flex-start',
	},
	actionButtonText: {
		color: '#ffffff',
		fontSize: 13,
		fontWeight: '600',
	},
	separator: {
		height: 8,
	},
});
