import React, { useCallback, useContext, useMemo, useState } from 'react';
import { logger } from '../../../src/utils/logger';
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
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useNotification } from '@/src/context/notificationContext';
import {
	SimpleBalanceWidget,
	QuickFinancialSummary,
	TransactionHistory,
	SettingsBudgetsGoalsWidget,
	RecurringExpensesSummaryWidget,
} from './components';
import {
	SkeletonContainer,
	DashboardWidgetSkeleton,
} from '../../../src/components/SkeletonLoader';
import {
	accessibilityProps,
	dynamicTextStyle,
	generateAccessibilityLabel,
} from '../../../src/utils/accessibility';

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
	const { unreadCount } = useNotification();
	const [refreshing, setRefreshing] = useState(false);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refetch();
		} catch (error) {
			logger.error('Error refreshing dashboard:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refetch]);

	/**
	 * ------------------ Derived / memoised values ---------------
	 */
	const { totalBalance, dailyChange } = useMemo(() => {
		const balance = transactions.reduce((sum, t) => {
			const amount =
				t.type === 'income'
					? isNaN(t.amount)
						? 0
						: t.amount
					: -(isNaN(t.amount) ? 0 : t.amount);
			return sum + amount;
		}, 0);

		// Use timezone-aware date handling (from ledger)
		const today = getLocalIsoDate();

		const change = transactions
			.filter((t) => {
				// Compare transaction date with today's date using ISO string format
				const txDay = t.date.slice(0, 10);
				const isToday = txDay === today;
				return isToday;
			})
			.reduce((s, t) => {
				const amount =
					t.type === 'income'
						? isNaN(t.amount)
							? 0
							: t.amount
						: -(isNaN(t.amount) ? 0 : t.amount);
				return s + amount;
			}, 0);

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
					<Text
						style={[styles.loadingText, dynamicTextStyle]}
						accessibilityRole="text"
						accessibilityLabel="Loading your dashboard"
					>
						Loading your dashboard...
					</Text>
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
						accessibilityRole="image"
						accessibilityLabel="Brie app logo"
					/>

					<View style={styles.headerButtons}>
						{/* Development Onboarding Button */}
						{__DEV__ && (
							<TouchableOpacity
								onPress={() => router.push('/(onboarding)/profileSetup')}
								style={styles.devButton}
								{...accessibilityProps.button}
								accessibilityLabel="Open onboarding (development)"
								accessibilityHint="Double tap to open onboarding screens for testing"
							>
								<Ionicons name="settings-outline" color="#4CAF50" size={20} />
							</TouchableOpacity>
						)}

						<TouchableOpacity
							onPress={() => router.push('/dashboard/notifications')}
							style={styles.notificationButton}
							{...accessibilityProps.button}
							accessibilityLabel={generateAccessibilityLabel.button(
								'Open',
								'notifications'
							)}
							accessibilityHint="Double tap to view notifications"
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
				</View>

				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContentContainer}
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
					scrollEventThrottle={16}
					removeClippedSubviews={true}
					keyboardShouldPersistTaps="handled"
					accessibilityLabel="Dashboard content"
				>
					<View style={[styles.contentContainer]}>
						{/* -------------------------------------------------- */}
						{/* Balance card */}
						{/* -------------------------------------------------- */}
						<SkeletonContainer
							isLoading={isLoading}
							fallback={<DashboardWidgetSkeleton />}
						>
							<View style={styles.headerCard}>
								<Text
									style={[styles.balanceLabel, dynamicTextStyle]}
									accessibilityRole="text"
									accessibilityLabel="Your balance label"
								>
									Your Balance
								</Text>
								<View style={styles.rowCenter}>
									<Text
										style={[styles.balanceAmount, dynamicTextStyle]}
										accessibilityRole="text"
										accessibilityLabel={`Your balance: ${currency(
											totalBalance
										)}`}
									>
										{currency(totalBalance)}
									</Text>
								</View>
								<Text
									style={[
										styles.dailyChange,
										{ color: dailyChange >= 0 ? '#16a34a' : '#dc2626' },
										dynamicTextStyle,
									]}
									accessibilityRole="text"
									accessibilityLabel={`Today's change: ${
										dailyChange >= 0 ? '+' : ''
									}${currency(dailyChange)}`}
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
						</SkeletonContainer>

						{/* Quick Financial Health Summary */}
						<SkeletonContainer
							isLoading={isLoading}
							fallback={<DashboardWidgetSkeleton />}
						>
							<QuickFinancialSummary transactions={transactions} />
						</SkeletonContainer>

						{/* Recurring Expenses Summary Widget */}
						<SkeletonContainer
							isLoading={isLoading}
							fallback={<DashboardWidgetSkeleton />}
						>
							<RecurringExpensesSummaryWidget
								title="Recurring Expenses"
								maxVisibleItems={3}
								showViewAllButton={true}
							/>
						</SkeletonContainer>

						{/* Recent Transactions */}
						<SkeletonContainer
							isLoading={isLoading}
							fallback={<DashboardWidgetSkeleton />}
						>
							<TransactionHistory
								transactions={transactions}
								onPress={() => {}}
							/>
						</SkeletonContainer>

						{/* Settings, Budgets & Goals Widget */}
						<SkeletonContainer
							isLoading={isLoading}
							fallback={<DashboardWidgetSkeleton />}
						>
							<SettingsBudgetsGoalsWidget compact={true} />
						</SkeletonContainer>
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
	scrollContentContainer: {
		flexGrow: 1,
	},
	contentContainer: {
		paddingHorizontal: 24,
		paddingTop: 8,
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
	headerButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	devButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f0f9ff',
		borderWidth: 1,
		borderColor: '#4CAF50',
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
		marginTop: 8,
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
