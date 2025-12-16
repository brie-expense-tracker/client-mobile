import React, { useState, useEffect, useContext } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	RefreshControl,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BillService, Bill } from '../../../../../src/services';
import { useBills } from '../../../../../src/context/billContext';
import { useTransactions } from '../../../../../src/context/transactionContext';
import { createLogger } from '../../../../../src/utils/sublogger';
import { FilterContext } from '../../../../../src/context/filterContext';
import BillCard from './BillCard';
import { resolveBillAppearance } from '../../../../../src/utils/billAppearance';
import { isDevMode } from '../../../../../src/config/environment';

const billsListLog = createLogger('BillsList');

interface BillsListProps {
	title?: string;
	showUpcomingOnly?: boolean;
	maxVisibleItems?: number;
	onExpensePress?: (expense: Bill) => void;
	showAddButton?: boolean;
}

const BillsList: React.FC<BillsListProps> = ({
	title = 'Bills',
	showUpcomingOnly = false,
	maxVisibleItems,
	onExpensePress,
	showAddButton = true,
}) => {
	const { setSelectedPatternId } = useContext(FilterContext);
	const { expenses: allExpenses, isLoading: loading, refetch } = useBills();
	const { refetch: refetchTransactions } = useTransactions();
	const [expenses, setExpenses] = useState<Bill[]>([]);
	const [markingAsPaid, setMarkingAsPaid] = useState<string | null>(null);
	const [paymentStatuses, setPaymentStatuses] = useState<
		Record<string, boolean | null>
	>({});

	// Filter expenses based on context data
	useEffect(() => {
		if (showUpcomingOnly) {
			// Filter for expenses due within 7 days
			const upcoming = allExpenses.filter((expense) => {
				const daysUntilDue = BillService.getDaysUntilNext(
					expense.nextExpectedDate
				);
				return daysUntilDue <= 7;
			});
			if (isDevMode) {
				billsListLog.debug('[BillsList] Filtered upcoming bills:', upcoming);
			}
			setExpenses(upcoming);
		} else {
			if (isDevMode) {
				billsListLog.debug('[BillsList] Setting all bills:', allExpenses);
			}
			setExpenses(allExpenses);
		}
	}, [allExpenses, showUpcomingOnly]);

	// Check payment status for all expenses
	useEffect(() => {
		const checkAllPaymentStatuses = async () => {
			if (expenses.length === 0) return;

			try {
				// Build IDs from current state (handles both patternId and id fields)
				// Only send valid ObjectIds (24-char hex) to avoid querying manual_* IDs
				const objectIdRe = /^[0-9a-fA-F]{24}$/;
				const patternIds = expenses
					.map((expense) => expense.patternId || (expense as any).id)
					.filter((id) => id && objectIdRe.test(id));

				if (patternIds.length === 0) {
					if (isDevMode) {
						billsListLog.debug(
							'⚠️ [BillsList] No valid ObjectIds to check payment status'
						);
					}
					setPaymentStatuses({});
					return;
				}

				const statuses = await BillService.checkBatchPaidStatus(patternIds);
				setPaymentStatuses(statuses);
			} catch (error) {
				billsListLog.error('Error checking payment statuses', error);
			}
		};

		checkAllPaymentStatuses();
	}, [expenses]);

	const handleOptionsPress = (expense: Bill) => {
		// Show options menu with edit and mark as paid options
		Alert.alert(
			expense.vendor,
			`$${expense.amount.toFixed(2)} - ${BillService.formatFrequency(
				expense.frequency
			)}`,
			[
				{
					text: 'Edit',
					onPress: () => {
						if (onExpensePress) {
							onExpensePress(expense);
						}
					},
				},
				{
					text: 'Pay bill',
					onPress: () => handlePayBill(expense),
					style: 'default',
				},
				{
					text: 'Cancel',
					style: 'cancel',
				},
			]
		);
	};

	const handlePayBill = async (expense: Bill) => {
		try {
			setMarkingAsPaid(expense.patternId);

			// Pay the bill - this creates a transaction and advances the period
			await BillService.payBill(expense.patternId);

			// Update payment status locally
			setPaymentStatuses((prev) => ({
				...prev,
				[expense.patternId]: true,
			}));

			// Refresh the data - both bills and transactions
			await Promise.all([refetch(), refetchTransactions()]);

			Alert.alert('Success', `${expense.vendor} has been paid`, [
				{ text: 'OK' },
			]);
		} catch (error: any) {
			billsListLog.error('Error paying bill', error);
			
			// Extract error message from multiple possible locations
			const errorMessage =
				error?.message ||
				error?.error ||
				error?.toString?.() ||
				(typeof error === 'string' ? error : '') ||
				'';
			
			// Handle the case where the bill is already paid gracefully
			const isAlreadyPaid =
				errorMessage.includes('already been paid') ||
				errorMessage.includes('already paid') ||
				errorMessage.toLowerCase().includes('already paid');
			
			if (isAlreadyPaid) {
				// Refresh data to ensure UI is up to date
				await Promise.all([refetch(), refetchTransactions()]);
				Alert.alert(
					'Already Paid',
					`${expense.vendor} has already been paid for this period.`,
					[{ text: 'OK' }]
				);
			} else {
				Alert.alert(
					'Error',
					errorMessage || 'Failed to pay bill. Please try again.',
					[{ text: 'OK' }]
				);
			}
		} finally {
			setMarkingAsPaid(null);
		}
	};

	const handleAddBill = () => {
		router.push('../../bills/new');
	};

	const handleRefresh = async () => {
		try {
			await refetch();
		} catch (error) {
			billsListLog.error('Error refreshing bills', error);
			Alert.alert('Error', 'Failed to refresh expenses. Please try again.', [
				{ text: 'OK' },
			]);
		}
	};

	const handleExpenseSelect = (expense: Bill) => {
		// Set the selected pattern ID in the filter context
		if (setSelectedPatternId) {
			setSelectedPatternId(expense.patternId);
		}
		// Also call the original onExpensePress if provided
		if (onExpensePress) {
			onExpensePress(expense);
		}
	};

	// Group expenses by frequency
	const groupExpensesByFrequency = () => {
		const grouped: Record<string, Bill[]> = {
			weekly: [],
			monthly: [],
			quarterly: [],
			yearly: [],
		};

		expenses.forEach((expense) => {
			if (grouped[expense.frequency]) {
				grouped[expense.frequency].push(expense);
			}
		});

		return grouped;
	};

	const formatPeriodHeader = (frequency: string) => {
		switch (frequency) {
			case 'weekly':
				return 'This Week';
			case 'monthly':
				return 'This Month';
			case 'quarterly':
				return 'This Quarter';
			case 'yearly':
				return 'This Year';
			default:
				return frequency.charAt(0).toUpperCase() + frequency.slice(1);
		}
	};

	const renderExpenseItem = (expense: Bill) => {
		const daysUntilDue = BillService.getDaysUntilNext(expense.nextExpectedDate);
		const frequency = BillService.formatFrequency(expense.frequency);

		// Use actual payment status from the API
		const isPaid = paymentStatuses[expense.patternId] === true;
		const isMarkingAsPaid = markingAsPaid === expense.patternId;
		const autoPay = (expense as any).autoPay === true;

		// Resolve appearance based on appearanceMode (respects user customization)
		const { icon, color } = resolveBillAppearance(expense);

		return (
			<TouchableOpacity
				key={expense.patternId}
				onPress={() => handleExpenseSelect(expense)}
			>
				{(() => {
					// Parse date-only string (YYYY-MM-DD) as local date to avoid timezone issues
					const datePart = expense.nextExpectedDate.slice(0, 10);
					let date: Date;
					if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
						const [year, month, day] = datePart.split('-').map(Number);
						date = new Date(year, month - 1, day); // month is 0-indexed
					} else {
						date = new Date(expense.nextExpectedDate);
					}
					return (
						<BillCard
							vendor={expense.vendor}
							amount={expense.amount}
							dueInDays={daysUntilDue}
							nextDueDate={date.toLocaleDateString()}
							frequency={frequency}
							iconName={icon}
							color={color}
							isPaid={isPaid}
							autoPay={autoPay}
							isProcessing={isMarkingAsPaid}
							onPressMarkPaid={() => handlePayBill(expense)}
							onPressEdit={() => handleOptionsPress(expense)}
						/>
					);
				})()}
			</TouchableOpacity>
		);
	};

	const renderPeriodSection = (frequency: string, expenses: Bill[]) => {
		if (expenses.length === 0) return null;

		return (
			<View key={frequency} style={styles.periodSection}>
				<View style={styles.periodHeader}>
					<View style={styles.periodIconWrapper}>
						<Ionicons name="calendar-outline" size={20} color="#00a2ff" />
					</View>
					<Text style={styles.periodText}>{formatPeriodHeader(frequency)}</Text>
				</View>
				<View style={styles.expensesList}>
					{expenses.map(renderExpenseItem)}
				</View>
			</View>
		);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#007ACC" />
				<Text style={styles.loadingText}>Loading bills...</Text>
			</View>
		);
	}

	const groupedExpenses = groupExpensesByFrequency();
	const hasExpenses = expenses.length > 0;

	// Calculate summary statistics
	const totalAmount = expenses.reduce(
		(sum, expense) => sum + expense.amount,
		0
	);
	const paidCount = expenses.filter(
		(expense) => paymentStatuses[expense.patternId] === true
	).length;
	const unpaidCount = expenses.length - paidCount;

	return (
		<View style={styles.container}>
			{title && (
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
					<View style={styles.headerButtons}>
						<TouchableOpacity
							style={styles.refreshButton}
							onPress={handleRefresh}
							disabled={loading}
						>
							<Ionicons
								name="refresh"
								size={20}
								color={loading ? '#ccc' : '#007ACC'}
							/>
						</TouchableOpacity>
						{showAddButton && (
							<TouchableOpacity
								style={styles.addButton}
								onPress={handleAddBill}
							>
								<Ionicons name="add" size={20} color="#007ACC" />
								<Text style={styles.addButtonText}>Add</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>
			)}

			<ScrollView
				style={styles.scrollContainer}
				refreshControl={
					<RefreshControl
						refreshing={loading}
						onRefresh={handleRefresh}
						tintColor="#007ACC"
						colors={['#007ACC']}
					/>
				}
				showsVerticalScrollIndicator={false}
			>
				{!hasExpenses ? (
					<View style={styles.emptyContainer}>
						<Ionicons name="repeat" size={48} color="#ccc" />
						<Text style={styles.emptyTitle}>No Bills</Text>
						<Text style={styles.emptyText}>
							{showUpcomingOnly
								? 'No upcoming bills in the next 7 days'
								: 'Add bills to track your regular payments'}
						</Text>

						{showAddButton && (
							<TouchableOpacity
								style={styles.addBillButton}
								onPress={handleAddBill}
							>
								<Ionicons name="add" size={16} color="#007ACC" />
								<Text style={styles.addBillButtonText}>Add Bill</Text>
							</TouchableOpacity>
						)}
					</View>
				) : (
					<View style={styles.expensesContainer}>
						{/* Summary Statistics */}
						<View style={styles.summaryContainer}>
							<View style={styles.summaryItem}>
								<Text style={styles.summaryLabel}>Total Amount</Text>
								<Text style={styles.summaryValue}>
									${totalAmount.toFixed(2)}
								</Text>
							</View>
							<View style={styles.summaryItem}>
								<Text style={styles.summaryLabel}>Paid</Text>
								<Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
									{paidCount}
								</Text>
							</View>
							<View style={styles.summaryItem}>
								<Text style={styles.summaryLabel}>Unpaid</Text>
								<Text style={[styles.summaryValue, { color: '#F44336' }]}>
									{unpaidCount}
								</Text>
							</View>
						</View>

						{Object.entries(groupedExpenses).map(([frequency, expenses]) =>
							renderPeriodSection(frequency, expenses)
						)}
					</View>
				)}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		flex: 1,
	},
	scrollContainer: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingTop: 8,
		paddingBottom: 8,
		paddingHorizontal: 24,
	},
	headerButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	refreshButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#f0f8ff',
		justifyContent: 'center',
		alignItems: 'center',
	},
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: '#f0f8ff',
	},
	addButtonText: {
		marginLeft: 4,
		fontSize: 14,
		fontWeight: '500',
		color: '#007ACC',
	},
	loadingContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
		paddingVertical: 40,
	},
	loadingText: {
		marginTop: 10,
		color: '#666',
		fontSize: 16,
	},
	emptyContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 40,
		paddingVertical: 40,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#666',
		marginTop: 10,
	},
	emptyText: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
		marginTop: 5,
		lineHeight: 20,
		marginBottom: 20,
	},
	addBillButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		backgroundColor: '#f0f8ff',
		borderWidth: 1,
		borderColor: '#007ACC',
	},
	addBillButtonText: {
		marginLeft: 6,
		fontSize: 14,
		fontWeight: '500',
		color: '#007ACC',
	},
	expensesContainer: {
		paddingHorizontal: 0,
	},
	summaryContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		backgroundColor: '#f8f9fa',
		marginHorizontal: 24,
		marginBottom: 16,
		paddingVertical: 16,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	summaryItem: {
		alignItems: 'center',
		flex: 1,
	},
	summaryLabel: {
		fontSize: 12,
		color: '#6c757d',
		fontWeight: '500',
		marginBottom: 4,
	},
	summaryValue: {
		fontSize: 16,
		fontWeight: '700',
		color: '#212529',
	},
	periodSection: {
		marginBottom: 0,
	},
	periodHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		paddingHorizontal: 24,
	},
	periodIconWrapper: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#e0f7fa',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8,
	},
	periodText: {
		fontSize: 18,
		fontWeight: '600',
		color: '#212121',
	},
	expensesList: {
		paddingHorizontal: 0,
	},
});

export default BillsList;
