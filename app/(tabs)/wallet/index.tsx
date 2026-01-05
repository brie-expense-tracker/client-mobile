import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	Animated,
	SafeAreaView,
	ScrollView,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { useBudget } from '../../../src/context/budgetContext';
import { useGoal } from '../../../src/context/goalContext';
import { useBills } from '../../../src/context/billContext';
import { BillService } from '../../../src/services';
import { DebtsService, Debt } from '../../../src/services/feature/debtsService';
import { palette, space, shadow } from '../../../src/ui/theme';
import { getItem, setItem } from '../../../src/utils/safeStorage';
import BottomSheet from '../../../src/components/BottomSheet';

const currencyFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
});

function WalletHero({
	total = 0,
	setupNetChange = 0,
	onPress,
}: {
	total?: number | null;
	setupNetChange?: number;
	onPress?: () => void;
}) {
	const formatted = `${
		setupNetChange >= 0 ? '+' : ''
	}${currencyFormatter.format(Math.abs(setupNetChange))} this month`;

	const isPositive = setupNetChange >= 0;

	const content = (
		<View style={heroStyles.container}>
			<View>
				<Text style={heroStyles.overline}>Your setup</Text>
				<Text style={heroStyles.label}>Total Tracked</Text>
				<Text style={heroStyles.amount}>
					{currencyFormatter.format(total ?? 0)}
				</Text>
				<Text style={heroStyles.sub}>
					Everything you&apos;re currently tracking
				</Text>
			</View>
			<View style={heroStyles.heroRight}>
				<View style={heroStyles.deltaPill}>
					<Text style={heroStyles.deltaText}>
						{isPositive ? '↑ ' : '↓ '}
						{formatted}
					</Text>
				</View>
				<View style={heroStyles.heroSparklineWrapper}>
					<Svg width={90} height={40}>
						<Path
							d="M2 30 L18 22 L36 24 L54 12 L72 18 L88 6"
							stroke="#0F6FFF"
							strokeWidth={2}
							fill="none"
							strokeLinecap="round"
						/>
					</Svg>
				</View>
			</View>
		</View>
	);

	if (onPress) {
		return (
			<TouchableOpacity onPress={onPress} activeOpacity={0.7}>
				{content}
			</TouchableOpacity>
		);
	}

	return content;
}

const heroStyles = StyleSheet.create({
	container: {
		backgroundColor: '#0F172A',
		borderRadius: 24,
		padding: 22,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 20,
		...shadow.card,
	},
	overline: {
		color: '#CBD5F5',
		fontSize: 12,
		fontWeight: '500',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 2,
	},
	label: {
		color: '#E2E8F0',
		fontWeight: '600',
		fontSize: 16,
	},
	amount: {
		fontSize: 32,
		fontWeight: '700',
		color: '#F8FAFC',
		marginTop: 8,
	},
	sub: {
		color: '#CBD5F5',
		marginTop: 8,
		fontSize: 13,
	},
	heroRight: {
		alignItems: 'flex-end',
		flex: 1,
	},
	deltaPill: {
		backgroundColor: 'rgba(15,111,255,0.18)',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 999,
	},
	deltaText: {
		color: '#60A5FA',
		fontWeight: '600',
		fontSize: 12,
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
		<View style={styles.card}>
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
		</View>
	);
}

function UpcomingBillsSkeleton() {
	return (
		<View style={styles.card}>
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
		</View>
	);
}

function GoalsCardSkeleton() {
	return (
		<View style={styles.card}>
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
		</View>
	);
}

function DebtCardSkeleton() {
	return (
		<View style={styles.card}>
			<View style={styles.cardHeaderRow}>
				<View style={styles.cardHeaderLeft}>
					<SkeletonLine width={32} height={32} style={{ borderRadius: 12 }} />
					<View>
						<SkeletonLine width={140} height={18} />
						<SkeletonLine
							width={150}
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
		</View>
	);
}

type CardHeaderProps = {
	title: string;
	subtitle?: string;
	actionLabel?: string;
	icon?: keyof typeof Ionicons.glyphMap;
};

function CardHeader({
	title,
	subtitle,
	actionLabel,
	icon = 'ellipse-outline',
}: CardHeaderProps) {
	return (
		<View style={styles.cardHeaderRow}>
			<View style={styles.cardHeaderLeft}>
				<View style={styles.cardIcon}>
					<Ionicons name={icon} size={18} color="#0F6FFF" />
				</View>
				<View>
					<Text style={styles.cardTitle}>{title}</Text>
					{subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
				</View>
			</View>
			{actionLabel ? <Text style={styles.linkText}>{actionLabel}</Text> : null}
		</View>
	);
}

function StatPill({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.statPill}>
			<Text style={styles.statPillLabel}>{label}</Text>
			<Text style={styles.statPillValue}>{value}</Text>
		</View>
	);
}

function QuickActionButton({
	label,
	onPress,
}: {
	label: string;
	onPress: () => void;
}) {
	return (
		<TouchableOpacity onPress={onPress} style={styles.quickAction}>
			<Text style={styles.quickActionText}>{label}</Text>
		</TouchableOpacity>
	);
}

type UpcomingExpenseSummary = {
	id: string;
	vendor: string;
	amount: string;
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
	},
	scroll: {
		backgroundColor: '#F1F5F9',
	},
	header: {
		paddingHorizontal: space.xl,
		paddingTop: space.lg,
		paddingBottom: 12,
		backgroundColor: palette.surfaceAlt,
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		color: palette.text,
	},
	subtitle: {
		marginTop: 4,
		color: palette.textMuted,
	},
	content: {
		paddingHorizontal: space.xl,
		paddingTop: 16,
		paddingBottom: 32,
		gap: 18,
		backgroundColor: '#F1F5F9',
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 22,
		padding: 18,
		...shadow.card,
	},
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
		backgroundColor: 'rgba(15,111,255,0.12)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '600',
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
		backgroundColor: '#F8FAFC',
		borderRadius: 14,
		paddingVertical: 10,
		paddingHorizontal: 12,
		gap: 4,
	},
	statPillLabel: {
		color: '#94A3B8',
		fontSize: 12,
	},
	statPillValue: {
		color: '#0F172A',
		fontWeight: '600',
	},
	linkText: {
		color: palette.primary,
		fontWeight: '600',
	},
	ticketList: {
		marginTop: 14,
		gap: 12,
	},
	ticketItem: {
		backgroundColor: '#F8FAFC',
		borderRadius: 18,
		paddingVertical: 12,
		paddingHorizontal: 16,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	ticketVendor: {
		color: '#0F172A',
		fontWeight: '600',
	},
	ticketMeta: {
		color: '#94A3B8',
		fontSize: 12,
		marginTop: 2,
	},
	footerSpacer: {
		height: 32,
	},
	skeletonBlock: {
		backgroundColor: '#E5E7EB',
	},
	quickActionsRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 4,
		flexWrap: 'wrap',
	},
	quickAction: {
		backgroundColor: '#fff',
		borderRadius: 16,
		paddingHorizontal: 16,
		paddingVertical: 10,
		flexGrow: 1,
		minWidth: 110,
		alignItems: 'center',
		...shadow.card,
	},
	quickActionText: {
		fontWeight: '600',
		color: '#0F172A',
	},
});

function useCardPressAnimation() {
	const scale = useRef(new Animated.Value(1)).current;
	const opacity = useRef(new Animated.Value(1)).current;

	const handlePressIn = useCallback(() => {
		Animated.parallel([
			Animated.spring(scale, {
				toValue: 0.97,
				useNativeDriver: true,
				speed: 20,
				bounciness: 6,
			}),
			Animated.timing(opacity, {
				toValue: 0.9,
				duration: 120,
				useNativeDriver: true,
			}),
		]).start();
	}, [scale, opacity]);

	const handlePressOut = useCallback(() => {
		Animated.parallel([
			Animated.spring(scale, {
				toValue: 1,
				useNativeDriver: true,
				speed: 20,
				bounciness: 6,
			}),
			Animated.timing(opacity, {
				toValue: 1,
				duration: 120,
				useNativeDriver: true,
			}),
		]).start();
	}, [scale, opacity]);

	const animatedStyle: StyleProp<ViewStyle> = {
		transform: [{ scale }],
		opacity,
	};

	return { animatedStyle, handlePressIn, handlePressOut };
}

type CardWrapperProps = {
	children: React.ReactNode;
	onPress?: () => void;
	accessibilityLabel: string;
};

function CardWrapper({
	children,
	onPress,
	accessibilityLabel,
}: CardWrapperProps) {
	const { animatedStyle, handlePressIn, handlePressOut } =
		useCardPressAnimation();

	const isPressable = !!onPress;

	return (
		<TouchableOpacity
			activeOpacity={1}
			onPress={onPress}
			onPressIn={isPressable ? handlePressIn : undefined}
			onPressOut={isPressable ? handlePressOut : undefined}
			disabled={!isPressable}
			accessibilityRole={isPressable ? 'button' : undefined}
			accessibilityLabel={accessibilityLabel}
		>
			<Animated.View style={[styles.card, animatedStyle]}>
				{children}
			</Animated.View>
		</TouchableOpacity>
	);
}

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

	const [debts, setDebts] = useState<Debt[]>([]);
	const [debtsLoading, setDebtsLoading] = useState(true);

	type WalletBaseline = {
		budgetsAllocated: number;
		goalsCurrent: number;
		debtTotal: number;
		trackedBalance: number;
		createdAt: string;
	};

	const [monthBaseline, setMonthBaseline] = useState<WalletBaseline | null>(
		null
	);
	const [showBreakdown, setShowBreakdown] = useState(false);
	const budgetsBusy = budgetsLoading && !budgetsLoaded;
	const billsBusy = billsLoading && !billsLoaded;
	const goalsBusy = goalsLoading && !goalsLoaded;
	const debtsBusy = debtsLoading && !debts.length;

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

	const loadDebts = useCallback(async () => {
		setDebtsLoading(true);
		try {
			const data = await DebtsService.getDebts();
			setDebts(data);
		} catch (error) {
			console.warn('Failed to load debts summary', error);
		} finally {
			setDebtsLoading(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadDebts();
		}, [loadDebts])
	);

	// Helper functions for month keys
	const getMonthKey = useCallback((d = new Date()) => {
		return `${d.getFullYear()}_${d.getMonth()}`;
	}, []);

	const baselineKeyForMonth = useCallback(
		(d = new Date()) => {
			return `walletBaseline_${getMonthKey(d)}`;
		},
		[getMonthKey]
	);

	// Extract current values for tracked balance and baseline comparison
	const budgetsAmount = monthlySummary?.totalAllocated ?? 0;
	const goalsAmount = goals.reduce((sum, goal) => sum + (goal.current || 0), 0);
	const debtsAmount = DebtsService.calculateTotalDebt(debts);

	// Calculate tracked balance (budgets allocated + goals current + debts total)
	const trackedBalance = useMemo(() => {
		return budgetsAmount + goalsAmount + debtsAmount;
	}, [budgetsAmount, goalsAmount, debtsAmount]);

	// Load or create the baseline once data is ready
	useEffect(() => {
		const loadOrCreateBaseline = async () => {
			try {
				const key = baselineKeyForMonth();
				const stored = await getItem(key);

				if (stored) {
					setMonthBaseline(JSON.parse(stored));
					return;
				}

				// Create baseline at first "stable load" of the month
				const baseline: WalletBaseline = {
					budgetsAllocated: budgetsAmount,
					goalsCurrent: goalsAmount,
					debtTotal: debtsAmount,
					trackedBalance: budgetsAmount + goalsAmount + debtsAmount,
					createdAt: new Date().toISOString(),
				};

				await setItem(key, JSON.stringify(baseline));
				setMonthBaseline(baseline);
			} catch (e) {
				console.warn('Failed to load/create wallet baseline', e);
			}
		};

		// only do this when data is actually loaded and stable
		if (!budgetsBusy && !goalsBusy && !debtsBusy) {
			loadOrCreateBaseline();
		}
	}, [
		budgetsBusy,
		goalsBusy,
		debtsBusy,
		budgetsAmount,
		goalsAmount,
		debtsAmount,
		baselineKeyForMonth,
	]);

	// Compute "this month" setup change
	const setupNetChange = useMemo(() => {
		if (!monthBaseline) return 0;

		const budgetsDelta = budgetsAmount - monthBaseline.budgetsAllocated;
		const goalsDelta = goalsAmount - monthBaseline.goalsCurrent;
		const debtDelta = debtsAmount - monthBaseline.debtTotal; // positive means debt increased

		// debt going down is GOOD -> subtract debt delta
		return budgetsDelta + goalsDelta - debtDelta;
	}, [monthBaseline, budgetsAmount, goalsAmount, debtsAmount]);

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

	const debtSummary = useMemo(() => {
		if (debtsLoading) {
			return {
				subtitle: 'Loading debts…',
				totalDebt: '—',
				count: '—',
				average: '—',
			};
		}

		if (!debts.length) {
			return {
				subtitle: 'No debts tracked yet',
				totalDebt: formatCurrency(0),
				count: '0',
				average: formatCurrency(0),
			};
		}

		const totalDebtAmount = DebtsService.calculateTotalDebt(debts);
		const averageDebt = totalDebtAmount / debts.length;

		return {
			subtitle: `Total debt remaining: ${formatCurrency(totalDebtAmount)}`,
			totalDebt: formatCurrency(totalDebtAmount),
			count: String(debts.length),
			average: formatCurrency(averageDebt),
		};
	}, [debtsLoading, debts, formatCurrency]);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Wallet Overview</Text>
				<Text style={styles.subtitle}>Manage what you&apos;re tracking</Text>
			</View>

			<ScrollView
				style={styles.scroll}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.content}
			>
				{budgetsBusy || goalsBusy || debtsBusy ? (
					<WalletHeroSkeleton />
				) : (
					<WalletHero
						total={trackedBalance}
						setupNetChange={setupNetChange}
						onPress={() => setShowBreakdown(true)}
					/>
				)}

				<View style={styles.quickActionsRow}>
					<QuickActionButton
						label="Add Budget"
						onPress={() => router.push('/(tabs)/wallet/budgets/new')}
					/>
					<QuickActionButton
						label="Add Bill"
						onPress={() => router.push('/(tabs)/wallet/bills/new')}
					/>
					<QuickActionButton
						label="Add Goal"
						onPress={() => router.push('/(tabs)/wallet/goals/new')}
					/>
				</View>

				{budgetsBusy ? (
					<BudgetCardSkeleton />
				) : (
					<CardWrapper
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
					</CardWrapper>
				)}

				{billsBusy ? (
					<UpcomingBillsSkeleton />
				) : (
					<CardWrapper
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
					</CardWrapper>
				)}

				{goalsBusy ? (
					<GoalsCardSkeleton />
				) : (
					<CardWrapper
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
					</CardWrapper>
				)}

				{debtsBusy ? (
					<DebtCardSkeleton />
				) : (
					<CardWrapper
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
					</CardWrapper>
				)}

				<View style={styles.footerSpacer} />
			</ScrollView>

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
						<Text
							style={{
								fontSize: 20,
								fontWeight: '700',
								color: '#0F172A',
							}}
						>
							Total Tracked
						</Text>
						<TouchableOpacity onPress={() => setShowBreakdown(false)}>
							<Ionicons name="close" size={24} color="#64748B" />
						</TouchableOpacity>
					</View>
				}
			>
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
				>
					<Text
						style={{
							fontSize: 32,
							fontWeight: '700',
							color: '#0F172A',
							marginBottom: 24,
						}}
					>
						{currencyFormatter.format(trackedBalance)}
					</Text>

					<View style={{ gap: 16 }}>
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
								paddingVertical: 12,
								borderBottomWidth: 1,
								borderBottomColor: '#E5E7EB',
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
										backgroundColor: 'rgba(15,111,255,0.12)',
										alignItems: 'center',
										justifyContent: 'center',
									}}
								>
									<Ionicons
										name="pie-chart-outline"
										size={20}
										color="#0F6FFF"
									/>
								</View>
								<View>
									<Text
										style={{
											fontSize: 16,
											fontWeight: '600',
											color: '#0F172A',
										}}
									>
										Budgets (monthly)
									</Text>
									<Text
										style={{
											fontSize: 13,
											color: '#64748B',
											marginTop: 2,
										}}
									>
										{formatCurrency(budgetsAmount)}
									</Text>
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
								borderBottomColor: '#E5E7EB',
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
										backgroundColor: 'rgba(15,111,255,0.12)',
										alignItems: 'center',
										justifyContent: 'center',
									}}
								>
									<Ionicons name="flag-outline" size={20} color="#0F6FFF" />
								</View>
								<View>
									<Text
										style={{
											fontSize: 16,
											fontWeight: '600',
											color: '#0F172A',
										}}
									>
										Goals saved
									</Text>
									<Text
										style={{
											fontSize: 13,
											color: '#64748B',
											marginTop: 2,
										}}
									>
										{formatCurrency(goalsAmount)}
									</Text>
								</View>
							</View>
						</View>

						<View
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
										backgroundColor: 'rgba(15,111,255,0.12)',
										alignItems: 'center',
										justifyContent: 'center',
									}}
								>
									<Ionicons name="card-outline" size={20} color="#0F6FFF" />
								</View>
								<View>
									<Text
										style={{
											fontSize: 16,
											fontWeight: '600',
											color: '#0F172A',
										}}
									>
										Debt remaining
									</Text>
									<Text
										style={{
											fontSize: 13,
											color: '#64748B',
											marginTop: 2,
										}}
									>
										{formatCurrency(debtsAmount)}
									</Text>
								</View>
							</View>
						</View>
					</View>
				</ScrollView>
			</BottomSheet>
		</SafeAreaView>
	);
}
