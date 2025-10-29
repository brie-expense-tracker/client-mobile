import React, { useMemo, useState, useEffect } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Platform,
	ActionSheetIOS,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
	RecurringExpense,
	RecurringExpenseService,
} from '../../../../src/services';
import { resolveRecurringExpenseAppearance } from '../../../../src/utils/recurringExpenseAppearance';
import { isDevMode } from '../../../../src/config/environment';
import { createLogger } from '../../../../src/utils/sublogger';

const recurringExpensesFeedLog = createLogger('RecurringExpensesFeed');

const formatCurrency = (amount: number): string => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(amount);
};

const formatDate = (dateString: string) => {
	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
};

const getDaysUntilNext = (nextExpectedDate: string) => {
	const next = new Date(nextExpectedDate).setHours(0, 0, 0, 0);
	const now = new Date().setHours(0, 0, 0, 0);
	return Math.ceil((next - now) / (1000 * 60 * 60 * 24));
};

// Extended interface for expenses with payment status
interface RecurringExpenseWithPaymentStatus extends RecurringExpense {
	isPaid: boolean;
	paymentDate?: string;
	nextDueDate: string;
}

// Helper function to calculate next due date
const calculateNextDueDate = (
	currentDate: string,
	frequency: string
): string => {
	const date = new Date(currentDate);

	switch (frequency) {
		case 'weekly':
			date.setDate(date.getDate() + 7);
			break;
		case 'monthly':
			date.setMonth(date.getMonth() + 1);
			break;
		case 'quarterly':
			date.setMonth(date.getMonth() + 3);
			break;
		case 'yearly':
			date.setFullYear(date.getFullYear() + 1);
			break;
	}

	return date.toISOString();
};

function RecurringExpenseRow({
	expense,
	onPressMenu,
	onPressRow,
}: {
	expense: RecurringExpenseWithPaymentStatus;
	onPressMenu?: (id: string) => void;
	onPressRow?: (expense: RecurringExpenseWithPaymentStatus) => void;
}) {
	const daysUntilNext = getDaysUntilNext(expense.nextDueDate);

	// Resolve appearance based on appearanceMode (respects user customization)
	const { icon, color } = resolveRecurringExpenseAppearance(expense);

	// Get status icon and text
	const getStatusIcon = () => {
		if (expense.isPaid) {
			return { name: 'checkmark-circle', color: '#10b981' };
		} else if (daysUntilNext < 0) {
			return { name: 'close-circle', color: '#dc2626' };
		} else if (daysUntilNext <= 7) {
			return { name: 'remove-circle', color: '#f59e0b' };
		} else {
			return { name: 'remove-circle', color: '#f59e0b' };
		}
	};

	const getStatusText = () => {
		if (expense.isPaid && expense.paymentDate) {
			return `Paid: ${expense.paymentDate}`;
		} else {
			return `Next due: ${formatDate(expense.nextDueDate)}`;
		}
	};

	const statusIcon = getStatusIcon();
	const statusText = getStatusText();

	// Chip color by urgency
	let chipColor = '#E8F5E9';
	let chipText = '#2E7D32';

	if (daysUntilNext <= 3) {
		chipColor = '#FFEBEE';
		chipText = '#C62828';
	} else if (daysUntilNext <= 14) {
		chipColor = '#FFF3E0';
		chipText = '#EF6C00';
	}

	return (
		<TouchableOpacity
			style={styles.rowContainer}
			onPress={() => onPressRow?.(expense)}
			activeOpacity={0.7}
		>
			{/* Icon */}
			<View style={[styles.iconWrapper, { backgroundColor: color + '20' }]}>
				<Ionicons name={icon} size={24} color={color} />
			</View>

			{/* Middle content */}
			<View style={styles.rowMiddle}>
				<Text style={styles.title}>{expense.vendor}</Text>
				<Text style={styles.subtitleGray}>
					{expense.frequency.charAt(0).toUpperCase() +
						expense.frequency.slice(1)}{' '}
					• {statusText}
				</Text>
			</View>

			{/* Right side - Amount and Status */}
			<View style={styles.rightSection}>
				<Text style={styles.amountText}>{formatCurrency(expense.amount)}</Text>
				<View style={styles.statusContainer}>
					<Ionicons
						name={statusIcon.name as any}
						size={16}
						color={statusIcon.color}
						style={styles.statusIcon}
					/>
					<View style={[styles.chip, { backgroundColor: chipColor }]}>
						<Text style={[styles.chipText, { color: chipText }]}>
							{Math.abs(daysUntilNext)}d
						</Text>
					</View>
				</View>
			</View>

			{/* Menu button */}
			<TouchableOpacity
				onPress={(e) => {
					e.stopPropagation();
					onPressMenu?.(expense.patternId);
				}}
				style={styles.kebabHit}
				hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
				accessibilityRole="button"
				accessibilityLabel={`More options for ${expense.vendor}`}
			>
				<Ionicons name="ellipsis-vertical" size={18} color="#a1a1aa" />
			</TouchableOpacity>
		</TouchableOpacity>
	);
}

export default function RecurringExpensesFeed({
	scrollEnabled = true,
	onPressMenu,
	onPressRow,
	expenses = [],
	activeTab = 'all',
}: {
	scrollEnabled?: boolean;
	onPressMenu?: (id: string) => void;
	onPressRow?: (expense: RecurringExpenseWithPaymentStatus) => void;
	expenses?: RecurringExpense[];
	activeTab?: 'all' | 'monthly' | 'weekly';
}) {
	const [sortBy, setSortBy] = useState<
		'vendor' | 'amount' | 'dueDate' | 'frequency'
	>('dueDate');
	const [expensesWithPaymentStatus, setExpensesWithPaymentStatus] = useState<
		RecurringExpenseWithPaymentStatus[]
	>([]);
	const [isLoadingPaymentStatus, setIsLoadingPaymentStatus] = useState(false);
	const [paymentStatusError, setPaymentStatusError] = useState<string | null>(
		null
	);
	const lastFetchRef = React.useRef<string>('');
	const isFetchingRef = React.useRef(false);

	// Check payment status for all expenses using batch API
	useEffect(() => {
		const checkPaymentStatus = async () => {
			if (expenses.length === 0) return;

			// Create a cache key from expense IDs AND appearance data
			// This ensures we re-render when icon/color changes
			const cacheKey = expenses
				.map(
					(e) =>
						`${e.patternId || (e as any).id}:${e.icon}:${e.color}:${
							(e as any).appearanceMode || 'brand'
						}`
				)
				.sort()
				.join(',');

			// Skip if we already fetched for these exact expenses
			if (lastFetchRef.current === cacheKey || isFetchingRef.current) {
				if (isDevMode) {
					recurringExpensesFeedLog.debug(
						'⏭️ [RecurringExpensesFeed] Skipping duplicate payment status check'
					);
				}
				return;
			}

			isFetchingRef.current = true;
			lastFetchRef.current = cacheKey;
			setIsLoadingPaymentStatus(true);
			setPaymentStatusError(null);
			try {
				// Get all pattern IDs from current state (uses helper for consistency)
				// Only send valid ObjectIds (24-char hex) to avoid querying manual_* IDs
				const objectIdRe = /^[0-9a-fA-F]{24}$/;
				const patternIds = expenses
					.map((expense) => expense.patternId || (expense as any).id)
					.filter((id) => id && objectIdRe.test(id));

				if (patternIds.length === 0) {
					if (isDevMode) {
						recurringExpensesFeedLog.debug(
							'⚠️ [RecurringExpensesFeed] No valid ObjectIds to check payment status'
						);
					}
					setExpensesWithPaymentStatus(
						expenses.map((expense) => ({
							...expense,
							isPaid: false,
							nextDueDate: expense.nextExpectedDate,
						}))
					);
					setIsLoadingPaymentStatus(false);
					return;
				}

				// Use batch API to check all payment statuses at once
				const paymentStatuses =
					await RecurringExpenseService.checkBatchPaidStatus(patternIds);

				const expensesWithStatus = expenses.map((expense) => {
					const expenseId = expense.patternId || (expense as any).id;
					const isPaid = paymentStatuses[expenseId] || false;

					// Check if paid within 2 weeks of the monthly expense
					let isPaidWithinTwoWeeks = false;
					let paymentDate: string | undefined;
					let nextDueDate: string = expense.nextExpectedDate;

					if (isPaid) {
						// Since we only get a boolean from batch API, we'll assume it's paid within the period
						isPaidWithinTwoWeeks = true;
						paymentDate = new Date().toLocaleDateString();
						// Calculate next due date based on frequency
						nextDueDate = calculateNextDueDate(
							expense.nextExpectedDate,
							expense.frequency
						);
					} else {
						// If not paid, the next due date is the current expected date
						nextDueDate = expense.nextExpectedDate;
					}

					return {
						...expense,
						isPaid: isPaidWithinTwoWeeks,
						paymentDate,
						nextDueDate,
					};
				});

				setExpensesWithPaymentStatus(expensesWithStatus);
			} catch (error) {
				recurringExpensesFeedLog.error('Error checking payment status', error);
				setPaymentStatusError('Failed to check payment status');
				setExpensesWithPaymentStatus(
					expenses.map((expense) => ({
						...expense,
						isPaid: false,
						nextDueDate: expense.nextExpectedDate,
					}))
				);
			} finally {
				setIsLoadingPaymentStatus(false);
				isFetchingRef.current = false;
			}
		};

		checkPaymentStatus();
	}, [expenses]);

	const filtered = useMemo(() => {
		let filteredExpenses = expensesWithPaymentStatus;

		// Filter by parent-controlled tab
		if (activeTab !== 'all') {
			filteredExpenses = filteredExpenses.filter(
				(expense) => expense.frequency === activeTab
			);
		}

		// Sort expenses
		return filteredExpenses.sort((a, b) => {
			switch (sortBy) {
				case 'vendor':
					return a.vendor.localeCompare(b.vendor);
				case 'amount':
					return b.amount - a.amount;
				case 'dueDate':
					return (
						new Date(a.nextDueDate).getTime() -
						new Date(b.nextDueDate).getTime()
					);
				case 'frequency':
					return a.frequency.localeCompare(b.frequency);
				default:
					return 0;
			}
		});
	}, [activeTab, sortBy, expensesWithPaymentStatus]);

	const openSortPicker = () => {
		const labels = ['Due Date', 'Vendor', 'Amount', 'Frequency', 'Cancel'];
		const keys: (typeof sortBy)[] = [
			'dueDate',
			'vendor',
			'amount',
			'frequency',
		];
		if (Platform.OS === 'ios') {
			ActionSheetIOS.showActionSheetWithOptions(
				{ title: 'Sort by', options: labels, cancelButtonIndex: 4 },
				(idx) => {
					if (idx == null || idx === 4) return;
					setSortBy(keys[idx]);
				}
			);
		} else {
			Alert.alert('Sort by', undefined, [
				{ text: 'Due Date', onPress: () => setSortBy('dueDate') },
				{ text: 'Vendor', onPress: () => setSortBy('vendor') },
				{ text: 'Amount', onPress: () => setSortBy('amount') },
				{ text: 'Frequency', onPress: () => setSortBy('frequency') },
				{ text: 'Cancel', style: 'cancel' },
			]);
		}
	};

	// Show loading state while checking payment status
	if (isLoadingPaymentStatus && expenses.length > 0) {
		return (
			<View style={styles.screen}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="small" color="#007ACC" />
					<Text style={styles.loadingText}>Checking payment status...</Text>
				</View>
			</View>
		);
	}

	// Show error state if payment status check failed
	if (paymentStatusError && expenses.length > 0) {
		return (
			<View style={styles.screen}>
				<View style={styles.errorContainer}>
					<Ionicons name="warning-outline" size={24} color="#f59e0b" />
					<Text style={styles.errorText}>{paymentStatusError}</Text>
					<TouchableOpacity
						style={styles.retryButton}
						onPress={() => setExpensesWithPaymentStatus([])}
					>
						<Text style={styles.retryButtonText}>Retry</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	// Empty state component
	const EmptyState = () => (
		<View style={styles.emptyState}>
			<Ionicons name="repeat-outline" size={48} color="#d1d5db" />
			<Text style={styles.emptyTitle}>No recurring expenses found</Text>
			<Text style={styles.emptySubtitle}>
				{activeTab === 'all'
					? 'Add your first recurring expense to get started'
					: `No ${activeTab} recurring expenses`}
			</Text>
		</View>
	);

	return (
		<View style={styles.screen}>
			{/* Toolbar */}
			<View style={styles.toolbar}>
				<TouchableOpacity
					onPress={openSortPicker}
					activeOpacity={0.7}
					style={styles.toolbarChip}
					accessibilityRole="button"
					accessibilityLabel="Change sort order"
				>
					<Ionicons name="swap-vertical" size={14} color="#0A84FF" />
					<Text style={styles.toolbarChipText}>
						Sort:{' '}
						{sortBy === 'dueDate'
							? 'Due Date'
							: sortBy === 'vendor'
							? 'Vendor'
							: sortBy === 'amount'
							? 'Amount'
							: 'Frequency'}
					</Text>
				</TouchableOpacity>
			</View>

			{/* List */}
			<FlatList
				data={filtered}
				keyExtractor={(expense) => expense.patternId}
				renderItem={({ item }) => (
					<RecurringExpenseRow
						expense={item}
						onPressMenu={
							onPressMenu ??
							((id) => {
								if (isDevMode) {
									recurringExpensesFeedLog.debug('menu:', id);
								}
							})
						}
						onPressRow={onPressRow}
					/>
				)}
				ItemSeparatorComponent={() => <View style={styles.separator} />}
				scrollEnabled={scrollEnabled}
				ListEmptyComponent={<EmptyState />}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: '#ffffff' },

	// Inset divider (matches BudgetsFeed/GoalsFeed)
	separator: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: '#ECEFF3',
	},

	rowContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingVertical: 16,
		// No bottom border; separator handles dividers
	},
	iconWrapper: {
		width: 48,
		height: 48,
		borderRadius: 24,
		marginRight: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},

	rowMiddle: { flex: 1 },
	title: { fontSize: 17, fontWeight: '700', color: '#0a0a0a' },
	subtitleGray: { color: '#71717a', fontSize: 13, marginTop: 2 },

	rightSection: {
		flexDirection: 'column',
		alignItems: 'flex-end',
		gap: 4,
		marginRight: 8,
	},
	amountText: {
		fontSize: 17,
		fontWeight: '600',
		color: '#222222',
		textAlign: 'right',
	},
	chip: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		alignSelf: 'flex-end',
	},
	chipText: {
		fontSize: 11,
		fontWeight: '600',
		textAlign: 'center',
	},

	kebabHit: { paddingLeft: 4, paddingTop: 4, marginLeft: 4 },
	statusContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	statusIcon: {
		marginTop: 2,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	loadingText: {
		marginTop: 10,
		color: '#52525b',
		fontSize: 14,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	errorText: {
		marginTop: 10,
		color: '#dc2626',
		fontSize: 16,
		textAlign: 'center',
	},
	retryButton: {
		marginTop: 20,
		paddingVertical: 10,
		paddingHorizontal: 20,
		backgroundColor: '#007ACC',
		borderRadius: 8,
	},
	retryButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
	// Minimal toolbar (never overflows)
	toolbar: {
		paddingTop: 8,
		paddingBottom: 6,
	},
	toolbarChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		alignSelf: 'flex-start',
		backgroundColor: '#fff',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	toolbarChipText: { fontSize: 12, fontWeight: '600', color: '#0A84FF' },
	// Empty state
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
		paddingHorizontal: 32,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#374151',
		textAlign: 'center',
		marginTop: 16,
	},
	emptySubtitle: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
		marginTop: 8,
		lineHeight: 20,
	},
});
