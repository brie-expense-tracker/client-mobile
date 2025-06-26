import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
	Transaction,
	transactions as dummyTransactions,
} from '../../../src/data/transactions';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/**
 * -----------------------------------------------------------------------------
 * Constants & Helpers
 * -----------------------------------------------------------------------------
 */

// Prefer env var ➜ LAN / Production fallback instead of hard‑coded localhost
const API_URL =
	process.env.EXPO_PUBLIC_API_URL ??
	'http://192.168.1.10:3000/api/transactions';

const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
}).format;

// Category → icon map lives at module scope so it isn't recreated each render
const CATEGORY_ICON_MAP: Record<
	string,
	{ name: keyof typeof Ionicons.glyphMap; color: string }
> = {
	Groceries: { name: 'cart-outline', color: '#4CAF50' },
	Utilities: { name: 'flash-outline', color: '#FFC107' },
	Entertainment: { name: 'game-controller-outline', color: '#9C27B0' },
	Travel: { name: 'airplane-outline', color: '#2196F3' },
	Health: { name: 'fitness-outline', color: '#F44336' },
	Dining: { name: 'restaurant-outline', color: '#FF9800' },
	Shopping: { name: 'bag-outline', color: '#E91E63' },
	Transportation: { name: 'car-outline', color: '#2196F3' },
	Housing: { name: 'home-outline', color: '#795548' },
	Education: { name: 'school-outline', color: '#3F51B5' },
	Salary: { name: 'cash-outline', color: '#4CAF50' },
	Investment: { name: 'trending-up-outline', color: '#009688' },
	Gifts: { name: 'gift-outline', color: '#E91E63' },
	Other: { name: 'ellipsis-horizontal-outline', color: '#9E9E9E' },
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
		const income = transactions
			.filter((t) => t.type === 'income')
			.reduce((s, t) => s + t.amount, 0);
		const expense = transactions
			.filter((t) => t.type === 'expense')
			.reduce((s, t) => s + t.amount, 0);
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
	<View style={styles.suggestionBox}>
		<View style={styles.suggestionHeader}>
			<Ionicons name="bulb-outline" size={20} color="#007AFF" />
			<Text style={styles.suggestionTitle}>AI Insights</Text>
		</View>
		<Text style={styles.suggestionText}>
			Based on your spending patterns, consider setting aside 20% of your income
			for savings this month.
		</Text>
	</View>
);

/**
 * -----------------------------------------------------------------------------
 * TransactionHistory – recent transactions list (top 6)
 * -----------------------------------------------------------------------------
 */
const TransactionHistory: React.FC<{ transactions: Transaction[] }> = ({
	transactions,
}) => (
	<View style={styles.transactionsSectionContainer}>
		<View style={styles.transactionsHeader}>
			<Text style={styles.transactionsTitle}>Recent Activity</Text>
			<TouchableOpacity onPress={() => router.push('/ledger')}>
				<Text style={styles.viewAllText}>View All</Text>
			</TouchableOpacity>
		</View>

		<View style={styles.transactionsListContainer}>
			{transactions
				.sort((a, b) => +new Date(b.date) - +new Date(a.date))
				.slice(0, 6)
				.map((t) => {
					const categoryKey = t.category?.[0] ?? 'Other';
					const iconData =
						CATEGORY_ICON_MAP[categoryKey] ?? CATEGORY_ICON_MAP['Other'];
					const { name, color } = iconData;

					return (
						<View key={t.id} style={styles.transactionItem}>
							<TouchableOpacity
								onPress={() => router.push('/ledger')}
								style={styles.transactionContent}
							>
								<View style={styles.transactionLeft}>
									<View
										style={[
											styles.iconContainer,
											{ backgroundColor: `${color}20` },
										]}
									>
										<Ionicons name={name} size={20} color={color} />
									</View>
									<View style={styles.transactionInfo}>
										<Text style={styles.transactionDescription}>
											{t.description}
										</Text>
										<Text style={styles.transactionCategory}>
											{t.category?.join(', ') || 'Other'}
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
										{t.type === 'income' ? '+' : '-'} {currency(t.amount)}
									</Text>
									<Text style={styles.transactionDate}>{t.date.slice(5)}</Text>
								</View>
							</TouchableOpacity>
						</View>
					);
				})}
		</View>
	</View>
);

/**
 * -----------------------------------------------------------------------------
 * Dashboard – main screen
 * -----------------------------------------------------------------------------
 */
const Dashboard: React.FC = () => {
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [isFetching, setIsFetching] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	/**
	 * ----------------------- Fetch data ------------------------
	 */
	const fetchTransactions = useCallback(async () => {
		setIsFetching(true);
		try {
			const { data } = await axios.get(API_URL);
			const formatted: Transaction[] = data.map((t: any) => ({
				id: t._id ?? t.id,
				description: t.description ?? '',
				amount: Number(t.amount) ?? 0,
				date: t.date ?? new Date().toISOString(),
				tags: t.tags ?? [],
				type: t.type ?? 'expense',
				category: t.category ?? ['Other'],
			}));
			setTransactions(formatted);
		} catch (err) {
			console.warn('[Dashboard] API failed, using dummy data', err);
			setTransactions(dummyTransactions);
		} finally {
			setIsFetching(false);
		}
	}, []);

	useEffect(() => {
		fetchTransactions();
	}, [fetchTransactions]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await fetchTransactions();
		setRefreshing(false);
	}, [fetchTransactions]);

	/**
	 * ------------------ Derived / memoised values ---------------
	 */
	const { totalBalance, dailyChange } = useMemo(() => {
		const balance = transactions.reduce(
			(sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
			0
		);

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const change = transactions
			.filter((t) => {
				const d = new Date(t.date);
				d.setHours(0, 0, 0, 0);
				return d.getTime() === today.getTime();
			})
			.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);

		return { totalBalance: balance, dailyChange: change } as const;
	}, [transactions]);

	/**
	 * --------------------------- UI -----------------------------
	 */
	if (isFetching) {
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
				<ScrollView
					style={styles.scrollView}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor="#007AFF"
							colors={['#007AFF']}
							progressBackgroundColor="#ffffff"
						/>
					}
				>
					<View style={[styles.contentContainer]}>
						{/* -------------------------------------------------- */}
						{/* Header */}
						{/* -------------------------------------------------- */}
						<View style={styles.headerContainer}>
							<View style={styles.headerTextContainer}>
								<Image
									source={require('../../../assets/images/brie-logos.png')}
									style={styles.logo}
									resizeMode="contain"
								/>
							</View>

							<TouchableOpacity
								onPress={() => router.push('/dashboard/notifications')}
								style={styles.notificationButton}
							>
								<View>
									<Ionicons
										name="notifications-outline"
										color="#333"
										size={24}
									/>
									<View style={styles.notificationAlertButton} />
								</View>
							</TouchableOpacity>
						</View>

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
								{currency(dailyChange)} today
							</Text>

							<SimpleBalanceWidget transactions={transactions} />
						</View>

						{/* AI Insights */}
						<AISuggestionBox />

						{/* Recent Transactions */}
						<TransactionHistory transactions={transactions} />
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
	},
	/** Header **/
	headerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 24,
	},
	headerTextContainer: {
		flexDirection: 'column',
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
		top: -2,
		right: -2,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#FF6A00',
		borderWidth: 1,
		borderColor: 'white',
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
	/** AI box **/
	suggestionBox: {
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
		padding: 20,
		marginBottom: 24,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	suggestionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	suggestionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginLeft: 8,
	},
	suggestionText: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
	},
	logo: {
		width: 100,
		height: 30,
	},
});

export default Dashboard;
