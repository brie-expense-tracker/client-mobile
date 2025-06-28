// index.tsx
import React, { useState, useMemo, useContext } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Dimensions,
	Modal,
	TouchableWithoutFeedback,
	Alert,
	TextInput,
	SectionList,
	Animated,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Transaction } from '../../../src/data/transactions';
import { TransactionContext } from '../../../src/context/transactionContext';
import { FilterContext } from '../../../src/context/filterContext';
import { TransactionRow } from '../../../src/components/transactionRow';

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
	const [modalVisible, setModalVisible] = useState(false);
	const [activePicker, setActivePicker] = useState<
		'calendar' | 'dateMode' | null
	>(null);
	const [tempSelection, setTempSelection] = useState<string>('');
	const [searchQuery, setSearchQuery] = useState('');

	const { transactions, isLoading, refetch, deleteTransaction } =
		useContext(TransactionContext);
	const { selectedCategories, dateFilterMode } = useContext(FilterContext);

	const handleFilterPress = () => {
		router.push('./ledger/ledgerFilter');
	};

	// filter transactions
	const filtered = useMemo(() => {
		return transactions
			.filter((tx) => {
				// category match
				const catMatch =
					selectedCategories.length === 0 ||
					tx.categories.some((cat) => selectedCategories.includes(cat.name));
				// date match
				const txDay = tx.date.slice(0, 10);
				const dateMatch =
					dateFilterMode === 'month' ||
					(dateFilterMode === 'day' && txDay === selectedDate);
				// search match
				const text = searchQuery.toLowerCase();
				const searchMatch =
					!text ||
					tx.description.toLowerCase().includes(text) ||
					tx.categories.some((cat) => cat.name.toLowerCase().includes(text));
				return catMatch && dateMatch && searchMatch;
			})
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	}, [
		transactions,
		selectedCategories,
		dateFilterMode,
		selectedDate,
		searchQuery,
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
				data,
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

	const handlePickerPress = (picker: 'calendar' | 'dateMode') => {
		setActivePicker(picker);
		if (picker === 'calendar') {
			setModalVisible(true);
		} else if (picker === 'dateMode') {
			setTempSelection(dateFilterMode);
			setModalVisible(true);
		}
	};

	const handleCalendarDayPress = (day: { dateString: string }) => {
		setSelectedDate(day.dateString);
		setModalVisible(false);
		setActivePicker(null);
	};

	// Edit modal handlers
	const showEditModal = (transaction: Transaction) => {
		router.push({
			pathname: '/ledger/edit',
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
						<View style={styles.headerTextContainer}>
							<Text style={styles.headerText}>Ledger</Text>
						</View>
						<View style={styles.headerRight}>
							<TouchableOpacity
								style={[
									styles.filterButton,
									dateFilterMode === 'month' && styles.filterButtonDisabled,
								]}
								onPress={() => {
									if (dateFilterMode !== 'month') {
										handlePickerPress('calendar');
									}
								}}
							>
								<Ionicons
									name="calendar"
									size={24}
									color={dateFilterMode === 'month' ? '#616161' : '#212121'}
								/>
							</TouchableOpacity>
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
										<Text>No transactions</Text>
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
			<Modal
				visible={modalVisible}
				transparent
				animationType="none"
				onRequestClose={() => setModalVisible(false)}
				statusBarTranslucent
			>
				<TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
					<View style={styles.modalOverlay}>
						<TouchableWithoutFeedback>
							<View style={styles.modalContent}>
								<View style={styles.modalHeader}>
									<Text style={styles.modalTitle}>Select Date</Text>
									<TouchableOpacity
										onPress={() => setModalVisible(false)}
										style={styles.closeButton}
									>
										<Ionicons name="close" size={24} color="#9ca3af" />
									</TouchableOpacity>
								</View>
								<Calendar
									onDayPress={handleCalendarDayPress}
									markedDates={{
										[selectedDate]: {
											selected: true,
											selectedColor: '#0095FF',
										},
									}}
									theme={{
										todayTextColor: '#0095FF',
										arrowColor: '#0095FF',
										dotColor: '#0095FF',
										selectedDayBackgroundColor: '#0095FF',
										textDayFontSize: 16,
										textMonthFontSize: 16,
										textDayHeaderFontSize: 16,
										textDayFontWeight: '500',
										textMonthFontWeight: '500',
										textDayHeaderFontWeight: '500',
									}}
								/>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		</GestureHandlerRootView>
	);
}

// =============================================
// Styles
// =============================================
const { width, height } = Dimensions.get('window');
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
		padding: 8,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 2000,
	},
	modalContent: {
		backgroundColor: 'white',
		borderRadius: 24,
		width: width * 0.8,
		maxHeight: height * 0.4,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#212121',
	},
	closeButton: {
		padding: 4,
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
