/**
 * Fallback Card Component
 *
 * Displays cached financial data when AI services are unavailable.
 * Provides a graceful fallback experience with spend plans, budgets, and recommendations.
 */

import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
	CachedSpendPlan,
	CachedBudget,
	CachedGoal,
} from '@/src/services/resilience/fallbackService';

interface FallbackCardProps {
	spendPlan?: CachedSpendPlan | null;
	budgets?: CachedBudget[];
	goals?: CachedGoal[];
	lastSync?: Date | null;
	onRetry?: () => void;
	onRefresh?: () => void;
	isRetrying?: boolean;
	showWorkButton?: boolean;
	onShowWork?: () => void;
}

export default function FallbackCard({
	spendPlan,
	budgets = [],
	goals = [],
	lastSync,
	onRetry,
	onRefresh,
	isRetrying = false,
	showWorkButton = false,
	onShowWork,
}: FallbackCardProps) {
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount);
	};

	const formatPercentage = (value: number) => {
		return `${(value * 100).toFixed(1)}%`;
	};

	const getUtilizationColor = (utilization: number) => {
		if (utilization > 1) return '#ef4444'; // Red for over budget
		if (utilization > 0.8) return '#f59e0b'; // Orange for close to budget
		return '#10b981'; // Green for under budget
	};

	const getUtilizationIcon = (utilization: number) => {
		if (utilization > 1) return 'warning';
		if (utilization > 0.8) return 'alert-circle';
		return 'checkmark-circle';
	};

	const formatLastSync = (date: Date | null) => {
		if (!date) return 'Never synced';

		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${diffDays}d ago`;
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Ionicons name="cloud-offline" size={20} color="#6b7280" />
					<Text style={styles.headerTitle}>Offline Mode</Text>
				</View>
				<View style={styles.headerRight}>
					{lastSync && (
						<Text style={styles.lastSyncText}>
							Last sync: {formatLastSync(lastSync)}
						</Text>
					)}
				</View>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{spendPlan && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>💰 Spend Plan</Text>
						<View style={styles.summaryCard}>
							<View style={styles.summaryRow}>
								<Text style={styles.summaryLabel}>Monthly Income</Text>
								<Text style={styles.summaryValue}>
									{formatCurrency(spendPlan.plan.monthlyIncome)}
								</Text>
							</View>
							<View style={styles.summaryRow}>
								<Text style={styles.summaryLabel}>Total Budget</Text>
								<Text style={styles.summaryValue}>
									{formatCurrency(spendPlan.plan.totalBudget)}
								</Text>
							</View>
							<View style={styles.summaryRow}>
								<Text style={styles.summaryLabel}>Total Spent</Text>
								<Text style={styles.summaryValue}>
									{formatCurrency(spendPlan.plan.totalSpent)}
								</Text>
							</View>
							<View style={[styles.summaryRow, styles.summaryRowLast]}>
								<Text style={styles.summaryLabel}>Remaining</Text>
								<Text
									style={[
										styles.summaryValue,
										{
											color:
												spendPlan.plan.remaining >= 0 ? '#10b981' : '#ef4444',
										},
									]}
								>
									{formatCurrency(spendPlan.plan.remaining)}
								</Text>
							</View>
						</View>
					</View>
				)}

				{budgets.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>📊 Budgets</Text>
						{budgets.map((budget, index) => (
							<View key={budget.id || index} style={styles.budgetCard}>
								<View style={styles.budgetHeader}>
									<Text style={styles.budgetName}>{budget.name}</Text>
									<View style={styles.budgetUtilization}>
										<Ionicons
											name={getUtilizationIcon(budget.utilization)}
											size={16}
											color={getUtilizationColor(budget.utilization)}
										/>
										<Text
											style={[
												styles.utilizationText,
												{ color: getUtilizationColor(budget.utilization) },
											]}
										>
											{formatPercentage(budget.utilization)}
										</Text>
									</View>
								</View>
								<View style={styles.budgetBar}>
									<View
										style={[
											styles.budgetBarFill,
											{
												width: `${Math.min(budget.utilization * 100, 100)}%`,
												backgroundColor: getUtilizationColor(
													budget.utilization
												),
											},
										]}
									/>
								</View>
								<View style={styles.budgetDetails}>
									<Text style={styles.budgetSpent}>
										{formatCurrency(budget.spent)}
									</Text>
									<Text style={styles.budgetTotal}>
										of {formatCurrency(budget.amount)}
									</Text>
									<Text style={styles.budgetRemaining}>
										{formatCurrency(budget.remaining)} left
									</Text>
								</View>
							</View>
						))}
					</View>
				)}

				{goals.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>🎯 Goals</Text>
						{goals.map((goal, index) => (
							<View key={goal.id || index} style={styles.goalCard}>
								<View style={styles.goalHeader}>
									<Text style={styles.goalName}>{goal.name}</Text>
									<Text style={styles.goalProgress}>
										{formatPercentage(goal.progress)}
									</Text>
								</View>
								<View style={styles.goalBar}>
									<View
										style={[
											styles.goalBarFill,
											{ width: `${goal.progress * 100}%` },
										]}
									/>
								</View>
								<View style={styles.goalDetails}>
									<Text style={styles.goalCurrent}>
										{formatCurrency(goal.current)}
									</Text>
									<Text style={styles.goalTarget}>
										of {formatCurrency(goal.target)}
									</Text>
									{goal.dueDate && (
										<Text style={styles.goalDueDate}>
											Due: {new Date(goal.dueDate).toLocaleDateString()}
										</Text>
									)}
								</View>
							</View>
						))}
					</View>
				)}

				{spendPlan?.plan.recommendations &&
					spendPlan.plan.recommendations.length > 0 && (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>💡 Recommendations</Text>
							<View style={styles.recommendationsCard}>
								{spendPlan.plan.recommendations.map((recommendation, index) => (
									<View key={index} style={styles.recommendationItem}>
										<Ionicons name="bulb" size={16} color="#f59e0b" />
										<Text style={styles.recommendationText}>
											{recommendation}
										</Text>
									</View>
								))}
							</View>
						</View>
					)}

				<View style={styles.footer}>
					<Text style={styles.footerText}>
						This data is from your last successful sync. Some features may be
						limited while offline.
					</Text>
				</View>
			</ScrollView>

			<View style={styles.actions}>
				{showWorkButton && onShowWork && (
					<TouchableOpacity style={styles.showWorkButton} onPress={onShowWork}>
						<Ionicons name="analytics" size={16} color="#374151" />
						<Text style={styles.showWorkButtonText}>Show Work</Text>
					</TouchableOpacity>
				)}

				<View style={styles.actionButtons}>
					{onRefresh && (
						<TouchableOpacity
							style={styles.actionButton}
							onPress={onRefresh}
							disabled={isRetrying}
						>
							<Ionicons name="refresh" size={16} color="#3b82f6" />
							<Text style={styles.actionButtonText}>Refresh</Text>
						</TouchableOpacity>
					)}

					{onRetry && (
						<TouchableOpacity
							style={[styles.actionButton, styles.retryButton]}
							onPress={onRetry}
							disabled={isRetrying}
						>
							{isRetrying ? (
								<ActivityIndicator size="small" color="#ffffff" />
							) : (
								<Ionicons name="refresh" size={16} color="#ffffff" />
							)}
							<Text style={[styles.actionButtonText, styles.retryButtonText]}>
								{isRetrying ? 'Retrying...' : 'Retry AI'}
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		margin: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
		marginLeft: 8,
	},
	headerRight: {
		flex: 1,
		alignItems: 'flex-end',
	},
	lastSyncText: {
		fontSize: 12,
		color: '#6b7280',
	},
	content: {
		maxHeight: 400,
	},
	section: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
		marginBottom: 12,
	},
	summaryCard: {
		backgroundColor: '#f9fafb',
		borderRadius: 8,
		padding: 12,
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 4,
	},
	summaryRowLast: {
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
		marginTop: 4,
		paddingTop: 8,
	},
	summaryLabel: {
		fontSize: 14,
		color: '#6b7280',
	},
	summaryValue: {
		fontSize: 14,
		fontWeight: '600',
		color: '#111827',
	},
	budgetCard: {
		backgroundColor: '#f9fafb',
		borderRadius: 8,
		padding: 12,
		marginBottom: 8,
	},
	budgetHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	budgetName: {
		fontSize: 14,
		fontWeight: '500',
		color: '#111827',
	},
	budgetUtilization: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	utilizationText: {
		fontSize: 12,
		fontWeight: '500',
		marginLeft: 4,
	},
	budgetBar: {
		height: 6,
		backgroundColor: '#e5e7eb',
		borderRadius: 3,
		marginBottom: 8,
	},
	budgetBarFill: {
		height: '100%',
		borderRadius: 3,
	},
	budgetDetails: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	budgetSpent: {
		fontSize: 12,
		fontWeight: '500',
		color: '#111827',
	},
	budgetTotal: {
		fontSize: 12,
		color: '#6b7280',
	},
	budgetRemaining: {
		fontSize: 12,
		color: '#10b981',
		fontWeight: '500',
	},
	goalCard: {
		backgroundColor: '#f9fafb',
		borderRadius: 8,
		padding: 12,
		marginBottom: 8,
	},
	goalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	goalName: {
		fontSize: 14,
		fontWeight: '500',
		color: '#111827',
	},
	goalProgress: {
		fontSize: 12,
		fontWeight: '500',
		color: '#3b82f6',
	},
	goalBar: {
		height: 6,
		backgroundColor: '#e5e7eb',
		borderRadius: 3,
		marginBottom: 8,
	},
	goalBarFill: {
		height: '100%',
		backgroundColor: '#3b82f6',
		borderRadius: 3,
	},
	goalDetails: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	goalCurrent: {
		fontSize: 12,
		fontWeight: '500',
		color: '#111827',
	},
	goalTarget: {
		fontSize: 12,
		color: '#6b7280',
	},
	goalDueDate: {
		fontSize: 12,
		color: '#f59e0b',
		fontWeight: '500',
	},
	recommendationsCard: {
		backgroundColor: '#f9fafb',
		borderRadius: 8,
		padding: 12,
	},
	recommendationItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 8,
	},
	recommendationText: {
		fontSize: 14,
		color: '#374151',
		marginLeft: 8,
		flex: 1,
		lineHeight: 20,
	},
	footer: {
		padding: 16,
		backgroundColor: '#f9fafb',
	},
	footerText: {
		fontSize: 12,
		color: '#6b7280',
		textAlign: 'center',
		lineHeight: 16,
	},
	actions: {
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: '#e5e7eb',
	},
	showWorkButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f3f4f6',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	showWorkButtonText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#374151',
		marginLeft: 8,
	},
	actionButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f3f4f6',
		borderRadius: 8,
		padding: 12,
		flex: 1,
		marginHorizontal: 4,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	retryButton: {
		backgroundColor: '#3b82f6',
		borderColor: '#3b82f6',
	},
	actionButtonText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#374151',
		marginLeft: 8,
	},
	retryButtonText: {
		color: '#ffffff',
	},
});
