import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRecurringExpense } from '../../src/context/recurringExpenseContext';
import { RecurringExpense, RecurringExpenseService } from '../../src/services';
import LinearProgressBar from '../(tabs)/budgets/components/LinearProgressBar';
import { resolveRecurringExpenseAppearance } from '../../src/utils/recurringExpenseAppearance';

interface RecurringTransaction {
	id: string;
	status: 'pending' | 'completed' | 'overdue' | 'cancelled';
	expectedDate: string;
	actualDate?: string;
	transactionId?: string;
	periodStart: string;
	periodEnd: string;
	notes?: string;
	createdAt: string;
}

const RecurringExpenseSummaryScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const patternId = params.patternId as string;
	const { expenses } = useRecurringExpense();
	const [expense, setExpense] = useState<RecurringExpense | null>(null);
	const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
	const [loadingTransactions, setLoadingTransactions] = useState(false);

	// Load expense data when component mounts
	useEffect(() => {
		if (patternId && expenses.length > 0) {
			const foundExpense = expenses.find((e) => e.patternId === patternId);
			if (foundExpense) {
				setExpense(foundExpense);
				loadTransactionHistory(foundExpense.patternId);
			}
		}
	}, [patternId, expenses]);

	// Load transaction history for this recurring expense pattern
	const loadTransactionHistory = async (patternId: string) => {
		try {
			setLoadingTransactions(true);
			const transactionHistory =
				await RecurringExpenseService.getRecurringTransactionsForPattern(
					patternId,
					20 // Get more transactions to filter from
				);
			// Only show completed payments (actual payments made)
			const completedTransactions = transactionHistory.filter(
				(transaction) => transaction.status === 'completed'
			);
			setTransactions(completedTransactions);
		} catch (error) {
			console.error('Error loading transaction history:', error);
		} finally {
			setLoadingTransactions(false);
		}
	};

	if (!expense) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="chevron-back" size={24} color="#222" />
					</TouchableOpacity>
					<Text style={styles.screenTitle}>Expense Details</Text>
					<View style={styles.placeholderButton} />
				</View>
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Loading expense...</Text>
				</View>
			</SafeAreaView>
		);
	}

	const daysUntilNext = RecurringExpenseService.getDaysUntilNext(
		expense.nextExpectedDate
	);

	// Resolve appearance based on appearanceMode (respects user customization)
	const { icon, color } = resolveRecurringExpenseAppearance(expense);

	// Get urgency status
	const getUrgencyStatus = () => {
		if (daysUntilNext <= 0)
			return { status: 'overdue', color: '#ef4444', text: 'Overdue' };
		if (daysUntilNext <= 3)
			return { status: 'urgent', color: '#f59e0b', text: 'Due Soon' };
		if (daysUntilNext <= 7)
			return { status: 'warning', color: '#f59e0b', text: 'This Week' };
		return { status: 'normal', color: '#10b981', text: 'Upcoming' };
	};

	const urgencyStatus = getUrgencyStatus();

	// Calculate progress through the current payment period
	const getProgressPercent = () => {
		const totalDaysInPeriod = (() => {
			switch (expense.frequency) {
				case 'weekly':
					return 7;
				case 'monthly':
					return 30;
				case 'quarterly':
					return 90;
				case 'yearly':
					return 365;
				default:
					return 30;
			}
		})();

		// If overdue, show 100% (period is complete)
		if (daysUntilNext <= 0) {
			return 100;
		}

		// Calculate how much of the period has elapsed
		const daysElapsed = totalDaysInPeriod - daysUntilNext;
		const progress = (daysElapsed / totalDaysInPeriod) * 100;

		// Clamp between 0 and 100
		return Math.max(0, Math.min(100, progress));
	};

	const progressPercent = getProgressPercent();

	// Calculate annual cost
	const getAnnualCost = () => {
		switch (expense.frequency) {
			case 'weekly':
				return expense.amount * 52;
			case 'monthly':
				return expense.amount * 12;
			case 'quarterly':
				return expense.amount * 4;
			case 'yearly':
				return expense.amount;
			default:
				return expense.amount;
		}
	};

	const annualCost = getAnnualCost();

	// Helper function to format date
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	// Helper function to get status icon and color
	const getStatusIconAndColor = (status: string) => {
		switch (status) {
			case 'completed':
				return { icon: 'checkmark-circle', color: '#10b981' };
			case 'pending':
				return { icon: 'time', color: '#f59e0b' };
			case 'overdue':
				return { icon: 'warning', color: '#ef4444' };
			case 'cancelled':
				return { icon: 'close-circle', color: '#6b7280' };
			default:
				return { icon: 'help-circle', color: '#6b7280' };
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Ionicons name="chevron-back" size={24} color="#222" />
				</TouchableOpacity>
				<Text style={styles.screenTitle}>Expense Details</Text>
				<View style={styles.placeholderButton} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Expense Overview Card */}
				<View style={styles.overviewCard}>
					<View style={styles.expenseHeader}>
						<View
							style={[styles.iconBubble, { backgroundColor: color + '12' }]}
						>
							<Ionicons name={icon as any} size={24} color={color} />
						</View>
						<View style={styles.expenseInfo}>
							<Text style={styles.expenseName}>{expense.vendor}</Text>
							<Text style={styles.expensePeriod}>
								{expense.frequency.charAt(0).toUpperCase() +
									expense.frequency.slice(1)}{' '}
								Expense
							</Text>
						</View>
					</View>

					<View style={styles.progressSection}>
						<LinearProgressBar
							percent={progressPercent}
							height={8}
							color={color}
							trackColor="#f3f4f6"
							leftLabel="Status"
							rightLabel={urgencyStatus.text}
							animated={true}
						/>
					</View>

					<View style={styles.amountsRow}>
						<View style={styles.amountItem}>
							<Text style={styles.amountLabel}>Amount</Text>
							<Text style={styles.amountValue}>
								${expense.amount.toFixed(2)}
							</Text>
						</View>
						<View style={styles.amountItem}>
							<Text style={styles.amountLabel}>Frequency</Text>
							<Text style={styles.amountValue}>
								{expense.frequency.charAt(0).toUpperCase() +
									expense.frequency.slice(1)}
							</Text>
						</View>
						<View style={styles.amountItem}>
							<Text style={styles.amountLabel}>Next Due</Text>
							<Text
								style={[
									styles.amountValue,
									urgencyStatus.status === 'overdue'
										? styles.overBudget
										: styles.underBudget,
								]}
							>
								{daysUntilNext <= 0
									? `${Math.abs(daysUntilNext)}d ago`
									: daysUntilNext === 1
									? '1d'
									: `${daysUntilNext}d`}
							</Text>
						</View>
					</View>
				</View>

				{/* Financial Impact Analysis */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Financial Impact</Text>
					<View style={styles.impactCard}>
						<View style={styles.impactRow}>
							<View style={styles.impactItem}>
								<Text style={styles.impactLabel}>Per {expense.frequency}</Text>
								<Text style={styles.impactValue}>
									${expense.amount.toFixed(2)}
								</Text>
							</View>
							<View style={styles.impactItem}>
								<Text style={styles.impactLabel}>Annual Cost</Text>
								<Text style={styles.impactValue}>${annualCost.toFixed(2)}</Text>
							</View>
						</View>
						<View style={styles.impactRow}>
							<View style={styles.impactItem}>
								<Text style={styles.impactLabel}>Monthly Average</Text>
								<Text style={styles.impactValue}>
									${(annualCost / 12).toFixed(2)}
								</Text>
							</View>
							<View style={styles.impactItem}>
								<Text style={styles.impactLabel}>Weekly Average</Text>
								<Text style={styles.impactValue}>
									${(annualCost / 52).toFixed(2)}
								</Text>
							</View>
						</View>
					</View>
				</View>

				{/* Analysis Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Analysis</Text>
					<View style={styles.analysisCard}>
						<View style={styles.analysisItem}>
							<Ionicons name="trending-up" size={20} color="#10b981" />
							<Text style={styles.analysisText}>
								This {expense.frequency} expense costs $
								{expense.amount.toFixed(2)}
							</Text>
						</View>
						<View style={styles.analysisItem}>
							<Ionicons name="calendar" size={20} color="#3b82f6" />
							<Text style={styles.analysisText}>
								Next payment due on{' '}
								{new Date(expense.nextExpectedDate).toLocaleDateString()}
							</Text>
						</View>
						{urgencyStatus.status === 'overdue' && (
							<View style={styles.analysisItem}>
								<Ionicons name="warning" size={20} color="#f59e0b" />
								<Text style={styles.analysisText}>
									This payment is ${Math.abs(daysUntilNext)} days overdue
								</Text>
							</View>
						)}
					</View>
				</View>

				{/* Cost Comparison */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Cost Comparison</Text>
					<View style={styles.comparisonCard}>
						<View style={styles.comparisonItem}>
							<Text style={styles.comparisonLabel}>
								This expense represents:
							</Text>
							<Text style={styles.comparisonValue}>
								{((annualCost / 50000) * 100).toFixed(1)}% of a $50k annual
								budget
							</Text>
						</View>
						<View style={styles.comparisonItem}>
							<Text style={styles.comparisonLabel}>Monthly impact:</Text>
							<Text style={styles.comparisonValue}>
								${(annualCost / 12).toFixed(2)} per month
							</Text>
						</View>
						<View style={styles.comparisonItem}>
							<Text style={styles.comparisonLabel}>Daily cost:</Text>
							<Text style={styles.comparisonValue}>
								${(annualCost / 365).toFixed(2)} per day
							</Text>
						</View>
					</View>
				</View>

				{/* History Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Payment History</Text>
					<View style={styles.historyCard}>
						{loadingTransactions ? (
							<View style={styles.loadingHistory}>
								<Text style={styles.loadingHistoryText}>
									Loading payment history...
								</Text>
							</View>
						) : transactions.length > 0 ? (
							transactions.map((transaction, index) => {
								const statusInfo = getStatusIconAndColor(transaction.status);
								return (
									<View key={transaction.id} style={styles.historyItem}>
										<View style={styles.historyIcon}>
											<Ionicons
												name={statusInfo.icon as any}
												size={16}
												color={statusInfo.color}
											/>
										</View>
										<View style={styles.historyContent}>
											<Text style={styles.historyTitle}>Payment Completed</Text>
											<Text style={styles.historyAmount}>
												${expense.amount.toFixed(2)} paid on $
												{formatDate(
													transaction.actualDate || transaction.expectedDate
												)}
											</Text>
										</View>
									</View>
								);
							})
						) : (
							<View style={styles.noHistory}>
								<Text style={styles.noHistoryText}>
									No payment history available
								</Text>
							</View>
						)}
					</View>
				</View>

				{/* Strategic Insights */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Strategic Insights</Text>
					<View style={styles.insightsCard}>
						<View style={styles.insightItem}>
							<Ionicons name="bulb" size={20} color="#f59e0b" />
							<Text style={styles.insightText}>
								{annualCost > 1200
									? 'This is a significant recurring expense. Consider if the value justifies the cost.'
									: annualCost > 600
									? 'This is a moderate recurring expense. Review periodically for value.'
									: 'This is a small recurring expense. Likely manageable within most budgets.'}
							</Text>
						</View>
						<View style={styles.insightItem}>
							<Ionicons name="trending-up" size={20} color="#10b981" />
							<Text style={styles.insightText}>
								{expense.frequency === 'weekly'
									? 'Weekly expenses can add up quickly. Monitor your spending patterns.'
									: expense.frequency === 'monthly'
									? 'Monthly expenses are easier to budget for and track.'
									: 'Less frequent expenses provide more time to save between payments.'}
							</Text>
						</View>
						<View style={styles.insightItem}>
							<Ionicons name="calculator" size={20} color="#3b82f6" />
							<Text style={styles.insightText}>
								{daysUntilNext <= 7
									? 'Payment is due soon. Ensure funds are available.'
									: 'You have time to plan for this payment. Consider setting aside funds.'}
							</Text>
						</View>
					</View>
				</View>

				{/* Action Recommendations */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Action Recommendations</Text>
					<View style={styles.recommendationsCard}>
						<View style={styles.recommendationItem}>
							<Ionicons name="checkmark-circle" size={20} color="#10b981" />
							<Text style={styles.recommendationText}>
								Set up automatic payments to avoid late fees
							</Text>
						</View>
						<View style={styles.recommendationItem}>
							<Ionicons name="calendar" size={20} color="#3b82f6" />
							<Text style={styles.recommendationText}>
								Mark payment dates on your calendar
							</Text>
						</View>
						<View style={styles.recommendationItem}>
							<Ionicons name="analytics" size={20} color="#f59e0b" />
							<Text style={styles.recommendationText}>
								Review this expense quarterly for value assessment
							</Text>
						</View>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		backgroundColor: '#ffffff',
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		width: 40,
	},
	screenTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#0a0a0a',
		flex: 1,
		textAlign: 'center',
	},
	placeholderButton: {
		width: 40,
	},
	content: {
		flex: 1,
	},
	overviewCard: {
		margin: 16,
		padding: 20,
		backgroundColor: '#ffffff',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	expenseHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	iconBubble: {
		width: 48,
		height: 48,
		borderRadius: 12,
		marginRight: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	expenseInfo: {
		flex: 1,
	},
	expenseName: {
		fontSize: 20,
		fontWeight: '700',
		color: '#0a0a0a',
		marginBottom: 4,
	},
	expensePeriod: {
		fontSize: 14,
		color: '#6b7280',
	},
	progressSection: {
		marginBottom: 20,
	},
	amountsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	amountItem: {
		alignItems: 'center',
		flex: 1,
	},
	amountLabel: {
		fontSize: 12,
		fontWeight: '500',
		color: '#6b7280',
		marginBottom: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	amountValue: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0a0a0a',
	},
	overBudget: {
		color: '#e11d48',
	},
	underBudget: {
		color: '#10b981',
	},
	section: {
		marginHorizontal: 16,
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0a0a0a',
		marginBottom: 12,
	},
	impactCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
	},
	impactRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	impactItem: {
		alignItems: 'center',
		flex: 1,
	},
	impactLabel: {
		fontSize: 12,
		fontWeight: '500',
		color: '#6b7280',
		marginBottom: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		textAlign: 'center',
	},
	impactValue: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0a0a0a',
		textAlign: 'center',
	},
	analysisCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
	},
	analysisItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	analysisText: {
		fontSize: 14,
		color: '#374151',
		marginLeft: 12,
		flex: 1,
	},
	comparisonCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
	},
	comparisonItem: {
		marginBottom: 16,
	},
	comparisonLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 4,
	},
	comparisonValue: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0a0a0a',
	},
	historyCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
	},
	historyItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	historyIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#f3f4f6',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	historyContent: {
		flex: 1,
	},
	historyTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 2,
	},
	historyAmount: {
		fontSize: 12,
		color: '#6b7280',
	},
	loadingHistory: {
		padding: 20,
		alignItems: 'center',
	},
	loadingHistoryText: {
		fontSize: 14,
		color: '#6b7280',
	},
	noHistory: {
		padding: 20,
		alignItems: 'center',
	},
	noHistoryText: {
		fontSize: 14,
		color: '#6b7280',
		fontStyle: 'italic',
	},
	insightsCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
	},
	insightItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	insightText: {
		fontSize: 14,
		color: '#374151',
		marginLeft: 12,
		flex: 1,
		lineHeight: 20,
	},
	recommendationsCard: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 16,
	},
	recommendationItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	recommendationText: {
		fontSize: 14,
		color: '#374151',
		marginLeft: 12,
		flex: 1,
		lineHeight: 20,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 16,
		color: '#6b7280',
	},
});

export default RecurringExpenseSummaryScreen;
