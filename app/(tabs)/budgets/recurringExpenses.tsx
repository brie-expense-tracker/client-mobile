import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Alert,
	RefreshControl,
	ActivityIndicator,
} from 'react-native';
import CustomSlidingModal from './components/CustomSlidingModal';
import { RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import RecurringExpensesFeed from './components/RecurringExpensesFeed';
import RecurringSummaryCard from './components/RecurringSummaryCard';
import { useRecurringExpenses } from '../../../src/hooks/useRecurringExpenses';
import { RecurringExpenseService } from '../../../src/services';
import {
	accessibilityProps,
	dynamicTextStyle,
	generateAccessibilityLabel,
	voiceOverHints,
} from '../../../src/utils/accessibility';

// ==========================================
// Types
// ==========================================

// Extended interface for expenses with payment status
interface RecurringExpenseWithPaymentStatus {
	patternId: string;
	vendor: string;
	amount: number;
	frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	nextExpectedDate: string;
	confidence?: number;
	transactions?: any[];
	isPaid: boolean;
	paymentDate?: string;
	nextDueDate: string;
}

// ==========================================
// Constants
// ==========================================

const RecurringExpensesScreen: React.FC = () => {
	const [refreshing, setRefreshing] = useState(false);
	const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
	const [selectedExpense, setSelectedExpense] =
		useState<RecurringExpenseWithPaymentStatus | null>(null);
	const [activeView, setActiveView] = useState<'monthly' | 'weekly'>('monthly');

	// Use only the hook, not both context and hook
	const { expenses, refetch, markAsPaid, isLoading, hasLoaded, error } =
		useRecurringExpenses();

	// ==========================================
	// Memoized Calculations
	// ==========================================

	const overdueExpenses = useMemo(() => {
		return expenses.filter((expense) => {
			const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
				expense.nextExpectedDate
			);
			return daysUntilDue <= 0;
		});
	}, [expenses]);

	const dueThisWeekExpenses = useMemo(() => {
		return expenses.filter((expense) => {
			const daysUntilDue = RecurringExpenseService.getDaysUntilNext(
				expense.nextExpectedDate
			);
			return daysUntilDue > 0 && daysUntilDue <= 7;
		});
	}, [expenses]);

	const overdueAmount = useMemo(() => {
		return overdueExpenses.reduce((sum, expense) => sum + expense.amount, 0);
	}, [overdueExpenses]);

	const dueThisWeekAmount = useMemo(() => {
		return dueThisWeekExpenses.reduce(
			(sum, expense) => sum + expense.amount,
			0
		);
	}, [dueThisWeekExpenses]);

	const overdueCount = useMemo(() => overdueExpenses.length, [overdueExpenses]);
	const dueThisWeekCount = useMemo(
		() => dueThisWeekExpenses.length,
		[dueThisWeekExpenses]
	);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refetch();
		} catch (error) {
			console.error('Error refreshing recurring expenses:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refetch]);

	// Refresh when component mounts
	useEffect(() => {
		onRefresh();
	}, [onRefresh]);

	const handleExpensePress = (expense: RecurringExpenseWithPaymentStatus) => {
		setSelectedExpense(expense);
		setIsOptionsModalVisible(true);
	};

	const handleExpenseMenuPress = (patternId: string) => {
		const expense = expenses.find((e) => e.patternId === patternId);
		if (expense) {
			// Convert to payment status interface
			const expenseWithStatus: RecurringExpenseWithPaymentStatus = {
				...expense,
				isPaid: false,
				nextDueDate: expense.nextExpectedDate,
			};
			setSelectedExpense(expenseWithStatus);
			setIsOptionsModalVisible(true);
		}
	};

	const handleExpenseRowPress = (
		expense: RecurringExpenseWithPaymentStatus
	) => {
		router.push({
			pathname: '/(stack)/recurringExpenseDetails',
			params: {
				patternId: expense.patternId,
			},
		});
	};

	const hideOptionsModal = () => {
		setIsOptionsModalVisible(false);
		setSelectedExpense(null);
	};

	const handleViewPaymentHistory = () => {
		if (selectedExpense) {
			// Navigate to the recurring expense summary screen
			router.push({
				pathname: '/(stack)/recurringExpenseDetails',
				params: {
					patternId: selectedExpense.patternId,
					vendor: selectedExpense.vendor,
					amount: selectedExpense.amount.toString(),
					frequency: selectedExpense.frequency,
				},
			});
			hideOptionsModal();
		}
	};

	const handleEditExpense = () => {
		if (selectedExpense) {
			Alert.alert('Coming Soon', 'Edit functionality will be available soon!');
			hideOptionsModal();
		}
	};

	const handleMarkAsPaid = async () => {
		if (selectedExpense) {
			try {
				// Calculate period dates based on frequency
				const now = new Date();
				let periodStart, periodEnd;

				switch (selectedExpense.frequency) {
					case 'monthly':
						periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
						periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
						break;
					case 'weekly':
						const dayOfWeek = now.getDay();
						const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
						periodStart = new Date(now);
						periodStart.setDate(now.getDate() - daysFromMonday);
						periodStart.setHours(0, 0, 0, 0);
						periodEnd = new Date(periodStart);
						periodEnd.setDate(periodStart.getDate() + 6);
						periodEnd.setHours(23, 59, 59, 999);
						break;
					case 'quarterly':
						const quarter = Math.floor(now.getMonth() / 3);
						periodStart = new Date(now.getFullYear(), quarter * 3, 1);
						periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
						break;
					case 'yearly':
						periodStart = new Date(now.getFullYear(), 0, 1);
						periodEnd = new Date(now.getFullYear(), 11, 31);
						break;
					default:
						periodStart = new Date(now);
						periodEnd = new Date(now);
				}

				await markAsPaid(
					selectedExpense.patternId,
					periodStart.toISOString(),
					periodEnd.toISOString()
				);

				Alert.alert(
					'Success',
					`${selectedExpense.vendor} has been marked as paid for this period.`,
					[{ text: 'OK' }]
				);
				hideOptionsModal();
			} catch (error) {
				console.error('Error marking as paid:', error);
				Alert.alert('Error', 'Failed to mark as paid. Please try again.', [
					{ text: 'OK' },
				]);
			}
		}
	};

	const handleAddRecurringExpense = () => {
		router.push('/(stack)/addRecurringExpense');
	};

	const handleViewToggle = () => {
		setActiveView(activeView === 'monthly' ? 'weekly' : 'monthly');
	};

	// ==========================================
	// Loading State Component
	// ==========================================
	const LoadingState = () => (
		<View
			style={styles.loadingContainer}
			accessibilityRole="progressbar"
			accessibilityLabel="Loading recurring expenses"
		>
			<ActivityIndicator
				size="large"
				color="#00a2ff"
				accessibilityRole="progressbar"
			/>
			<Text
				style={[styles.loadingText, dynamicTextStyle]}
				accessibilityRole="text"
			>
				Loading recurring expenses...
			</Text>
		</View>
	);

	// ==========================================
	// Error State Component
	// ==========================================
	const ErrorState = () => (
		<View
			style={styles.errorContainer}
			accessibilityRole="alert"
			accessibilityLabel="Error loading recurring expenses"
		>
			<View style={styles.errorContent}>
				<Ionicons
					name="warning-outline"
					size={64}
					color="#ff6b6b"
					accessibilityRole="image"
					accessibilityLabel="Warning icon"
				/>
				<Text
					style={[styles.errorTitle, dynamicTextStyle]}
					accessibilityRole="text"
				>
					Unable to Load Expenses
				</Text>
				<Text
					style={[styles.errorSubtext, dynamicTextStyle]}
					accessibilityRole="text"
				>
					There was a problem connecting to the server. Please check your
					connection and try again.
				</Text>
				<RectButton
					style={styles.errorButton}
					onPress={() => router.replace('/(tabs)/budgets/recurringExpenses')}
					{...accessibilityProps.button}
					accessibilityLabel={generateAccessibilityLabel.button(
						'Retry',
						'loading'
					)}
					accessibilityHint={voiceOverHints.retry}
				>
					<Ionicons
						name="refresh"
						size={20}
						color="#fff"
						accessibilityRole="image"
						accessibilityLabel="Retry icon"
					/>
					<Text
						style={[styles.errorButtonText, dynamicTextStyle]}
						accessibilityRole="text"
					>
						Retry
					</Text>
				</RectButton>
			</View>
		</View>
	);

	// ==========================================
	// Empty State Component
	// ==========================================
	const EmptyState = () => (
		<View
			style={styles.emptyContainer}
			accessibilityRole="text"
			accessibilityLabel="No recurring expenses available"
		>
			<View style={styles.emptyContent}>
				<Ionicons
					name="repeat-outline"
					size={64}
					color="#e0e0e0"
					accessibilityRole="image"
					accessibilityLabel="Empty recurring expenses icon"
				/>
				<Text
					style={[styles.emptyTitle, dynamicTextStyle]}
					accessibilityRole="text"
				>
					No Recurring Expenses
				</Text>
				<Text
					style={[styles.emptySubtext, dynamicTextStyle]}
					accessibilityRole="text"
				>
					Add your first recurring expense to start tracking regular payments
				</Text>
				<RectButton
					style={styles.emptyAddButton}
					onPress={handleAddRecurringExpense}
					{...accessibilityProps.button}
					accessibilityLabel={generateAccessibilityLabel.button(
						'Add',
						'recurring expense'
					)}
					accessibilityHint={voiceOverHints.add}
				>
					<Ionicons
						name="add"
						size={20}
						color="#fff"
						accessibilityRole="image"
						accessibilityLabel="Add icon"
					/>
					<Text
						style={[styles.emptyAddButtonText, dynamicTextStyle]}
						accessibilityRole="text"
					>
						Add Expense
					</Text>
				</RectButton>
			</View>
		</View>
	);

	// ==========================================
	// Main Render
	// ==========================================
	// Show loading state while fetching data
	if (isLoading && !hasLoaded) {
		return <LoadingState />;
	}

	// Show error state if there's an error
	if (error && hasLoaded) {
		return <ErrorState />;
	}

	// Show empty state if no expenses and data has loaded
	if (expenses.length === 0 && hasLoaded) {
		return <EmptyState />;
	}

	return (
		<View
			style={styles.mainContainer}
			accessibilityLabel="Recurring expenses screen"
		>
			<ScrollView
				style={styles.content}
				contentContainerStyle={styles.scrollContentContainer}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor="#00a2ff"
						colors={['#00a2ff']}
						accessibilityLabel="Pull to refresh recurring expenses"
					/>
				}
				showsVerticalScrollIndicator={false}
				accessibilityLabel="Recurring expenses list"
			>
				{/* Recurring Summary Card */}
				<RecurringSummaryCard
					expenses={expenses}
					activeView={activeView}
					onViewToggle={handleViewToggle}
					onExpensePress={handleExpensePress}
					onAddExpense={handleAddRecurringExpense}
					overdueAmount={overdueAmount}
					dueThisWeekAmount={dueThisWeekAmount}
					overdueCount={overdueCount}
					dueThisWeekCount={dueThisWeekCount}
				/>

				{/* Recurring Expenses Feed */}
				<RecurringExpensesFeed
					expenses={expenses}
					onPressMenu={handleExpenseMenuPress}
					onPressRow={handleExpenseRowPress}
					scrollEnabled={false}
				/>
			</ScrollView>

			{/* Options Modal */}
			<CustomSlidingModal
				isVisible={isOptionsModalVisible}
				onClose={hideOptionsModal}
				title={selectedExpense?.vendor || 'Expense Options'}
				icon="ellipsis-horizontal"
			>
				<View
					style={styles.optionsModalContent}
					accessibilityLabel="Expense options menu"
				>
					<RectButton
						style={styles.optionButton}
						onPress={handleViewPaymentHistory}
						{...accessibilityProps.button}
						accessibilityLabel={generateAccessibilityLabel.button(
							'View',
							'payment history'
						)}
						accessibilityHint={voiceOverHints.navigate}
					>
						<View style={styles.optionContent}>
							<Ionicons
								name="time-outline"
								size={20}
								color="#00a2ff"
								accessibilityRole="image"
								accessibilityLabel="Payment history icon"
							/>
							<Text
								style={[styles.optionText, dynamicTextStyle]}
								accessibilityRole="text"
							>
								View Payment History
							</Text>
						</View>
					</RectButton>

					<RectButton
						style={styles.optionButton}
						onPress={handleEditExpense}
						{...accessibilityProps.button}
						accessibilityLabel={generateAccessibilityLabel.button(
							'Edit',
							'expense'
						)}
						accessibilityHint={voiceOverHints.edit}
					>
						<View style={styles.optionContent}>
							<Ionicons
								name="create-outline"
								size={20}
								color="#00a2ff"
								accessibilityRole="image"
								accessibilityLabel="Edit icon"
							/>
							<Text
								style={[styles.optionText, dynamicTextStyle]}
								accessibilityRole="text"
							>
								Edit Expense
							</Text>
						</View>
					</RectButton>

					<RectButton
						style={styles.optionButton}
						onPress={handleMarkAsPaid}
						{...accessibilityProps.button}
						accessibilityLabel={generateAccessibilityLabel.button(
							'Mark as paid',
							'expense'
						)}
						accessibilityHint={voiceOverHints.save}
					>
						<View style={styles.optionContent}>
							<Ionicons
								name="checkmark-circle-outline"
								size={20}
								color="#00a2ff"
								accessibilityRole="image"
								accessibilityLabel="Mark as paid icon"
							/>
							<Text
								style={[styles.optionText, dynamicTextStyle]}
								accessibilityRole="text"
							>
								Mark as Paid
							</Text>
						</View>
					</RectButton>

					<RectButton
						style={styles.optionButton}
						onPress={hideOptionsModal}
						{...accessibilityProps.button}
						accessibilityLabel={generateAccessibilityLabel.button(
							'Cancel',
							'options'
						)}
						accessibilityHint={voiceOverHints.cancel}
					>
						<View style={styles.optionContent}>
							<Ionicons
								name="close-outline"
								size={20}
								color="#757575"
								accessibilityRole="image"
								accessibilityLabel="Cancel icon"
							/>
							<Text
								style={[styles.optionText, dynamicTextStyle]}
								accessibilityRole="text"
							>
								Cancel
							</Text>
						</View>
					</RectButton>
				</View>
			</CustomSlidingModal>
		</View>
	);
};

// ==========================================
// Styles
// ==========================================
const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},

	content: {
		flex: 1,
	},

	scrollContentContainer: {
		paddingHorizontal: 0,
		marginTop: 8,
	},

	optionsModalContent: {
		backgroundColor: 'white',
		borderRadius: 16,
		maxWidth: 400,
		alignItems: 'center',
		paddingHorizontal: 0,
	},

	optionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8f9fa',
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 12,
		marginBottom: 12,
		width: '100%',
		justifyContent: 'center',
	},

	optionContent: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	optionText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#212121',
		marginLeft: 12,
	},

	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#757575',
	},

	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
		backgroundColor: '#fff',
	},
	errorContent: {
		alignItems: 'center',
		maxWidth: 280,
	},
	errorTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#212121',
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	errorSubtext: {
		fontSize: 16,
		color: '#757575',
		textAlign: 'center',
		marginBottom: 32,
		lineHeight: 22,
	},
	errorButton: {
		backgroundColor: '#00a2ff',
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	errorButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},

	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
		backgroundColor: '#fff',
	},
	emptyContent: {
		alignItems: 'center',
		maxWidth: 280,
	},
	emptyTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#212121',
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	emptySubtext: {
		fontSize: 16,
		color: '#757575',
		textAlign: 'center',
		marginBottom: 32,
		lineHeight: 22,
	},
	emptyAddButton: {
		backgroundColor: '#00a2ff',
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	emptyAddButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
});

export default RecurringExpensesScreen;
