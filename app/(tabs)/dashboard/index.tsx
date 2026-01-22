import React, {
	useCallback,
	useContext,
	useMemo,
	useState,
	useEffect,
	useRef,
} from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	RefreshControl,
	ActivityIndicator,
	Image,
	TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useNotification } from '../../../src/context/notificationContext';
import useAuth from '../../../src/context/AuthContext';
import { InsightsService, AIInsight } from '../../../src/services/feature/insightsService';
import {
	DashboardService,
	DashboardRollup,
} from '../../../src/services/feature/dashboardService';
import {
	accessibilityProps,
	generateAccessibilityLabel,
} from '../../../src/utils/accessibility';
import { palette, space, type } from '../../../src/ui/theme';
import { useDevModeEasterEgg } from '../../../src/hooks/useDevModeEasterEgg';
import {
	AppScreen,
	AppCard,
	AppText,
	AppButton,
	HeroCard,
} from '../../../src/ui/primitives';

const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
}).format;

export default function DashboardPro() {
	const { transactions, isLoading, refetch } = useContext(TransactionContext);
	const { unreadCount } = useNotification();
	const { firebaseUser, user } = useAuth();
	const insets = useSafeAreaInsets();
	const [refreshing, setRefreshing] = useState(false);
	const [weeklyInsights, setWeeklyInsights] = useState<AIInsight[]>([]);
	const [insightsLoading, setInsightsLoading] = useState(false);
	const [rollup, setRollup] = useState<DashboardRollup | null>(null);
	const { handleLogoTap } = useDevModeEasterEgg();
	
	// Track when data was last fetched to avoid unnecessary refetches
	const lastFetchTimeRef = useRef<number>(0);
	const isInitialMountRef = useRef(true);
	const STALE_DATA_THRESHOLD = 30000; // 30 seconds

	const fetchWeeklyInsights = useCallback(async (showLoading = true) => {
		if (!firebaseUser || !user) {
			setWeeklyInsights([]);
			return;
		}

		try {
			if (showLoading) {
				setInsightsLoading(true);
			}
			const response = await InsightsService.getInsights('weekly');
			if (response.success && response.data) {
				setWeeklyInsights(response.data);
			}
		} catch (error: any) {
			if (error?.isAuthError || error?.message === 'User not authenticated') {
				setWeeklyInsights([]);
				return;
			}
			console.error('Error fetching weekly insights:', error);
			setWeeklyInsights([]);
		} finally {
			if (showLoading) {
				setInsightsLoading(false);
			}
		}
	}, [firebaseUser, user]);

	const generateWeeklyInsights = useCallback(async () => {
		if (!firebaseUser || !user) {
			return;
		}

		try {
			setInsightsLoading(true);
			const response = await InsightsService.generateInsights('weekly');
			if (response.success && response.data) {
				setWeeklyInsights(response.data);
			} else {
				// If generation fails, try fetching existing insights
				await fetchWeeklyInsights(true);
			}
		} catch (error: any) {
			if (error?.isAuthError || error?.message === 'User not authenticated') {
				setWeeklyInsights([]);
				return;
			}
			console.error('Error generating weekly insights:', error);
			// On error, try to fetch existing insights as fallback
			await fetchWeeklyInsights(true);
		} finally {
			setInsightsLoading(false);
		}
	}, [firebaseUser, user, fetchWeeklyInsights]);

	const fetchRollup = useCallback(async () => {
		if (!firebaseUser || !user) {
			setRollup(null);
			return;
		}

		try {
			const data = await DashboardService.getDashboardRollup();
			if (data && data.cashflow && data.budgets && data.debts && data.recurring) {
				setRollup(data);
			}
		} catch (error: any) {
			if (error?.isAuthError || error?.message === 'User not authenticated') {
				setRollup(null);
				return;
			}
			console.error('Error fetching dashboard rollup:', error);
			setRollup(null);
		}
	}, [firebaseUser, user]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await Promise.all([refetch(), fetchWeeklyInsights(true), fetchRollup()]);
			lastFetchTimeRef.current = Date.now();
		} finally {
			setRefreshing(false);
		}
	}, [refetch, fetchWeeklyInsights, fetchRollup]);

	// Initial fetch - only runs once on mount
	useEffect(() => {
		if (isInitialMountRef.current) {
			isInitialMountRef.current = false;
			const loadInitialData = async () => {
				await Promise.all([fetchWeeklyInsights(true), fetchRollup()]);
				lastFetchTimeRef.current = Date.now();
			};
			loadInitialData();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Empty deps - only run once on mount, functions are stable via useCallback

	// Refresh when dashboard comes into focus - only if data is stale
	useFocusEffect(
		useCallback(() => {
			const now = Date.now();
			const timeSinceLastFetch = now - lastFetchTimeRef.current;
			const isDataStale = timeSinceLastFetch > STALE_DATA_THRESHOLD;
			
			// Only refetch if stale or if we don't have data yet
			if (isDataStale || !rollup || weeklyInsights.length === 0) {
				refetch();
				fetchWeeklyInsights(false);
				fetchRollup();
				lastFetchTimeRef.current = now;
			}
		}, [refetch, fetchWeeklyInsights, fetchRollup, rollup, weeklyInsights.length])
	);

	// Calculate simple balance
	const { totalBalance, weeklyNet } = useMemo(() => {
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);
		const weekAgoIso = weekAgo.toISOString().split('T')[0];

		let balance = 0;
		let weekly = 0;

		for (const t of transactions) {
			const amt = isNaN(t.amount) ? 0 : t.amount;
			balance += amt;

			const d = (t.date || '').slice(0, 10);
			if (d >= weekAgoIso) {
				weekly += amt;
			}
		}

		return { totalBalance: balance, weeklyNet: weekly };
	}, [transactions]);

	// Calculate today's focus action
	const todayFocus = useMemo(() => {
		if (!rollup) {
			// Default focus if no data yet
			return {
				message: 'Review your finances',
				onPress: () => router.push('/(tabs)/wallet'),
			};
		}

		// Priority 1: Bills due today
		const billDueToday = rollup.recurring?.upcoming?.find(
			(bill) => bill.daysUntilDue === 0
		);
		if (billDueToday) {
			return {
				message: 'Pay 1 bill due today',
				onPress: () => router.push('/(tabs)/wallet/bills'),
			};
		}

		// Priority 2: No budgets created
		const totalBudgets = rollup.budgets?.totalBudgets || 0;
		if (totalBudgets === 0) {
			return {
				message: 'Create your first budget',
				onPress: () => router.push('/(tabs)/wallet/budgets'),
			};
		}

		// Priority 3: Default - review finances in Wallet
		return {
			message: 'Review your finances',
			onPress: () => router.push('/(tabs)/wallet'),
		};
	}, [rollup]);

	// Get recent transactions (last 3)
	const recentTransactions = useMemo(() => {
		return [...transactions]
			.sort((a, b) => {
				const dateA = new Date(a.date || 0).getTime();
				const dateB = new Date(b.date || 0).getTime();
				return dateB - dateA;
			})
			.slice(0, 3);
	}, [transactions]);


	if (isLoading) {
		return (
			<AppScreen edges={['left', 'right']} scrollable={false}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={palette.primary} />
					<AppText.Body style={styles.loadingText}>
						Loading your dashboard…
					</AppText.Body>
				</View>
			</AppScreen>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
			<GestureHandlerRootView style={{ flex: 1 }}>
				{/* ---------- Sticky Header ---------- */}
				<View style={styles.stickyHeader}>
					<TouchableOpacity
						onPress={handleLogoTap}
						activeOpacity={0.7}
						style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
					>
						<Image
							source={require('../../../src/assets/logos/brie-logo.png')}
							style={styles.logo}
							resizeMode="contain"
							accessibilityRole="image"
							accessibilityLabel="Brie app logo"
						/>
					</TouchableOpacity>

					<View style={styles.headerButtons}>
						<TouchableOpacity
							onPress={() => router.push('/dashboard/notifications')}
							style={styles.headerButton}
							{...accessibilityProps.button}
							accessibilityLabel={generateAccessibilityLabel.button(
								'Open',
								'notifications'
							)}
						>
							<View>
								<Ionicons
									name="notifications-outline"
									color={palette.text}
									size={24}
								/>
								{unreadCount > 0 && (
									<View style={styles.notificationBadge}>
										<Text style={styles.notificationBadgeText}>
											{unreadCount > 99 ? '99+' : unreadCount}
										</Text>
									</View>
								)}
							</View>
						</TouchableOpacity>
					</View>
				</View>

				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={[
						styles.content,
						{ paddingBottom: insets.bottom + space.xxl },
					]}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor={palette.primary}
							colors={[palette.primary]}
							progressBackgroundColor={palette.surface}
						/>
					}
					keyboardShouldPersistTaps="handled"
				>
					{/* Simple Balance Summary */}
					<SimpleBalanceCard balance={totalBalance} weeklyNet={weeklyNet} />

					{/* Today's Focus */}
					<TodaysFocusCard focus={todayFocus} />

					{/* Weekly Money Check-In - Hero Card */}
					<WeeklyCheckInCard
						insights={weeklyInsights}
						loading={insightsLoading}
						onViewAll={() => {
							const topInsight = weeklyInsights[0];
							const msg = topInsight
								? `Weekly check-in: "${topInsight.title}". ${topInsight.message}\n\nExplain what caused this and what I should do next.`
								: "Show me my weekly money check-in. Summarize the key patterns and give me 1-2 actions for this week.";
							router.push(
								`/(tabs)/chat?initialMessage=${encodeURIComponent(msg)}`
							);
						}}
						onGenerateInsights={generateWeeklyInsights}
					/>

					{/* Can I Afford X? Entry Point */}
					<CanIAffordCard />

					{/* Recent Transactions (3 items) */}
					{recentTransactions.length > 0 && (
						<RecentTransactionsList transactions={recentTransactions} />
					)}

					{/* Quick Action - Add Transaction */}
					<AppButton
						label="Add Transaction"
						variant="ghost"
						icon="add-circle"
						iconPosition="left"
						onPress={() => router.push('/(tabs)/transaction')}
						fullWidth
					/>
				</ScrollView>
			</GestureHandlerRootView>
		</SafeAreaView>
	);
}

/** ----------------- Subcomponents ----------------- */

function SimpleBalanceCard({
	balance,
	weeklyNet,
}: {
	balance: number;
	weeklyNet: number;
}) {
	const isPositive = balance >= 0;
	const weeklyIsPositive = weeklyNet >= 0;

	return (
		<AppCard>
			<AppText.Label color="muted">Transaction Balance</AppText.Label>
			<AppText.Body color="subtle" style={simpleBalanceStyles.subtitle}>
				Manual balance
			</AppText.Body>
			<AppText
				style={simpleBalanceStyles.amount}
				color={isPositive ? 'default' : 'danger'}
			>
				{currency(balance)}
			</AppText>
			<View style={simpleBalanceStyles.weeklyRow}>
				<Ionicons
					name={weeklyIsPositive ? 'arrow-up' : 'arrow-down'}
					size={14}
					color={weeklyIsPositive ? palette.success : palette.danger}
				/>
				<AppText.Body
					style={simpleBalanceStyles.weeklyText}
					color={weeklyIsPositive ? 'success' : 'danger'}
				>
					{weeklyIsPositive ? '+' : ''}
					{currency(weeklyNet)} this week
				</AppText.Body>
			</View>
		</AppCard>
	);
}

function WeeklyCheckInCard({
	insights,
	loading,
	onViewAll,
	onGenerateInsights,
}: {
	insights: AIInsight[];
	loading: boolean;
	onViewAll: () => void;
	onGenerateInsights: () => void;
}) {
	const hasInsights = insights.length > 0;
	const topInsight = insights[0];

	return (
		<HeroCard
			variant="gradient"
			onPress={hasInsights ? onViewAll : onGenerateInsights}
			accessibilityLabel="Weekly Money Check-In"
			contentStyle={checkInStyles.content}
		>
			<View style={checkInStyles.header}>
					<View style={checkInStyles.iconContainer}>
						<Ionicons name="sparkles" size={24} color={palette.primaryTextOn} />
					</View>
					<View style={{ flex: 1 }}>
						<AppText.Heading style={checkInStyles.title}>
							Weekly Money Check-In
						</AppText.Heading>
						<AppText.Body style={checkInStyles.subtitle}>
							{hasInsights
								? 'Chat with AI about your financial patterns'
								: 'Get personalized insights and action steps'}
						</AppText.Body>
					</View>
					<Ionicons name="chevron-forward" size={20} color={palette.primaryTextOn} />
			</View>

				{loading ? (
					<View style={checkInStyles.loadingContainer}>
						<ActivityIndicator size="small" color={palette.primaryTextOn} />
						<Text style={checkInStyles.loadingText}>
							Analyzing your transactions...
						</Text>
					</View>
			) : hasInsights ? (
				<View style={checkInStyles.insightContainer}>
					<AppText.Heading style={checkInStyles.insightTitle} numberOfLines={2}>
						{topInsight.title}
					</AppText.Heading>
					<AppText.Body style={checkInStyles.insightMessage} numberOfLines={3}>
						{topInsight.message}
					</AppText.Body>
					{insights.length > 1 && (
						<View style={checkInStyles.moreContainer}>
							<AppText.Body style={checkInStyles.moreText}>
								{insights.length} insights ready
							</AppText.Body>
							<AppText.Caption style={checkInStyles.tapText}>
								Tap to chat through it
							</AppText.Caption>
						</View>
					)}
				</View>
			) : (
				<View style={checkInStyles.emptyContainer}>
					<AppText.Body style={checkInStyles.emptyText}>
						Tap to get action steps
					</AppText.Body>
				</View>
			)}
		</HeroCard>
	);
}

function TodaysFocusCard({
	focus,
}: {
	focus: { message: string; onPress: () => void };
}) {
	return (
		<AppCard onPress={focus.onPress} accessibilityLabel={focus.message}>
			<View style={focusStyles.content}>
				<View style={focusStyles.iconContainer}>
					<Ionicons name="flag" size={20} color={palette.primary} />
				</View>
				<View style={focusStyles.textContainer}>
					<AppText.Label style={focusStyles.label}>Today&apos;s Focus</AppText.Label>
					<AppText.Heading style={focusStyles.message}>
						{focus.message}
					</AppText.Heading>
				</View>
				<Ionicons name="chevron-forward" size={20} color={palette.textSubtle} />
			</View>
		</AppCard>
	);
}

function CanIAffordCard() {
	const [amount, setAmount] = useState('');
	const [item, setItem] = useState('');

	const handleAsk = () => {
		const trimmedAmount = amount.trim();
		const trimmedItem = item.trim();
		
		if (!trimmedAmount || !trimmedItem) return;

		// Format the message
		const message = `Can I afford $${trimmedAmount} for ${trimmedItem}?`;
		
		// Navigate to chat with the message as a query parameter
		// Encode the message to handle special characters
		const encodedMessage = encodeURIComponent(message);
		router.push(`/(tabs)/chat?initialMessage=${encodedMessage}`);
	};

	const canSubmit = amount.trim().length > 0 && item.trim().length > 0;

	return (
		<AppCard>
			<View style={affordStyles.header}>
				<Ionicons name="calculator-outline" size={20} color={palette.primary} />
				<AppText.Heading style={affordStyles.title}>Can I afford X?</AppText.Heading>
			</View>
			<View style={affordStyles.inputContainer}>
				<View style={affordStyles.amountRow}>
					<AppText.Body style={affordStyles.dollarSign}>$</AppText.Body>
					<TextInput
						style={affordStyles.amountInput}
						value={amount}
						onChangeText={setAmount}
						placeholder="Amount"
						placeholderTextColor={palette.textSubtle}
						keyboardType="decimal-pad"
						maxLength={10}
					/>
				</View>
				<TextInput
					style={affordStyles.itemInput}
					value={item}
					onChangeText={setItem}
					placeholder="What do you want to buy?"
					placeholderTextColor={palette.textSubtle}
					maxLength={50}
				/>
			</View>
			<AppButton
				label="Ask AI"
				variant="primary"
				icon="arrow-forward"
				onPress={handleAsk}
				disabled={!canSubmit}
				fullWidth
			/>
		</AppCard>
	);
}

// Removed SnapshotRow - finance widgets moved to Wallet tab

function RecentTransactionsList({
	transactions,
}: {
	transactions: { _id?: string; description?: string; amount: number; date?: string; type?: string }[];
}) {
	return (
		<AppCard>
			<View style={recentStyles.header}>
				<AppText.Heading style={recentStyles.title}>Recent Activity</AppText.Heading>
				<TouchableOpacity onPress={() => router.push('/(tabs)/wallet')}>
					<AppText.Body color="primary" style={recentStyles.viewAll}>
						View All
					</AppText.Body>
				</TouchableOpacity>
			</View>
					{transactions.map((tx, index) => {
						const isExpense = tx.type === 'expense' || tx.amount < 0;
						const amount = Math.abs(tx.amount);
						const date = tx.date ? new Date(tx.date).toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
						}) : '';

						return (
							<TouchableOpacity
								key={tx._id || index}
								style={recentStyles.transaction}
								onPress={() => router.push('/(tabs)/wallet')}
								activeOpacity={0.7}
							>
								<View style={recentStyles.transactionContent}>
								<AppText.Body style={recentStyles.transactionDesc} numberOfLines={1}>
									{tx.description || 'Transaction'}
								</AppText.Body>
								<AppText.Caption color="muted" style={recentStyles.transactionDate}>
									{date}
								</AppText.Caption>
								</View>
								<AppText.Body
									style={recentStyles.transactionAmount}
									color={isExpense ? 'danger' : 'success'}
								>
									{isExpense ? '-' : '+'}
									{currency(amount)}
								</AppText.Body>
							</TouchableOpacity>
						);
					})}
		</AppCard>
	);
}

/** ----------------- Styles ----------------- */

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: palette.surfaceAlt },
	loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	loadingText: {
		marginTop: 16,
		...type.h2,
		color: palette.textMuted,
	},
	scrollView: { flex: 1, backgroundColor: palette.surfaceAlt },
	content: {
		paddingHorizontal: space.xl,
		paddingTop: space.md,
		// paddingBottom now handled inline with safe area insets
		gap: 20,
	},
	stickyHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: space.xl,
		paddingTop: space.sm,
		paddingBottom: space.sm,
		backgroundColor: palette.surfaceAlt,
	},
	logo: { height: 40, width: 90 },
	headerButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	headerButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
	},
	notificationBadge: {
		position: 'absolute',
		top: -2,
		right: -2,
		minWidth: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: palette.danger,
		borderWidth: 2,
		borderColor: palette.surface,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 4,
	},
	notificationBadgeText: {
		color: palette.surface,
		...type.labelXs,
		textAlign: 'center',
	},
	// quickAddButton styles moved to AppButton primitive
});

const simpleBalanceStyles = StyleSheet.create({
	subtitle: {
		marginBottom: 8,
	},
	amount: {
		...type.num2xl,
		letterSpacing: -0.5,
		marginBottom: 12,
	},
	weeklyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	weeklyText: {
		...type.body,
		fontWeight: '600',
	},
});

const checkInStyles = StyleSheet.create({
	content: {
		minHeight: 160,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 20,
	},
	iconContainer: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: 'rgba(255, 255, 255, 0.25)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		...type.h1,
		fontWeight: '800',
		color: palette.primaryTextOn,
		marginBottom: 4,
		letterSpacing: -0.3,
	},
	subtitle: {
		...type.body,
		color: palette.primaryTextOn,
		opacity: 0.95,
	},
	loadingContainer: {
		alignItems: 'center',
		paddingVertical: 20,
	},
	loadingText: {
		marginTop: 12,
		...type.body,
		color: 'rgba(255, 255, 255, 0.9)',
	},
	insightContainer: {
		backgroundColor: 'rgba(255, 255, 255, 0.15)',
		borderRadius: 16,
		padding: 16,
	},
	insightTitle: {
		...type.h2,
		color: palette.primaryTextOn,
		marginBottom: 8,
	},
	insightMessage: {
		...type.body,
		color: palette.primaryTextOn,
		opacity: 0.95,
		lineHeight: 20,
		marginBottom: 8,
	},
	moreContainer: {
		marginTop: 8,
	},
	moreText: {
		...type.body,
		fontWeight: '600',
		color: palette.primaryTextOn,
		opacity: 0.95,
		marginBottom: 2,
	},
	tapText: {
		...type.small,
		color: palette.primaryTextOn,
		opacity: 0.8,
	},
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: 20,
	},
	emptyText: {
		...type.body,
		color: palette.primaryTextOn,
		opacity: 0.9,
	},
});

const focusStyles = StyleSheet.create({
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: palette.primarySoft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	textContainer: {
		flex: 1,
	},
	label: {
		...type.labelSm,
		color: palette.textMuted,
		marginBottom: 4,
	},
	message: {
		...type.h2,
		color: palette.text,
	},
});

// Removed snapshotStyles - finance widgets moved to Wallet tab

const recentStyles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	title: {
		...type.h2,
		color: palette.text,
	},
	viewAll: {
		...type.body,
		fontWeight: '600',
		color: palette.primary,
	},
	transaction: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: palette.subtle,
	},
	transactionContent: {
		flex: 1,
		marginRight: 12,
	},
	transactionDesc: {
		...type.body,
		fontWeight: '600',
		color: palette.text,
		marginBottom: 2,
	},
	transactionDate: {
		...type.bodyXs,
		color: palette.textMuted,
	},
	transactionAmount: {
		...type.body,
		fontWeight: '700',
	},
});

const affordStyles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 12,
	},
	title: {
		...type.h2,
		color: palette.text,
	},
	inputContainer: {
		gap: 12,
		marginBottom: 12,
	},
	amountRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: palette.surfaceAlt,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderWidth: 1,
		borderColor: palette.borderSubtle,
	},
	dollarSign: {
		...type.numLg,
		color: palette.text,
		marginRight: 4,
	},
	amountInput: {
		flex: 1,
		...type.numLg,
		color: palette.text,
		padding: 0,
	},
	itemInput: {
		backgroundColor: palette.surfaceAlt,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		...type.body,
		color: palette.text,
		borderWidth: 1,
		borderColor: palette.borderSubtle,
	},
	askButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		backgroundColor: palette.primary,
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 12,
	},
	askButtonDisabled: {
		backgroundColor: palette.textSubtle,
		opacity: 0.6,
	},
	askButtonText: {
		...type.body,
		fontWeight: '700',
		color: palette.primaryTextOn,
	},
});
