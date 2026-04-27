// index.tsx
import React, { useState, useMemo, useContext } from 'react';
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
import {
	useSafeAreaInsets,
	SafeAreaInsetsContext,
} from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
	BorderlessButton,
	GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
	TransactionContext,
	type Transaction,
} from '../../../../src/context/transactionContext';
import { useFilter } from '../../../../src/context/filterContext';
import { TransactionRow } from './components/transactionRow';
import CalendarSheet from './components/CalendarSheet';
import CalendarTrigger from './components/CalendarTrigger';
import { palette, radius, space } from '../../../../src/ui/theme';

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
	},
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
const DEFAULT_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

export default function TransactionScreen() {
	const rawInsets = useContext(SafeAreaInsetsContext);
	const insets = rawInsets ?? DEFAULT_INSETS;
	const [selectedDate, setSelectedDate] = useState<string>(() => {
		return getLocalIsoDate();
	});
	const [searchQuery, setSearchQuery] = useState('');
	const [calendarOpen, setCalendarOpen] = useState(false);

	const { transactions, isLoading, refetch, deleteTransaction } =
		useContext(TransactionContext);
	const { dateFilterMode, transactionTypes, selectedPatternId } = useFilter();

	const handleFilterPress = () => {
		router.push('./ledger/ledgerFilter');
	};

	// filter transactions
	const filtered = useMemo(() => {
		return transactions
			.filter((tx) => {
				const typeMatch = transactionTypes[tx.type];
				if (!typeMatch) return false;

				const patternMatch = !selectedPatternId
					? true
					: !!(tx.recurringPattern?.patternId === selectedPatternId);
				if (!patternMatch) return false;

				const txDay = tx.date.slice(0, 10);
				const dateMatch =
					dateFilterMode === 'month' ||
					(dateFilterMode === 'day' && txDay === selectedDate);
				if (!dateMatch) return false;

				const text = searchQuery.toLowerCase();
				const searchMatch =
					!text || (tx.description?.toLowerCase().includes(text) ?? false);
				return searchMatch;
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
		dateFilterMode,
		selectedDate,
		searchQuery,
		transactionTypes,
		selectedPatternId,
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
							placeholder="Search Cash In or Cash Out..."
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
							ItemSeparatorComponent={() => (
								<View style={styles.itemSeparator} />
							)}
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
										<Text style={styles.emptyText}>
											No Cash In or Cash Out yet
										</Text>
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
		paddingTop: space.sm,
		paddingBottom: space.xs,
		backgroundColor: palette.bg,
	},
	monthHeaderText: {
		fontSize: 14,
		fontWeight: '600',
		color: palette.text,
		paddingHorizontal: space.lg,
		letterSpacing: 0.2,
	},
	itemSeparator: {
		height: 1,
		backgroundColor: palette.subtle,
		marginHorizontal: space.xl,
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
	modalContainer: {
		width: '100%',
	},
	formGroup: {
		marginBottom: 20,
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		color: palette.textMuted,
		marginBottom: 8,
	},
	input: {
		backgroundColor: palette.input,
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		color: palette.text,
		borderWidth: 1,
		borderColor: palette.border,
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
		borderColor: palette.border,
		alignItems: 'center',
		backgroundColor: palette.surfaceSunken,
	},
	typeButtonActive: {
		backgroundColor: palette.primary,
		borderColor: palette.primary,
	},
	typeButtonText: {
		fontSize: 16,
		fontWeight: '500',
		color: palette.textMuted,
	},
	typeButtonTextActive: {
		color: palette.textOnPrimary,
		fontWeight: '600',
	},
	updateButton: {
		backgroundColor: palette.primary,
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 8,
	},
	updateButtonText: {
		color: palette.textOnPrimary,
		fontSize: 16,
		fontWeight: '600',
	},
	// Edit modal specific styles
	editModalContainer: {
		width: '100%',
		zIndex: 999,
	},
	editModalContent: {
		backgroundColor: palette.surface,
		borderTopLeftRadius: radius.shell,
		borderTopRightRadius: radius.shell,
		padding: 24,
		zIndex: 1000,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: palette.border,
	},
	editFormGroup: {
		marginBottom: 20,
	},
	editLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: palette.textMuted,
		marginBottom: 8,
	},
	editInput: {
		backgroundColor: palette.input,
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		color: palette.text,
		borderWidth: 1,
		borderColor: palette.border,
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
		borderColor: palette.border,
		alignItems: 'center',
		backgroundColor: palette.surfaceSunken,
	},
	editTypeButtonActive: {
		backgroundColor: palette.primary,
		borderColor: palette.primary,
	},
	editTypeButtonText: {
		fontSize: 16,
		fontWeight: '500',
		color: palette.textMuted,
	},
	editTypeButtonTextActive: {
		color: palette.textOnPrimary,
		fontWeight: '600',
	},
	editUpdateButton: {
		backgroundColor: palette.primary,
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 8,
	},
	editUpdateButtonText: {
		color: palette.textOnPrimary,
		fontSize: 16,
		fontWeight: '600',
	},
	editDateButton: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: palette.input,
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: palette.border,
	},
	editDateButtonText: {
		fontSize: 16,
		color: palette.text,
	},
	calendarContainer: {
		marginTop: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: palette.border,
		borderRadius: 12,
	},
});
