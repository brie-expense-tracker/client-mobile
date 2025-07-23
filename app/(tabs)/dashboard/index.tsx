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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useBudget } from '../../../src/context/budgetContext';
import { useGoal } from '../../../src/context/goalContext';
import { useProfile } from '@/src/context/profileContext';
import { useNotification } from '@/src/context/notificationContext';
import {
	StatWidget,
	SimpleBalanceWidget,
	QuickFinancialSummary,
	AiInsightsSummary,
	TransactionHistory,
} from './components';

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

						{/* Quick Financial Health Summary */}
						<QuickFinancialSummary transactions={transactions} />

						{/* AI Insights - Click to see Smart Actions */}
						<AiInsightsSummary
							maxInsights={1}
							compact={true}
							title="AI Insights"
						/>

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
	rowCenter: { flexDirection: 'row', alignItems: 'center' },
	logo: {
		height: 30,
		width: 80,
		alignSelf: 'center',
		marginBottom: 12,
	},
});

export default Dashboard;
