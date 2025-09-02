import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CostWarningChip from './CostWarningChip';

interface CostOptimizationData {
	totalSavings: number;
	cacheHitRate: number;
	compressionRatio: number;
	proUsage: number;
	recommendations: string[];
	proRemaining: number;
	warnings: Array<{
		type: string;
		message: string;
		severity: 'low' | 'medium' | 'high';
	}>;
}

export default function CostOptimizationDashboard() {
	const [data, setData] = useState<CostOptimizationData | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		try {
			setLoading(true);
			// TODO: Fetch from API
			// Mock data for now
			const mockData: CostOptimizationData = {
				totalSavings: 12.45,
				cacheHitRate: 78.5,
				compressionRatio: 0.85,
				proUsage: 8,
				proRemaining: 12,
				recommendations: [
					'Use standard model for routine questions to save pro allotment',
					'Enable smart routing to save more on AI costs',
					'More cache entries will improve response speed and reduce costs',
				],
				warnings: [
					{
						type: 'pro_limit_near',
						message:
							"Pro analyses left: 12. You've saved $12.45 with Smart Mode.",
						severity: 'medium',
					},
				],
			};
			setData(mockData);
		} catch (error) {
			console.error('Error loading cost optimization data:', error);
		} finally {
			setLoading(false);
		}
	};

	const onRefresh = async () => {
		setRefreshing(true);
		await loadData();
		setRefreshing(false);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<Text style={styles.loadingText}>Loading optimization data...</Text>
			</View>
		);
	}

	if (!data) {
		return (
			<View style={styles.errorContainer}>
				<Text style={styles.errorText}>Unable to load optimization data</Text>
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
				<TouchableOpacity style={styles.actionButton}>
					<Ionicons name="settings-outline" size={20} color="#3b82f6" />
					<Text style={styles.actionButtonText}>Optimization Settings</Text>
					<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
				</TouchableOpacity>

				<TouchableOpacity style={styles.actionButton}>
					<Ionicons name="analytics-outline" size={20} color="#3b82f6" />
					<Text style={styles.actionButtonText}>Detailed Analytics</Text>
					<Ionicons name="chevron-forward" size={16} color="#9ca3af" />
				</TouchableOpacity>

				<TouchableOpacity style={styles.actionButton}>
					<Ionicons name="help-circle-outline" size={20} color="#3b82f6" />
					<Text style={styles.actionButtonText}>How It Works</Text>
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
});
