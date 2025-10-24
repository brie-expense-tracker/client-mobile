// FactPack Display Component - Renders structured financial data directly in UI
// Prevents "why don't numbers match?" confusion by showing exact data

import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FactPack } from '../../../../src/services/assistant/factPack';

interface FactPackDisplayProps {
	factPack: FactPack;
	onRefresh?: () => void;
	showDetails?: boolean;
	compact?: boolean;
}

export default function FactPackDisplay({
	factPack,
	onRefresh,
	showDetails = false,
	compact = false,
}: FactPackDisplayProps) {
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	};

	const formatPercentage = (value: number) => {
		return `${value.toFixed(0)}%`;
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'over':
			case 'behind':
				return '#ef4444'; // Red
			case 'at_limit':
				return '#f59e0b'; // Yellow
			case 'under':
			case 'on_track':
			case 'ahead':
				return '#10b981'; // Green
			default:
				return '#6b7280'; // Gray
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'over':
			case 'behind':
				return 'warning';
			case 'at_limit':
				return 'alert-circle';
			case 'under':
			case 'on_track':
				return 'checkmark-circle';
			case 'ahead':
				return 'trending-up';
			default:
				return 'information-circle';
		}
	};

	if (compact) {
		return (
			<View style={styles.compactContainer}>
				<View style={styles.timeStamp}>
					<Ionicons name="time" size={12} color="#6b7280" />
					<Text style={styles.timeText}>{factPack.time_window.period}</Text>
				</View>

				<View style={styles.compactSummary}>
					<View style={styles.summaryItem}>
						<Text style={styles.compactSummaryLabel}>Budgets</Text>
						<Text style={styles.compactSummaryValue}>
							{factPack.budgets.filter((b) => b.status === 'over').length} over
						</Text>
					</View>

					<View style={styles.summaryItem}>
						<Text style={styles.compactSummaryLabel}>Goals</Text>
						<Text style={styles.compactSummaryValue}>
							{factPack.goals.filter((g) => g.status === 'behind').length}{' '}
							behind
						</Text>
					</View>

					<View style={styles.summaryItem}>
						<Text style={styles.compactSummaryLabel}>Spending</Text>
						<Text style={styles.compactSummaryValue}>
							{formatCurrency(factPack.spendingPatterns.totalSpent)}
						</Text>
					</View>
				</View>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Time Context Header */}
			<View style={styles.timeHeader}>
				<View style={styles.timeInfo}>
					<Ionicons name="calendar" size={20} color="#3b82f6" />
					<Text style={styles.timeTitle}>Data Period</Text>
				</View>
				<Text style={styles.timePeriod}>{factPack.time_window.period}</Text>
				<Text style={styles.timezone}>{factPack.time_window.tz}</Text>
				{onRefresh && (
					<TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
						<Ionicons name="refresh" size={16} color="#6b7280" />
					</TouchableOpacity>
				)}
			</View>

			{/* Budget Status */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Ionicons name="wallet" size={18} color="#10b981" />
					<Text style={styles.sectionTitle}>Budget Status</Text>
				</View>

				{factPack.budgets.map((budget, index) => (
					<View key={budget.id} style={styles.budgetItem}>
						<View style={styles.budgetHeader}>
							<Text style={styles.budgetName}>{budget.name}</Text>
							<View
								style={[
									styles.statusBadge,
									{ backgroundColor: getStatusColor(budget.status) + '20' },
								]}
							>
								<Ionicons
									name={getStatusIcon(budget.status) as any}
									size={12}
									color={getStatusColor(budget.status)}
								/>
								<Text
									style={[
										styles.statusText,
										{ color: getStatusColor(budget.status) },
									]}
								>
									{budget.status.replace('_', ' ')}
								</Text>
							</View>
						</View>

						<View style={styles.budgetProgress}>
							<View style={styles.progressBar}>
								<View
									style={[
										styles.progressFill,
										{
											width: `${Math.min(budget.utilization, 100)}%`,
											backgroundColor: getStatusColor(budget.status),
										},
									]}
								/>
							</View>
							<Text style={styles.progressText}>
								{formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
							</Text>
						</View>

						<View style={styles.budgetDetails}>
							<Text style={styles.detailText}>
								Remaining: {formatCurrency(budget.remaining)}
							</Text>
							<Text style={styles.detailText}>
								Utilization: {formatPercentage(budget.utilization)}
							</Text>
						</View>
					</View>
				))}
			</View>

			{/* Goal Progress */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Ionicons name="flag" size={18} color="#8b5cf6" />
					<Text style={styles.sectionTitle}>Goal Progress</Text>
				</View>

				{factPack.goals.map((goal, index) => (
					<View key={goal.id} style={styles.goalItem}>
						<View style={styles.goalHeader}>
							<Text style={styles.goalName}>{goal.name}</Text>
							<View
								style={[
									styles.statusBadge,
									{ backgroundColor: getStatusColor(goal.status) + '20' },
								]}
							>
								<Ionicons
									name={getStatusIcon(goal.status) as any}
									size={12}
									color={getStatusColor(goal.status)}
								/>
								<Text
									style={[
										styles.statusText,
										{ color: getStatusColor(goal.status) },
									]}
								>
									{goal.status.replace('_', ' ')}
								</Text>
							</View>
						</View>

						<View style={styles.goalProgress}>
							<View style={styles.progressBar}>
								<View
									style={[
										styles.progressFill,
										{
											width: `${Math.min(goal.progress, 100)}%`,
											backgroundColor: getStatusColor(goal.status),
										},
									]}
								/>
							</View>
							<Text style={styles.progressText}>
								{formatCurrency(goal.currentAmount)} /{' '}
								{formatCurrency(goal.targetAmount)}
							</Text>
						</View>

						<View style={styles.goalDetails}>
							<Text style={styles.detailText}>
								Remaining: {formatCurrency(goal.remaining)}
							</Text>
							<Text style={styles.detailText}>
								Progress: {formatPercentage(goal.progress)}
							</Text>
							<Text style={styles.detailText}>
								Deadline: {new Date(goal.deadline).toLocaleDateString()}
							</Text>
						</View>
					</View>
				))}
			</View>

			{/* Spending Patterns */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Ionicons name="trending-down" size={18} color="#f59e0b" />
					<Text style={styles.sectionTitle}>Spending Patterns</Text>
				</View>

				<View style={styles.spendingSummary}>
					<View style={styles.summaryRow}>
						<Text style={styles.summaryLabel}>Total Spent:</Text>
						<Text style={styles.summaryValue}>
							{formatCurrency(factPack.spendingPatterns.totalSpent)}
						</Text>
					</View>

					<View style={styles.summaryRow}>
						<Text style={styles.summaryLabel}>Daily Average:</Text>
						<Text style={styles.summaryValue}>
							{formatCurrency(factPack.spendingPatterns.averageDaily)}
						</Text>
					</View>

					<View style={styles.summaryRow}>
						<Text style={styles.summaryLabel}>Trend:</Text>
						<Text style={styles.summaryValue}>
							{factPack.spendingPatterns.trend}
						</Text>
					</View>
				</View>

				{factPack.spendingPatterns.topCategories.length > 0 && (
					<View style={styles.categoriesSection}>
						<Text style={styles.categoriesTitle}>Top Categories</Text>
						{factPack.spendingPatterns.topCategories.map((category, index) => (
							<View key={index} style={styles.categoryItem}>
								<Text style={styles.categoryName}>{category.name}</Text>
								<View style={styles.categoryDetails}>
									<Text style={styles.categoryAmount}>
										{formatCurrency(category.total)}
									</Text>
									<Text style={styles.categoryPercentage}>
										{formatPercentage(category.percentage)}
									</Text>
								</View>
							</View>
						))}
					</View>
				)}
			</View>

			{/* Account Balances */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Ionicons name="card" size={18} color="#3b82f6" />
					<Text style={styles.sectionTitle}>Account Balances</Text>
				</View>

				{factPack.balances.map((balance, index) => (
					<View key={balance.accountId} style={styles.balanceItem}>
						<View style={styles.balanceHeader}>
							<Text style={styles.balanceName}>{balance.name}</Text>
							<Text style={styles.balanceType}>{balance.type}</Text>
						</View>

						<View style={styles.balanceAmounts}>
							<Text style={styles.balanceCurrent}>
								{formatCurrency(balance.current)}
							</Text>
							<Text style={styles.balanceTotal}>
								of {formatCurrency(balance.total)}
							</Text>
						</View>

						<Text style={styles.balanceSpent}>
							Spent: {formatCurrency(balance.spent)}
						</Text>
					</View>
				))}
			</View>

			{/* Data Freshness Footer */}
			<View style={styles.footer}>
				<Text style={styles.footerText}>
					Generated: {new Date(factPack.metadata.generatedAt).toLocaleString()}
				</Text>
				<Text style={styles.footerText}>
					Source: {factPack.metadata.source}
				</Text>
				{factPack.metadata.freshness > 0 && (
					<Text style={styles.footerText}>
						Updated {Math.round(factPack.metadata.freshness / 60)} minutes ago
					</Text>
				)}
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},

	// Time Header
	timeHeader: {
		backgroundColor: '#f8fafc',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e2e8f0',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	timeInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	timeTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1e293b',
	},
	timePeriod: {
		fontSize: 14,
		fontWeight: '500',
		color: '#3b82f6',
	},
	timezone: {
		fontSize: 12,
		color: '#6b7280',
	},
	refreshButton: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: '#f1f5f9',
	},

	// Sections
	section: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		gap: 8,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1e293b',
	},

	// Budget Items
	budgetItem: {
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 12,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	budgetHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	budgetName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		gap: 4,
	},
	statusText: {
		fontSize: 10,
		fontWeight: '600',
		textTransform: 'capitalize',
	},
	budgetProgress: {
		marginBottom: 8,
	},
	progressBar: {
		height: 8,
		backgroundColor: '#e2e8f0',
		borderRadius: 4,
		overflow: 'hidden',
		marginBottom: 4,
	},
	progressFill: {
		height: '100%',
		borderRadius: 4,
	},
	progressText: {
		fontSize: 12,
		color: '#64748b',
		textAlign: 'right',
	},
	budgetDetails: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	detailText: {
		fontSize: 11,
		color: '#64748b',
	},

	// Goal Items
	goalItem: {
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 12,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	goalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	goalName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
	},
	goalProgress: {
		marginBottom: 8,
	},
	goalDetails: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		flexWrap: 'wrap',
	},

	// Spending Patterns
	spendingSummary: {
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 12,
		marginBottom: 12,
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	summaryLabel: {
		fontSize: 12,
		color: '#64748b',
	},
	summaryValue: {
		fontSize: 12,
		fontWeight: '600',
		color: '#1e293b',
	},
	categoriesSection: {
		marginTop: 8,
	},
	categoriesTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
		marginBottom: 8,
	},
	categoryItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 4,
	},
	categoryName: {
		fontSize: 12,
		color: '#374151',
	},
	categoryDetails: {
		flexDirection: 'row',
		gap: 12,
	},
	categoryAmount: {
		fontSize: 12,
		fontWeight: '600',
		color: '#1e293b',
	},
	categoryPercentage: {
		fontSize: 12,
		color: '#64748b',
	},

	// Balance Items
	balanceItem: {
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 12,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	balanceHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	balanceName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
	},
	balanceType: {
		fontSize: 10,
		color: '#64748b',
		textTransform: 'capitalize',
		backgroundColor: '#f1f5f9',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 8,
	},
	balanceAmounts: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 4,
		marginBottom: 4,
	},
	balanceCurrent: {
		fontSize: 18,
		fontWeight: '700',
		color: '#10b981',
	},
	balanceTotal: {
		fontSize: 12,
		color: '#64748b',
	},
	balanceSpent: {
		fontSize: 11,
		color: '#64748b',
	},

	// Footer
	footer: {
		padding: 16,
		backgroundColor: '#f8fafc',
		borderTopWidth: 1,
		borderTopColor: '#e2e8f0',
	},
	footerText: {
		fontSize: 10,
		color: '#9ca3af',
		textAlign: 'center',
		marginBottom: 2,
	},

	// Compact Mode
	compactContainer: {
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	timeStamp: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginBottom: 8,
	},
	timeText: {
		fontSize: 11,
		color: '#6b7280',
		fontWeight: '500',
	},
	compactSummary: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	summaryItem: {
		alignItems: 'center',
	},
	compactSummaryLabel: {
		fontSize: 10,
		color: '#64748b',
		marginBottom: 2,
	},
	compactSummaryValue: {
		fontSize: 12,
		fontWeight: '600',
		color: '#1e293b',
	},
});
