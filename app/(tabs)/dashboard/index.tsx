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
	Animated,
	Easing,
	Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
	Path,
	Defs,
	LinearGradient as SvgGrad,
	Stop,
} from 'react-native-svg';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useNotification } from '../../../src/context/notificationContext';
import { useGoal } from '../../../src/context/goalContext';
import { TransactionHistory } from './components';
import {
	DashboardService,
	DashboardRollup,
} from '../../../src/services/feature/dashboardService';
import {
	accessibilityProps,
	dynamicTextStyle,
	generateAccessibilityLabel,
} from '../../../src/utils/accessibility';
import BottomSheet from '../../../src/components/BottomSheet';
import { palette, space, shadow } from '../../../src/ui/theme';

const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
}).format;
const getLocalIsoDate = () => {
	const today = new Date();
	const offset = today.getTimezoneOffset();
	const localDate = new Date(today.getTime() - offset * 60 * 1000);
	return localDate.toISOString().split('T')[0];
};

export default function DashboardPro() {
	const { transactions, isLoading, refetch } = useContext(TransactionContext);
	const { unreadCount } = useNotification();
	const { goals } = useGoal();
	const params = useLocalSearchParams<{ transactionImpact?: string }>();
	const [refreshing, setRefreshing] = useState(false);
	const [rollup, setRollup] = useState<DashboardRollup | null>(null);
	const [rollupLoading, setRollupLoading] = useState(true);
	const [transactionImpact, setTransactionImpact] = useState<{
		message: string;
		type: 'debt' | 'budget' | 'goal' | 'none';
	} | null>(null);
	const [helpModalOpen, setHelpModalOpen] = useState<string | null>(null);
	const [previousRollup, setPreviousRollup] = useState<DashboardRollup | null>(
		null
	);

	const fetchRollup = useCallback(async () => {
		try {
			setRollupLoading(true);
			const data = await DashboardService.getDashboardRollup();
			// Validate data structure
			if (
				data &&
				data.cashflow &&
				data.budgets &&
				data.debts &&
				data.recurring
			) {
				setRollup(data);
			} else {
				console.error('Invalid rollup data structure:', data);
				setRollup(null);
			}
		} catch (error) {
			console.error('Error fetching dashboard rollup:', error);
			setRollup(null);
		} finally {
			setRollupLoading(false);
		}
	}, []);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await Promise.all([refetch(), fetchRollup()]);
		} finally {
			setRefreshing(false);
		}
	}, [refetch, fetchRollup]);

	// Refresh transactions and rollup when dashboard comes into focus
	useFocusEffect(
		useCallback(() => {
			refetch();
			fetchRollup();
		}, [refetch, fetchRollup])
	);

	// Initial fetch
	useEffect(() => {
		fetchRollup();
	}, [fetchRollup]);

	// Detect transaction impact from URL params
	useEffect(() => {
		if (params.transactionImpact) {
			try {
				const impact = JSON.parse(params.transactionImpact);
				setTransactionImpact(impact);
				// Auto-dismiss after 5 seconds
				setTimeout(() => setTransactionImpact(null), 5000);
				// Clear the param
				router.setParams({ transactionImpact: undefined });
			} catch {
				// Invalid JSON, ignore
			}
		}
	}, [params.transactionImpact]);

	// Detect changes in rollup to show impact
	useEffect(() => {
		if (!rollup || !previousRollup || rollupLoading) {
			setPreviousRollup(rollup);
			return;
		}

		// Index budgets by id for safe comparison
		const prevById = Object.fromEntries(
			previousRollup.budgets.budgets.map((b) => [b.budgetId, b])
		);

		let shown = false;

		// Check for budget changes
		for (const b of rollup.budgets.budgets) {
			const prev = prevById[b.budgetId];
			if (prev && b.spent > prev.spent && !transactionImpact) {
				setTransactionImpact({
					message: `Counted toward: ${b.budgetName} (${b.percentageUsed.toFixed(
						0
					)}% used)`,
					type: 'budget',
				});
				shown = true;
				setTimeout(() => setTransactionImpact(null), 5000);
				break;
			}
		}

		// Check for debt payment changes
		if (!shown) {
			const prevPaid = previousRollup.debts.paidThisMonth ?? 0;
			const currPaid = rollup.debts.paidThisMonth ?? 0;
			if (currPaid > prevPaid && !transactionImpact) {
				const diff = currPaid - prevPaid;
				setTransactionImpact({
					message: `Applied to debt • Paid this month: ${currency(diff)}`,
					type: 'debt',
				});
				setTimeout(() => setTransactionImpact(null), 5000);
			}
		}

		setPreviousRollup(rollup);
	}, [rollup, previousRollup, rollupLoading, transactionImpact]);

	// Calculate next best action
	const nextAction = useMemo(() => {
		if (!rollup) return null;

		const now = new Date();
		const dayOfMonth = now.getDate();
		const daysInMonth = new Date(
			now.getFullYear(),
			now.getMonth() + 1,
			0
		).getDate();
		const monthProgress = (dayOfMonth / daysInMonth) * 100;

		// Check budget overages
		const overBudget = rollup.budgets.budgets.find(
			(b) => b.percentageUsed > 80 && monthProgress < 80
		);
		if (overBudget) {
			return {
				type: 'budget',
				message: `You've spent ${overBudget.percentageUsed.toFixed(0)}% of ${
					overBudget.budgetName
				} and it's the ${dayOfMonth}${
					dayOfMonth === 1
						? 'st'
						: dayOfMonth === 2
						? 'nd'
						: dayOfMonth === 3
						? 'rd'
						: 'th'
				}. Consider reducing spending.`,
				priority: 'high',
			};
		}

		// Check debt payments
		if (rollup.debts.paidThisMonth === 0 && rollup.debts.totalDebt > 0) {
			return {
				type: 'debt',
				message: 'You made no debt payments this month — add one?',
				priority: 'medium',
			};
		}

		// Check negative cashflow
		if (rollup.cashflow.netSavings < 0) {
			return {
				type: 'cashflow',
				message:
					'Net savings is negative this month — review biggest expenses?',
				priority: 'high',
			};
		}

		// Check goal progress
		if (goals && goals.length > 0) {
			const lowProgressGoal = goals.find((g) => {
				if (!g.deadline) return false; // Guard against missing deadline
				const progress = (g.current / g.target) * 100;
				const daysLeft = Math.ceil(
					(new Date(g.deadline).getTime() - now.getTime()) /
						(1000 * 60 * 60 * 24)
				);
				return progress < 50 && daysLeft < 30 && daysLeft >= 0;
			});
			if (lowProgressGoal && lowProgressGoal.deadline) {
				const daysLeft = Math.max(
					0,
					Math.ceil(
						(new Date(lowProgressGoal.deadline).getTime() - now.getTime()) /
							(1000 * 60 * 60 * 24)
					)
				);
				return {
					type: 'goal',
					message: `${lowProgressGoal.name} is ${(
						(lowProgressGoal.current / lowProgressGoal.target) *
						100
					).toFixed(0)}% complete with ${daysLeft} days left.`,
					priority: 'medium',
				};
			}
		}

		return null;
	}, [rollup, goals]);

	// Calculate financial health score
	const healthScore = useMemo(() => {
		if (!rollup) return null;

		// Calculate individual scores (0-100)
		const budgetsTotal = Math.max(1, rollup.budgets.totalBudgets);
		const budgetScore = (rollup.budgets.budgetsOnTrack / budgetsTotal) * 100; // 0-100
		const cashflowScore = rollup.cashflow.netSavings >= 0 ? 100 : 50;
		const debtScore = rollup.debts.isHealthy ? 100 : 60;
		const loggingScore = transactions.length > 0 ? 100 : 50;

		// Weighted sum
		const score =
			budgetScore * 0.3 +
			cashflowScore * 0.3 +
			debtScore * 0.25 +
			loggingScore * 0.15;

		const reasons: string[] = [];
		if (budgetScore < 80) reasons.push('Some budgets need attention');
		if (cashflowScore < 100) reasons.push('Negative cashflow this month');
		if (!rollup.debts.isHealthy) reasons.push('Debt-to-income ratio is high');

		return {
			score: Math.round(score),
			status:
				score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'needs_attention',
			reasons,
		};
	}, [rollup, transactions.length]);

	const { totalBalance, dailyChange, last7 } = useMemo(() => {
		const today = getLocalIsoDate();
		let balance = 0;
		let change = 0;
		const byDay: Record<string, number> = {};

		for (const t of transactions) {
			const amt = isNaN(t.amount) ? 0 : t.amount;
			// Amount is already signed (positive for income, negative for expenses)
			balance += amt;

			const d = (t.date || '').slice(0, 10);
			byDay[d] = (byDay[d] || 0) + amt;

			if (d === today) change += amt;
		}

		// make last 7 days sparkline data (oldest -> newest)
		const days: string[] = [];
		for (let i = 6; i >= 0; i--) {
			const dt = new Date();
			dt.setDate(dt.getDate() - i);
			const iso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
				.toISOString()
				.slice(0, 10);
			days.push(iso);
		}
		const last7 = days.map((d) => byDay[d] || 0);

		return { totalBalance: balance, dailyChange: change, last7 };
	}, [transactions]);

	if (isLoading) {
		return (
			<SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007AFF" />
					<Text style={[styles.loadingText, dynamicTextStyle]}>
						Loading your dashboard…
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
			<GestureHandlerRootView style={{ flex: 1 }}>
				{/* ---------- Sticky Header ---------- */}
				<View style={styles.stickyHeader}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
						<Image
							source={require('../../../src/assets/logos/brie-logo.png')}
							style={styles.logo}
							resizeMode="contain"
							accessibilityRole="image"
							accessibilityLabel="Brie app logo"
						/>
					</View>

					<View style={styles.headerButtons}>
						<TouchableOpacity
							onPress={() => router.push('/(stack)/settings')}
							style={styles.headerButton}
							{...accessibilityProps.button}
							accessibilityLabel={generateAccessibilityLabel.button(
								'Open',
								'settings'
							)}
						>
							<Ionicons name="settings-outline" color="#111827" size={24} />
						</TouchableOpacity>

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
									color="#111827"
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
					contentContainerStyle={styles.content}
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
					keyboardShouldPersistTaps="handled"
				>
					{/* Transaction Impact Banner */}
					{transactionImpact && (
						<TransactionImpactBanner
							message={transactionImpact.message}
							type={transactionImpact.type}
							onDismiss={() => setTransactionImpact(null)}
							onViewDetails={
								transactionImpact.type === 'budget'
									? () => {
											setTransactionImpact(null);
											router.push('/(tabs)/wallet/budgets');
									  }
									: transactionImpact.type === 'debt'
									? () => {
											setTransactionImpact(null);
											router.push('/(tabs)/wallet/debts');
									  }
									: transactionImpact.type === 'goal'
									? () => {
											setTransactionImpact(null);
											router.push('/(tabs)/wallet/goals');
									  }
									: undefined
							}
						/>
					)}

					{/* ---------- Hero Pro Balance Card ---------- */}
					<HeroPro
						total={totalBalance}
						dailyChange={dailyChange}
						last7={last7}
					/>

					{/* ---------- Inline Quick Actions (replaces FAB) ---------- */}
					<QuickActionsRow
						onLogExpense={() => router.push('/(tabs)/transaction?mode=expense')}
						onLogIncome={() => router.push('/(tabs)/transaction?mode=income')}
						onReviewCashflow={() => router.push('/(tabs)/dashboard/ledger')}
					/>

					{/* Next Best Action Card */}
					{nextAction && (
						<NextBestActionCard
							action={nextAction}
							onAction={() => {
								if (nextAction.type === 'debt') {
									router.push('/(tabs)/wallet/debts');
								} else if (nextAction.type === 'budget') {
									router.push('/(tabs)/wallet/budgets');
								} else if (nextAction.type === 'goal') {
									router.push('/(tabs)/wallet/goals');
								} else {
									router.push('/(tabs)/transaction');
								}
							}}
						/>
					)}

					{/* ---------- Performance Cards ---------- */}
					{rollupLoading ? (
						<View style={styles.card}>
							<ActivityIndicator size="small" color="#3B82F6" />
							<Text style={[styles.loadingText, dynamicTextStyle]}>
								Loading dashboard data...
							</Text>
						</View>
					) : rollup ? (
						<>
							{/* Cashflow Card */}
							<CashflowCard
								cashflow={rollup.cashflow}
								onPress={() => router.push('/(tabs)/dashboard/ledger')}
								onHelp={() => setHelpModalOpen('cashflow')}
							/>

							<SetupPulseCard
								budgets={rollup.budgets}
								debts={rollup.debts}
								recurring={rollup.recurring}
								onManage={() => router.push('/(tabs)/wallet')}
							/>
						</>
					) : null}

					{/* Financial Health Score Card */}
					{healthScore && (
						<FinancialHealthCard
							score={healthScore.score}
							status={
								healthScore.status as 'excellent' | 'good' | 'needs_attention'
							}
							reasons={healthScore.reasons}
						/>
					)}

					{/* ---------- Transaction History ---------- */}
					<TransactionHistory
						transactions={transactions}
						onPress={() => {}}
						isLoading={isLoading}
					/>
				</ScrollView>

				{/* Help Modal */}
				<HelpModal
					type={helpModalOpen}
					onClose={() => setHelpModalOpen(null)}
				/>
			</GestureHandlerRootView>
		</SafeAreaView>
	);
}

/** ----------------- Subcomponents ----------------- */

function HeroPro({
	total,
	dailyChange,
	last7,
}: {
	total: number;
	dailyChange: number;
	last7: number[];
}) {
	// ------- animated count-up for balance -------
	const anim = useRef(new Animated.Value(0)).current;
	const [display, setDisplay] = useState(0);

	useEffect(() => {
		anim.stopAnimation();
		anim.setValue(0);
		Animated.timing(anim, {
			toValue: 1,
			duration: 700,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		}).start();
	}, [total, anim]);

	useEffect(() => {
		const startVal = display;
		const endVal = total;
		const sub = anim.addListener(({ value }) => {
			const v = startVal + (endVal - startVal) * value;
			setDisplay(v);
		});
		return () => anim.removeListener(sub);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [total]);

	// ------- sparkline path (with area) -------
	const screenWidth = Dimensions.get('window').width;
	const w = screenWidth - 24 * 2; // padding from container
	const h = 72;
	const pad = 6;
	const step = (w - pad * 2) / Math.max(last7.length - 1, 1);
	const max = Math.max(...last7, 1);
	const min = Math.min(...last7, 0);
	const span = Math.max(max - min, 1);

	const points = last7.map((v, i) => {
		const x = pad + i * step;
		const y = h - pad - ((v - min) / span) * (h - pad * 2);
		return { x, y };
	});

	const lineD =
		points.length > 0
			? points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')
			: `M${pad},${h - pad} L${w - pad},${h - pad}`;

	const areaD =
		points.length > 0
			? `M${points[0].x},${h - pad} ` +
			  points.map((p) => `L${p.x},${p.y}`).join(' ') +
			  ` L${points[points.length - 1].x},${h - pad} Z`
			: `M${pad},${h - pad} L${w - pad},${h - pad} L${w - pad},${h - pad} Z`;

	const isPositive = total >= 0;
	const mainLine = isPositive ? '#2563EB' : '#DC2626';
	const pillBg = isPositive ? '#ECFDF5' : '#FEF2F2';
	const pillBorder = isPositive ? '#10B981' : '#EF4444';
	const pillText = isPositive ? '#065F46' : '#991B1B';
	const arrow = isPositive ? 'arrow-up' : 'arrow-down';

	return (
		<LinearGradient
			colors={isPositive ? ['#F0F7FF', '#EEF2FF'] : ['#FFF1F2', '#FDF2F8']}
			start={{ x: 0, y: 0 }}
			end={{ x: 1, y: 1 }}
			style={heroStyles.card}
		>
			<View style={heroStyles.topRow}>
				<View>
					<Text style={heroStyles.label}>Today&apos;s Performance</Text>
					<Text
						style={[
							heroStyles.amount,
							{ color: isPositive ? '#0B1324' : '#0B1324' },
						]}
						accessibilityRole="header"
					>
						{currency(display)}
					</Text>
					<Text style={heroStyles.subLabel}>
						Live cashflow across logged transactions
					</Text>
				</View>

				<View
					accessible
					accessibilityLabel={`Day change ${
						dailyChange >= 0 ? 'up' : 'down'
					} ${currency(Math.abs(dailyChange))}`}
					style={[
						heroStyles.pill,
						{ backgroundColor: pillBg, borderColor: pillBorder },
					]}
				>
					<Ionicons name={arrow} size={14} color={pillText} />
					<Text style={[heroStyles.pillText, { color: pillText }]}>
						{dailyChange >= 0 ? '+' : '-'}
						{currency(Math.abs(dailyChange))} today
					</Text>
				</View>
			</View>

			<View style={{ height: h, marginTop: 14 }}>
				<Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
					<Defs>
						<SvgGrad id="areaFill" x1="0" y1="0" x2="0" y2="1">
							<Stop offset="0" stopColor={mainLine} stopOpacity="0.25" />
							<Stop offset="1" stopColor={mainLine} stopOpacity="0.02" />
						</SvgGrad>
					</Defs>

					{/* area */}
					<Path d={areaD} fill="url(#areaFill)" />

					{/* line */}
					<Path
						d={lineD}
						fill="none"
						stroke={mainLine}
						strokeWidth={2}
						strokeLinejoin="round"
						strokeLinecap="round"
					/>

					{/* end dot */}
					{points.length > 0 ? (
						<Path
							d={`M${points.at(-1)!.x},${
								points.at(-1)!.y
							} m-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0`}
							fill={mainLine}
						/>
					) : null}
				</Svg>
			</View>

			<View style={heroStyles.captionRow}>
				<Text style={heroStyles.caption}>Last 7 days</Text>
			</View>
		</LinearGradient>
	);
}

function QuickActionsRow({
	onLogExpense,
	onLogIncome,
	onReviewCashflow,
}: {
	onLogExpense: () => void;
	onLogIncome: () => void;
	onReviewCashflow: () => void;
}) {
	return (
		<View style={styles.qaRow}>
			<ActionChip
				label="Log Expense"
				icon="arrow-up-circle-outline"
				onPress={onLogExpense}
			/>
			<ActionChip
				label="Log Income"
				icon="arrow-down-circle-outline"
				onPress={onLogIncome}
			/>
			<ActionChip
				label="Cashflow"
				icon="analytics-outline"
				onPress={onReviewCashflow}
			/>
		</View>
	);
}

function ActionChip({
	label,
	icon,
	onPress,
}: {
	label: string;
	icon: any;
	onPress: () => void;
}) {
	return (
		<TouchableOpacity
			onPress={onPress}
			style={styles.actionChip}
			{...accessibilityProps.button}
		>
			<Ionicons name={icon} size={16} color="#374151" />
			<Text style={[styles.actionChipText, dynamicTextStyle]}>{label}</Text>
		</TouchableOpacity>
	);
}

// 4 Rollup Cards
function CashflowCard({
	cashflow,
	onPress,
	onHelp,
}: {
	cashflow: DashboardRollup['cashflow'];
	onPress: () => void;
	onHelp?: () => void;
}) {
	if (!cashflow) return null;

	const totalIncome = cashflow.totalIncome || 0;
	const totalExpenses = cashflow.totalExpenses || 0;
	const netSavings = cashflow.netSavings || 0;

	const hasAnyData = totalIncome !== 0 || totalExpenses !== 0;

	// pick colors
	const isPositive = netSavings >= 0;
	const netColor = isPositive ? '#16AE05' : '#DC2626';

	return (
		<TouchableOpacity
			onPress={onPress}
			style={styles.card}
			{...accessibilityProps.button}
			accessibilityLabel={`Cashflow this month. Income ${currency(
				totalIncome
			)}, expenses ${currency(totalExpenses)}, net ${currency(netSavings)}`}
		>
			{/* header */}
			<View style={styles.cardHeaderRow}>
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
					<Text style={[styles.cardTitle, dynamicTextStyle]}>Cashflow</Text>
					{onHelp && (
						<TouchableOpacity
							onPress={onHelp}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						>
							<Ionicons name="help-circle-outline" size={16} color="#9CA3AF" />
						</TouchableOpacity>
					)}
				</View>
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
					{/* time range pill */}
					<View
						style={{
							backgroundColor: '#EFF6FF',
							borderRadius: 999,
							paddingHorizontal: 10,
							paddingVertical: 3,
						}}
					>
						<Text style={{ fontSize: 11, color: '#1D4ED8', fontWeight: '600' }}>
							This month
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
				</View>
			</View>

			{/* body */}
			{hasAnyData ? (
				<View style={{ marginTop: 12 }}>
					{/* Net as hero */}
					<View
						style={{
							flexDirection: 'row',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: 12,
						}}
					>
						<Text style={[styles.netSavingsLabel, dynamicTextStyle]}>
							Net this month
						</Text>
						<Text
							style={[
								styles.netSavingsValue,
								{ color: netColor, fontSize: 20 },
								dynamicTextStyle,
							]}
						>
							{currency(netSavings)}
						</Text>
					</View>

					{/* income / expenses */}
					<View style={styles.cashflowRow}>
						<View style={styles.cashflowItem}>
							<Text style={[styles.cashflowLabel, dynamicTextStyle]}>
								Income
							</Text>
							<Text
								style={[
									styles.cashflowValue,
									{ color: '#16AE05' },
									dynamicTextStyle,
								]}
							>
								{currency(totalIncome)}
							</Text>
						</View>
						<View style={styles.cashflowItem}>
							<Text style={[styles.cashflowLabel, dynamicTextStyle]}>
								Expenses
							</Text>
							<Text
								style={[
									styles.cashflowValue,
									{ color: '#DC2626' },
									dynamicTextStyle,
								]}
							>
								{currency(totalExpenses)}
							</Text>
						</View>
					</View>
				</View>
			) : (
				// empty / low-data state
				<View style={{ marginTop: 12 }}>
					<Text style={[styles.cardSummary, dynamicTextStyle]}>
						No cashflow yet this month.
					</Text>
					<Text style={[styles.hint, { marginTop: 4 }, dynamicTextStyle]}>
						Add income or an expense to see how you&apos;re doing.
					</Text>
				</View>
			)}
		</TouchableOpacity>
	);
}

function SetupPulseCard({
	budgets,
	debts,
	recurring,
	onManage,
}: {
	budgets: DashboardRollup['budgets'];
	debts: DashboardRollup['debts'];
	recurring: DashboardRollup['recurring'];
	onManage: () => void;
}) {
	if (!budgets && !debts && !recurring) {
		return null;
	}

	const offTrackBudgets = (budgets?.budgets || []).filter(
		(budget) => budget.onTrack === false
	);
	const budgetLine =
		(budgets?.totalBudgets || 0) === 0
			? 'No budgets yet'
			: offTrackBudgets.length > 0
			? `${offTrackBudgets.length} ${
					offTrackBudgets.length === 1 ? 'budget' : 'budgets'
			  } need attention`
			: 'All budgets on track';

	const nextUpcoming = recurring?.upcoming?.[0];
	const recurringLine = nextUpcoming
		? `${nextUpcoming.name} • ${currency(nextUpcoming.amount)} ${
				nextUpcoming.daysUntilDue === 0
					? 'due today'
					: nextUpcoming.daysUntilDue === 1
					? 'due tomorrow'
					: `in ${nextUpcoming.daysUntilDue} days`
		  }`
		: 'No bills due this week';

	const debtSummary =
		(debts?.totalDebt || 0) === 0
			? 'No debts tracked yet'
			: debts?.summary || 'Debt payoff is on track';

	return (
		<TouchableOpacity
			onPress={onManage}
			style={styles.card}
			activeOpacity={0.85}
			{...accessibilityProps.button}
			accessibilityLabel="Open wallet setup overview"
		>
			<View style={styles.cardHeaderRow}>
				<Text style={[styles.cardTitle, dynamicTextStyle]}>Setup Pulse</Text>
				<View style={styles.pulseBadge}>
					<Text style={styles.pulseBadgeText}>Wallet</Text>
				</View>
			</View>

			<View style={{ marginTop: 12, gap: 12 }}>
				<View style={styles.pulseRow}>
					<View style={styles.pulseIconWrapper}>
						<Ionicons name="wallet-outline" size={18} color="#2563EB" />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={[styles.pulseLabel, dynamicTextStyle]}>Budgets</Text>
						<Text style={[styles.pulseValue, dynamicTextStyle]}>
							{budgetLine}
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
				</View>

				<View style={styles.pulseRow}>
					<View style={styles.pulseIconWrapper}>
						<Ionicons name="calendar-outline" size={18} color="#2563EB" />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={[styles.pulseLabel, dynamicTextStyle]}>
							Upcoming Bill
						</Text>
						<Text style={[styles.pulseValue, dynamicTextStyle]}>
							{recurringLine}
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
				</View>

				<View style={styles.pulseRow}>
					<View style={styles.pulseIconWrapper}>
						<Ionicons name="trending-down-outline" size={18} color="#2563EB" />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={[styles.pulseLabel, dynamicTextStyle]}>Debt</Text>
						<Text style={[styles.pulseValue, dynamicTextStyle]}>
							{debtSummary}
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
				</View>
			</View>
		</TouchableOpacity>
	);
}

// Transaction Impact Banner
function TransactionImpactBanner({
	message,
	type,
	onDismiss,
	onViewDetails,
}: {
	message: string;
	type: 'debt' | 'budget' | 'goal' | 'none';
	onDismiss: () => void;
	onViewDetails?: () => void;
}) {
	const iconMap = {
		debt: 'card-outline',
		budget: 'wallet-outline',
		goal: 'trophy-outline',
		none: 'checkmark-circle-outline',
	};

	const colorMap = {
		debt: '#3B82F6',
		budget: '#EF4444',
		goal: '#10B981',
		none: '#10B981',
	};

	return (
		<View
			style={[
				styles.impactBanner,
				{
					backgroundColor: colorMap[type] + '15',
					borderColor: colorMap[type] + '30',
				},
			]}
		>
			<Ionicons name={iconMap[type] as any} size={18} color={colorMap[type]} />
			<Text style={[styles.impactBannerText, { color: '#111827' }]}>
				{message}
			</Text>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
				{onViewDetails && (
					<TouchableOpacity onPress={onViewDetails}>
						<Text style={[styles.impactBannerLink, { color: colorMap[type] }]}>
							View
						</Text>
					</TouchableOpacity>
				)}
				<TouchableOpacity
					onPress={onDismiss}
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				>
					<Ionicons name="close" size={18} color="#6B7280" />
				</TouchableOpacity>
			</View>
		</View>
	);
}

// Financial Health Score Card
function FinancialHealthCard({
	score,
	status,
	reasons,
}: {
	score: number;
	status: 'excellent' | 'good' | 'needs_attention';
	reasons: string[];
}) {
	const statusConfig = {
		excellent: {
			color: '#10B981',
			icon: 'checkmark-circle',
			label: 'Excellent',
		},
		good: { color: '#F59E0B', icon: 'alert-circle', label: 'Good' },
		needs_attention: {
			color: '#EF4444',
			icon: 'warning',
			label: 'Needs Attention',
		},
	};

	const config = statusConfig[status];

	return (
		<View style={styles.healthCard}>
			<View style={styles.healthHeader}>
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
					<Ionicons name={config.icon as any} size={20} color={config.color} />
					<Text style={[styles.healthTitle, dynamicTextStyle]}>
						Financial Health
					</Text>
				</View>
				<View
					style={[
						styles.healthScoreBadge,
						{ backgroundColor: config.color + '20' },
					]}
				>
					<Text style={[styles.healthScoreText, { color: config.color }]}>
						{score}/100
					</Text>
				</View>
			</View>
			<View style={{ marginTop: 12 }}>
				<Text
					style={[
						styles.healthStatus,
						{ color: config.color },
						dynamicTextStyle,
					]}
				>
					{config.label}
				</Text>
				{reasons.length > 0 && (
					<View style={{ marginTop: 8, gap: 4 }}>
						{reasons.slice(0, 2).map((reason, i) => (
							<Text key={i} style={[styles.healthReason, dynamicTextStyle]}>
								• {reason}
							</Text>
						))}
					</View>
				)}
			</View>
		</View>
	);
}

// Next Best Action Card
function NextBestActionCard({
	action,
	onAction,
}: {
	action: { type: string; message: string; priority: string };
	onAction: () => void;
}) {
	const priorityConfig = {
		high: { color: '#EF4444', icon: 'alert-circle' },
		medium: { color: '#F59E0B', icon: 'information-circle' },
		low: { color: '#3B82F6', icon: 'bulb-outline' },
	};

	const config =
		priorityConfig[action.priority as 'high' | 'medium' | 'low'] ||
		priorityConfig.medium;

	return (
		<TouchableOpacity
			style={styles.actionCard}
			onPress={onAction}
			activeOpacity={0.7}
		>
			<View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
				<View
					style={[styles.actionIcon, { backgroundColor: config.color + '20' }]}
				>
					<Ionicons name={config.icon as any} size={20} color={config.color} />
				</View>
				<View style={{ flex: 1 }}>
					<Text style={[styles.actionTitle, dynamicTextStyle]}>Today</Text>
					<Text style={[styles.actionMessage, dynamicTextStyle]}>
						{action.message}
					</Text>
				</View>
				<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
			</View>
		</TouchableOpacity>
	);
}

// Help Modal
function HelpModal({
	type,
	onClose,
}: {
	type: string | null;
	onClose: () => void;
}) {
	const helpContent: Record<string, { title: string; content: string }> = {
		cashflow: {
			title: 'How Cashflow Works',
			content:
				"Cashflow shows your income, expenses, and net savings for this month. It's calculated from all your transactions. Income is money coming in, expenses are money going out, and net savings is the difference.",
		},
		budgets: {
			title: 'How Budgets Work',
			content:
				'Budgets track your spending by category or type. When you add an expense transaction and link it to a budget, that amount is counted toward the budget. A budget is "on track" if you\'ve used less than 80% of it.',
		},
		debts: {
			title: 'How Debt Tracking Works',
			content:
				'Debt payments are automatically detected from your transactions based on patterns, descriptions, or when you explicitly link an expense to a debt. The debt-to-income ratio shows how much debt you have compared to your monthly income. A healthy ratio is under 36%.',
		},
	};

	const content = type ? helpContent[type] : null;

	return (
		<BottomSheet
			isOpen={!!type}
			onClose={onClose}
			snapPoints={[0.4]}
			header={
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						paddingHorizontal: 16,
						paddingBottom: 8,
					}}
				>
					<Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
						{content?.title}
					</Text>
					<TouchableOpacity onPress={onClose}>
						<Ionicons name="close" size={24} color="#64748B" />
					</TouchableOpacity>
				</View>
			}
		>
			{content && (
				<View style={{ padding: 16 }}>
					<Text style={{ fontSize: 15, color: '#374151', lineHeight: 22 }}>
						{content.content}
					</Text>
				</View>
			)}
		</BottomSheet>
	);
}

/** ----------------- Styles ----------------- */

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: palette.surfaceAlt },
	loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#6B7280',
		fontWeight: '500',
	},
	scrollView: { flex: 1, backgroundColor: palette.surfaceAlt },
	content: {
		paddingHorizontal: space.xl,
		paddingTop: space.sm,
		paddingBottom: space.xxl,
		gap: 18,
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
	headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },

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
		backgroundColor: '#EF4444',
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

	qaRow: {
		flexDirection: 'row',
		gap: 8,
		flexWrap: 'wrap',
	},
	actionChip: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
		backgroundColor: palette.surface,
		paddingVertical: 10,
		paddingHorizontal: 8,
		borderRadius: 16,
		...shadow.card,
	},
	actionChipText: { color: palette.text, fontSize: 13, fontWeight: '600' },

	card: {
		backgroundColor: palette.surface,
		borderRadius: 22,
		padding: 18,
		...shadow.card,
	},
	cardHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	cardTitle: { fontSize: 16, fontWeight: '700', color: palette.text },
	viewAll: { fontSize: 14, color: palette.primary, fontWeight: '600' },
	pulseBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor: '#EEF2FF',
	},
	pulseBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#3730A3',
	},
	pulseRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		gap: 12,
	},
	pulseIconWrapper: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#EFF6FF',
	},
	pulseLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
	pulseValue: { fontSize: 14, fontWeight: '600', color: '#0F172A' },

	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	summaryLabel: { fontSize: 14, color: palette.text, fontWeight: '600' },
	summaryValue: { fontSize: 14, color: palette.text, fontWeight: '700' },
	progressTrack: {
		height: 8,
		backgroundColor: '#F3F4F6',
		borderRadius: 999,
		marginTop: 8,
		overflow: 'hidden',
	},
	progressFill: { height: 8, backgroundColor: '#60A5FA' },
	hint: { marginTop: 6, fontSize: 12, color: '#6B7280' },

	recurringRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		gap: 10,
	},
	dot: { width: 8, height: 8, borderRadius: 4 },
	recurringName: { fontSize: 14, fontWeight: '600', color: palette.text },
	recurringMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
	recurringAmount: { fontSize: 14, fontWeight: '700', color: palette.text },
	cardSummary: { fontSize: 14, color: palette.textMuted, fontWeight: '500' },
	cashflowRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 16,
	},
	cashflowItem: { flex: 1 },
	cashflowLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
	cashflowValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
	netSavingsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: palette.border,
	},
	netSavingsLabel: { fontSize: 14, fontWeight: '600', color: palette.text },
	netSavingsValue: { fontSize: 20, fontWeight: '700' },
	debtRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	debtLabel: { fontSize: 14, color: palette.textMuted, fontWeight: '500' },
	debtValue: { fontSize: 16, fontWeight: '700', color: palette.text },

	// Impact banner
	impactBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		...shadow.card,
	},
	impactBannerText: {
		flex: 1,
		fontSize: 14,
		fontWeight: '600',
	},
	impactBannerLink: {
		fontSize: 13,
		fontWeight: '700',
	},

	// Health card
	healthCard: {
		backgroundColor: palette.surface,
		borderRadius: 22,
		padding: 18,
		paddingTop: 20,
		...shadow.card,
	},
	healthHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	healthTitle: { fontSize: 16, fontWeight: '700', color: palette.text },
	healthScoreBadge: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 999,
	},
	healthScoreText: { fontSize: 14, fontWeight: '700' },
	healthStatus: { fontSize: 14, fontWeight: '600' },
	healthReason: { fontSize: 13, color: '#6B7280' },

	// Action card
	actionCard: {
		backgroundColor: palette.surface,
		borderRadius: 18,
		padding: 16,
		...shadow.card,
	},
	actionIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionTitle: {
		fontSize: 12,
		fontWeight: '700',
		color: '#6B7280',
		marginBottom: 4,
	},
	actionMessage: { fontSize: 14, fontWeight: '600', color: palette.text },
});

const heroStyles = StyleSheet.create({
	card: {
		borderRadius: 24,
		paddingHorizontal: 22,
		paddingBottom: 22,
		paddingTop: 36,
		...shadow.card,
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	label: { color: palette.textMuted, fontSize: 13, fontWeight: '600' },
	amount: {
		marginTop: 4,
		fontSize: 30,
		fontWeight: '800',
		letterSpacing: -0.3,
		color: palette.text,
	},
	subLabel: {
		marginTop: 6,
		fontSize: 12,
		color: palette.textMuted,
		fontWeight: '500',
	},
	pill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 999,
		borderWidth: 1,
	},
	pillText: { fontSize: 12, fontWeight: '700' },
	captionRow: { marginTop: 10 },
	caption: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
});
