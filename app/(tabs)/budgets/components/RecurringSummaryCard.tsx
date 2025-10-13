import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RectButton } from 'react-native-gesture-handler';
import { RecurringExpenseService } from '../../../../src/services';
import { palette, space, type as typography } from '../../../../src/ui';
import { currency } from '../../../../src/utils/format';

interface RecurringExpense {
	patternId: string;
	vendor: string;
	amount: number;
	frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	nextExpectedDate: string;
	confidence?: number;
	transactions?: any[];
}

// Extended interface for expenses with payment status
interface RecurringExpenseWithPaymentStatus extends RecurringExpense {
	isPaid: boolean;
	paymentDate?: string;
	nextDueDate: string;
}

interface Props {
	expenses: RecurringExpense[];
	monthlyBudget?: number;
	onExpensePress?: (expense: RecurringExpenseWithPaymentStatus) => void;
	activeView: 'all' | 'monthly' | 'weekly';
	onViewToggle: () => void;
	onAddExpense: () => void;
	onRefresh?: () => void;
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
	onRefresh,
	overdueAmount = 0,
	dueThisWeekAmount = 0,
	overdueCount = 0,
	dueThisWeekCount = 0,
}) => {
	const [expensesWithPaymentStatus, setExpensesWithPaymentStatus] = useState<
		RecurringExpenseWithPaymentStatus[]
	>([]);
	const [isLoadingPaymentStatus, setIsLoadingPaymentStatus] = useState(false);
	const [paymentStatusError, setPaymentStatusError] = useState<string | null>(
		null
	);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Check payment status for all expenses using batch API
	useEffect(() => {
		const checkPaymentStatus = async () => {
			if (expenses.length === 0) return;

			setIsLoadingPaymentStatus(true);
			setPaymentStatusError(null);
			try {
				// Use batch API for better performance
				const patternIds = expenses.map((expense) => expense.patternId);
				const paymentStatuses =
					await RecurringExpenseService.checkBatchPaidStatus(patternIds);

				const expensesWithStatus = expenses.map((expense) => {
					const isPaid = paymentStatuses[expense.patternId] === true;
					let paymentDate: string | undefined;
					let nextDueDate: string = expense.nextExpectedDate;

					if (isPaid) {
						// Calculate next due date based on frequency
						nextDueDate = calculateNextDueDate(
							expense.nextExpectedDate,
							expense.frequency
						);
						// For now, we don't have payment date from batch API
						// This could be enhanced if the API provides payment dates
					}

					return {
						...expense,
						isPaid,
						paymentDate,
						nextDueDate,
					};
				});

				setExpensesWithPaymentStatus(expensesWithStatus);
			} catch (error) {
				console.error('Error checking payment status:', error);
				setPaymentStatusError('Failed to load payment status');
				setExpensesWithPaymentStatus(
					expenses.map((expense) => ({
						...expense,
						isPaid: false,
						nextDueDate: expense.nextExpectedDate,
					}))
				);
			} finally {
				setIsLoadingPaymentStatus(false);
			}
		};

		checkPaymentStatus();
	}, [expenses]);

	// Refresh payment status - memoized to prevent unnecessary re-renders
	const handleRefresh = useCallback(async () => {
		if (isRefreshing) return; // Prevent multiple simultaneous refreshes

		setIsRefreshing(true);

		if (onRefresh) {
			onRefresh();
		}
		// Also refresh payment status locally
		const checkPaymentStatus = async () => {
			if (expenses.length === 0) return;

			setIsLoadingPaymentStatus(true);
			setPaymentStatusError(null);
			try {
				const patternIds = expenses.map((expense) => expense.patternId);
				const paymentStatuses =
					await RecurringExpenseService.checkBatchPaidStatus(patternIds);

				const expensesWithStatus = expenses.map((expense) => {
					const isPaid = paymentStatuses[expense.patternId] === true;
					let nextDueDate: string = expense.nextExpectedDate;

					if (isPaid) {
						nextDueDate = calculateNextDueDate(
							expense.nextExpectedDate,
							expense.frequency
						);
					}

					return {
						...expense,
						isPaid,
						nextDueDate,
					};
				});

				setExpensesWithPaymentStatus(expensesWithStatus);
			} catch (error) {
				console.error('Error refreshing payment status:', error);
				setPaymentStatusError('Failed to refresh payment status');
			} finally {
				setIsLoadingPaymentStatus(false);
			}
		};

		try {
			await checkPaymentStatus();
		} finally {
			setIsRefreshing(false);
		}
	}, [expenses, onRefresh, isRefreshing]);

	// Helper function to calculate next due date
	const calculateNextDueDate = (
		currentDate: string,
		frequency: string
	): string => {
		const date = new Date(currentDate);

		switch (frequency) {
			case 'weekly':
				date.setDate(date.getDate() + 7);
				break;
			case 'monthly':
				date.setMonth(date.getMonth() + 1);
				break;
			case 'quarterly':
				date.setMonth(date.getMonth() + 3);
				break;
			case 'yearly':
				date.setFullYear(date.getFullYear() + 1);
				break;
		}

		return date.toISOString();
	};

	// Use expenses with payment status if available, otherwise fall back to original expenses
	// const displayExpenses =
	// 	expensesWithPaymentStatus.length > 0 ? expensesWithPaymentStatus : expenses;

	// Calculate payment status summary - memoized for performance
	const paymentStatusSummary = useMemo(() => {
		if (expensesWithPaymentStatus.length === 0) {
			return { paidCount: 0, unpaidCount: 0 };
		}

		const paidCount = expensesWithPaymentStatus.filter((e) => e.isPaid).length;
		const unpaidCount = expensesWithPaymentStatus.filter(
			(e) => !e.isPaid
		).length;

		return { paidCount, unpaidCount };
	}, [expensesWithPaymentStatus]);

	const { paidCount, unpaidCount } = paymentStatusSummary;

	const getMonthlyEquivalent = (amount: number, frequency: string) => {
		switch (frequency) {
			case 'weekly':
				return (amount * 52) / 12;
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
			case 'monthly':
			case 'quarterly':
			case 'yearly':
				return 0; // Only include weekly expenses
			default:
				return 0;
		}
	};

	const getCurrentPeriodAmount = useCallback(
		(expense: RecurringExpenseWithPaymentStatus) => {
			const now = new Date();
			const nextDate = new Date(expense.nextDueDate);

			// If overdue or due this period, include the amount
			if (activeView === 'monthly') {
				// For monthly view, include if due this month
				const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
				if (nextDate <= nextMonth) {
					return getMonthlyEquivalent(expense.amount, expense.frequency);
				}
			} else if (activeView === 'weekly') {
				// For weekly view, only include weekly expenses due this week
				if (expense.frequency === 'weekly') {
					const endOfWeek = new Date(now);
					endOfWeek.setDate(now.getDate() + 7);
					if (nextDate <= endOfWeek) {
						return getWeeklyEquivalent(expense.amount, expense.frequency);
					}
				}
			} else {
				// For 'all' view, include all expenses as monthly equivalents
				return getMonthlyEquivalent(expense.amount, expense.frequency);
			}
			return 0;
		},
		[activeView]
	);

	// Memoize expensive calculations to avoid recomputation on every render
	const overdueExpenses = useMemo(
		() =>
			(expenses || []).filter((expense) => {
				const daysUntilDue = Math.ceil(
					(new Date(expense.nextExpectedDate).getTime() -
						new Date().getTime()) /
						(1000 * 60 * 60 * 24)
				);
				return daysUntilDue <= 0;
			}),
		[expenses]
	);

	const dueThisPeriodExpenses = useMemo(
		() =>
			(expenses || []).filter((expense) => {
				const daysUntilDue = Math.ceil(
					(new Date(expense.nextExpectedDate).getTime() -
						new Date().getTime()) /
						(1000 * 60 * 60 * 24)
				);
				if (activeView === 'monthly') {
					return daysUntilDue > 0 && daysUntilDue <= 30;
				} else if (activeView === 'weekly') {
					return daysUntilDue > 0 && daysUntilDue <= 7;
				}
				// 'all' view: include all upcoming expenses
				return daysUntilDue > 0;
			}),
		[expenses, activeView]
	);

	const totalPeriodAmount = useMemo(
		() =>
			(expenses || []).reduce(
				(sum, expense) =>
					sum +
					getCurrentPeriodAmount(expense as RecurringExpenseWithPaymentStatus),
				0
			),
		[expenses, getCurrentPeriodAmount]
	);

	const totalAllTime = useMemo(() => {
		if (activeView === 'monthly') {
			return (expenses || []).reduce(
				(sum, expense) =>
					sum + getMonthlyEquivalent(expense.amount, expense.frequency),
				0
			);
		} else if (activeView === 'weekly') {
			return (expenses || []).reduce(
				(sum, expense) =>
					sum + getWeeklyEquivalent(expense.amount, expense.frequency),
				0
			);
		}
		// 'all' view: sum all monthly equivalents
		return (expenses || []).reduce(
			(sum, expense) =>
				sum + getMonthlyEquivalent(expense.amount, expense.frequency),
			0
		);
	}, [expenses, activeView]);

	const localOverdueAmount = useMemo(
		() =>
			overdueExpenses.reduce((sum, expense) => {
				if (activeView === 'monthly' || activeView === 'all') {
					return sum + getMonthlyEquivalent(expense.amount, expense.frequency);
				} else {
					// For weekly view, only include weekly expenses
					if (expense.frequency === 'weekly') {
						return sum + getWeeklyEquivalent(expense.amount, expense.frequency);
					}
					return sum;
				}
			}, 0),
		[overdueExpenses, activeView]
	);

	const dueThisPeriodAmount = useMemo(
		() =>
			dueThisPeriodExpenses.reduce((sum, expense) => {
				if (activeView === 'monthly' || activeView === 'all') {
					return sum + getMonthlyEquivalent(expense.amount, expense.frequency);
				} else {
					// For weekly view, only include weekly expenses
					if (expense.frequency === 'weekly') {
						return sum + getWeeklyEquivalent(expense.amount, expense.frequency);
					}
					return sum;
				}
			}, 0),
		[dueThisPeriodExpenses, activeView]
	);

	const currentPeriodLabel =
		activeView === 'monthly'
			? 'This Month'
			: activeView === 'weekly'
			? 'This Week'
			: 'All Time';
	// const currentPeriodUnit = activeView === 'monthly' ? '/mo' : '/wk';

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

				{/* Header Controls */}
				<View style={styles.headerControls}>
					{/* Add Button */}
					<TouchableOpacity
						style={styles.addButton}
						onPress={onAddExpense}
						accessibilityLabel="Add new recurring expense"
						accessibilityHint="Tap to add a new recurring expense"
						accessibilityRole="button"
					>
						<Ionicons name="add" size={20} color={palette.text} />
						<Text style={styles.addButtonText}>Add Expense</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Summary Statistics */}
			<View style={styles.statsContainer}>
				{/* Primary Metric and Toggle Row */}
				<View style={styles.primaryMetricRow}>
					{/* Primary Metric - Current Period Total */}
					<View style={styles.primaryMetric}>
						<Text style={styles.primaryMetricValue}>
							{currency(totalPeriodAmount)}
						</Text>
						<Text style={styles.primaryMetricLabel}>
							Due {currentPeriodLabel}
						</Text>
					</View>

					{/* Period Toggle - Inline with primary metric */}
					<RectButton
						style={styles.viewToggleButton}
						onPress={onViewToggle}
						accessibilityLabel={`Switch to ${
							activeView === 'monthly' ? 'weekly' : 'monthly'
						} view`}
						accessibilityHint="Tap to switch between monthly and weekly view"
						accessibilityRole="button"
					>
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
							{currency(overdueAmount || localOverdueAmount)}
						</Text>
						<Text style={styles.metricLabel}>Overdue</Text>
						{(overdueCount || overdueExpenses.length) > 0 && (
							<Text style={styles.metricCount}>
								({overdueCount || overdueExpenses.length}{' '}
								{(overdueCount || overdueExpenses.length) === 1
									? 'expense'
									: 'expenses'}
								)
							</Text>
						)}
					</View>

					<View style={styles.metricItem}>
						<Text style={styles.metricValue}>
							{currency(dueThisPeriodAmount)}
						</Text>
						<Text style={styles.metricLabel}>Due Soon</Text>
						{dueThisPeriodExpenses.length > 0 && (
							<Text style={styles.metricCount}>
								({dueThisPeriodExpenses.length})
							</Text>
						)}
					</View>

					<View style={styles.metricItem}>
						<Text style={styles.metricValue}>{currency(totalAllTime)}</Text>
						<Text style={styles.metricLabel}>
							Total {activeView === 'monthly' ? 'Monthly' : 'Weekly'}
						</Text>
					</View>
				</View>

				{/* Payment Status Summary */}
				{expensesWithPaymentStatus.length > 0 && (
					<View style={styles.paymentStatusSection}>
						<View style={styles.paymentStatusHeader}>
							<Ionicons
								name="checkmark-circle-outline"
								size={16}
								color={palette.success}
							/>
							<Text style={styles.paymentStatusTitle}>Payment Status</Text>
						</View>
						<View style={styles.paymentStatusContent}>
							<View style={styles.paymentStatusItem}>
								<Ionicons
									name="checkmark-circle"
									size={16}
									color={palette.success}
								/>
								<Text style={styles.paymentStatusText}>{paidCount} paid</Text>
							</View>
							<View style={styles.paymentStatusItem}>
								<Ionicons
									name="remove-circle"
									size={16}
									color={palette.warning}
								/>
								<Text style={styles.paymentStatusText}>
									{unpaidCount} upcoming
								</Text>
							</View>
						</View>
					</View>
				)}

				{/* Payment Status Loading */}
				{isLoadingPaymentStatus && expenses.length > 0 && (
					<View style={styles.paymentStatusLoading}>
						<ActivityIndicator size="small" color={palette.primary} />
						<Text style={styles.paymentStatusLoadingText}>
							Checking payment status...
						</Text>
					</View>
				)}

				{/* Payment Status Error */}
				{paymentStatusError && (
					<View style={styles.paymentStatusError}>
						<Ionicons name="warning-outline" size={16} color={palette.danger} />
						<Text style={styles.paymentStatusErrorText}>
							{paymentStatusError}
						</Text>
						<TouchableOpacity
							style={styles.retryButton}
							onPress={handleRefresh}
							accessibilityLabel="Retry loading payment status"
							accessibilityHint="Tap to retry loading payment status"
							accessibilityRole="button"
						>
							<Text style={styles.retryButtonText}>Retry</Text>
						</TouchableOpacity>
					</View>
				)}

				{/* Overdue Section */}
				{(overdueAmount > 0 || overdueCount > 0) && (
					<View style={styles.overdueSection}>
						<View style={styles.overdueHeader}>
							<Ionicons
								name="warning-outline"
								size={16}
								color={palette.danger}
							/>
							<Text style={styles.overdueTitle}>Overdue</Text>
						</View>
						<View style={styles.overdueContent}>
							<Text style={styles.overdueAmount}>
								{currency(overdueAmount)}
							</Text>
							<Text style={styles.overdueCount}>
								({overdueCount} {overdueCount === 1 ? 'expense' : 'expenses'})
							</Text>
						</View>
					</View>
				)}

				{/* Due This Week Section */}
				{activeView === 'weekly' &&
					(dueThisWeekAmount > 0 || dueThisWeekCount > 0) && (
						<View style={styles.dueThisWeekSection}>
							<View style={styles.dueThisWeekHeader}>
								<Ionicons
									name="calendar-outline"
									size={16}
									color={palette.info}
								/>
								<Text style={styles.dueThisWeekTitle}>Due This Week</Text>
							</View>
							<View style={styles.dueThisWeekContent}>
								<Text style={styles.dueThisWeekAmount}>
									{currency(dueThisWeekAmount)}
								</Text>
								<Text style={styles.dueThisWeekCount}>
									({dueThisWeekCount}{' '}
									{dueThisWeekCount === 1 ? 'expense' : 'expenses'})
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
		backgroundColor: palette.surface,
		paddingVertical: space.sm,
	},
	headerSection: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: space.lg,
		paddingHorizontal: space.sm,
	},
	headerContent: {
		flex: 1,
	},
	headerTitle: {
		...typography.titleMd,
		color: palette.text,
		marginBottom: 4,
	},
	headerSubtitle: {
		...typography.bodySm,
		color: palette.textMuted,
	},
	viewToggleButton: {
		position: 'absolute',
		right: 0,
		top: 0,
		paddingVertical: 6,
		paddingHorizontal: space.md,
		borderRadius: 16,
		backgroundColor: palette.surfaceAlt,
		borderWidth: 1,
		borderColor: palette.borderMuted,
	},
	viewToggleContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	viewToggleText: {
		fontSize: 12,
		fontWeight: '500',
		color: palette.text,
	},
	headerControls: {
		flexDirection: 'column',
		alignItems: 'flex-end',
		gap: 8,
	},
	toggleSection: {
		alignItems: 'flex-end',
		marginBottom: space.sm,
		paddingHorizontal: space.sm,
	},
	addButton: {
		backgroundColor: palette.surfaceAlt,
		borderRadius: 12,
		paddingVertical: space.md,
		paddingHorizontal: 10,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		borderWidth: 1,
		borderColor: palette.borderMuted,
	},
	addButtonText: {
		color: palette.text,
		fontSize: 14,
		fontWeight: '600',
	},
	statsContainer: {
		backgroundColor: palette.surface,
		borderBottomWidth: 1,
		borderColor: palette.border,
		paddingBottom: space.md,
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
		...typography.num2xl,
		color: palette.text,
		marginBottom: 4,
	},
	primaryMetricLabel: {
		...typography.labelSm,
		color: palette.textSubtle,
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
		...typography.numLg,
		color: palette.text,
		marginBottom: 4,
	},
	metricLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: palette.textSubtle,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 2,
	},
	metricCount: {
		fontSize: 10,
		color: palette.textMuted,
		fontWeight: '500',
	},
	dueThisWeekSection: {
		marginTop: space.lg,
		padding: space.md,
		backgroundColor: palette.surfaceAlt,
		borderRadius: 12,
		borderLeftWidth: 3,
		borderLeftColor: palette.info,
	},
	dueThisWeekHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: space.sm,
	},
	dueThisWeekTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: palette.text,
		marginLeft: space.sm,
	},
	dueThisWeekContent: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
	},
	dueThisWeekAmount: {
		...typography.numLg,
		color: palette.info,
	},
	dueThisWeekCount: {
		fontSize: 12,
		color: palette.textMuted,
	},
	overdueSection: {
		marginTop: space.lg,
		padding: space.md,
		backgroundColor: palette.dangerSubtle,
		borderRadius: 12,
		borderLeftWidth: 3,
		borderLeftColor: palette.danger,
	},
	overdueHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: space.sm,
	},
	overdueTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: palette.danger,
		marginLeft: space.sm,
	},
	overdueContent: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
	},
	overdueAmount: {
		...typography.numLg,
		color: palette.danger,
	},
	overdueCount: {
		fontSize: 12,
		color: palette.danger,
	},
	paymentStatusSection: {
		marginTop: space.lg,
		padding: space.lg,
		backgroundColor: palette.surfaceAlt,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: palette.border,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
		elevation: 1,
	},
	paymentStatusHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: space.md,
		paddingBottom: space.sm,
		borderBottomWidth: 1,
		borderBottomColor: palette.border,
	},
	paymentStatusTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: palette.text,
		marginLeft: space.sm,
	},
	paymentStatusContent: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: space.sm,
	},
	paymentStatusItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: space.sm,
		paddingHorizontal: space.md,
		backgroundColor: palette.surface,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: palette.border,
		flex: 1,
		marginHorizontal: 4,
		justifyContent: 'center',
	},
	paymentStatusText: {
		fontSize: 13,
		fontWeight: '600',
		color: palette.text,
	},
	paymentStatusLoading: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: space.lg,
		paddingVertical: space.lg,
		paddingHorizontal: 20,
		backgroundColor: palette.surfaceAlt,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: palette.border,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
		elevation: 1,
	},
	paymentStatusLoadingText: {
		marginLeft: space.md,
		fontSize: 14,
		fontWeight: '600',
		color: palette.textMuted,
	},
	paymentStatusError: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: space.lg,
		paddingVertical: space.md,
		paddingHorizontal: space.lg,
		backgroundColor: palette.dangerSubtle,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: palette.dangerBorder,
	},
	paymentStatusErrorText: {
		flex: 1,
		marginLeft: space.sm,
		fontSize: 14,
		fontWeight: '500',
		color: palette.danger,
	},
	retryButton: {
		paddingVertical: 6,
		paddingHorizontal: space.md,
		backgroundColor: palette.danger,
		borderRadius: 8,
	},
	retryButtonText: {
		fontSize: 12,
		fontWeight: '600',
		color: palette.surface,
	},
});

export default RecurringSummaryCard;
