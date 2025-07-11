import React, {
	useCallback,
	useContext,
	useMemo,
	useState,
	useEffect,
} from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	RefreshControl,
	ActivityIndicator,
	Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Transaction } from '../../../src/data/transactions';
import { Ionicons } from '@expo/vector-icons';
import {
	BorderlessButton,
	GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useBudget } from '../../../src/context/budgetContext';
import { useGoal } from '../../../src/context/goalContext';
import { AIInsightsSummary } from '../../../src/components';
import { useProfile } from '@/src/context/profileContext';
import { useNotification } from '@/src/context/notificationContext';

/**
 * -----------------------------------------------------------------------------
 * Constants & Helpers
 * -----------------------------------------------------------------------------
 */

const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
}).format;

const getLocalIsoDate = (): string => {
	const today = new Date();
	// Adjust for timezone offset to ensure we get the correct local date
	const offset = today.getTimezoneOffset();
	const localDate = new Date(today.getTime() - offset * 60 * 1000);
	return localDate.toISOString().split('T')[0];
};

const formatTransactionDate = (dateString: string): string => {
	try {
		// Handle empty, null, or undefined date strings
		if (
			!dateString ||
			typeof dateString !== 'string' ||
			dateString.trim() === ''
		) {
			return 'Invalid Date';
		}

		// Extract just the date part (YYYY-MM-DD) if it's a longer string
		const datePart = dateString.slice(0, 10);

		// Check if it's a valid YYYY-MM-DD format
		if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
			return 'Invalid Date';
		}

		// Parse the date in local timezone by creating a date object
		// and adjusting for timezone offset
		const [year, month, day] = datePart.split('-').map(Number);
		const date = new Date(year, month - 1, day); // month is 0-indexed

		// Check if the date is valid
		if (isNaN(date.getTime())) {
			return 'Invalid Date';
		}

		// Check if the date is today
		const today = new Date();
		if (date.toDateString() === today.toDateString()) {
			return today.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
			});
		}

		// Format as "Jun 27" for PST timezone
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
	} catch (error) {
		return 'Invalid Date';
	}
};

/**
 * -----------------------------------------------------------------------------
 * StatWidget – small metric card
 * -----------------------------------------------------------------------------
 */
interface StatWidgetProps {
	label: string;
	value: number;
	icon: keyof typeof Ionicons.glyphMap;
	iconColor: string;
	color: string;
	progressValue?: number;
	totalValue?: number;
}

const StatWidget: React.FC<StatWidgetProps> = ({
	label,
	value,
	icon,
	iconColor,
	color,
}) => (
	<View style={styles.statWidget}>
		<View style={styles.statContent}>
			<View style={styles.statHeader}>
				<Text style={[styles.statLabel, { color }]}>{label}</Text>
			</View>
			<View style={styles.rowCenter}>
				{/* <View style={styles.statIconWrapper}> */}
				<Ionicons
					name={icon}
					size={20}
					color={iconColor}
					style={styles.statIcon}
				/>
				{/* </View> */}
				<Text style={[styles.statValue, { color }]}>{currency(value)}</Text>
			</View>
		</View>
		{/* Progress bar could go here */}
	</View>
);

/**
 * -----------------------------------------------------------------------------
 * SimpleBalanceWidget – income vs expense
 * -----------------------------------------------------------------------------
 */
interface BalanceWidgetProps {
	transactions: Transaction[];
}

const SimpleBalanceWidget: React.FC<BalanceWidgetProps> = ({
	transactions,
}) => {
	const { totalIncome, totalExpense } = useMemo(() => {
		console.log(
			'[SimpleBalanceWidget] Calculating income/expense from transactions:',
			transactions.length
		);

		const income = transactions
			.filter((t) => t.type === 'income')
			.reduce((s, t) => {
				const amount = isNaN(t.amount) ? 0 : t.amount;
				console.log(
					`[SimpleBalanceWidget] Income transaction ${t.id}: ${t.amount} -> ${amount}`
				);
				return s + amount;
			}, 0);

		const expense = transactions
			.filter((t) => t.type === 'expense')
			.reduce((s, t) => {
				const amount = isNaN(t.amount) ? 0 : t.amount;
				console.log(
					`[SimpleBalanceWidget] Expense transaction ${t.id}: ${t.amount} -> ${amount}`
				);
				return s + amount;
			}, 0);

		console.log('[SimpleBalanceWidget] Calculated totals:', {
			totalIncome: income,
			totalExpense: expense,
		});
		return { totalIncome: income, totalExpense: expense } as const;
	}, [transactions]);

	const max = Math.max(totalIncome, totalExpense);

	return (
		<View style={styles.simpleStatsContainer}>
			<View style={styles.simpleStatsRow}>
				<StatWidget
					label="Income"
					value={totalIncome}
					icon="trending-up-outline"
					color="#333"
					iconColor="#16ae05"
					progressValue={totalIncome}
					totalValue={max}
				/>
				<StatWidget
					label="Expense"
					value={totalExpense}
					icon="trending-down-outline"
					color="#333"
					iconColor="#dc2626"
					progressValue={totalExpense}
					totalValue={max}
				/>
			</View>
		</View>
	);
};

/**
 * -----------------------------------------------------------------------------
 * AI suggestion banner
 * -----------------------------------------------------------------------------
 */
const AISuggestionBox = () => (
	<AIInsightsSummary
		maxInsights={1}
		showGenerateButton={false}
		compact={false}
		title="AI Insights"
	/>
);

/**
 * -----------------------------------------------------------------------------
 * TransactionHistory – recent transactions list (top 6)
 * -----------------------------------------------------------------------------
 */
const TransactionHistory: React.FC<{
	transactions: Transaction[];
	onPress: (isPressed: boolean) => void;
}> = ({ transactions, onPress }) => {
	const { budgets } = useBudget();
	const { goals } = useGoal();

	const recentTransactions = transactions
		.sort((a, b) => {
			// First, compare by date (newest first)
			const dateA = new Date(a.date);
			const dateB = new Date(b.date);

			if (dateA.getTime() !== dateB.getTime()) {
				return dateB.getTime() - dateA.getTime(); // Newest date first
			}

			// If dates are the same, compare by updatedAt time (newest first)
			const updatedAtA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
			const updatedAtB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);

			return updatedAtB.getTime() - updatedAtA.getTime(); // Newest time first
		})
		.slice(0, 6);

	// Helper function to get target name and percentage
	const getTargetName = (transaction: Transaction): string => {
		if (transaction.target && transaction.targetModel) {
			if (transaction.targetModel === 'Budget') {
				const budget = budgets.find((b) => b.id === transaction.target);
				if (budget) {
					const percentage = budget.spentPercentage
						? `${Math.round(budget.spentPercentage)}%`
						: '';
					return `${budget.name}${percentage ? ` (${percentage})` : ''}`;
				}
				return 'Unknown Budget';
			} else if (transaction.targetModel === 'Goal') {
				const goal = goals.find((g) => g.id === transaction.target);
				if (goal) {
					const percentage =
						goal.target > 0
							? `${Math.round((goal.current / goal.target) * 100)}%`
							: '';
					return `${goal.name}${percentage ? ` (${percentage})` : ''}`;
				}
				return 'Unknown Goal';
			}
		}

		// Fallback: show transaction type when no target is specified
		return transaction.type === 'income' ? 'Income' : 'Expense';
	};

	// Helper function to get transaction context (icon and color from target)
	const getTransactionContext = (transaction: Transaction) => {
		if (transaction.target && transaction.targetModel) {
			if (transaction.targetModel === 'Budget') {
				const budget = budgets.find((b) => b.id === transaction.target);
				if (budget) {
					return {
						icon: budget.icon as keyof typeof Ionicons.glyphMap,
						color: budget.color,
					};
				}
			} else if (transaction.targetModel === 'Goal') {
				const goal = goals.find((g) => g.id === transaction.target);
				if (goal) {
					return {
						icon: goal.icon as keyof typeof Ionicons.glyphMap,
						color: goal.color,
					};
				}
			}
		}

		// Fallback for transactions without target or when target not found
		// Use more descriptive icons based on transaction type
		if (transaction.type === 'income') {
			return {
				icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap,
				color: '#16a34a', // Green for income
			};
		} else {
			return {
				icon: 'trending-down-outline' as keyof typeof Ionicons.glyphMap,
				color: '#dc2626', // Red for expense
			};
		}
	};

	return (
		<View style={styles.transactionsSectionContainer}>
			<View style={styles.transactionsHeader}>
				<Text style={styles.transactionsTitle}>Recent Activity</Text>
				<TouchableOpacity onPress={() => router.push('/dashboard/ledger')}>
					<Text style={styles.viewAllText}>View All</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.transactionsListContainer}>
				{recentTransactions.length > 0 ? (
					recentTransactions.map((t) => {
						// Get icon and color from transaction's target
						const iconData = getTransactionContext(t);

						return (
							<View key={t.id} style={styles.transactionItem}>
								<BorderlessButton
									onPress={() => router.push('/dashboard/ledger')}
									style={styles.transactionContent}
									onActiveStateChange={onPress}
								>
									<View style={styles.transactionLeft}>
										<View
											style={[
												styles.iconContainer,
												{ backgroundColor: `${iconData.color}20` },
											]}
										>
											<Ionicons
												name={iconData.icon}
												size={20}
												color={iconData.color}
											/>
										</View>
										<View style={styles.transactionInfo}>
											<Text style={styles.transactionDescription}>
												{t.description}
											</Text>
											<Text style={styles.transactionCategory}>
												{getTargetName(t)}
											</Text>
										</View>
									</View>

									<View style={styles.transactionRight}>
										<Text
											style={[
												styles.transactionAmount,
												t.type === 'income'
													? styles.incomeAmount
													: styles.expenseAmount,
											]}
										>
											{t.type === 'income' ? '+' : '-'}{' '}
											{currency(isNaN(t.amount) ? 0 : t.amount)}
										</Text>
										<Text style={styles.transactionDate}>
											{formatTransactionDate(t.date)}
										</Text>
									</View>
								</BorderlessButton>
							</View>
						);
					})
				) : (
					<View style={styles.emptyContainer}>
						<Ionicons name="document-outline" size={48} color="#ccc" />
						<Text style={styles.emptyText}>No transactions</Text>
					</View>
				)}
			</View>
		</View>
	);
};

/**
 * -----------------------------------------------------------------------------
 * Dashboard – main screen
 * -----------------------------------------------------------------------------
 */
const Dashboard: React.FC = () => {
	const { transactions, isLoading, refetch } = useContext(TransactionContext);
	const { budgets } = useBudget();
	const { goals } = useGoal();
	const { profile, loading: profileLoading } = useProfile();
	const { unreadCount } = useNotification();
	const [isPressed, setIsPressed] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	// Debug logging
	useEffect(() => {
		console.log('[Dashboard] Current state:', {
			transactionsCount: transactions.length,
			transactions: transactions.slice(0, 3).map((tx) => ({
				id: tx.id,
				description: tx.description,
				type: tx.type,
				amount: tx.amount,
				target: tx.target,
				targetModel: tx.targetModel,
				date: tx.date,
			})),
			budgetsCount: budgets.length,
			goalsCount: goals.length,
			isLoading,
		});
	}, [transactions, budgets, goals, isLoading]);

	const onRefresh = useCallback(async () => {
		console.log('[Dashboard] onRefresh called');
		setRefreshing(true);
		try {
			await refetch();
		} catch (error) {
			console.error('Error refreshing dashboard:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refetch]);

	/**
	 * ------------------ Derived / memoised values ---------------
	 */
	const { totalBalance, dailyChange } = useMemo(() => {
		console.log(
			'[Dashboard] Calculating balance from transactions:',
			transactions.length
		);

		const balance = transactions.reduce((sum, t) => {
			const amount =
				t.type === 'income'
					? isNaN(t.amount)
						? 0
						: t.amount
					: -(isNaN(t.amount) ? 0 : t.amount);
			console.log(
				`[Dashboard] Transaction ${t.id}: ${t.type} ${t.amount} -> contribution: ${amount}`
			);
			return sum + amount;
		}, 0);

		// Use timezone-aware date handling (from ledger)
		const today = getLocalIsoDate();
		console.log("[Dashboard] Today's date:", today);

		const change = transactions
			.filter((t) => {
				// Compare transaction date with today's date using ISO string format
				const txDay = t.date.slice(0, 10);
				const isToday = txDay === today;
				console.log(
					`[Dashboard] Transaction ${t.id} date: ${t.date} -> ${txDay}, isToday: ${isToday}`
				);
				return isToday;
			})
			.reduce((s, t) => {
				const amount =
					t.type === 'income'
						? isNaN(t.amount)
							? 0
							: t.amount
						: -(isNaN(t.amount) ? 0 : t.amount);
				console.log(
					`[Dashboard] Today's transaction ${t.id}: ${t.type} ${t.amount} -> contribution: ${amount}`
				);
				return s + amount;
			}, 0);

		console.log('[Dashboard] Calculated values:', {
			totalBalance: balance,
			dailyChange: change,
		});
		return { totalBalance: balance, dailyChange: change } as const;
	}, [transactions]);

	/**
	 * --------------------------- UI -----------------------------
	 */
	if (isLoading) {
		return (
			<SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007AFF" />
					<Text style={styles.loadingText}>Loading your dashboard...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
			<GestureHandlerRootView style={{ flex: 1 }}>
				{/* -------------------------------------------------- */}
				{/* Sticky Header */}
				{/* -------------------------------------------------- */}
				<View style={styles.stickyHeader}>
					<Image
						source={require('../../../src/assets/images/brie-logos.png')}
						style={styles.logo}
						resizeMode="contain"
					/>

					<TouchableOpacity
						onPress={() => router.push('/dashboard/notifications')}
						style={styles.notificationButton}
					>
						<View>
							<Ionicons name="notifications-outline" color="#333" size={24} />
							{unreadCount > 0 && (
								<View style={styles.notificationAlertButton}>
									<Text style={styles.notificationBadgeText}>
										{unreadCount > 99 ? '99+' : unreadCount}
									</Text>
								</View>
							)}
						</View>
					</TouchableOpacity>
				</View>

				<ScrollView
					style={styles.scrollView}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor="#00a2ff"
							colors={['#00a2ff']}
							progressBackgroundColor="#ffffff"
						/>
					}
				>
					<View style={[styles.contentContainer]}>
						{/* -------------------------------------------------- */}
						{/* Balance card */}
						{/* -------------------------------------------------- */}
						<View style={styles.headerCard}>
							<Text style={styles.balanceLabel}>Your Balance</Text>
							<View style={styles.rowCenter}>
								<Text style={styles.balanceAmount}>
									{currency(totalBalance)}
								</Text>
							</View>
							<Text
								style={[
									styles.dailyChange,
									{ color: dailyChange >= 0 ? '#16a34a' : '#dc2626' },
								]}
							>
								{dailyChange >= 0 ? '+' : ''}
								{currency(dailyChange)}{' '}
								{new Date().toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
								})}
							</Text>

							<SimpleBalanceWidget transactions={transactions} />
						</View>

						{/* AI Insights */}
						<AISuggestionBox />

						{/* Recent Transactions */}
						<TransactionHistory
							transactions={transactions}
							onPress={setIsPressed}
						/>
					</View>
				</ScrollView>
			</GestureHandlerRootView>
		</SafeAreaView>
	);
};

/**
 * -----------------------------------------------------------------------------
 * Styles
 * -----------------------------------------------------------------------------
 */
const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#fff',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
		fontWeight: '500',
	},
	scrollView: {
		flex: 1,
		backgroundColor: '#fff',
	},
	contentContainer: {
		padding: 24,
		paddingTop: 0,
	},
	/** Header **/
	stickyHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
		zIndex: 1000,
	},
	headerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
		flex: 1,
	},
	notificationButton: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	notificationAlertButton: {
		position: 'absolute',
		top: -4,
		right: -4,
		minWidth: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: '#dc2626',
		borderWidth: 2,
		borderColor: 'white',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 4,
	},
	notificationBadgeText: {
		color: 'white',
		fontSize: 10,
		fontWeight: 'bold',
		textAlign: 'center',
	},
	/** Balance card **/
	headerCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 20,
		marginBottom: 24,
		borderWidth: 1,
		borderColor: '#efefef',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	balanceLabel: {
		color: '#666',
		fontSize: 14,
		fontWeight: '500',
		marginBottom: 8,
	},
	balanceAmount: {
		color: '#333',
		fontSize: 32,
		fontWeight: '600',
	},
	dailyChange: {
		fontSize: 16,
		fontWeight: '500',
		marginVertical: 8,
	},
	/** Stat widget **/
	statWidget: {
		flex: 1,
		borderRadius: 12,
		backgroundColor: '#fff',
	},
	statContent: { flex: 1 },
	statHeader: { marginBottom: 12 },
	statLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#666',
	},
	statValue: {
		fontSize: 18,
		fontWeight: '600',
	},
	statIcon: {
		marginRight: 8,
	},
	statIconWrapper: {
		height: 36,
		width: 36,
		borderRadius: 18,
		backgroundColor: '#f8f9fa',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8,
	},
	/** Rows **/
	rowCenter: { flexDirection: 'row', alignItems: 'center' },
	simpleStatsContainer: { marginTop: 16 },
	simpleStatsRow: { flexDirection: 'row', gap: 12 },
	/** Transaction list **/
	transactionsSectionContainer: {
		marginTop: 8,
	},
	transactionsHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	transactionsTitle: {
		fontWeight: '600',
		fontSize: 18,
		color: '#333',
	},
	viewAllText: {
		color: '#889195',
		fontSize: 14,
		fontWeight: '500',
	},
	transactionsListContainer: {
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#efefef',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
		backgroundColor: '#fff',
	},
	transactionItem: {
		borderRadius: 12,
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	transactionContent: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		flex: 1,
	},
	transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	transactionInfo: { flex: 1 },
	transactionDescription: {
		fontWeight: '500',
		color: '#333',
		fontSize: 16,
	},
	transactionCategory: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
	},
	transactionRight: { alignItems: 'flex-end' },
	transactionAmount: {
		fontSize: 16,
		fontWeight: '600',
	},
	transactionDate: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
	},
	incomeAmount: { color: '#16a34a' },
	expenseAmount: { color: '#dc2626' },
	logo: {
		height: 30,
		width: 80,
		alignSelf: 'center',
		marginBottom: 12,
	},

	emptyContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
		fontWeight: '500',
	},
});

export default Dashboard;
