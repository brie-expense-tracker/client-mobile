// app/(tabs)/insights/[period].tsx

import React, { useEffect, useState } from 'react';
import {
	SafeAreaView,
	Text,
	ActivityIndicator,
	StyleSheet,
	ScrollView,
	Alert,
	Pressable,
	View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
	InsightsService,
	AIInsight,
} from '../../../src/services/insightsService';

export default function InsightDetail() {
	const { period } = useLocalSearchParams<{
		period: 'daily' | 'weekly' | 'monthly';
	}>();
	const [insights, setInsights] = useState<AIInsight[]>([]);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		async function loadInsights() {
			try {
				// Try to get existing insights for this period
				const response = await InsightsService.getInsights(period);

				if (
					response.success &&
					response.data &&
					Array.isArray(response.data) &&
					response.data.length > 0
				) {
					setInsights(response.data);
				} else {
					// Generate new insights if none exist
					const generateResponse = await InsightsService.generateInsights(
						period
					);
					if (
						generateResponse.success &&
						generateResponse.data &&
						Array.isArray(generateResponse.data)
					) {
						setInsights(generateResponse.data);
					} else {
						throw new Error('Failed to generate insights');
					}
				}
			} catch (err) {
				console.warn('Failed to load insights:', err);
				Alert.alert('Error', 'Failed to load insights. Please try again.');
			} finally {
				setLoading(false);
			}
		}

		loadInsights();
	}, [period]);

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'high':
				return '#FF6B6B';
			case 'medium':
				return '#FFA726';
			case 'low':
				return '#66BB6A';
			default:
				return '#9E9E9E';
		}
	};

	const getInsightTypeColor = (type: string) => {
		switch (type) {
			case 'budgeting':
				return '#42A5F5';
			case 'savings':
				return '#66BB6A';
			case 'spending':
				return '#FF6B6B';
			case 'income':
				return '#26A69A';
			default:
				return '#9E9E9E';
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.center}>
				<ActivityIndicator size="large" />
			</SafeAreaView>
		);
	}

	return (
		<ScrollView
			automaticallyAdjustContentInsets={true}
			showsVerticalScrollIndicator={false}
			contentContainerStyle={styles.container}
		>
			{insights.length === 0 ? (
				<View style={styles.emptyState}>
					<Text style={styles.emptyText}>
						No insights available for this period.
					</Text>
					<Text style={styles.emptySubtext}>
						Try adding some transactions to generate insights.
					</Text>
				</View>
			) : (
				insights.map((insight) => (
					<View key={insight._id} style={styles.insightCard}>
						<View style={styles.insightHeader}>
							<View style={styles.priorityBadge}>
								<View
									style={[
										styles.priorityDot,
										{ backgroundColor: getPriorityColor(insight.priority) },
									]}
								/>
								<Text style={styles.priorityText}>
									{insight.priority.toUpperCase()}
								</Text>
							</View>
							<View style={styles.typeBadge}>
								<Text
									style={[
										styles.typeText,
										{ color: getInsightTypeColor(insight.insightType) },
									]}
								>
									{insight.insightType.toUpperCase()}
								</Text>
							</View>
						</View>

						<Text style={styles.insightTitle}>{insight.title}</Text>
						<Text style={styles.insightMessage}>{insight.message}</Text>

						<Text style={styles.detailedTitle}>Detailed Analysis</Text>
						<Text style={styles.detailedText}>
							{insight.detailedExplanation}
						</Text>

						{insight.isActionable && insight.actionItems.length > 0 && (
							<View style={styles.actionSection}>
								<Text style={styles.actionTitle}>Recommended Actions</Text>
								{insight.actionItems.map((action, index) => (
									<View key={index} style={styles.actionItem}>
										<Text style={styles.actionNumber}>{index + 1}</Text>
										<View style={styles.actionContent}>
											<Text style={styles.actionItemTitle}>{action.title}</Text>
											<Text style={styles.actionItemDescription}>
												{action.description}
											</Text>
										</View>
									</View>
								))}
							</View>
						)}

						{insight.metadata && (
							<View style={styles.metadataSection}>
								<Text style={styles.metadataTitle}>Financial Summary</Text>
								<View style={styles.metadataRow}>
									<Text style={styles.metadataLabel}>Income:</Text>
									<Text style={styles.metadataValue}>
										${insight.metadata.totalIncome.toFixed(2)}
									</Text>
								</View>
								<View style={styles.metadataRow}>
									<Text style={styles.metadataLabel}>Expenses:</Text>
									<Text style={styles.metadataValue}>
										${insight.metadata.totalExpenses.toFixed(2)}
									</Text>
								</View>
								<View style={styles.metadataRow}>
									<Text style={styles.metadataLabel}>Net:</Text>
									<Text
										style={[
											styles.metadataValue,
											{
												color:
													insight.metadata.netIncome >= 0
														? '#66BB6A'
														: '#FF6B6B',
											},
										]}
									>
										${insight.metadata.netIncome.toFixed(2)}
									</Text>
								</View>
							</View>
						)}
					</View>
				))
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { padding: 16, flex: 1, backgroundColor: '#ffffff' },
	header: {
		fontSize: 28,
		fontWeight: '600',
		marginBottom: 20,
		color: '#333',
	},
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	emptyState: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		fontSize: 18,
		color: '#666',
		marginBottom: 8,
	},
	emptySubtext: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
	},
	insightCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	insightHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	priorityBadge: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	priorityDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 6,
	},
	priorityText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#666',
	},
	typeBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		backgroundColor: '#f5f5f5',
	},
	typeText: {
		fontSize: 10,
		fontWeight: '600',
	},
	insightTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	insightMessage: {
		fontSize: 16,
		color: '#666',
		lineHeight: 22,
		marginBottom: 16,
	},
	detailedTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	detailedText: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
		marginBottom: 16,
	},
	actionSection: {
		marginBottom: 16,
	},
	actionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 12,
	},
	actionItem: {
		flexDirection: 'row',
		marginBottom: 12,
	},
	actionNumber: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#42A5F5',
		color: '#fff',
		textAlign: 'center',
		lineHeight: 24,
		fontSize: 12,
		fontWeight: '600',
		marginRight: 12,
	},
	actionContent: {
		flex: 1,
	},
	actionItemTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginBottom: 4,
	},
	actionItemDescription: {
		fontSize: 13,
		color: '#666',
		lineHeight: 18,
	},
	metadataSection: {
		backgroundColor: '#f8f9fa',
		borderRadius: 8,
		padding: 12,
	},
	metadataTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	metadataRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	metadataLabel: {
		fontSize: 13,
		color: '#666',
	},
	metadataValue: {
		fontSize: 13,
		fontWeight: '600',
		color: '#333',
	},
});
