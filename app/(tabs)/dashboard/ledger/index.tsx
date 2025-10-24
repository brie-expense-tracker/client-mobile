// index.tsx
import React, { useState, useMemo, useContext, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Alert,
	TextInput,
	SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
	BorderlessButton,
	GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { TransactionContext } from '../../../../src/context/transactionContext';
import { FilterContext } from '../../../../src/context/filterContext';
import { useBudget } from '../../../../src/context/budgetContext';
import { useGoal } from '../../../../src/context/goalContext';
import { TransactionRow } from './components/transactionRow';
import CalendarSheet from './components/CalendarSheet';
import CalendarTrigger from './components/CalendarTrigger';

// Transaction interface defined inline since we removed the mock data file
interface Transaction {
	id: string;
	description: string;
	amount: number;
	date: string; // ISO string
	type: 'income' | 'expense';
	target?: string; // ObjectId of the target Budget or Goal
	targetModel?: 'Budget' | 'Goal';
	updatedAt?: string; // ISO string for sorting by time when dates are the same
	recurringPattern?: {
		patternId: string;
		frequency: string;
		confidence: number;
		nextExpectedDate: string;
	};
}

// =============================================
// Utility Functions
// =============================================
type DateInput = string | Date;

const formatDate = (
	input: DateInput,
	locale = 'en-US',
	options: Intl.DateTimeFormatOptions = {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	}
): string => {
	// if you ever pass an empty string or nullish, treat as "All Dates"
	if (!input) return 'All Dates';

	// avoid reparsing a Date
	const date =
		typeof input === 'string' ? new Date(input + 'T00:00:00') : input;

	// guard invalid parses (shouldn't happen with your ISO getter, but just in case)
	if (isNaN(date.getTime())) return 'Invalid date';

	// Check if the date is today
	const today = new Date();
	if (date.toDateString() === today.toDateString()) {
		return 'Today';
	}

	// Check if the date is yesterday
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	if (date.toDateString() === yesterday.toDateString()) {
		return 'Yesterday';
	}

	// For other dates, use a simplified format
	return date.toLocaleDateString(locale, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
};

const monthNames = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

const formatMonthHeader = (monthKey: string) => {
	// monthKey is "YYYY-MM"
	const [year, mm] = monthKey.split('-');
	const monthIndex = Number(mm) - 1; // 0-based
	return `${monthNames[monthIndex].toUpperCase()} ${year}`; // e.g. "May 2025"
};

const getLocalIsoDate = (): string => {
	const today = new Date();
	// Adjust for timezone offset to ensure we get the correct local date
	const offset = today.getTimezoneOffset();
	const localDate = new Date(today.getTime() - offset * 60 * 1000);
	return localDate.toISOString().split('T')[0];
};

// =============================================
// Main Transaction Screen Component
// =============================================
export default function TransactionScreen() {
	const insets = useSafeAreaInsets();
	const [selectedDate, setSelectedDate] = useState<string>(() => {
		return getLocalIsoDate();
	});
	const [searchQuery, setSearchQuery] = useState('');
	const [calendarOpen, setCalendarOpen] = useState(false);

	const { transactions, isLoading, refetch, deleteTransaction } =
		useContext(TransactionContext);
	const {
		selectedGoals,
		selectedBudgets,
		dateFilterMode,
		selectedPatternId,
		setSelectedPatternId,
		transactionTypes,
	} = useContext(FilterContext);
	const { goals } = useGoal();
	const { budgets } = useBudget();

	// Debug logging
	useEffect(() => {
			transactionsCount: transactions.length,
			transactions: transactions.map((tx) => ({
				id: tx.id,
				description: tx.description,
				type: tx.type,
				target: tx.target,
				targetModel: tx.targetModel,
				date: tx.date,
			})),
			selectedGoals,
			selectedBudgets,
			selectedPatternId,
			dateFilterMode,
			selectedDate,
			goalsCount: goals.length,
			budgetsCount: budgets.length,
		});
	}, [
		transactions,
		selectedGoals,
		selectedBudgets,
		selectedPatternId,
		dateFilterMode,
		selectedDate,
		goals,
		budgets,
	]);

	const handleFilterPress = () => {
		router.push('./ledger/ledgerFilter');
	};

	// filter transactions
	const filtered = useMemo(() => {
			totalTransactions: transactions.length,
			selectedGoals,
			selectedBudgets,
			dateFilterMode,
			selectedDate,
			searchQuery,
			selectedPatternId,
			transactionTypes,
		});

		return transactions
			.filter((tx) => {
				// transaction type match
				const typeMatch = transactionTypes[tx.type];
				if (!typeMatch) {
					console.log(
						'[Ledger] Transaction filtered out by type filter:',
						tx.description,
						'type:',
						tx.type
					);
					return false;
				}

				// pattern match
				const patternMatch = (() => {
					if (!selectedPatternId) {
						return true;
					}

					// Check if transaction has a recurring pattern that matches
					if (
						tx.recurringPattern &&
						tx.recurringPattern.patternId === selectedPatternId
					) {
						console.log(
							'[Ledger] Transaction matches selected pattern:',
							tx.description
						);
						return true;
					}

					console.log(
						'[Ledger] Transaction filtered out by pattern filter:',
						tx.description
					);
					return false;
				})();

				// goal/budget match
				const goalBudgetMatch = (() => {
					// If no goals or budgets are selected, show all transactions
					if (selectedGoals.length === 0 && selectedBudgets.length === 0) {
						console.log(
							'[Ledger] No filters selected, showing all transactions'
						);
						return true;
					}

					// Check if transaction matches any selected goals (for income transactions)
					if (tx.type === 'income' && selectedGoals.length > 0) {
						// Check if transaction has a goal target
						if (tx.target && tx.targetModel === 'Goal') {
							const matchingGoals = goals.filter(
								(goal) =>
									selectedGoals.includes(goal.id) && tx.target === goal.id
							);
							if (matchingGoals.length > 0) {
								console.log(
									'[Ledger] Transaction matches selected goal:',
									tx.description
								);
								return true;
							}
						} else {
							// Transaction doesn't have a goal target, but we have goals selected
							// This means it's an "Other" transaction for goals
							console.log(
								'[Ledger] Transaction is "Other" for goals:',
								tx.description
							);
							return false; // Don't show "Other" transactions when specific goals are selected
						}
					}

					// Check if transaction matches any selected budgets (for expense transactions)
					if (tx.type === 'expense' && selectedBudgets.length > 0) {
						// Check if transaction has a budget target
						if (tx.target && tx.targetModel === 'Budget') {
							const matchingBudgets = budgets.filter(
								(budget) =>
									selectedBudgets.includes(budget.id) && tx.target === budget.id
							);
							if (matchingBudgets.length > 0) {
								console.log(
									'[Ledger] Transaction matches selected budget:',
									tx.description
								);
								return true;
							}
						} else {
							// Transaction doesn't have a budget target, but we have budgets selected
							// This means it's an "Other" transaction for budgets
							console.log(
								'[Ledger] Transaction is "Other" for budgets:',
								tx.description
							);
							return false; // Don't show "Other" transactions when specific budgets are selected
						}
					}

					// If we have goals selected but this is an expense transaction, or
					// if we have budgets selected but this is an income transaction,
					// don't show it
					if (
						(selectedGoals.length > 0 && tx.type === 'expense') ||
						(selectedBudgets.length > 0 && tx.type === 'income')
					) {
						console.log(
							'[Ledger] Transaction type mismatch with selected filters:',
							tx.description
						);
						return false;
					}

					console.log(
						'[Ledger] Transaction filtered out by goal/budget filter:',
						tx.description
					);
					return false;
				})();

				// date match
				const txDay = tx.date.slice(0, 10);
				const dateMatch =
					dateFilterMode === 'month' ||
					(dateFilterMode === 'day' && txDay === selectedDate);

				if (!dateMatch) {
					console.log(
						'[Ledger] Transaction filtered out by date filter:',
						tx.description,
						'txDay:',
						txDay,
						'selectedDate:',
						selectedDate
					);
				}

				// search match
				const text = searchQuery.toLowerCase();
				const searchMatch =
					!text || tx.description.toLowerCase().includes(text);

				if (!searchMatch) {
					console.log(
						'[Ledger] Transaction filtered out by search filter:',
						tx.description
					);
				}

				const shouldInclude =
					patternMatch && goalBudgetMatch && dateMatch && searchMatch;
				if (shouldInclude) {
				}

				return shouldInclude;
			})
			.sort((a, b) => {
				// First, compare by date (newest first)
				const dateA = new Date(a.date);
				const dateB = new Date(b.date);

				if (dateA.getTime() !== dateB.getTime()) {
					return dateB.getTime() - dateA.getTime(); // Newest date first
				}

				// If dates are the same, compare by updatedAt time (newest first)
				const updatedAtA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
				const updatedAtB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);

				return updatedAtB.getTime() - updatedAtA.getTime(); // Newest time first
			});
	}, [
		transactions,
		selectedGoals,
		selectedBudgets,
		selectedPatternId,
		goals,
		budgets,
		dateFilterMode,
		selectedDate,
		searchQuery,
		transactionTypes,
	]);

	// Group into sections
	const sections = useMemo(() => {
		const groups: Record<string, Transaction[]> = {};
		filtered.forEach((tx) => {
			const key = tx.date.slice(0, 7);
			if (!groups[key]) groups[key] = [];
			groups[key].push(tx);
		});
		return Object.entries(groups)
			.sort(([a], [b]) => b.localeCompare(a))
			.map(([monthKey, data]) => ({
				title: formatMonthHeader(monthKey),
				data: data.sort((a, b) => {
					// First, compare by date (newest first)
					const dateA = new Date(a.date);
					const dateB = new Date(b.date);

					if (dateA.getTime() !== dateB.getTime()) {
						return dateB.getTime() - dateA.getTime(); // Newest date first
					}

					// If dates are the same, compare by updatedAt time (newest first)
					const updatedAtA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
					const updatedAtB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);

					return updatedAtB.getTime() - updatedAtA.getTime(); // Newest time first
				}),
			}));
	}, [filtered]);

	const onDelete = (id: string, resetAnimation: () => void) => {
		Alert.alert('Delete Transaction', 'Are you sure?', [
			{ text: 'Cancel', style: 'cancel', onPress: resetAnimation },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: () => deleteTransaction(id),
			},
		]);
	};

	// Edit modal handlers
	const showEditModal = (transaction: Transaction) => {
		router.push({
			pathname: '/dashboard/ledger/edit',
			params: { id: transaction.id },
		});
	};

	const renderDateHeader = () => {
		if (dateFilterMode !== 'day' || !selectedDate) return null;
		return (
			<View style={styles.dateHeader}>
				<Text style={styles.dateHeaderText}>{formatDate(selectedDate)}</Text>
			</View>
		);
	};

	return (
		<GestureHandlerRootView style={styles.rootContainer}>
			<View style={[styles.safeArea, { paddingTop: insets.top }]}>
				<View style={styles.mainContainer}>
					{/* Header */}
					<View style={styles.headerContainer}>
						<BorderlessButton onPress={() => router.back()}>
							<Ionicons name="chevron-back" size={24} color="#212121" />
						</BorderlessButton>
						<View style={styles.headerRight}>
							<TouchableOpacity
								style={styles.addButton}
								onPress={() => router.push('/(tabs)/transaction')}
							>
								<Ionicons name="add" size={24} color="#212121" />
							</TouchableOpacity>
							{dateFilterMode === 'day' ? (
								<View style={{ flex: 1, marginRight: 8 }}>
									<CalendarTrigger
										dateISO={selectedDate}
										onPress={() => setCalendarOpen(true)}
									/>
								</View>
							) : (
								<TouchableOpacity
									style={[
										styles.filterButton,
										dateFilterMode === 'month' && styles.filterButtonDisabled,
									]}
									onPress={() => {
										// This could trigger a mode change to day mode
										// For now, we'll keep it as a placeholder
									}}
								>
									<Ionicons
										name="calendar"
										size={24}
										color={dateFilterMode === 'month' ? '#616161' : '#212121'}
									/>
								</TouchableOpacity>
							)}
							<TouchableOpacity
								style={styles.filterButton}
								onPress={handleFilterPress}
							>
								<Ionicons name="reorder-three" size={32} color="#212121" />
							</TouchableOpacity>
						</View>
					</View>

					{/* Search Bar */}
					<View style={styles.searchContainer}>
						<Ionicons
							name="search"
							size={20}
							color="#9ca3af"
							style={styles.searchIcon}
						/>
						<TextInput
							style={styles.searchInput}
							placeholder="Search transactions..."
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholderTextColor="#9ca3af"
						/>
						{searchQuery ? (
							<TouchableOpacity
								onPress={() => setSearchQuery('')}
								style={styles.clearButton}
							>
								<Ionicons name="close-circle" size={20} color="#9ca3af" />
							</TouchableOpacity>
						) : null}
					</View>

					{/* Pattern Filter Indicator */}
					{selectedPatternId && (
						<View style={styles.patternFilterContainer}>
							<View style={styles.patternFilterContent}>
								<Ionicons name="repeat" size={16} color="#007ACC" />
								<Text style={styles.patternFilterText}>
									Filtered by recurring pattern
								</Text>
								<TouchableOpacity
									onPress={() => setSelectedPatternId(null)}
									style={styles.clearPatternButton}
								>
									<Ionicons name="close" size={16} color="#007ACC" />
								</TouchableOpacity>
							</View>
						</View>
					)}

					{/* Date Header */}
					{renderDateHeader()}

					{/* Transaction List */}
					<View style={styles.listContainer}>
						<SectionList
							sections={sections}
							keyExtractor={(item, index) =>
								item.id || `temp-${index}-${Date.now()}`
							}
							renderSectionHeader={({ section }) =>
								dateFilterMode === 'month' ? (
									<View style={styles.monthHeader}>
										<Text style={styles.monthHeaderText}>{section.title}</Text>
									</View>
								) : null
							}
							renderItem={({ item }) => (
								<TransactionRow
									item={item}
									onDelete={onDelete}
									onEdit={showEditModal}
								/>
							)}
							ListEmptyComponent={
								isLoading ? (
									<View style={styles.loadingContainer}>
										<Text>Loading…</Text>
									</View>
								) : (
									<View style={styles.emptyContainer}>
										<Ionicons name="document-outline" size={48} color="#ccc" />
										<Text style={styles.emptyText}>No transactions</Text>
									</View>
								)
							}
							contentContainerStyle={styles.listContentContainer}
							onRefresh={refetch}
							refreshing={isLoading}
						/>
					</View>
				</View>
			</View>

			{/* Calendar Modal */}
			<CalendarSheet
				visible={calendarOpen}
				value={selectedDate}
				onClose={() => setCalendarOpen(false)}
				onChange={(iso) => {
					if (iso) {
						setSelectedDate(iso);
					}
					setCalendarOpen(false);
				}}
			/>
		</GestureHandlerRootView>
	);
}

// =============================================
// Styles
// =============================================
const styles = StyleSheet.create({
	rootContainer: {
		flex: 1,
	},
	safeArea: {
		flex: 1,
		backgroundColor: '#fff',
	},
	mainContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	headerContainer: {
		flexDirection: 'row',
		marginBottom: 16,
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
		backgroundColor: '#fff',
	},
	listContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	listContentContainer: {
		flexGrow: 1,
	},
	listContentContainerLoading: {
		justifyContent: 'center',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
		fontWeight: '500',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		color: '#9ca3af',
		fontSize: 16,
	},
	empty: {
		alignItems: 'center',
	},
	incomeAmount: {
		color: '#16a34a',
	},
	expenseAmount: {
		color: '#dc2626',
	},
	txDate: {
		fontSize: 12,
		color: '#9ca3af',
		marginTop: 4,
	},
	headerTextContainer: {
		flexDirection: 'column',
	},
	headerText: {
		color: '#212121',
		fontSize: 28,
		fontWeight: '500',
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	filterButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
	},
	filterButtonDisabled: {
		opacity: 0.5,
	},
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		backgroundColor: '#f0f0f0',
		borderRadius: 8,
		marginRight: 8,
	},
	pickerContent: {
		width: '100%',
	},
	picker: {
		width: '100%',
		height: 200,
	},
	monthHeader: {
		paddingVertical: 8,
		backgroundColor: '#ffffff',
	},
	monthHeaderText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#363636',
		paddingHorizontal: 24,
	},
	dateHeader: {
		paddingTop: 8,
		marginTop: 8,
	},
	dateHeaderText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#363636',
		paddingHorizontal: 24,
	},
	txRowContainer: {
		// position: 'relative',
		overflow: 'hidden',
	},
	txRow: {
		flexDirection: 'row',
		paddingVertical: 16,
		alignItems: 'center',
		backgroundColor: '#fff',
		paddingHorizontal: 24,
	},
	txDesc: {
		fontSize: 16,
		fontWeight: '500',
		color: '#212121',
	},
	txCategory: {
		fontSize: 12,
		color: '#9ca3af',
		marginTop: 4,
	},
	txRight: {
		alignItems: 'flex-end',
	},
	txAmount: {
		fontSize: 16,
		fontWeight: '600',
	},
	deleteAction: {
		position: 'absolute',
		right: 0,
		top: 0,
		bottom: 0,
		width: '100%',
		backgroundColor: '#dc2626',
		justifyContent: 'center',
		alignItems: 'flex-end',
		paddingRight: 18,
	},
	iconContainer: {
		width: 36,
		height: 36,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f3f4f6',
		borderRadius: 12,
		paddingHorizontal: 12,
		height: 44,
		marginHorizontal: 24,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: '#212121',
		paddingVertical: 8,
	},
	clearButton: {
		padding: 4,
	},
	patternFilterContainer: {
		marginHorizontal: 24,
		marginVertical: 8,
	},
	patternFilterContent: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#e3f2fd',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderWidth: 1,
		borderColor: '#007ACC',
	},
	patternFilterText: {
		flex: 1,
		marginLeft: 8,
		fontSize: 14,
		color: '#007ACC',
		fontWeight: '500',
	},
	clearPatternButton: {
		padding: 4,
	},
	modalContainer: {
		width: '100%',
	},
	formGroup: {
		marginBottom: 20,
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	input: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		color: '#212121',
	},
	typeSelector: {
		flexDirection: 'row',
		gap: 12,
	},
	typeButton: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
	},
	typeButtonActive: {
		backgroundColor: '#0095FF',
		borderColor: '#0095FF',
	},
	typeButtonText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#757575',
	},
	typeButtonTextActive: {
		color: '#FFFFFF',
		fontWeight: '600',
	},
	updateButton: {
		backgroundColor: '#0095FF',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 8,
	},
	updateButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	// Edit modal specific styles
	editModalContainer: {
		width: '100%',
		zIndex: 999,
	},
	editModalContent: {
		backgroundColor: '#FFFFFF',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 24,
		zIndex: 1000,
	},
	editFormGroup: {
		marginBottom: 20,
	},
	editLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	editInput: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		color: '#212121',
	},
	editTypeSelector: {
		flexDirection: 'row',
		gap: 12,
	},
	editTypeButton: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
	},
	editTypeButtonActive: {
		backgroundColor: '#0095FF',
		borderColor: '#0095FF',
	},
	editTypeButtonText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#757575',
	},
	editTypeButtonTextActive: {
		color: '#FFFFFF',
		fontWeight: '600',
	},
	editUpdateButton: {
		backgroundColor: '#0095FF',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 8,
	},
	editUpdateButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	editDateButton: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	editDateButtonText: {
		fontSize: 16,
		color: '#212121',
	},
	calendarContainer: {
		marginTop: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 12,
	},
});
