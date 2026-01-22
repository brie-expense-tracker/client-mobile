import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	Animated,
	ScrollView,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
// Debt tracking hidden for MVP - useFocusEffect no longer needed (was used for debt loading)
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useBudget } from '../../../src/context/budgetContext';
import { useGoal } from '../../../src/context/goalContext';
import { useBills } from '../../../src/context/billContext';
import { useProfile } from '../../../src/context/profileContext';
import { BillService } from '../../../src/services';
// Debt tracking hidden for MVP - increases finance complexity perception
// import { DebtsService, Debt } from '../../../src/services/feature/debtsService';
import { palette, type } from '../../../src/ui/theme';
import BottomSheet from '../../../src/components/BottomSheet';
import {
	AppScreen,
	AppCard,
	AppText,
	AppButton,
	HeroCard,
} from '../../../src/ui/primitives';
import CardHeader from './components/shared/CardHeader';
import StatPill from './components/shared/StatPill';
import TransactionsSummaryCard from './components/transactions/TransactionsSummaryCard';

const currencyFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
});

function SafeToSpendHero({
	safeToSpend = 0,
	onPress,
}: {
	safeToSpend?: number | null;
	onPress?: () => void;
}) {
	return (
		<HeroCard
			variant="dark"
			onPress={onPress}
			accessibilityLabel="Safe to spend this week"
			contentStyle={heroStyles.content}
		>
			<AppText.Caption style={heroStyles.overline}>THIS WEEK</AppText.Caption>

			<AppText style={heroStyles.amount}>
				{currencyFormatter.format(safeToSpend ?? 0)}
			</AppText>

			<AppText.Body style={heroStyles.sub}>
				After budgets and bills
			</AppText.Body>
		</HeroCard>
	);
}


const heroStyles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 20,
	},
	content: {
		paddingVertical: 22,
		paddingHorizontal: 22,
		minHeight: 140,
		justifyContent: 'center',
	},
	overline: {
		...type.labelSm,
		color: 'rgba(255,255,255,0.7)',
		letterSpacing: 1.2,
	},
	amount: {
		...type.num2xl,
		fontSize: 44,
		lineHeight: 48,
		color: '#FFFFFF',
		marginTop: 10,
		letterSpacing: -0.8,
	},
	sub: {
		...type.body,
		color: 'rgba(255,255,255,0.72)',
		marginTop: 8,
	},
	heroContent: {
		flex: 1,
	},
	heroRight: {
		alignItems: 'flex-end',
		flex: 1,
	},
	deltaPill: {
		backgroundColor: palette.primarySubtle,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 999,
	},
	deltaText: {
		color: palette.primary,
		...type.small,
		fontWeight: '600',
	},
	heroSparklineWrapper: {
		marginTop: 18,
	},
});

function useSkeletonShimmer() {
	const shimmer = useRef(new Animated.Value(0.6)).current;

	useEffect(() => {
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(shimmer, {
					toValue: 1,
					duration: 900,
					useNativeDriver: true,
				}),
				Animated.timing(shimmer, {
					toValue: 0.45,
					duration: 900,
					useNativeDriver: true,
				}),
			])
		);
		animation.start();

		return () => {
			animation.stop();
		};
	}, [shimmer]);

	return {
		opacity: shimmer,
	};
}

function SkeletonLine({
	width = '100%',
	height = 16,
	style,
}: {
	width?: number | `${number}%`;
	height?: number;
	style?: StyleProp<ViewStyle>;
}) {
	const shimmerStyle = useSkeletonShimmer();
	return (
		<Animated.View
			style={[
				styles.skeletonBlock,
				{ width, height, borderRadius: height / 2 },
				style,
				shimmerStyle,
			]}
		/>
	);
}

function WalletHeroSkeleton() {
	return (
		<View style={heroStyles.container}>
			<View>
				<SkeletonLine width={70} height={12} />
				<SkeletonLine
					width={200}
					height={34}
					style={{ marginTop: 12, borderRadius: 10 }}
				/>
				<SkeletonLine
					width={160}
					height={14}
					style={{ marginTop: 10, borderRadius: 8 }}
				/>
			</View>
			<View style={heroStyles.heroRight}>
				<SkeletonLine width={70} height={20} style={{ borderRadius: 10 }} />
				<SkeletonLine
					width={90}
					height={32}
					style={{ marginTop: 18, borderRadius: 8 }}
				/>
			</View>
		</View>
	);
}

function BudgetCardSkeleton() {
	return (
		<AppCard padding={18} borderRadius={22}>
			<View style={styles.cardHeaderRow}>
				<View style={styles.cardHeaderLeft}>
					<SkeletonLine width={32} height={32} style={{ borderRadius: 12 }} />
					<View>
						<SkeletonLine width={140} height={18} />
						<SkeletonLine
							width={120}
							height={12}
							style={{ marginTop: 6, borderRadius: 6 }}
						/>
					</View>
				</View>
				<SkeletonLine width={50} height={14} />
			</View>

			<View style={styles.statRow}>
				<SkeletonLine width="32%" height={48} style={{ borderRadius: 16 }} />
				<SkeletonLine width="32%" height={48} style={{ borderRadius: 16 }} />
				<SkeletonLine width="32%" height={48} style={{ borderRadius: 16 }} />
			</View>
		</AppCard>
	);
}

function UpcomingBillsSkeleton() {
	return (
		<AppCard padding={18} borderRadius={22}>
			<View style={styles.cardHeaderRow}>
				<View style={styles.cardHeaderLeft}>
					<SkeletonLine width={32} height={32} style={{ borderRadius: 12 }} />
					<View>
						<SkeletonLine width={150} height={18} />
						<SkeletonLine
							width={120}
							height={12}
							style={{ marginTop: 6, borderRadius: 6 }}
						/>
					</View>
				</View>
				<SkeletonLine width={60} height={14} />
			</View>

			<View style={styles.statRow}>
				<SkeletonLine width="32%" height={48} style={{ borderRadius: 16 }} />
				<SkeletonLine width="32%" height={48} style={{ borderRadius: 16 }} />
				<SkeletonLine width="32%" height={48} style={{ borderRadius: 16 }} />
			</View>

			<View style={styles.ticketList}>
				<SkeletonLine width="100%" height={52} style={{ borderRadius: 18 }} />
				<SkeletonLine width="100%" height={52} style={{ borderRadius: 18 }} />
			</View>
		</AppCard>
	);
}

function GoalsCardSkeleton() {
	return (
		<AppCard padding={18} borderRadius={22}>
			<View style={styles.cardHeaderRow}>
				<View style={styles.cardHeaderLeft}>
					<SkeletonLine width={32} height={32} style={{ borderRadius: 12 }} />
					<View>
						<SkeletonLine width={140} height={18} />
						<SkeletonLine
							width={120}
							height={12}
							style={{ marginTop: 6, borderRadius: 6 }}
						/>
					</View>
				</View>
				<SkeletonLine width={50} height={14} />
			</View>
			<View style={styles.statRow}>
				<SkeletonLine width="32%" height={48} style={{ borderRadius: 16 }} />
				<SkeletonLine width="32%" height={48} style={{ borderRadius: 16 }} />
				<SkeletonLine width="32%" height={48} style={{ borderRadius: 16 }} />
			</View>
		</AppCard>
	);
}

// Debt tracking hidden for MVP - increases finance complexity perception
// function DebtCardSkeleton() {
// 	return (
// 		<View style={styles.card}>
// 			<View style={styles.cardHeaderRow}>
// 				<View style={styles.cardHeaderLeft}>
// 					<SkeletonLine width={32} height={32} style={{ borderRadius: 12 }} />
// 					<View>
// 						<SkeletonLine width={140} height={18} />
// 						<SkeletonLine
// 							width={150}
// 							height={12}
// 							style={{ marginTop: 6, borderRadius: 6 }}
// 						/>
// 					</View>
// 				</View>
// 				<SkeletonLine width={60} height={14} />
// 			</View>
// 			<View style={styles.statRow}>
// 				<SkeletonLine width="32%" height={48} style={{ borderRadius: 16 }} />
// 				<SkeletonLine width="32%" height={48} style={{ borderRadius: 16 }} />
// 				<SkeletonLine width="32%" height={48} style={{ borderRadius: 16 }} />
// 			</View>
// 		</View>
// 	);
// }



function QuickActionButton({
	label,
	onPress,
	secondary = false,
}: {
	label: string;
	onPress: () => void;
	secondary?: boolean;
}) {
	return (
		<AppButton
			label={label}
			variant={secondary ? 'secondary' : 'primary'}
			onPress={onPress}
			size="md"
		/>
	);
}

type UpcomingExpenseSummary = {
	id: string;
	vendor: string;
	amount: string;
};

const styles = StyleSheet.create({
	header: {
		// Horizontal padding handled by AppScreen
		paddingBottom: 12,
	},
	subtitle: {
		marginTop: 4,
	},
	// content styles removed - AppScreen now handles all screen-level spacing
	// Card styles moved to AppCard primitive
	cardHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	cardHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	cardIcon: {
		width: 32,
		height: 32,
		borderRadius: 12,
		backgroundColor: palette.primarySubtle,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardTitle: {
		...type.numLg,
		color: palette.text,
	},
	cardSub: {
		marginTop: 6,
		color: palette.textMuted,
	},
	statRow: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 16,
	},
	statPill: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
		borderRadius: 14,
		paddingVertical: 10,
		paddingHorizontal: 12,
		gap: 4,
	},
	statPillLabel: {
		color: palette.textMuted,
		...type.bodyXs,
	},
	statPillValue: {
		color: palette.text,
		...type.body,
		fontWeight: '600',
	},
	linkText: {
		color: palette.primary,
		...type.body,
		fontWeight: '600',
	},
	ticketList: {
		marginTop: 14,
		gap: 12,
	},
	ticketItem: {
		backgroundColor: palette.surfaceAlt,
		borderRadius: 18,
		paddingVertical: 12,
		paddingHorizontal: 16,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	ticketVendor: {
		color: palette.text,
		...type.body,
		fontWeight: '600',
	},
	ticketMeta: {
		color: palette.textMuted,
		...type.bodyXs,
		marginTop: 2,
	},
	footerSpacer: {
		height: 32,
	},
	skeletonBlock: {
		backgroundColor: palette.border,
	},
	quickActionsRow: {
		flexDirection: 'row',
		gap: 12,
		flexWrap: 'wrap',
		// Vertical spacing handled by AppScreen gap system
	},
	// QuickActionButton styles moved to AppButton primitive
});


export default function WalletOverviewScreen() {
	const {
		budgets,
		monthlySummary,
		hasLoaded: budgetsLoaded,
		isLoading: budgetsLoading,
		refetch: refetchBudgets,
	} = useBudget();
	const {
		goals,
		hasLoaded: goalsLoaded,
		isLoading: goalsLoading,
		refetch: refetchGoals,
	} = useGoal();
	const {
		expenses,
		hasLoaded: billsLoaded,
		isLoading: billsLoading,
		refetch: refetchBills,
	} = useBills();
	const { profile } = useProfile();

	// Debt tracking hidden for MVP - increases finance complexity perception
	// const [debts, setDebts] = useState<Debt[]>([]);
	// const [debtsLoading, setDebtsLoading] = useState(true);

	const [showBreakdown, setShowBreakdown] = useState(false);
	const budgetsBusy = budgetsLoading && !budgetsLoaded;
	const billsBusy = billsLoading && !billsLoaded;
	const goalsBusy = goalsLoading && !goalsLoaded;
	// const debtsBusy = debtsLoading && !debts.length;

	useEffect(() => {
		if (!budgetsLoaded) {
			refetchBudgets();
		}
	}, [budgetsLoaded, refetchBudgets]);

	useEffect(() => {
		if (!goalsLoaded) {
			refetchGoals();
		}
	}, [goalsLoaded, refetchGoals]);

	useEffect(() => {
		if (!billsLoaded) {
			refetchBills();
		}
	}, [billsLoaded, refetchBills]);

	// Debt tracking hidden for MVP - increases finance complexity perception
	// const loadDebts = useCallback(async () => {
	// 	// Don't flip to skeleton on refocus if we already have data
	// 	if (debts.length > 0) return;
	// 	
	// 	setDebtsLoading(true);
	// 	try {
	// 		const data = await DebtsService.getDebts();
	// 		setDebts(data);
	// 	} catch (error) {
	// 		console.warn('Failed to load debts summary', error);
	// 	} finally {
	// 		setDebtsLoading(false);
	// 	}
	// }, [debts.length]);

	// useFocusEffect(
	// 	useCallback(() => {
	// 		loadDebts();
	// 	}, [loadDebts])
	// );

	// Extract current values for tracked balance
	const budgetsAmount = monthlySummary?.totalAllocated ?? 0;
	const goalsAmount = goals.reduce((sum, goal) => sum + (goal.current || 0), 0);
	// Debt tracking hidden for MVP - increases finance complexity perception
	// const debtsAmount = DebtsService.calculateTotalDebt(debts);

	// Calculate tracked balance (budgets allocated + goals current)
	// Debt tracking hidden for MVP - increases finance complexity perception
	const trackedBalance = useMemo(() => {
		return budgetsAmount + goalsAmount;
	}, [budgetsAmount, goalsAmount]);


	const formatCurrency = useCallback((amount?: number | null) => {
		if (typeof amount !== 'number' || Number.isNaN(amount)) {
			return '—';
		}
		return currencyFormatter.format(amount);
	}, []);

	const budgetSummary = useMemo(() => {
		const loading = budgetsLoading && !budgetsLoaded;
		if (loading) {
			return {
				total: '—',
				spent: '—',
				remaining: '—',
				subtitle: 'Loading budgets…',
			};
		}

		const total = monthlySummary?.totalAllocated ?? 0;
		const spent = monthlySummary?.totalSpent ?? 0;
		const remaining = Math.max(0, total - spent);

		return {
			total: formatCurrency(total),
			spent: formatCurrency(spent),
			remaining: formatCurrency(remaining),
			subtitle:
				budgets.length > 0
					? `${budgets.length} ${
							budgets.length === 1 ? 'budget' : 'budgets'
					  } this month`
					: 'No budgets yet',
		};
	}, [
		budgetsLoading,
		budgetsLoaded,
		monthlySummary,
		formatCurrency,
		budgets.length,
	]);

	const {
		dueThisWeekCount,
		dueThisWeekAmount,
		upcomingExpenses,
		billsSubtitle,
	} = useMemo(() => {
		const loading = billsLoading && !billsLoaded;
		if (loading) {
			return {
				dueThisWeekCount: 0,
				dueThisWeekAmount: '—',
				upcomingExpenses: [] as UpcomingExpenseSummary[],
				billsSubtitle: 'Loading upcoming bills…',
			};
		}

		if (!expenses.length) {
			return {
				dueThisWeekCount: 0,
				dueThisWeekAmount: formatCurrency(0),
				upcomingExpenses: [] as UpcomingExpenseSummary[],
				billsSubtitle: 'No bills yet',
			};
		}

		const dueSoon = expenses.filter((expense) => {
			if (!expense?.nextExpectedDate) return false;
			const days = BillService.getDaysUntilNext(expense.nextExpectedDate);
			return days >= 0 && days <= 7;
		});

		const amountDue = dueSoon.reduce(
			(sum, expense) => sum + (expense.amount || 0),
			0
		);

		const upcoming = [...expenses]
			.filter((expense) => expense.nextExpectedDate)
			.sort((a, b) => {
				const aDate = new Date(a.nextExpectedDate ?? '').getTime();
				const bDate = new Date(b.nextExpectedDate ?? '').getTime();
				return aDate - bDate;
			})
			.slice(0, 2)
			.map((expense, index) => ({
				id: expense.patternId ?? `${expense.vendor}-${index}`,
				vendor: expense.vendor,
				amount: formatCurrency(expense.amount),
			}));

		return {
			dueThisWeekCount: dueSoon.length,
			dueThisWeekAmount: formatCurrency(amountDue),
			upcomingExpenses: upcoming,
			billsSubtitle:
				dueSoon.length > 0
					? `${dueSoon.length} ${
							dueSoon.length === 1 ? 'bill' : 'bills'
					  } due in the next 7 days`
					: 'No bills due within 7 days',
		};
	}, [billsLoading, billsLoaded, expenses, formatCurrency]);

	const goalsSummary = useMemo(() => {
		const loading = goalsLoading && !goalsLoaded;
		if (loading) {
			return {
				subtitle: 'Loading goals…',
				saved: '—',
				target: '—',
				progress: '—',
			};
		}

		if (!goals.length) {
			return {
				subtitle: 'No goals yet',
				saved: formatCurrency(0),
				target: formatCurrency(0),
				progress: '0%',
			};
		}

		const totalCurrent = goals.reduce(
			(sum, goal) => sum + (goal.current || 0),
			0
		);
		const completedCount = goals.filter((goal) => {
			if (typeof goal.isCompleted === 'boolean') {
				return goal.isCompleted;
			}
			return (goal.current || 0) >= (goal.target || 0);
		}).length;
		const totalTarget = goals.reduce(
			(sum, goal) => sum + (goal.target || 0),
			0
		);
		const progressPercent =
			totalTarget === 0 ? 0 : Math.min(totalCurrent / totalTarget, 1);

		return {
			subtitle: `${completedCount}/${goals.length} completed`,
			saved: formatCurrency(totalCurrent),
			target: formatCurrency(totalTarget),
			progress: `${Math.round(progressPercent * 100)}%`,
		};
	}, [goalsLoading, goalsLoaded, goals, formatCurrency]);

	// Debt tracking hidden for MVP - increases finance complexity perception
	// const debtSummary = useMemo(() => {
	// 	if (debtsLoading) {
	// 		return {
	// 			subtitle: 'Loading debts…',
	// 			totalDebt: '—',
	// 			count: '—',
	// 			average: '—',
	// 		};
	// 	}

	// 	if (!debts.length) {
	// 		return {
	// 			subtitle: 'No debts tracked yet',
	// 			totalDebt: formatCurrency(0),
	// 			count: '0',
	// 			average: formatCurrency(0),
	// 		};
	// 	}

	// 	const totalDebtAmount = DebtsService.calculateTotalDebt(debts);
	// 	const averageDebt = totalDebtAmount / debts.length;

	// 	return {
	// 		subtitle: `Total debt remaining: ${formatCurrency(totalDebtAmount)}`,
	// 		totalDebt: formatCurrency(totalDebtAmount),
	// 		count: String(debts.length),
	// 		average: formatCurrency(averageDebt),
	// 	};
	// }, [debtsLoading, debts, formatCurrency]);


	// Calculate "Safe to Spend This Week"
	const safeToSpendThisWeek = useMemo(() => {
		// Get weekly income (from monthly income / 4.33, or from transactions)
		const monthlyIncome = profile?.monthlyIncome || 0;
		const weeklyIncome = monthlyIncome / 4.33;

		// Calculate weekly budget allocation
		// Monthly budgets divided by 4.33, plus weekly budgets
		const monthlyBudgets = budgets.filter((b) => b.period === 'monthly');
		const weeklyBudgets = budgets.filter((b) => b.period === 'weekly');
		
		const monthlyBudgetWeekly = monthlyBudgets.reduce(
			(sum, b) => sum + (b.amount / 4.33),
			0
		);
		const weeklyBudgetTotal = weeklyBudgets.reduce(
			(sum, b) => sum + b.amount,
			0
		);
		const totalWeeklyBudget = monthlyBudgetWeekly + weeklyBudgetTotal;

		// Get bills due this week (already calculated above)
		const billsDueThisWeek = expenses
			.filter((expense) => {
				if (!expense?.nextExpectedDate) return false;
				const days = BillService.getDaysUntilNext(expense.nextExpectedDate);
				return days >= 0 && days <= 7;
			})
			.reduce((sum, expense) => sum + (expense.amount || 0), 0);

		// Safe to spend = weekly income - weekly budgets - bills due this week
		const safeToSpend = Math.max(0, weeklyIncome - totalWeeklyBudget - billsDueThisWeek);

		return safeToSpend;
	}, [profile?.monthlyIncome, budgets, expenses]);

	return (
		<AppScreen>
			<View style={styles.header}>
				<AppText.Title>Wallet Overview</AppText.Title>
				<AppText.Subtitle color="muted" style={styles.subtitle}>
					Manage what you&apos;re tracking
				</AppText.Subtitle>
			</View>
				{budgetsBusy || goalsBusy ? (
					<WalletHeroSkeleton />
				) : (
					<SafeToSpendHero
						safeToSpend={safeToSpendThisWeek}
						onPress={() => setShowBreakdown(true)}
					/>
				)}

				<View style={styles.quickActionsRow}>
					<QuickActionButton
						label="Add Goal"
						onPress={() => router.push('/(tabs)/wallet/goals/new')}
					/>
					<QuickActionButton
						label="Add Budget"
						onPress={() => router.push('/(tabs)/wallet/budgets/new')}
						secondary
					/>
					<QuickActionButton
						label="Add Bill"
						onPress={() => router.push('/(tabs)/wallet/bills/new')}
						secondary
					/>
				</View>

				{budgetsBusy ? (
					<BudgetCardSkeleton />
				) : (
					<AppCard
						onPress={() => router.push('/(tabs)/wallet/budgets')}
						accessibilityLabel="Open budgets overview"
					>
						<View>
							<CardHeader
								title="Budget Overview"
								subtitle={budgetSummary.subtitle}
								actionLabel="View"
								icon="pie-chart-outline"
							/>

							<View style={styles.statRow}>
								<StatPill label="Total" value={budgetSummary.total} />
								<StatPill label="Spent" value={budgetSummary.spent} />
								<StatPill label="Remaining" value={budgetSummary.remaining} />
							</View>
						</View>
					</AppCard>
				)}

				{billsBusy ? (
					<UpcomingBillsSkeleton />
				) : (
					<AppCard
						onPress={() => router.push('/(tabs)/wallet/bills')}
						accessibilityLabel="Open upcoming bills"
					>
						<View>
							<CardHeader
								title="Upcoming Bills"
								subtitle={billsSubtitle}
								actionLabel="Manage"
								icon="repeat-outline"
							/>

							<View style={styles.statRow}>
								<StatPill
									label="Due (7d)"
									value={String(dueThisWeekCount > 0 ? dueThisWeekCount : 0)}
								/>
								<StatPill label="Amount Due" value={dueThisWeekAmount} />
								<StatPill label="Patterns" value={String(expenses.length)} />
							</View>

							<View style={styles.ticketList}>
								{upcomingExpenses.length > 0 ? (
									upcomingExpenses.map((expense) => (
										<View key={expense.id} style={styles.ticketItem}>
											<View>
												<Text style={styles.ticketVendor}>
													{expense.vendor}
												</Text>
												<Text style={styles.ticketMeta}>Due soon</Text>
											</View>
											<Text style={styles.ticketVendor}>{expense.amount}</Text>
										</View>
									))
								) : (
									<View style={styles.ticketItem}>
										<View>
											<Text style={styles.ticketVendor}>No upcoming bills</Text>
											<Text style={styles.ticketMeta}>You&apos;re all set</Text>
										</View>
									</View>
								)}
							</View>
						</View>
					</AppCard>
				)}

				{goalsBusy ? (
					<GoalsCardSkeleton />
				) : (
					<AppCard
						onPress={() => router.push('/(tabs)/wallet/goals')}
						accessibilityLabel="Open savings goals"
					>
						<View>
							<CardHeader
								title="Savings Goals"
								subtitle={goalsSummary.subtitle}
								actionLabel="View"
								icon="flag-outline"
							/>

							<View style={styles.statRow}>
								<StatPill label="Saved" value={goalsSummary.saved} />
								<StatPill label="Target" value={goalsSummary.target} />
								<StatPill label="Progress" value={goalsSummary.progress} />
							</View>
						</View>
					</AppCard>
				)}

				{/* Debt tracking hidden for MVP - increases finance complexity perception */}
				{/* {debtsBusy ? (
					<DebtCardSkeleton />
				) : (
					<AppCard
						onPress={() => router.push('/(tabs)/wallet/debts')}
						accessibilityLabel="Open debt payoff details"
					>
						<View>
							<CardHeader
								title="Debt Payoff"
								subtitle={debtSummary.subtitle}
								actionLabel="Track"
								icon="card-outline"
							/>

							<View style={styles.statRow}>
								<StatPill label="Total" value={debtSummary.totalDebt} />
								<StatPill label="Accounts" value={debtSummary.count} />
								<StatPill label="Avg Balance" value={debtSummary.average} />
							</View>
						</View>
					</AppCard>
				)} */}

				<TransactionsSummaryCard />

				<View style={styles.footerSpacer} />

			{/* Breakdown Modal */}
			<BottomSheet
				isOpen={showBreakdown}
				onClose={() => setShowBreakdown(false)}
				snapPoints={[0.5, 0.4]}
				header={
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							justifyContent: 'space-between',
							paddingHorizontal: 20,
							paddingBottom: 12,
						}}
					>
					<AppText.Heading>Total Tracked</AppText.Heading>
					<TouchableOpacity onPress={() => setShowBreakdown(false)}>
						<Ionicons name="close" size={24} color={palette.textSubtle} />
					</TouchableOpacity>
					</View>
				}
			>
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
				>
					<AppText.Title style={{ marginBottom: 24 }}>
						{currencyFormatter.format(trackedBalance)}
					</AppText.Title>

					<View style={{ gap: 16 }}>
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
								paddingVertical: 12,
								borderBottomWidth: 1,
								borderBottomColor: palette.border,
							}}
						>
							<View
								style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
							>
								<View
									style={{
										width: 40,
										height: 40,
										borderRadius: 12,
										backgroundColor: palette.primarySubtle,
										alignItems: 'center',
										justifyContent: 'center',
									}}
								>
									<Ionicons
										name="pie-chart-outline"
										size={20}
										color={palette.primary}
									/>
								</View>
								<View>
									<AppText.Heading>Budgets (monthly)</AppText.Heading>
									<AppText.Body color="subtle" style={{ marginTop: 2 }}>
										{formatCurrency(budgetsAmount)}
									</AppText.Body>
								</View>
							</View>
						</View>

						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
								paddingVertical: 12,
								borderBottomWidth: 1,
								borderBottomColor: palette.border,
							}}
						>
							<View
								style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
							>
								<View
									style={{
										width: 40,
										height: 40,
										borderRadius: 12,
										backgroundColor: palette.primarySubtle,
										alignItems: 'center',
										justifyContent: 'center',
									}}
								>
									<Ionicons name="flag-outline" size={20} color={palette.primary} />
								</View>
								<View>
									<AppText.Heading>Goals saved</AppText.Heading>
									<AppText.Body color="subtle" style={{ marginTop: 2 }}>
										{formatCurrency(goalsAmount)}
									</AppText.Body>
								</View>
							</View>
						</View>

						{/* Debt tracking hidden for MVP - increases finance complexity perception */}
						{/* <View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
								paddingVertical: 12,
							}}
						>
							<View
								style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
							>
								<View
									style={{
										width: 40,
										height: 40,
										borderRadius: 12,
										backgroundColor: palette.primarySubtle,
										alignItems: 'center',
										justifyContent: 'center',
									}}
								>
									<Ionicons name="card-outline" size={20} color={palette.primary} />
								</View>
								<View>
									<Text
										style={{
											...type.h2,
											color: palette.text,
										}}
									>
										Debt remaining
									</Text>
									<Text
										style={{
											...type.body,
											color: palette.textMuted,
											marginTop: 2,
										}}
									>
										{formatCurrency(debtsAmount)}
									</Text>
								</View>
							</View>
						</View> */}
					</View>
				</ScrollView>
			</BottomSheet>
		</AppScreen>
	);
}
