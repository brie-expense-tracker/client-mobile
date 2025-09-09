import React, { useState, useEffect, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	RefreshControl,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CostWarningChip from './CostWarningChip';
import { logChat } from '../../../services/feature/analyticsService';

interface CostOptimizationData {
	totalSavings: number;
	cacheHitRate: number;
	compressionRatio: number;
	proUsage: number;
	recommendations: string[];
	proRemaining: number;
	warnings: {
		type: string;
		message: string;
		severity: 'low' | 'medium' | 'high';
	}[];
	// Enhanced metrics
	monthlySpend: number;
	projectedSpend: number;
	tokenUsage: {
		total: number;
		mini: number;
		std: number;
		pro: number;
	};
	costBreakdown: {
		mini: number;
		std: number;
		pro: number;
	};
	trends: {
		daily: number[];
		weekly: number[];
		monthly: number[];
	};
	optimizationScore: number;
	lastUpdated: string;
}

export default function CostOptimizationDashboard() {
	const [data, setData] = useState<CostOptimizationData | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

	// Cost optimization service
	const fetchCostOptimizationData = async (): Promise<CostOptimizationData> => {
		try {
			// In a real implementation, this would fetch from your API
			// For now, we'll simulate API calls with realistic data

			// Simulate API delay
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Generate realistic mock data based on current date
			const now = new Date();
			const currentDay = now.getDate();

			// Calculate trends based on current date
			const dailyTrends = Array.from({ length: 7 }, (_, i) => {
				const day = currentDay - 6 + i;
				return Math.max(
					0,
					2.5 + Math.sin(day * 0.5) * 1.5 + Math.random() * 0.5
				);
			});

			const weeklyTrends = Array.from({ length: 4 }, (_, i) => {
				return 15 + Math.sin(i * 0.8) * 5 + Math.random() * 2;
			});

			const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
				return 60 + Math.sin(i * 0.5) * 20 + Math.random() * 10;
			});

			// Calculate optimization score based on various factors
			const cacheScore = Math.min(100, 78.5 + Math.random() * 10);
			const compressionScore = Math.min(100, 85 + Math.random() * 10);
			const proUsageScore = Math.max(0, 100 - (8 / 20) * 100);
			const optimizationScore = Math.round(
				(cacheScore + compressionScore + proUsageScore) / 3
			);

			const mockData: CostOptimizationData = {
				totalSavings: 12.45 + Math.random() * 5,
				cacheHitRate: cacheScore,
				compressionRatio: 0.85 + Math.random() * 0.1,
				proUsage: 8,
				proRemaining: 12,
				monthlySpend: 45.67 + Math.random() * 10,
				projectedSpend: 52.3 + Math.random() * 8,
				tokenUsage: {
					total: 125000 + Math.floor(Math.random() * 25000),
					mini: 80000 + Math.floor(Math.random() * 15000),
					std: 35000 + Math.floor(Math.random() * 10000),
					pro: 10000 + Math.floor(Math.random() * 5000),
				},
				costBreakdown: {
					mini: 0.16 + Math.random() * 0.05,
					std: 0.07 + Math.random() * 0.02,
					pro: 0.3 + Math.random() * 0.1,
				},
				trends: {
					daily: dailyTrends,
					weekly: weeklyTrends,
					monthly: monthlyTrends,
				},
				optimizationScore,
				lastUpdated: now.toISOString(),
				recommendations: [
					'Use standard model for routine questions to save pro allotment',
					'Enable smart routing to save more on AI costs',
					'More cache entries will improve response speed and reduce costs',
					'Consider using mini model for simple queries to reduce costs by 40%',
					'Enable compression for large contexts to save on token usage',
				],
				warnings: [
					{
						type: 'pro_limit_near',
						message: `Pro analyses left: 12. You've saved $${(
							12.45 +
							Math.random() * 5
						).toFixed(2)} with Smart Mode.`,
						severity: 'medium',
					},
					...(optimizationScore < 70
						? [
								{
									type: 'optimization_low',
									message:
										'Your optimization score is below 70%. Consider implementing more cost-saving strategies.',
									severity: 'high' as const,
								},
						  ]
						: []),
				],
			};

			return mockData;
		} catch (error) {
			console.error('Error fetching cost optimization data:', error);
			throw new Error('Failed to load cost optimization data');
		}
	};

	const loadData = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const costData = await fetchCostOptimizationData();
			setData(costData);
			setLastRefresh(new Date());

			// Log analytics
			logChat({
				intent: 'COST_OPTIMIZATION_VIEW',
				usedGrounding: false,
				model: 'local',
				tokensIn: 0,
				tokensOut: 0,
				hadActions: false,
				hadCard: true,
				fallback: false,
				responseTimeMs: 0,
				messageLength: 0,
				hasFinancialData: true,
			});
		} catch (error) {
			console.error('Error loading cost optimization data:', error);
			setError(error instanceof Error ? error.message : 'Failed to load data');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const onRefresh = async () => {
		setRefreshing(true);
		await loadData();
		setRefreshing(false);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#3b82f6" />
				<Text style={styles.loadingText}>Loading optimization data...</Text>
				{lastRefresh && (
					<Text style={styles.lastRefreshText}>
						Last updated: {lastRefresh.toLocaleTimeString()}
					</Text>
				)}
			</View>
		);
	}

	if (error || !data) {
		return (
			<View style={styles.errorContainer}>
				<Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
				<Text style={styles.errorText}>
					{error || 'Unable to load optimization data'}
				</Text>
				<TouchableOpacity style={styles.retryButton} onPress={loadData}>
					<Ionicons name="refresh" size={16} color="white" />
					<Text style={styles.retryButtonText}>Retry</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<ScrollView
			style={styles.container}
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
			}
		>
			{/* Header */}
			<View style={styles.header}>
				<Ionicons name="trending-down" size={24} color="#10b981" />
				<Text style={styles.headerTitle}>Cost Optimization</Text>
			</View>

			{/* Savings Summary */}
			<View style={styles.savingsCard}>
				<View style={styles.savingsHeader}>
					<Ionicons name="wallet" size={20} color="#10b981" />
					<Text style={styles.savingsTitle}>Total Savings This Month</Text>
				</View>
				<Text style={styles.savingsAmount}>
					${data.totalSavings.toFixed(2)}
				</Text>
				<Text style={styles.savingsSubtext}>
					Saved by using Smart Mode instead of Pro for every request
				</Text>
			</View>

			{/* Optimization Score */}
			<View style={styles.scoreCard}>
				<View style={styles.scoreHeader}>
					<Ionicons name="trophy" size={20} color="#f59e0b" />
					<Text style={styles.scoreTitle}>Optimization Score</Text>
				</View>
				<View style={styles.scoreContainer}>
					<Text style={styles.scoreValue}>{data.optimizationScore}</Text>
					<Text style={styles.scoreOutOf}>/100</Text>
				</View>
				<View style={styles.scoreBar}>
					<View
						style={[styles.scoreFill, { width: `${data.optimizationScore}%` }]}
					/>
				</View>
				<Text style={styles.scoreDescription}>
					{data.optimizationScore >= 80
						? 'Excellent optimization!'
						: data.optimizationScore >= 60
						? 'Good optimization, room for improvement'
						: 'Consider implementing more cost-saving strategies'}
				</Text>
			</View>

			{/* Metrics Grid */}
			<View style={styles.metricsGrid}>
				<View style={styles.metricCard}>
					<Text style={styles.metricValue}>
						{data.cacheHitRate.toFixed(1)}%
					</Text>
					<Text style={styles.metricLabel}>Cache Hit Rate</Text>
					<Text style={styles.metricDescription}>
						Responses served from cache
					</Text>
				</View>

				<View style={styles.metricCard}>
					<Text style={styles.metricValue}>
						{(data.compressionRatio * 100).toFixed(0)}%
					</Text>
					<Text style={styles.metricLabel}>Memory Compression</Text>
					<Text style={styles.metricDescription}>Context size reduction</Text>
				</View>

				<View style={styles.metricCard}>
					<Text style={styles.metricValue}>{data.proUsage}</Text>
					<Text style={styles.metricLabel}>Pro Models Used</Text>
					<Text style={styles.metricDescription}>Out of 20 monthly limit</Text>
				</View>

				<View style={styles.metricCard}>
					<Text style={styles.metricValue}>{data.proRemaining}</Text>
					<Text style={styles.metricLabel}>Pro Models Left</Text>
					<Text style={styles.metricDescription}>
						This month&apos;s remaining
					</Text>
				</View>
			</View>

			{/* Enhanced Metrics */}
			<View style={styles.enhancedMetricsSection}>
				<Text style={styles.sectionTitle}>Spending Overview</Text>

				<View style={styles.spendingCard}>
					<View style={styles.spendingRow}>
						<Text style={styles.spendingLabel}>Monthly Spend</Text>
						<Text style={styles.spendingValue}>
							${data.monthlySpend.toFixed(2)}
						</Text>
					</View>
					<View style={styles.spendingRow}>
						<Text style={styles.spendingLabel}>Projected Spend</Text>
						<Text
							style={[
								styles.spendingValue,
								{
									color:
										data.projectedSpend > data.monthlySpend
											? '#ef4444'
											: '#10b981',
								},
							]}
						>
							${data.projectedSpend.toFixed(2)}
						</Text>
					</View>
					<View style={styles.spendingRow}>
						<Text style={styles.spendingLabel}>Total Savings</Text>
						<Text style={[styles.spendingValue, { color: '#10b981' }]}>
							${data.totalSavings.toFixed(2)}
						</Text>
					</View>
				</View>

				<View style={styles.tokenUsageCard}>
					<Text style={styles.cardTitle}>Token Usage Breakdown</Text>
					<View style={styles.tokenBreakdown}>
						<View style={styles.tokenRow}>
							<View
								style={[styles.tokenIndicator, { backgroundColor: '#10b981' }]}
							/>
							<Text style={styles.tokenLabel}>Mini Model</Text>
							<Text style={styles.tokenValue}>
								{data.tokenUsage.mini.toLocaleString()}
							</Text>
							<Text style={styles.tokenCost}>
								${data.costBreakdown.mini.toFixed(2)}
							</Text>
						</View>
						<View style={styles.tokenRow}>
							<View
								style={[styles.tokenIndicator, { backgroundColor: '#3b82f6' }]}
							/>
							<Text style={styles.tokenLabel}>Standard Model</Text>
							<Text style={styles.tokenValue}>
								{data.tokenUsage.std.toLocaleString()}
							</Text>
							<Text style={styles.tokenCost}>
								${data.costBreakdown.std.toFixed(2)}
							</Text>
						</View>
						<View style={styles.tokenRow}>
							<View
								style={[styles.tokenIndicator, { backgroundColor: '#8b5cf6' }]}
							/>
							<Text style={styles.tokenLabel}>Pro Model</Text>
							<Text style={styles.tokenValue}>
								{data.tokenUsage.pro.toLocaleString()}
							</Text>
							<Text style={styles.tokenCost}>
								${data.costBreakdown.pro.toFixed(2)}
							</Text>
						</View>
					</View>
				</View>
			</View>

			{/* Warnings */}
			{data.warnings.length > 0 && (
				<View style={styles.warningsSection}>
					<Text style={styles.sectionTitle}>Warnings & Alerts</Text>
					{data.warnings.map((warning, index) => (
						<CostWarningChip
							key={index}
							type={warning.type as any}
							message={warning.message}
							severity={warning.severity}
							onDismiss={() => {
								// TODO: Dismiss warning
								console.log('Dismiss warning:', index);
							}}
						/>
					))}
				</View>
			)}

			{/* Recommendations */}
			<View style={styles.recommendationsSection}>
				<Text style={styles.sectionTitle}>Optimization Tips</Text>
				{data.recommendations.map((recommendation, index) => (
					<View key={index} style={styles.recommendationItem}>
						<Ionicons name="bulb-outline" size={16} color="#f59e0b" />
						<Text style={styles.recommendationText}>{recommendation}</Text>
					</View>
				))}
			</View>

			{/* Pro Allotment Progress */}
			<View style={styles.progressSection}>
				<Text style={styles.sectionTitle}>Pro Model Usage</Text>
				<View style={styles.progressBar}>
					<View
						style={[
							styles.progressFill,
							{ width: `${(data.proUsage / 20) * 100}%` },
						]}
					/>
				</View>
				<View style={styles.progressLabels}>
					<Text style={styles.progressLabel}>Used: {data.proUsage}</Text>
					<Text style={styles.progressLabel}>
						Remaining: {data.proRemaining}
					</Text>
				</View>
			</View>

			{/* Actions */}
			<View style={styles.actionsSection}>
				<TouchableOpacity
					style={styles.actionButton}
					onPress={() => {
						logChat({
							intent: 'COST_OPTIMIZATION_SETTINGS',
							usedGrounding: false,
							model: 'local',
							tokensIn: 0,
							tokensOut: 0,
							hadActions: true,
							hadCard: false,
							fallback: false,
							responseTimeMs: 0,
							messageLength: 0,
							hasFinancialData: true,
						});
						Alert.alert('Settings', 'Optimization settings would open here');
					}}
				>
					<Ionicons name="settings-outline" size={20} color="#3b82f6" />
					<Text style={styles.actionButtonText}>Optimization Settings</Text>
					<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.actionButton}
					onPress={() => {
						logChat({
							intent: 'COST_OPTIMIZATION_ANALYTICS',
							usedGrounding: false,
							model: 'local',
							tokensIn: 0,
							tokensOut: 0,
							hadActions: true,
							hadCard: false,
							fallback: false,
							responseTimeMs: 0,
							messageLength: 0,
							hasFinancialData: true,
						});
						Alert.alert('Analytics', 'Detailed analytics would open here');
					}}
				>
					<Ionicons name="analytics-outline" size={20} color="#3b82f6" />
					<Text style={styles.actionButtonText}>Detailed Analytics</Text>
					<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.actionButton}
					onPress={() => {
						logChat({
							intent: 'COST_OPTIMIZATION_HELP',
							usedGrounding: false,
							model: 'local',
							tokensIn: 0,
							tokensOut: 0,
							hadActions: true,
							hadCard: false,
							fallback: false,
							responseTimeMs: 0,
							messageLength: 0,
							hasFinancialData: true,
						});
						Alert.alert(
							'How It Works',
							'Cost optimization help would open here'
						);
					}}
				>
					<Ionicons name="help-circle-outline" size={20} color="#3b82f6" />
					<Text style={styles.actionButtonText}>How It Works</Text>
					<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.actionButton}
					onPress={() => {
						logChat({
							intent: 'COST_OPTIMIZATION_EXPORT',
							usedGrounding: false,
							model: 'local',
							tokensIn: 0,
							tokensOut: 0,
							hadActions: true,
							hadCard: false,
							fallback: false,
							responseTimeMs: 0,
							messageLength: 0,
							hasFinancialData: true,
						});
						Alert.alert('Export Data', 'Cost data export would start here');
					}}
				>
					<Ionicons name="download-outline" size={20} color="#3b82f6" />
					<Text style={styles.actionButtonText}>Export Data</Text>
					<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
	},
	loadingText: {
		fontSize: 16,
		color: '#6b7280',
		marginTop: 12,
	},
	lastRefreshText: {
		fontSize: 12,
		color: '#9ca3af',
		marginTop: 8,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
	},
	errorText: {
		fontSize: 16,
		color: '#ef4444',
		marginTop: 12,
		textAlign: 'center',
	},
	retryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#3b82f6',
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 8,
		marginTop: 16,
	},
	retryButtonText: {
		color: 'white',
		fontWeight: '600',
		marginLeft: 8,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 20,
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#111827',
		marginLeft: 12,
	},
	savingsCard: {
		backgroundColor: '#ffffff',
		margin: 20,
		padding: 20,
		borderRadius: 12,
		borderLeftWidth: 4,
		borderLeftColor: '#10b981',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	savingsHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	savingsTitle: {
		fontSize: 16,
		fontWeight: '500',
		color: '#374151',
		marginLeft: 8,
	},
	savingsAmount: {
		fontSize: 32,
		fontWeight: 'bold',
		color: '#10b981',
		marginBottom: 8,
	},
	savingsSubtext: {
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
	},
	metricsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: 20,
		marginBottom: 20,
	},
	metricCard: {
		width: '48%',
		backgroundColor: '#ffffff',
		padding: 16,
		borderRadius: 8,
		marginBottom: 12,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	metricValue: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#111827',
		marginBottom: 4,
	},
	metricLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#374151',
		marginBottom: 4,
		textAlign: 'center',
	},
	metricDescription: {
		fontSize: 12,
		color: '#6b7280',
		textAlign: 'center',
		lineHeight: 16,
	},
	warningsSection: {
		marginHorizontal: 20,
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#111827',
		marginBottom: 16,
	},
	recommendationsSection: {
		backgroundColor: '#ffffff',
		marginHorizontal: 20,
		marginBottom: 20,
		padding: 20,
		borderRadius: 12,
	},
	recommendationItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 16,
	},
	recommendationText: {
		flex: 1,
		fontSize: 14,
		color: '#374151',
		lineHeight: 20,
		marginLeft: 12,
	},
	progressSection: {
		backgroundColor: '#ffffff',
		marginHorizontal: 20,
		marginBottom: 20,
		padding: 20,
		borderRadius: 12,
	},
	progressBar: {
		height: 8,
		backgroundColor: '#e5e7eb',
		borderRadius: 4,
		marginBottom: 12,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		backgroundColor: '#3b82f6',
		borderRadius: 4,
	},
	progressLabels: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	progressLabel: {
		fontSize: 14,
		color: '#6b7280',
	},
	actionsSection: {
		marginHorizontal: 20,
		marginBottom: 20,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 8,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	actionButtonText: {
		flex: 1,
		fontSize: 16,
		color: '#374151',
		marginLeft: 12,
	},

	// Optimization Score
	scoreCard: {
		backgroundColor: '#ffffff',
		margin: 20,
		padding: 20,
		borderRadius: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	scoreHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	scoreTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#111827',
		marginLeft: 8,
	},
	scoreContainer: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginBottom: 12,
	},
	scoreValue: {
		fontSize: 36,
		fontWeight: 'bold',
		color: '#f59e0b',
	},
	scoreOutOf: {
		fontSize: 18,
		color: '#6b7280',
		marginLeft: 4,
	},
	scoreBar: {
		height: 8,
		backgroundColor: '#e5e7eb',
		borderRadius: 4,
		marginBottom: 12,
		overflow: 'hidden',
	},
	scoreFill: {
		height: '100%',
		backgroundColor: '#f59e0b',
		borderRadius: 4,
	},
	scoreDescription: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
	},

	// Enhanced Metrics
	enhancedMetricsSection: {
		marginHorizontal: 20,
		marginBottom: 20,
	},
	spendingCard: {
		backgroundColor: '#ffffff',
		padding: 20,
		borderRadius: 12,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	spendingRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	spendingLabel: {
		fontSize: 14,
		color: '#6b7280',
	},
	spendingValue: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
	},
	tokenUsageCard: {
		backgroundColor: '#ffffff',
		padding: 20,
		borderRadius: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
		marginBottom: 16,
	},
	tokenBreakdown: {
		gap: 12,
	},
	tokenRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
	},
	tokenIndicator: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginRight: 12,
	},
	tokenLabel: {
		flex: 1,
		fontSize: 14,
		color: '#374151',
	},
	tokenValue: {
		fontSize: 14,
		fontWeight: '500',
		color: '#111827',
		marginRight: 12,
	},
	tokenCost: {
		fontSize: 14,
		fontWeight: '600',
		color: '#10b981',
		minWidth: 50,
		textAlign: 'right',
	},
});
