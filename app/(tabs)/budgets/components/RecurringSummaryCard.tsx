import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RectButton } from 'react-native-gesture-handler';

interface RecurringExpense {
	patternId: string;
	vendor: string;
	amount: number;
	frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
	nextExpectedDate: string;
	confidence?: number;
	transactions?: any[];
}

interface Props {
	expenses: RecurringExpense[];
	monthlyBudget?: number;
	onExpensePress?: (expense: RecurringExpense) => void;
	activeView: 'monthly' | 'weekly';
	onViewToggle: () => void;
	onAddExpense: () => void;
	overdueAmount?: number;
	dueThisWeekAmount?: number;
	overdueCount?: number;
	dueThisWeekCount?: number;
}

const RecurringSummaryCard: React.FC<Props> = ({
	expenses = [],
	monthlyBudget = 5000,
	onExpensePress,
	activeView,
	onViewToggle,
	onAddExpense,
	overdueAmount = 0,
	dueThisWeekAmount = 0,
	overdueCount = 0,
	dueThisWeekCount = 0,
}) => {
	const getMonthlyEquivalent = (amount: number, frequency: string) => {
		switch (frequency) {
			case 'weekly':
				return (amount * 52) / 12;
			case 'biweekly':
				return (amount * 26) / 12;
			case 'monthly':
				return amount;
			case 'quarterly':
				return amount / 3;
			case 'yearly':
				return amount / 12;
			default:
				return amount;
		}
	};

	const getWeeklyEquivalent = (amount: number, frequency: string) => {
		switch (frequency) {
			case 'weekly':
				return amount;
			case 'biweekly':
				return amount / 2;
			case 'monthly':
			case 'quarterly':
			case 'yearly':
				return 0; // Only include weekly and biweekly expenses
			default:
				return 0;
		}
	};

	const getCurrentPeriodAmount = (expense: RecurringExpense) => {
		const now = new Date();
		const nextDate = new Date(expense.nextExpectedDate);
		const daysUntilDue = Math.ceil(
			(nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
		);

		// If overdue or due this period, include the amount
		if (activeView === 'monthly') {
			// For monthly view, include if due this month
			const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
			if (nextDate <= nextMonth) {
				return getMonthlyEquivalent(expense.amount, expense.frequency);
			}
		} else {
			// For weekly view, only include weekly/biweekly expenses due this week
			if (expense.frequency === 'weekly' || expense.frequency === 'biweekly') {
				const endOfWeek = new Date(now);
				endOfWeek.setDate(now.getDate() + 7);
				if (nextDate <= endOfWeek) {
					return getWeeklyEquivalent(expense.amount, expense.frequency);
				}
			}
		}
		return 0;
	};

	const totalPeriodAmount = (expenses || []).reduce(
		(sum, expense) => sum + getCurrentPeriodAmount(expense),
		0
	);

	const totalAllTime =
		activeView === 'monthly'
			? (expenses || []).reduce(
					(sum, expense) =>
						sum + getMonthlyEquivalent(expense.amount, expense.frequency),
					0
			  )
			: (expenses || []).reduce(
					(sum, expense) =>
						sum + getWeeklyEquivalent(expense.amount, expense.frequency),
					0
			  );

	const overdueExpenses = (expenses || []).filter((expense) => {
		const daysUntilDue = Math.ceil(
			(new Date(expense.nextExpectedDate).getTime() - new Date().getTime()) /
				(1000 * 60 * 60 * 24)
		);
		return daysUntilDue <= 0;
	});

	const dueThisPeriodExpenses = (expenses || []).filter((expense) => {
		const daysUntilDue = Math.ceil(
			(new Date(expense.nextExpectedDate).getTime() - new Date().getTime()) /
				(1000 * 60 * 60 * 24)
		);
		if (activeView === 'monthly') {
			// Due this month
			return daysUntilDue > 0 && daysUntilDue <= 30;
		} else {
			// Due this week
			return daysUntilDue > 0 && daysUntilDue <= 7;
		}
	});

	const localOverdueAmount = overdueExpenses.reduce((sum, expense) => {
		if (activeView === 'monthly') {
			return sum + getMonthlyEquivalent(expense.amount, expense.frequency);
		} else {
			// For weekly view, only include weekly/biweekly expenses
			if (expense.frequency === 'weekly' || expense.frequency === 'biweekly') {
				return sum + getWeeklyEquivalent(expense.amount, expense.frequency);
			}
			return sum;
		}
	}, 0);

	const dueThisPeriodAmount = dueThisPeriodExpenses.reduce((sum, expense) => {
		if (activeView === 'monthly') {
			return sum + getMonthlyEquivalent(expense.amount, expense.frequency);
		} else {
			// For weekly view, only include weekly/biweekly expenses
			if (expense.frequency === 'weekly' || expense.frequency === 'biweekly') {
				return sum + getWeeklyEquivalent(expense.amount, expense.frequency);
			}
			return sum;
		}
	}, 0);

	const currentPeriodLabel =
		activeView === 'monthly' ? 'This Month' : 'This Week';
	const currentPeriodUnit = activeView === 'monthly' ? '/mo' : '/wk';

	return (
		<View style={styles.container}>
			{/* Summary Header with Toggle and Add Button */}
			<View style={styles.headerSection}>
				<View style={styles.headerContent}>
					<Text style={styles.headerTitle}>Recurring Expenses</Text>
					<Text style={styles.headerSubtitle}>
						Track and manage your regular monthly payments
					</Text>
				</View>

				{/* Add Button - Inline with title */}
				<TouchableOpacity style={styles.addButton} onPress={onAddExpense}>
					<Ionicons name="add" size={20} color="#fff" />
					<Text style={styles.addButtonText}>Add Expense</Text>
				</TouchableOpacity>
			</View>

			{/* Summary Statistics */}
			<View style={styles.statsContainer}>
				{/* Primary Metric and Toggle Row */}
				<View style={styles.primaryMetricRow}>
					{/* Primary Metric - Current Period Total */}
					<View style={styles.primaryMetric}>
						<Text style={styles.primaryMetricValue}>
							${totalPeriodAmount.toFixed(0)}
						</Text>
						<Text style={styles.primaryMetricLabel}>
							Due {currentPeriodLabel}
						</Text>
					</View>

					{/* Period Toggle - Inline with primary metric */}
					<RectButton style={styles.viewToggleButton} onPress={onViewToggle}>
						<View style={styles.viewToggleContent}>
							<Text style={styles.viewToggleText}>
								{activeView === 'monthly' ? 'Monthly' : 'Weekly'}
							</Text>
						</View>
					</RectButton>
				</View>

				{/* Secondary Metrics Row */}
				<View style={styles.secondaryMetricsRow}>
					<View style={styles.metricItem}>
						<Text style={styles.metricValue}>
							${overdueAmount || localOverdueAmount}
						</Text>
						<Text style={styles.metricLabel}>Overdue</Text>
						{(overdueCount || overdueExpenses.length) > 0 && (
							<Text style={styles.metricCount}>
								({overdueCount || overdueExpenses.length})
							</Text>
						)}
					</View>

					<View style={styles.metricItem}>
						<Text style={styles.metricValue}>
							${dueThisPeriodAmount.toFixed(0)}
						</Text>
						<Text style={styles.metricLabel}>Due Soon</Text>
						{dueThisPeriodExpenses.length > 0 && (
							<Text style={styles.metricCount}>
								({dueThisPeriodExpenses.length})
							</Text>
						)}
					</View>

					<View style={styles.metricItem}>
						<Text style={styles.metricValue}>${totalAllTime.toFixed(0)}</Text>
						<Text style={styles.metricLabel}>
							Total {activeView === 'monthly' ? 'Monthly' : 'Weekly'}
						</Text>
					</View>
				</View>

				{/* Overdue Section */}
				{(overdueAmount > 0 || overdueCount > 0) && (
					<View style={styles.overdueSection}>
						<View style={styles.overdueHeader}>
							<Ionicons name="warning-outline" size={16} color="#ef4444" />
							<Text style={styles.overdueTitle}>Overdue</Text>
						</View>
						<View style={styles.overdueContent}>
							<Text style={styles.overdueAmount}>
								${overdueAmount.toFixed(0)}
							</Text>
							<Text style={styles.overdueCount}>({overdueCount} expenses)</Text>
						</View>
					</View>
				)}

				{/* Due This Week Section */}
				{activeView === 'weekly' &&
					(dueThisWeekAmount > 0 || dueThisWeekCount > 0) && (
						<View style={styles.dueThisWeekSection}>
							<View style={styles.dueThisWeekHeader}>
								<Ionicons name="calendar-outline" size={16} color="#00a2ff" />
								<Text style={styles.dueThisWeekTitle}>Due This Week</Text>
							</View>
							<View style={styles.dueThisWeekContent}>
								<Text style={styles.dueThisWeekAmount}>
									${dueThisWeekAmount.toFixed(0)}
								</Text>
								<Text style={styles.dueThisWeekCount}>
									({dueThisWeekCount} expenses)
								</Text>
							</View>
						</View>
					)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	headerSection: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16,
		paddingHorizontal: 8,
	},
	headerContent: {
		flex: 1,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#212121',
		marginBottom: 4,
	},
	headerSubtitle: {
		fontSize: 14,
		color: '#757575',
	},
	viewToggleButton: {
		position: 'absolute',
		right: 0,
		top: 0,
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 16,
		backgroundColor: '#f5f5f5',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	viewToggleContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	viewToggleText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#212121',
	},
	headerControls: {
		flexDirection: 'column',
		alignItems: 'flex-end',
		gap: 8,
	},
	toggleSection: {
		alignItems: 'flex-end',
		marginBottom: 8,
		paddingHorizontal: 8,
	},
	addButton: {
		backgroundColor: '#00a2ff',
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	addButtonText: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '600',
	},
	statsContainer: {
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderColor: '#e5e7eb',
		paddingBottom: 12,
	},
	primaryMetricRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
		position: 'relative',
	},
	primaryMetric: {
		alignItems: 'center',
	},
	primaryMetricValue: {
		fontSize: 32,
		fontWeight: '700',
		color: '#212121',
		marginBottom: 4,
	},
	primaryMetricLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#9ca3af',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	secondaryMetricsRow: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		width: '100%',
	},
	metricItem: {
		alignItems: 'center',
		flex: 1,
	},
	metricValue: {
		fontSize: 18,
		fontWeight: '700',
		color: '#212121',
		marginBottom: 4,
	},
	metricLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#9ca3af',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 2,
	},
	metricCount: {
		fontSize: 10,
		color: '#6b7280',
		fontWeight: '500',
	},
	dueThisWeekSection: {
		marginTop: 16,
		padding: 12,
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
		borderLeftWidth: 3,
		borderLeftColor: '#00a2ff',
	},
	dueThisWeekHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	dueThisWeekTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#212121',
		marginLeft: 8,
	},
	dueThisWeekContent: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
	},
	dueThisWeekAmount: {
		fontSize: 18,
		fontWeight: '700',
		color: '#00a2ff',
	},
	dueThisWeekCount: {
		fontSize: 12,
		color: '#757575',
	},
	overdueSection: {
		marginTop: 16,
		padding: 12,
		backgroundColor: '#fef2f2',
		borderRadius: 12,
		borderLeftWidth: 3,
		borderLeftColor: '#ef4444',
	},
	overdueHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	overdueTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#dc2626',
		marginLeft: 8,
	},
	overdueContent: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
	},
	overdueAmount: {
		fontSize: 18,
		fontWeight: '700',
		color: '#ef4444',
	},
	overdueCount: {
		fontSize: 12,
		color: '#dc2626',
	},
});

export default RecurringSummaryCard;
