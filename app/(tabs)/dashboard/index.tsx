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
} from 'react-native';
import {
	SafeAreaView,
	useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TransactionContext } from '../../../src/context/transactionContext';
import useAuth from '../../../src/context/AuthContext';
// MVP: InsightsService, DashboardService removed - cash-only focus
import {
	accessibilityProps,
	generateAccessibilityLabel,
} from '../../../src/utils/accessibility';
import { palette, space, type, radius } from '../../../src/ui/theme';
import { useDevModeEasterEgg } from '../../../src/hooks/useDevModeEasterEgg';
import {
	AppScreen,
	AppCard,
	AppText,
	AppButton,
} from '../../../src/ui/primitives';
import { ErrorBoundary } from '../../../src/components/ErrorBoundary';
import { useConnectivity } from '../../../src/utils/connectivity';

const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
}).format;

export default function DashboardPro() {
	const { transactions, isLoading, refetch } = useContext(TransactionContext);
	const { firebaseUser, user } = useAuth();
	const insets = useSafeAreaInsets();
	const [refreshing, setRefreshing] = useState(false);
	const { handleLogoTap } = useDevModeEasterEgg();
	const { isOnline } = useConnectivity();

	// MVP: Simplified refresh - transactions only
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refetch();
		} finally {
			setRefreshing(false);
		}
	}, [refetch]);

	// Refresh when dashboard comes into focus
	useFocusEffect(
		useCallback(() => {
			refetch();
		}, [refetch]),
	);

	// Calculate "Cash on Me" (sum of IN minus sum of OUT)
	const totalBalance = useMemo(() => {
		let balance = 0;
		for (const t of transactions) {
			balance += isNaN(t.amount) ? 0 : t.amount;
		}
		return balance;
	}, [transactions]);

	// Match web Today panel: only aggregate in/out for current local day.
	const todaySummary = useMemo(() => {
		const now = new Date();
		const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

		let totalIn = 0;
		let totalOut = 0;

		for (const t of transactions) {
			const txDate = (t.date || '').slice(0, 10);
			if (!txDate || txDate.length < 10) continue;
			if (txDate !== todayIso) continue;

			const amt = isNaN(t.amount) ? 0 : Math.abs(t.amount);
			const isExpense =
				t.type === 'expense' || (typeof t.amount === 'number' && t.amount < 0);

			if (isExpense) {
				totalOut += amt;
			} else {
				totalIn += amt;
			}
		}

		return {
			totalIn,
			totalOut,
			net: totalIn - totalOut,
		};
	}, [transactions]);

	// Get recent transactions for history preview
	const recentTransactions = useMemo(() => {
		return [...transactions]
			.sort((a, b) => {
				const dateA = new Date(a.date || 0).getTime();
				const dateB = new Date(b.date || 0).getTime();
				return dateB - dateA;
			})
			.slice(0, 5);
	}, [transactions]);

	// Show loading screen only on initial load
	if (isLoading && transactions.length === 0) {
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
		<ErrorBoundary>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
				<View style={styles.screenContent}>
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

					</View>

					{/* Offline Banner - Below header */}
					{!isOnline && (
						<View style={offlineBannerStyles.container}>
							<View style={offlineBannerStyles.banner}>
								<Ionicons
									name="cloud-offline"
									size={18}
									color={palette.danger}
								/>
								<AppText.Body style={offlineBannerStyles.text}>
									You&apos;re offline. Some features may be unavailable.
								</AppText.Body>
							</View>
						</View>
					)}

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
						{/* MVP: Cash on Me - prominent at top */}
						<CashOnMeCard
							balance={totalBalance}
							empty={transactions.length === 0}
						/>

						{/* MVP: Primary actions - one tap to log */}
						<View style={quickAddStyles.rowWrapper}>
							<View style={quickAddStyles.row}>
								<AppButton
									label="Cash In"
								variant="primary"
								icon="add"
								iconPosition="left"
								onPress={() => router.push('/(tabs)/transaction?mode=income')}
								style={quickAddStyles.halfButton}
							/>
							<AppButton
								label="Cash Out"
								variant="secondary"
								icon="remove"
								iconPosition="left"
								onPress={() => router.push('/(tabs)/transaction?mode=expense')}
								style={quickAddStyles.halfButton}
							/>
							</View>
						</View>

						{/* Match web: Today in / Today out summary */}
						<TodaySummaryCard summary={todaySummary} />

						{/* History - recent entries with View All */}
						<RecentTransactionsList transactions={recentTransactions} />
					</ScrollView>
				</View>
			</SafeAreaView>
		</ErrorBoundary>
	);
}

/** ----------------- MVP Subcomponents ----------------- */

function CashOnMeCard({ balance, empty }: { balance: number; empty: boolean }) {
	const isPositive = balance >= 0;

	return (
		<AppCard>
			<AppText.Label color="muted">Cash on Me</AppText.Label>
			{empty ? (
				<AppText.Body color="subtle" style={cashOnMeStyles.emptyText}>
					Log your first Cash In or Cash Out to see your total
				</AppText.Body>
			) : (
				<AppText
					style={cashOnMeStyles.amount}
					color={isPositive ? 'default' : 'danger'}
				>
					{currency(balance)}
				</AppText>
			)}
		</AppCard>
	);
}

function TodaySummaryCard({
	summary,
}: {
	summary: {
		totalIn: number;
		totalOut: number;
		net: number;
	};
}) {
	return (
		<AppCard
			onPress={() => router.push('/dashboard/ledger')}
			accessibilityLabel="Today summary"
		>
			<View style={last30Styles.header}>
				<AppText.Heading style={last30Styles.title}>Today</AppText.Heading>
				<Ionicons name="chevron-forward" size={18} color={palette.textSubtle} />
			</View>
			<View style={last30Styles.row}>
				<AppText.Body color="muted">Today IN</AppText.Body>
				<AppText.Body color="success">+{currency(summary.totalIn)}</AppText.Body>
			</View>
			<View style={last30Styles.row}>
				<AppText.Body color="muted">Today OUT</AppText.Body>
				<AppText.Body color="danger">-{currency(summary.totalOut)}</AppText.Body>
			</View>
			<View style={[last30Styles.row, last30Styles.netRow]}>
				<AppText.Body color="default">Net</AppText.Body>
				<AppText.Body
					color={summary.net >= 0 ? 'success' : 'danger'}
					style={last30Styles.netAmount}
				>
					{summary.net >= 0 ? '+' : ''}
					{currency(summary.net)}
				</AppText.Body>
			</View>
		</AppCard>
	);
}

function RecentTransactionsList({
	transactions,
}: {
	transactions: {
		id?: string;
		_id?: string;
		description?: string;
		amount: number;
		date?: string;
		type?: string;
		metadata?: { category?: string };
	}[];
}) {
	if (transactions.length === 0) {
		return (
			<AppCard>
				<View style={recentStyles.emptyContainer}>
					<Ionicons
						name="receipt-outline"
						size={32}
						color={palette.textMuted}
					/>
					<AppText.Body style={recentStyles.emptyTitle}>
						No transactions yet
					</AppText.Body>
					<AppText.Caption color="muted" style={recentStyles.emptySubtitle}>
						Log your first Cash In or Cash Out to see it here
					</AppText.Caption>
					<AppButton
						label="Cash In"
						variant="primary"
						icon="add"
						onPress={() => router.push('/(tabs)/transaction?mode=income')}
						style={recentStyles.emptyButton}
					/>
				</View>
			</AppCard>
		);
	}

	return (
		<AppCard>
			<View style={recentStyles.header}>
				<AppText.Heading style={recentStyles.title}>History</AppText.Heading>
				<TouchableOpacity onPress={() => router.push('/dashboard/ledger')}>
					<AppText.Body color="primary" style={recentStyles.viewAll}>
						View All
					</AppText.Body>
				</TouchableOpacity>
			</View>
			{transactions.map((tx, index) => {
				const isExpense = tx.type === 'expense' || tx.amount < 0;
				const amount = Math.abs(tx.amount);
				const date = tx.date
					? new Date(tx.date).toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
						})
					: '';

				const transactionId = tx.id || tx._id;
				return (
					<TouchableOpacity
						key={transactionId || index}
						style={recentStyles.transaction}
						onPress={() => {
							if (transactionId) {
								router.push({
									pathname: '/dashboard/ledger/edit',
									params: { id: transactionId },
								});
							}
						}}
						activeOpacity={0.7}
					>
						<View style={recentStyles.transactionContent}>
							<AppText.Body
								style={recentStyles.transactionDesc}
								numberOfLines={1}
							>
								{isExpense
									? tx.metadata?.category ||
										tx.description ||
										'Cash out'
									: tx.description || 'Cash in'}
							</AppText.Body>
							<AppText.Caption
								color="muted"
								style={recentStyles.transactionDate}
							>
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
	screenContent: { flex: 1 },
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
		backgroundColor: palette.shell,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
	},
	logo: { height: 40, width: 90 },
	// quickAddButton styles moved to AppButton primitive
});

const cashOnMeStyles = StyleSheet.create({
	amount: {
		...type.num2xl,
		letterSpacing: -0.5,
		marginTop: 8,
	},
	emptyText: {
		marginTop: 8,
		...type.body,
		color: palette.textMuted,
	},
});

const quickAddStyles = StyleSheet.create({
	rowWrapper: {
		width: '100%',
		alignItems: 'center',
	},
	row: {
		flexDirection: 'row',
		gap: space.md,
		alignSelf: 'center',
		maxWidth: 360,
		width: '100%',
	},
	halfButton: {
		flex: 1,
		minWidth: 0,
	},
});

const last30Styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: space.md,
	},
	title: {
		...type.h2,
		color: palette.text,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: space.xs,
	},
	netRow: {
		borderTopWidth: 1,
		borderTopColor: palette.border,
		marginTop: space.xs,
		paddingTop: space.sm,
	},
	netAmount: {
		fontWeight: '700',
	},
});

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
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: space.xl,
	},
	emptyTitle: {
		...type.h2,
		marginTop: space.md,
		marginBottom: space.xs,
	},
	emptySubtitle: {
		textAlign: 'center',
		marginBottom: space.md,
	},
	emptyButton: {
		marginTop: space.sm,
	},
});

const offlineBannerStyles = StyleSheet.create({
	container: {
		paddingHorizontal: space.xl,
		paddingBottom: space.sm,
		backgroundColor: palette.surfaceAlt,
	},
	banner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: palette.dangerSubtle,
		paddingHorizontal: space.md,
		paddingVertical: space.sm,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: palette.dangerBorder,
	},
	text: {
		...type.body,
		fontSize: 13,
		fontWeight: '500',
		color: palette.danger,
		flex: 1,
	},
});
