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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
import { useRecurringExpenses } from '../../../src/hooks/useRecurringExpenses';
import { useBudgets } from '../../../src/hooks/useBudgets';
import { useGoals } from '../../../src/hooks/useGoals';
import { TransactionHistory } from './components';
import {
	accessibilityProps,
	dynamicTextStyle,
	generateAccessibilityLabel,
} from '../../../src/utils/accessibility';

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
	const { budgets, isLoading: budgetsLoading } = useBudgets();
	const { goals, isLoading: goalsLoading } = useGoals();
	const [refreshing, setRefreshing] = useState(false);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refetch();
		} finally {
			setRefreshing(false);
		}
	}, [refetch]);

	// Refresh transactions when dashboard comes into focus
	useFocusEffect(
		useCallback(() => {
			refetch();
		}, [refetch])
	);

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

	// Calculate real budget and goal metrics
	const budgetMetrics = useMemo(() => {
		if (budgetsLoading || budgets.length === 0) {
			return {
				budgetUsed: 0,
				budgetHint: 'No budgets set',
			};
		}

		const currentMonth = new Date().getMonth();
		const currentYear = new Date().getFullYear();

		let totalBudget = 0;
		let totalSpent = 0;

		for (const budget of budgets) {
			totalBudget += budget.amount;

			// Calculate spent amount for current month
			const monthlyTransactions = transactions.filter((t) => {
				const tDate = new Date(t.date);
				return (
					tDate.getMonth() === currentMonth &&
					tDate.getFullYear() === currentYear &&
					t.amount < 0
				); // Only expenses
			});

			const monthlySpent = monthlyTransactions.reduce(
				(sum, t) => sum + Math.abs(t.amount),
				0
			);
			totalSpent += monthlySpent;
		}

		const budgetUsed = totalBudget > 0 ? totalSpent / totalBudget : 0;
		let budgetHint = 'No budgets set';

		if (totalBudget > 0) {
			if (budgetUsed < 0.5) {
				budgetHint = 'Under target this month';
			} else if (budgetUsed < 0.8) {
				budgetHint = 'On track this month';
			} else if (budgetUsed < 1.0) {
				budgetHint = 'Approaching limit';
			} else {
				budgetHint = 'Over budget this month';
			}
		}

		return { budgetUsed, budgetHint };
	}, [budgets, transactions, budgetsLoading]);

	const goalMetrics = useMemo(() => {
		if (goalsLoading || goals.length === 0) {
			return {
				savingsPace: 0,
				savingsHint: 'No goals set',
			};
		}

		if (goals.length === 0) {
			return {
				savingsPace: 0,
				savingsHint: 'No goals set',
			};
		}

		// Calculate overall progress across all goals
		let totalProgress = 0;
		let totalTarget = 0;

		for (const goal of goals) {
			totalProgress += goal.current || 0;
			totalTarget += goal.target;
		}

		const savingsPace = totalTarget > 0 ? totalProgress / totalTarget : 0;
		let savingsHint = 'No goals set';

		if (totalTarget > 0) {
			if (savingsPace < 0.25) {
				savingsHint = 'Getting started';
			} else if (savingsPace < 0.5) {
				savingsHint = 'Making progress';
			} else if (savingsPace < 0.75) {
				savingsHint = 'On track for goal';
			} else if (savingsPace < 1.0) {
				savingsHint = 'Almost there!';
			} else {
				savingsHint = 'Goal achieved!';
			}
		}

		return { savingsPace, savingsHint };
	}, [goals, goalsLoading]);

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
					contentContainerStyle={{ padding: 24, paddingTop: 8 }}
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
					{/* ---------- Hero Pro Balance Card ---------- */}
					<HeroPro
						total={totalBalance}
						dailyChange={dailyChange}
						last7={last7}
					/>

					{/* ---------- Inline Quick Actions (replaces FAB) ---------- */}
					<QuickActionsRow
						onAddIncome={() => router.push('/(tabs)/transaction?mode=income')}
						onAddExpense={() => router.push('/(tabs)/transaction?mode=expense')}
						onSetGoal={() => router.push('/(tabs)/budgets?tab=goals')}
					/>

					{/* ---------- Quick Financial Summary ---------- */}
					<QuickSummary
						items={[
							{
								label: 'Budget used',
								value: budgetMetrics.budgetUsed,
								hint: budgetMetrics.budgetHint,
							},
							{
								label: 'Savings pace',
								value: goalMetrics.savingsPace,
								hint: goalMetrics.savingsHint,
							},
							{
								label: 'Debt payoff',
								value: 0.18, // TODO: Calculate real debt payoff metrics
								hint: 'Consider rounding up payments',
							},
						]}
					/>

					{/* ---------- Recurring Expenses preview ---------- */}
					<RecurringPreview
						rowsLimit={3}
						onViewAll={() => router.push('/(tabs)/budgets?tab=recurring')}
					/>

					{/* ---------- Transaction History ---------- */}
					<TransactionHistory
						transactions={transactions}
						onPress={() => {}}
						isLoading={isLoading}
					/>
				</ScrollView>
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
	const w = 300;
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
					<Text style={heroStyles.label}>Your Balance</Text>
					<Text
						style={[
							heroStyles.amount,
							{ color: isPositive ? '#0B1324' : '#0B1324' },
						]}
						accessibilityRole="header"
					>
						{currency(display)}
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
	onAddIncome,
	onAddExpense,
	onSetGoal,
}: {
	onAddIncome: () => void;
	onAddExpense: () => void;
	onSetGoal: () => void;
}) {
	return (
		<View style={styles.qaRow}>
			<ActionChip
				label="Add Income"
				icon="arrow-down-circle-outline"
				onPress={onAddIncome}
			/>
			<ActionChip
				label="Add Expense"
				icon="arrow-up-circle-outline"
				onPress={onAddExpense}
			/>
			<ActionChip label="Set Goal" icon="flag-outline" onPress={onSetGoal} />
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

function QuickSummary({
	items,
}: {
	items: { label: string; value: number; hint?: string }[];
}) {
	return (
		<View style={styles.card}>
			<View style={styles.cardHeaderRow}>
				<Text style={[styles.cardTitle, dynamicTextStyle]}>
					Quick Financial Summary
				</Text>
			</View>
			{items.map((it, idx) => (
				<View key={idx} style={{ marginTop: idx === 0 ? 4 : 14 }}>
					<View style={styles.summaryRow}>
						<Text style={[styles.summaryLabel, dynamicTextStyle]}>
							{it.label}
						</Text>
						<Text style={[styles.summaryValue, dynamicTextStyle]}>
							{Math.round(it.value * 100)}%
						</Text>
					</View>
					<View style={styles.progressTrack}>
						<View
							style={[
								styles.progressFill,
								{ width: `${Math.min(100, Math.max(0, it.value * 100))}%` },
							]}
						/>
					</View>
					{it.hint ? (
						<Text style={[styles.hint, dynamicTextStyle]}>{it.hint}</Text>
					) : null}
				</View>
			))}
		</View>
	);
}

function RecurringPreview({
	rowsLimit = 3,
	onViewAll,
}: {
	rowsLimit?: number;
	onViewAll: () => void;
}) {
	// Get real recurring expenses data
	const { expenses } = useRecurringExpenses();

	// Process recurring expenses for display
	const rows = expenses
		.map((expense) => {
			const nextDue = new Date(expense.nextExpectedDate);
			const today = new Date();
			const daysUntilDue = Math.ceil(
				(nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
			);

			let status = 'upcoming';
			if (daysUntilDue <= 0) {
				status = 'overdue';
			} else if (daysUntilDue <= 3) {
				status = 'due-soon';
			}

			return {
				name: expense.vendor,
				due: nextDue.toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
				}),
				amount: expense.amount,
				status,
			};
		})
		.sort((a, b) => {
			// Sort by due date
			const aDate = new Date(a.due);
			const bDate = new Date(b.due);
			return aDate.getTime() - bDate.getTime();
		})
		.slice(0, rowsLimit);

	return (
		<View style={styles.card}>
			<View style={styles.cardHeaderRow}>
				<Text style={[styles.cardTitle, dynamicTextStyle]}>
					Recurring Expenses
				</Text>
				<TouchableOpacity onPress={onViewAll} {...accessibilityProps.button}>
					<Text style={styles.viewAll}>View all</Text>
				</TouchableOpacity>
			</View>
			{rows.map((r, i) => (
				<View key={i} style={styles.recurringRow}>
					<View
						style={[
							styles.dot,
							{
								backgroundColor:
									r.status === 'due-soon' ? '#F59E0B' : '#60A5FA',
							},
						]}
					/>
					<View style={{ flex: 1 }}>
						<Text style={[styles.recurringName, dynamicTextStyle]}>
							{r.name}
						</Text>
						<Text style={[styles.recurringMeta, dynamicTextStyle]}>
							Due {r.due}
						</Text>
					</View>
					<Text style={[styles.recurringAmount, dynamicTextStyle]}>
						{currency(r.amount)}
					</Text>
				</View>
			))}
		</View>
	);
}

/** ----------------- Styles ----------------- */

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
	loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#6B7280',
		fontWeight: '500',
	},

	scrollView: { flex: 1, backgroundColor: '#FFFFFF' },

	stickyHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingTop: 8,
		paddingBottom: 6,
		backgroundColor: '#FFFFFF',
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

	qaRow: { flexDirection: 'row', gap: 6, marginTop: 14, marginBottom: 8 },
	actionChip: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
		backgroundColor: '#FFFFFF',
		paddingVertical: 12,
		paddingHorizontal: 8,
		borderRadius: 14,
		borderWidth: 1.5,
		borderColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
		elevation: 1,
	},
	actionChipText: { color: '#374151', fontSize: 13, fontWeight: '600' },

	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginTop: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOpacity: 0.03,
		shadowRadius: 6,
		elevation: 1,
	},
	cardHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
	viewAll: { fontSize: 14, color: '#3B82F6', fontWeight: '600' },

	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	summaryLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },
	summaryValue: { fontSize: 14, color: '#111827', fontWeight: '700' },
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
	recurringName: { fontSize: 14, fontWeight: '600', color: '#111827' },
	recurringMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
	recurringAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
});

const heroStyles = StyleSheet.create({
	card: {
		borderRadius: 18,
		padding: 20,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.06,
		shadowRadius: 10,
		elevation: 2,
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	label: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
	amount: {
		marginTop: 4,
		fontSize: 30,
		fontWeight: '800',
		letterSpacing: -0.3,
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
