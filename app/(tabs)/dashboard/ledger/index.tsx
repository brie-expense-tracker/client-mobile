// index.tsx
import React, { useState, useMemo, useContext, useEffect } from 'react';
import { logger } from '../../../../src/utils/logger';
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
import { palette, radius, space } from '../../../../src/ui/theme';

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
	notes?: string;
	source?: 'manual' | 'plaid' | 'import' | 'ai';
	vendor?: string;
	metadata?: {
		location?: string;
		paymentMethod?: string;
		originalDescription?: string;
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
	// Format date directly from local components to avoid timezone conversion issues
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
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
		logger.debug('[Ledger] Current state:', {
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
		logger.debug('[Ledger] Filtering transactions:', {
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
					logger.debug(
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
						logger.debug(
							'[Ledger] Transaction matches selected pattern:',
							tx.description
						);
						return true;
					}

					logger.debug(
						'[Ledger] Transaction filtered out by pattern filter:',
						tx.description
					);
					return false;
				})();

				// goal/budget match
				const goalBudgetMatch = (() => {
					// If no goals or budgets are selected, show all transactions
					if (selectedGoals.length === 0 && selectedBudgets.length === 0) {
						logger.debug(
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
								logger.debug(
									'[Ledger] Transaction matches selected goal:',
									tx.description
								);
								return true;
							}
						} else {
							// Transaction doesn't have a goal target, but we have goals selected
							// This means it's an "Other" transaction for goals
							logger.debug(
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
								logger.debug(
									'[Ledger] Transaction matches selected budget:',
									tx.description
								);
								return true;
							}
						} else {
							// Transaction doesn't have a budget target, but we have budgets selected
							// This means it's an "Other" transaction for budgets
							logger.debug(
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
						logger.debug(
							'[Ledger] Transaction type mismatch with selected filters:',
							tx.description
						);
						return false;
					}

					logger.debug(
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
					logger.debug(
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
					logger.debug(
						'[Ledger] Transaction filtered out by search filter:',
						tx.description
					);
				}

				const shouldInclude =
					patternMatch && goalBudgetMatch && dateMatch && searchMatch;
				if (shouldInclude) {
					logger.debug('[Ledger] Transaction included:', tx.description);
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
							<Ionicons name="chevron-back" size={24} color={palette.text} />
						</BorderlessButton>
						<View style={styles.headerRight}>
							{dateFilterMode === 'day' && (
								<View style={{ flex: 1, marginRight: space.sm }}>
									<CalendarTrigger
										dateISO={selectedDate}
										onPress={() => setCalendarOpen(true)}
									/>
								</View>
							)}
							<TouchableOpacity
								style={styles.filterButton}
								onPress={handleFilterPress}
							>
								<Ionicons name="reorder-three" size={32} color={palette.text} />
							</TouchableOpacity>
						</View>
					</View>

					{/* Search Bar */}
					<View style={styles.searchContainer}>
						<Ionicons
							name="search"
							size={18}
							color={palette.textMuted}
							style={styles.searchIcon}
						/>
						<TextInput
							style={styles.searchInput}
							placeholder="Search transactions..."
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholderTextColor={palette.textMuted}
						/>
						{searchQuery ? (
							<TouchableOpacity
								onPress={() => setSearchQuery('')}
								style={styles.clearButton}
							>
								<Ionicons
									name="close-circle"
									size={18}
									color={palette.textMuted}
								/>
							</TouchableOpacity>
						) : null}
					</View>

					{/* Pattern Filter Indicator */}
					{selectedPatternId && (
						<View style={styles.patternFilterContainer}>
							<View style={styles.patternFilterContent}>
								<Ionicons name="repeat" size={16} color={palette.primary} />
								<Text style={styles.patternFilterText}>
									Filtered by recurring pattern
								</Text>
								<TouchableOpacity
									onPress={() => setSelectedPatternId(null)}
									style={styles.clearPatternButton}
								>
									<Ionicons name="close" size={16} color={palette.primary} />
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
										<Text style={styles.loadingText}>Loading…</Text>
									</View>
								) : (
									<View style={styles.emptyContainer}>
										<Ionicons
											name="document-outline"
											size={48}
											color={palette.textSubtle}
										/>
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
		backgroundColor: palette.bg,
	},
	mainContainer: {
		flex: 1,
		backgroundColor: palette.bg,
	},
	headerContainer: {
		flexDirection: 'row',
		marginBottom: space.md,
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: space.lg,
		backgroundColor: palette.bg,
		paddingTop: space.sm,
	},
	listContainer: {
		flex: 1,
		backgroundColor: palette.bg,
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
		paddingVertical: space.xxl,
	},
	emptyText: {
		marginTop: space.lg,
		fontSize: 16,
		color: palette.textMuted,
		fontWeight: '500',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: space.xxl,
	},
	loadingText: {
		color: palette.textMuted,
		fontSize: 16,
	},
	empty: {
		alignItems: 'center',
	},
	incomeAmount: {
		color: palette.success,
	},
	expenseAmount: {
		color: palette.danger,
	},
	txDate: {
		fontSize: 12,
		color: palette.textMuted,
		marginTop: 4,
	},
	headerTextContainer: {
		flexDirection: 'column',
	},
	headerText: {
		color: palette.text,
		fontSize: 28,
		fontWeight: '500',
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.md,
	},
	filterButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: space.sm,
	},
	filterButtonDisabled: {
		opacity: 0.5,
	},
	pickerContent: {
		width: '100%',
	},
	picker: {
		width: '100%',
		height: 200,
	},
	monthHeader: {
		paddingVertical: space.sm,
		backgroundColor: palette.bg,
	},
	monthHeaderText: {
		fontSize: 14,
		fontWeight: '600',
		color: palette.text,
		paddingHorizontal: space.lg,
		letterSpacing: 0.2,
	},
	dateHeader: {
		paddingTop: space.sm,
		marginTop: space.sm,
	},
	dateHeaderText: {
		fontSize: 14,
		fontWeight: '600',
		color: palette.text,
		paddingHorizontal: space.lg,
		letterSpacing: 0.2,
	},
	txRowContainer: {
		overflow: 'hidden',
	},
	txRow: {
		flexDirection: 'row',
		paddingVertical: space.md,
		alignItems: 'center',
		backgroundColor: palette.surface,
		paddingHorizontal: space.lg,
	},
	txDesc: {
		fontSize: 16,
		fontWeight: '500',
		color: palette.text,
	},
	txCategory: {
		fontSize: 12,
		color: palette.textMuted,
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
		backgroundColor: palette.danger,
		justifyContent: 'center',
		alignItems: 'flex-end',
		paddingRight: space.lg,
	},
	iconContainer: {
		width: 36,
		height: 36,
		borderRadius: radius.sm,
		justifyContent: 'center',
		alignItems: 'center',
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.md,
		paddingHorizontal: space.md,
		borderWidth: 1,
		borderColor: palette.border,
		minHeight: 44,
		marginHorizontal: space.lg,
		marginBottom: space.sm,
	},
	searchIcon: {
		marginRight: space.sm,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: palette.text,
		paddingVertical: 10,
	},
	clearButton: {
		padding: 4,
	},
	patternFilterContainer: {
		marginHorizontal: space.lg,
		marginVertical: space.sm,
	},
	patternFilterContent: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: palette.infoSubtle,
		borderRadius: radius.md,
		paddingHorizontal: space.md,
		paddingVertical: space.sm,
		borderWidth: 1,
		borderColor: palette.primarySubtle,
	},
	patternFilterText: {
		flex: 1,
		marginLeft: space.sm,
		fontSize: 14,
		color: palette.primary,
		fontWeight: '600',
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
