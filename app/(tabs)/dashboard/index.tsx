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
import { palette, space, type, radius } from '../../../src/ui/theme';
import { useDevModeEasterEgg } from '../../../src/hooks/useDevModeEasterEgg';
import {
	AppScreen,
	AppCard,
	AppText,
	AppButton,
	HeroCard,
} from '../../../src/ui/primitives';
import { ErrorBoundary } from '../../../src/components/ErrorBoundary';
import { NetworkErrorCard } from '../../../src/components/NetworkErrorCard';
import { ErrorService, ErrorState } from '../../../src/services/errorService';
import { useConnectivity } from '../../../src/utils/connectivity';
import {
	sanitizeAmount,
	sanitizeDescription,
} from '../../../src/utils/inputSanitization';

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
	const [fetchError, setFetchError] = useState<ErrorState | null>(null);
	const fetchErrorRef = useRef<ErrorState | null>(null); // Track error in ref to avoid race conditions
	const { handleLogoTap } = useDevModeEasterEgg();
	
	// Wrapper to set error with logging
	const setFetchErrorWithLog = useCallback((error: ErrorState | null, forceClear = false) => {
		// If trying to clear error but one exists, prevent clearing unless forceClear is true
		// This prevents race conditions where errors are cleared immediately after being set
		// But allows explicit clearing after successful fetches
		if (!error && fetchErrorRef.current && !forceClear) {
			// Don't clear - let the error persist until explicitly cleared after success
			// Only log in development to avoid noise in production
			if (__DEV__) {
				console.log('🛡️ [Dashboard] Protected error from being cleared:', fetchErrorRef.current.type);
			}
			return;
		}
		console.log('🔄 [Dashboard] setFetchError called:', error ? {
			type: error.type,
			message: error.message,
			retryable: error.retryable,
		} : 'null (forceClear: ' + forceClear + ')');
		fetchErrorRef.current = error; // Update ref immediately
		setFetchError(error);
	}, []);
	const { isOnline } = useConnectivity();
	
	// Track when data was last fetched to avoid unnecessary refetches
	const lastFetchTimeRef = useRef<number>(0);
	const isInitialMountRef = useRef(true);
	const STALE_DATA_THRESHOLD = 30000; // 30 seconds

	const fetchWeeklyInsights = useCallback(async (showLoading = true, clearError = true) => {
		if (!firebaseUser || !user) {
			setWeeklyInsights([]);
			return;
		}

		try {
			if (showLoading) {
				setInsightsLoading(true);
			}
			// Don't clear error here - let it persist until we successfully fetch data
			const response = await InsightsService.getInsights('weekly');
			if (response.success && response.data) {
				// Clear error on successful fetch if clearError is true
				// Use forceClear to bypass protection and allow clearing after success
				if (clearError) {
					setFetchErrorWithLog(null, true);
				}
				setWeeklyInsights(response.data);
			}
		} catch (error: any) {
			if (error?.isAuthError || error?.message === 'User not authenticated') {
				setWeeklyInsights([]);
				return;
			}
			console.error('Error fetching weekly insights:', error);
			try {
				// Extract safe error properties to avoid circular reference issues
				// Use try-catch for each property access to prevent stack overflow
				let errorMessage = 'Unknown error';
				let errorStatus: number | undefined;
				let errorType: string | undefined;
				let errorName: string | undefined;
				let errorCode: string | number | undefined;
				
				try {
					errorMessage = error?.message || 'Unknown error';
				} catch {
					errorMessage = 'Unknown error';
				}
				
				try {
					errorStatus = error?.status;
					errorType = error?.type;
					errorName = error?.name;
					errorCode = error?.code;
				} catch {
					// Ignore property access errors
				}
				
				const safeError = {
					message: errorMessage,
					status: errorStatus,
					type: errorType,
					name: errorName,
					code: errorCode,
				};
				
				const errorState = ErrorService.categorizeError(safeError);
				console.log('Setting fetchError from weekly insights:', {
					type: errorState.type,
					message: errorState.message,
					retryable: errorState.retryable,
				});
				setFetchErrorWithLog(errorState);
			} catch (categorizeErr) {
				console.error('Failed to categorize error:', categorizeErr);
				// Set a fallback error
				setFetchErrorWithLog({
					type: 'server_error',
					message: 'Our servers are experiencing issues. Please try again later.',
					action: 'Retry',
					retryable: true,
					timestamp: new Date(),
				});
			}
			setWeeklyInsights([]);
		} finally {
			if (showLoading) {
				setInsightsLoading(false);
			}
		}
	}, [firebaseUser, user, setFetchErrorWithLog]);

	const generateWeeklyInsights = useCallback(async () => {
		if (!firebaseUser || !user) {
			return;
		}

		try {
			setInsightsLoading(true);
			// Don't clear errors here - only clear on successful generation
			// This prevents clearing errors that were just set
			const response = await InsightsService.generateInsights('weekly');
			if (response.success && response.data) {
				// Clear error on successful generation - use forceClear to allow clearing
				setFetchErrorWithLog(null, true);
				setWeeklyInsights(response.data);
			} else {
				// If generation fails, silently try fetching existing insights
				await fetchWeeklyInsights(false, false);
			}
		} catch (error: any) {
			if (error?.isAuthError || error?.message === 'User not authenticated') {
				setWeeklyInsights([]);
				return;
			}
			console.error('Error generating weekly insights:', error);
			const errorState = ErrorService.categorizeError(error);
			
			// Don't show error for AI service failures - silently fallback to existing insights
			if (errorState.type === 'server_error' || errorState.type === 'timeout') {
				// Silently fallback to existing insights without showing error
				await fetchWeeklyInsights(false, false);
			} else if (errorState.type === 'connectivity') {
				// Only show connectivity errors
				setFetchError(errorState);
			} else {
				// For other errors, try to fetch existing insights as fallback
				await fetchWeeklyInsights(false, false);
			}
		} finally {
			setInsightsLoading(false);
		}
	}, [firebaseUser, user, fetchWeeklyInsights, setFetchErrorWithLog]);

	const fetchRollup = useCallback(async (clearError = true) => {
		if (!firebaseUser || !user) {
			setRollup(null);
			return;
		}

		try {
			// Don't clear error here - let it persist until we successfully fetch data
			const data = await DashboardService.getDashboardRollup();
			if (data && data.cashflow && data.budgets && data.debts && data.recurring) {
				// Clear error on successful fetch if clearError is true
				// Use forceClear to bypass protection and allow clearing after success
				if (clearError) {
					setFetchErrorWithLog(null, true);
				}
				setRollup(data);
			}
		} catch (error: any) {
			if (error?.isAuthError || error?.message === 'User not authenticated') {
				setRollup(null);
				return;
			}
			console.error('Error fetching dashboard rollup:', error);
			try {
				// Extract safe error properties to avoid circular reference issues
				// Use try-catch for each property access to prevent stack overflow
				let errorMessage = 'Unknown error';
				let errorStatus: number | undefined;
				let errorType: string | undefined;
				let errorName: string | undefined;
				let errorCode: string | number | undefined;
				
				try {
					errorMessage = error?.message || 'Unknown error';
				} catch {
					errorMessage = 'Unknown error';
				}
				
				try {
					errorStatus = error?.status;
					errorType = error?.type;
					errorName = error?.name;
					errorCode = error?.code;
				} catch {
					// Ignore property access errors
				}
				
				const safeError = {
					message: errorMessage,
					status: errorStatus,
					type: errorType,
					name: errorName,
					code: errorCode,
				};
				
				const errorState = ErrorService.categorizeError(safeError);
				console.log('Setting fetchError from rollup:', {
					type: errorState.type,
					message: errorState.message,
					retryable: errorState.retryable,
				});
				setFetchErrorWithLog(errorState);
			} catch (categorizeErr) {
				console.error('Failed to categorize error:', categorizeErr);
				// Set a fallback error
				setFetchErrorWithLog({
					type: 'server_error',
					message: 'Our servers are experiencing issues. Please try again later.',
					action: 'Retry',
					retryable: true,
					timestamp: new Date(),
				});
			}
			setRollup(null);
		}
	}, [firebaseUser, user, setFetchErrorWithLog]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		// Don't clear error at start - let individual functions handle it
		// Only clear error if all requests succeed
		try {
			// Run all fetches in parallel with a timeout to prevent hanging
			// Individual functions will set fetchError if they fail
			const refreshPromise = Promise.allSettled([
				refetch().catch((err) => {
					console.error('Error in refetch during refresh:', err);
					// TransactionContext handles its own errors, so we don't need to set fetchError here
				}), 
				fetchWeeklyInsights(true, false).catch((err) => {
					console.error('Error in fetchWeeklyInsights during refresh:', err);
					// fetchWeeklyInsights handles its own errors
				}), 
				fetchRollup(false).catch((err) => {
					console.error('Error in fetchRollup during refresh:', err);
					// fetchRollup handles its own errors
				})
			]);
			
			// Add a timeout to ensure refresh state always clears (5 seconds max)
			const timeoutPromise = new Promise<void>((resolve) => {
				setTimeout(() => {
					console.warn('Refresh timeout after 5s - clearing refresh state');
					resolve();
				}, 5000); // 5 second timeout - reasonable for network requests
			});
			
			// Race between refresh and timeout - timeout only clears refreshing state, not errors
			const refreshResult = await Promise.race([
				refreshPromise.then((results) => ({ type: 'results' as const, results })),
				timeoutPromise.then(() => ({ type: 'timeout' as const }))
			]);
			
			// Only clear error if all requests succeeded (not timed out)
			if (refreshResult.type === 'results') {
				const results = refreshResult.results;
				if (Array.isArray(results)) {
					const allSucceeded = results.every((result: any) => result.status === 'fulfilled');
					if (allSucceeded) {
						setFetchErrorWithLog(null, true); // Clear error only if all succeeded, force clear
					}
				}
				// If timeout occurred, don't clear error - let it persist
			}
			
			lastFetchTimeRef.current = Date.now();
		} catch (error) {
			console.error('Unexpected error in onRefresh:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refetch, fetchWeeklyInsights, fetchRollup, setFetchErrorWithLog]);

	// Initial fetch - only runs once on mount
	useEffect(() => {
		if (isInitialMountRef.current) {
			isInitialMountRef.current = false;
			const loadInitialData = async () => {
				// Don't clear errors on initial load - let them persist from previous session
				// Errors will only be cleared on successful fetches
				await Promise.all([
					fetchWeeklyInsights(true, false), // Don't clear error
					fetchRollup(false) // Don't clear error
				]);
				lastFetchTimeRef.current = Date.now();
			};
			loadInitialData();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Empty deps - only run once on mount, functions are stable via useCallback

	// Refresh when dashboard comes into focus - only if data is stale
	// Don't refetch if there's an active error - let user retry manually
	useFocusEffect(
		useCallback(() => {
			// Don't auto-refetch if there's an error - check both state and ref to avoid race conditions
			if (fetchError || fetchErrorRef.current) {
				return;
			}
			
			const now = Date.now();
			const timeSinceLastFetch = now - lastFetchTimeRef.current;
			const isDataStale = timeSinceLastFetch > STALE_DATA_THRESHOLD;
			
			// Only refetch if stale or if we don't have data yet
			if (isDataStale || !rollup || weeklyInsights.length === 0) {
				refetch();
				fetchWeeklyInsights(false, false); // Don't clear error on background refresh
				fetchRollup(false); // Don't clear error on background refresh
				lastFetchTimeRef.current = now;
			}
		}, [refetch, fetchWeeklyInsights, fetchRollup, rollup, weeklyInsights.length, fetchError])
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

	// Debug: Log error state
	useEffect(() => {
		if (fetchError) {
			console.log('🔴 [Dashboard] fetchError is set:', {
				type: fetchError.type,
				message: fetchError.message,
				retryable: fetchError.retryable,
			});
		}
	}, [fetchError]);

	// Show loading screen only on initial load, not when refreshing with errors
	if (isLoading && !fetchError && transactions.length === 0) {
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

				{/* Offline Banner - Below header */}
				{!isOnline && (
					<View style={offlineBannerStyles.container}>
						<View style={offlineBannerStyles.banner}>
							<Ionicons name="cloud-offline" size={18} color={palette.danger} />
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
					{/* Error Banner - At top of ScrollView content */}
					{fetchError ? (
						<View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
							<NetworkErrorCard
								error={fetchError}
							onRetry={async () => {
								// Retry all failed requests in parallel
								// Don't clear error immediately - wait for all to succeed
								try {
									const results = await Promise.allSettled([
										refetch().catch((err) => {
											console.error('Error in refetch during retry:', err);
										}),
										fetchWeeklyInsights(true, false).catch((err) => {
											console.error('Error in fetchWeeklyInsights during retry:', err);
										}),
										fetchRollup(false).catch((err) => {
											console.error('Error in fetchRollup during retry:', err);
										}),
									]);
									
									// Only clear error if all requests succeeded
									const allSucceeded = results.every((result: any) => result.status === 'fulfilled');
									if (allSucceeded) {
										setFetchErrorWithLog(null, true);
									}
								} catch (error) {
									console.error('Unexpected error in retry:', error);
								}
							}}
							/>
						</View>
					) : null}
					{/* Debug: Show error state only in true dev mode (not in production builds) */}
					{__DEV__ && fetchError && (
						<View style={{ padding: 8, backgroundColor: 'rgba(255, 193, 7, 0.1)', marginHorizontal: space.xl, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255, 193, 7, 0.3)' }}>
							<Text style={{ fontSize: 10, color: '#856404' }}>
								🔍 DEV: {fetchError.type} - {fetchError.message.substring(0, 50)}...
							</Text>
						</View>
					)}

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
		</ErrorBoundary>
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

function WeeklyCheckInSkeleton() {
	return (
		<HeroCard variant="gradient" contentStyle={checkInStyles.content}>
			<View style={checkInStyles.header}>
				<View style={[checkInStyles.iconContainer, { opacity: 0.5 }]}>
					<Ionicons name="sparkles" size={24} color={palette.primaryTextOn} />
				</View>
				<View style={{ flex: 1 }}>
					<View style={skeletonStyles.title} />
					<View style={[skeletonStyles.subtitle, { width: '80%' }]} />
				</View>
			</View>
			<View style={skeletonStyles.content}>
				<View style={skeletonStyles.line} />
				<View style={[skeletonStyles.line, { width: '90%' }]} />
				<View style={[skeletonStyles.line, { width: '75%' }]} />
			</View>
		</HeroCard>
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

	if (loading) {
		return <WeeklyCheckInSkeleton />;
	}

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

				{hasInsights ? (
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
						Tap to get personalized insights
					</AppText.Body>
					<AppText.Caption style={checkInStyles.emptyHint}>
						We&apos;ll analyze your transactions and provide actionable advice
					</AppText.Caption>
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

// Validation utilities
function validateAmount(value: string): {
	valid: boolean;
	error?: string;
	numericValue?: number;
} {
	if (!value || value.trim().length === 0) {
		return { valid: false, error: 'Please enter an amount' };
	}

	// Remove $ and commas
	const cleaned = value.replace(/[$,]/g, '');

	// Check if it's a valid number
	const num = parseFloat(cleaned);
	if (isNaN(num)) {
		return {
			valid: false,
			error: 'Please enter a valid number (e.g., 50.00)',
		};
	}

	// Check if positive
	if (num <= 0) {
		return { valid: false, error: 'Amount must be greater than $0' };
	}

	// Check if too large (prevent overflow)
	if (num > 1000000) {
		return {
			valid: false,
			error: 'Amount is too large. Maximum is $1,000,000',
		};
	}

	// Check decimal places (max 2)
	const decimalParts = cleaned.split('.');
	if (decimalParts.length > 1 && decimalParts[1].length > 2) {
		return {
			valid: false,
			error: 'Please use up to 2 decimal places (e.g., 50.99)',
		};
	}

	return { valid: true, numericValue: num };
}

function validateItemDescription(value: string): { valid: boolean; error?: string } {
	if (!value || value.trim().length === 0) {
		return { valid: false, error: 'Please enter what you want to buy' };
	}

	if (value.trim().length < 2) {
		return {
			valid: false,
			error: 'Description must be at least 2 characters',
		};
	}

	if (value.length > 50) {
		return {
			valid: false,
			error: 'Description is too long (max 50 characters)',
		};
	}

	// Check for potentially harmful content (basic sanitization)
	const harmfulPatterns = /[<>{}[\]\\]/;
	if (harmfulPatterns.test(value)) {
		return {
			valid: false,
			error: 'Description contains invalid characters',
		};
	}

	return { valid: true };
}

function CanIAffordCard() {
	const [amount, setAmount] = useState('');
	const [item, setItem] = useState('');
	const [amountError, setAmountError] = useState<string | null>(null);
	const [itemError, setItemError] = useState<string | null>(null);
	const [touched, setTouched] = useState({ amount: false, item: false });

	// Format amount as user types
	const handleAmountChange = (value: string) => {
		// Sanitize input
		const sanitized = sanitizeAmount(value);
		setAmount(sanitized);

		// Validate on change if touched
		if (touched.amount) {
			const validation = validateAmount(sanitized);
			setAmountError(validation.error || null);
		}
	};

	const handleItemChange = (value: string) => {
		// Sanitize input
		const sanitized = sanitizeDescription(value);
		setItem(sanitized);

		// Validate on change if touched
		if (touched.item) {
			const validation = validateItemDescription(sanitized);
			setItemError(validation.error || null);
		}
	};

	const handleAmountBlur = () => {
		setTouched((prev) => ({ ...prev, amount: true }));

		// Format amount on blur
		if (amount) {
			const validation = validateAmount(amount);
			if (validation.valid && validation.numericValue) {
				// Format to 2 decimal places
				setAmount(validation.numericValue.toFixed(2));
			}
			setAmountError(validation.error || null);
		}
	};

	const handleItemBlur = () => {
		setTouched((prev) => ({ ...prev, item: true }));

		// Validate on blur
		if (item) {
			const validation = validateItemDescription(item);
			setItemError(validation.error || null);
		}
	};

	const handleAsk = () => {
		// Mark both as touched
		setTouched({ amount: true, item: true });

		// Validate both
		const amountValidation = validateAmount(amount);
		const itemValidation = validateItemDescription(item);

		setAmountError(amountValidation.error || null);
		setItemError(itemValidation.error || null);

		// Only proceed if both are valid
		if (!amountValidation.valid || !itemValidation.valid) {
			return;
		}

		// Format the message with validated numeric value
		const numericAmount = amountValidation.numericValue!;
		const message = `Can I afford $${numericAmount.toFixed(2)} for ${item.trim()}?`;

		// Navigate to chat
		const encodedMessage = encodeURIComponent(message);
		router.push(`/(tabs)/chat?initialMessage=${encodedMessage}`);

		// Reset form after navigation
		setAmount('');
		setItem('');
		setTouched({ amount: false, item: false });
		setAmountError(null);
		setItemError(null);
	};

	const canSubmit =
		amount.trim().length > 0 &&
		item.trim().length > 0 &&
		!amountError &&
		!itemError;

	return (
		<AppCard>
			<View style={affordStyles.header}>
				<Ionicons name="calculator-outline" size={20} color={palette.primary} />
				<AppText.Heading style={affordStyles.title}>Can I afford X?</AppText.Heading>
			</View>
			<View style={affordStyles.inputContainer}>
				<View>
					<View
						style={[
							affordStyles.amountRow,
							amountError && touched.amount && affordStyles.inputError,
						]}
					>
						<AppText.Body style={affordStyles.dollarSign}>$</AppText.Body>
						<TextInput
							style={affordStyles.amountInput}
							value={amount}
							onChangeText={handleAmountChange}
							onBlur={handleAmountBlur}
							placeholder="0.00"
							placeholderTextColor={palette.textSubtle}
							keyboardType="decimal-pad"
							maxLength={12}
						/>
					</View>
					{amountError && touched.amount ? (
						<AppText.Caption color="danger" style={affordStyles.errorText}>
							{amountError}
						</AppText.Caption>
					) : (
						<AppText.Caption color="muted" style={affordStyles.helperText}>
							Enter amount (e.g., 50.00)
						</AppText.Caption>
					)}
				</View>
				<View>
					<TextInput
						style={[
							affordStyles.itemInput,
							itemError && touched.item && affordStyles.inputError,
						]}
						value={item}
						onChangeText={handleItemChange}
						onBlur={handleItemBlur}
						placeholder="What do you want to buy?"
						placeholderTextColor={palette.textSubtle}
						maxLength={50}
					/>
					{itemError && touched.item && (
						<AppText.Caption color="danger" style={affordStyles.errorText}>
							{itemError}
						</AppText.Caption>
					)}
				</View>
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
	transactions: { id?: string; _id?: string; description?: string; amount: number; date?: string; type?: string }[];
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
						Add your first transaction to see it here
					</AppText.Caption>
					<AppButton
						label="Add Transaction"
						variant="ghost"
						icon="add-circle"
						onPress={() => router.push('/(tabs)/transaction')}
						style={recentStyles.emptyButton}
					/>
				</View>
			</AppCard>
		);
	}

	return (
		<AppCard>
			<View style={recentStyles.header}>
				<AppText.Heading style={recentStyles.title}>Recent Activity</AppText.Heading>
				<TouchableOpacity onPress={() => router.push('/dashboard/ledger')}>
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
		marginBottom: 4,
	},
	emptyHint: {
		...type.small,
		color: palette.primaryTextOn,
		opacity: 0.75,
		textAlign: 'center',
	},
});

const skeletonStyles = StyleSheet.create({
	title: {
		height: 24,
		backgroundColor: 'rgba(255, 255, 255, 0.3)',
		borderRadius: 4,
		marginBottom: 8,
		width: '60%',
	},
	subtitle: {
		height: 16,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		borderRadius: 4,
	},
	content: {
		marginTop: 16,
		gap: 8,
	},
	line: {
		height: 16,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		borderRadius: 4,
		width: '100%',
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
	inputError: {
		borderColor: palette.danger,
		borderWidth: 2,
	},
	errorText: {
		marginTop: 4,
		marginLeft: 4,
	},
	helperText: {
		marginTop: 4,
		marginLeft: 4,
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
