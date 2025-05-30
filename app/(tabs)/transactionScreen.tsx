// transactionScreen.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Dimensions,
	Modal,
	TouchableWithoutFeedback,
	StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { router } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { Transaction, transactions as dummyData } from '../data/transactions';

type RootStackParamList = {
	Tracker: undefined;
	historyFilterScreen: {
		selectedTag: string;
		dateFilterMode: string;
		allTags: string[];
	};
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const dateFilterModes = [
	{ label: 'Day', value: 'day', icon: 'calendar-outline' },
	{ label: 'Month', value: 'month', icon: 'calendar' },
];

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

	return date.toLocaleDateString(locale, options);
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
	return `${monthNames[monthIndex]} ${year}`; // e.g. "May 2025"
};

const getLocalIsoDate = (): string => {
	const today = new Date();
	// Adjust for timezone offset to ensure we get the correct local date
	const offset = today.getTimezoneOffset();
	const localDate = new Date(today.getTime() - offset * 60 * 1000);
	return localDate.toISOString().split('T')[0];
};

export default function TransactionScreen() {
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [dateFilterMode, setDateFilterMode] = useState<string>('month');
	const [selectedDate, setSelectedDate] = useState<string>(() => {
		// Get the most recent transaction date instead of today
		const dates = dummyData.map((tx) => tx.date);
		return dates.sort().reverse()[0]; // Get the most recent date
	});
	const [modalVisible, setModalVisible] = useState(false);
	const [activePicker, setActivePicker] = useState<
		'calendar' | 'dateMode' | null
	>(null);
	const [tempSelection, setTempSelection] = useState<string>('');
	const navigation = useNavigation<NavigationProp>();

	// derive unique tags from data
	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		dummyData.forEach((tx) => {
			// Make sure tx.tags exists and is an array
			if (tx.tags && Array.isArray(tx.tags)) {
				tx.tags.forEach((tag) => {
					if (typeof tag === 'string' && tag.trim()) {
						tagSet.add(tag.trim());
					}
				});
			}
		});
		// Convert to array and sort alphabetically
		return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
	}, []);

	const handleFilterPress = () => {
		router.push({
			pathname: '/screens/historyFilterScreen',
			params: {
				selectedTags: JSON.stringify(selectedTags),
				dateFilterMode,
				allTags: JSON.stringify(allTags),
			},
		});
	};

	// Add this effect to handle filter changes
	useEffect(() => {
		const unsubscribe = navigation.addListener('focus', () => {
			const params = navigation
				.getState()
				.routes.find((r) => r.name === 'historyFilterScreen')?.params as
				| {
						selectedTags?: string;
						dateFilterMode?: string;
						allTags?: string;
				  }
				| undefined;

			if (params) {
				if (params.selectedTags !== undefined) {
					setSelectedTags(JSON.parse(params.selectedTags));
				}
				if (params.dateFilterMode !== undefined) {
					setDateFilterMode(params.dateFilterMode);
				}
				// If we have a date filter mode, we should update the selected date
				if (params.dateFilterMode === 'month') {
					// Get the most recent transaction date for the current month
					const dates = dummyData
						.filter((tx) =>
							tx.date.startsWith(new Date().toISOString().slice(0, 7))
						)
						.map((tx) => tx.date);
					if (dates.length > 0) {
						setSelectedDate(dates.sort().reverse()[0]);
					}
				}
			}
		});

		return unsubscribe;
	}, [navigation]);

	// filter transactions
	const filtered = useMemo(() => {
		const filteredData = dummyData.filter((tx) => {
			const txDate = tx.date.slice(0, 10); // YYYY-MM-DD
			const txMonth = tx.date.slice(0, 7); // YYYY-MM

			// Check if transaction has any of the selected tags
			// If no tags are selected, show all transactions
			const tagMatch =
				selectedTags.length === 0 ||
				(tx.tags && tx.tags.some((tag) => selectedTags.includes(tag)));

			// Apply date filtering based on mode
			let dateMatch = true;
			if (dateFilterMode === 'day' && selectedDate) {
				dateMatch = txDate === selectedDate;
			}
			// Remove month filtering when in month mode to show all months
			// else if (dateFilterMode === 'month' && selectedDate) {
			// 	dateMatch = txMonth === selectedDate.slice(0, 7);
			// }

			return tagMatch && dateMatch;
		});

		// Sort by date in descending order (newest first)
		return filteredData.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
		);
	}, [selectedTags, selectedDate, dateFilterMode]);

	// Group transactions by month
	const groupedTransactions = useMemo(() => {
		const groups: { [key: string]: Transaction[] } = {};

		filtered.forEach((transaction) => {
			const monthKey = transaction.date.slice(0, 7); // YYYY-MM
			if (!groups[monthKey]) {
				groups[monthKey] = [];
			}
			groups[monthKey].push(transaction);
		});

		// Sort months in descending order
		return Object.entries(groups)
			.sort(([a], [b]) => b.localeCompare(a))
			.map(([monthKey, transactions]) => ({
				monthKey,
				transactions,
			}));
	}, [filtered]);

	const handlePickerPress = (picker: 'calendar' | 'dateMode') => {
		setActivePicker(picker);
		if (picker === 'calendar') {
			setModalVisible(true);
		} else if (picker === 'dateMode') {
			setTempSelection(dateFilterMode);
			setModalVisible(true);
		}
	};

	const handleDateModeSelect = (value: string) => {
		setDateFilterMode(value);
	};

	const handleCalendarDayPress = (day: { dateString: string }) => {
		setSelectedDate(day.dateString);
		setModalVisible(false);
		setActivePicker(null);
	};

	const renderDateHeader = () => {
		if (dateFilterMode !== 'day' || !selectedDate) return null;
		return (
			<View style={styles.dateHeader}>
				<Text style={styles.dateHeaderText}>{formatDate(selectedDate)}</Text>
			</View>
		);
	};

	const renderMonthHeader = ({ monthKey }: { monthKey: string }) => (
		<View style={styles.monthHeader}>
			<Text style={styles.monthHeaderText}>{formatMonthHeader(monthKey)}</Text>
		</View>
	);

	const renderTransaction = ({ item }: { item: Transaction }) => (
		<View style={styles.txRow}>
			<View style={{ flex: 1 }}>
				<Text style={styles.txDesc}>{item.description}</Text>
				<Text style={styles.txTags}>{item.tags.join(', ')}</Text>
			</View>
			<View style={styles.txRight}>
				<Text
					style={[
						styles.txAmount,
						item.type === 'income' ? styles.incomeAmount : styles.expenseAmount,
					]}
				>
					{item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
				</Text>
				<Text style={styles.txDate}>{item.date.slice(5)}</Text>
			</View>
		</View>
	);

	return (
		<View style={styles.mainContainer}>
			<StatusBar
				barStyle="dark-content"
				backgroundColor="transparent"
				translucent
			/>
			<SafeAreaView style={styles.safeArea} edges={['top']}>
				<View style={styles.container}>
					{/* Header */}
					<View style={styles.headerContainer}>
						<View style={styles.headerLeft}>
							{/* <TouchableOpacity
								onPress={() => router.back()}
								style={{ zIndex: 1000 }}
							>
								<Ionicons name="chevron-back-outline" size={36} color="#555" />
							</TouchableOpacity> */}
						</View>
						<Text style={styles.headerTitle}>History</Text>
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
									color={dateFilterMode === 'month' ? '#616161' : '#555'}
								/>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.filterButton}
								onPress={handleFilterPress}
							>
								<Ionicons name="reorder-three" size={32} color="#555" />
							</TouchableOpacity>
						</View>
					</View>

					{/* Date Header */}
					{renderDateHeader()}

					{/* Transaction List */}
					<FlatList
						data={groupedTransactions}
						keyExtractor={(item) => item.monthKey}
						contentContainerStyle={{ paddingBottom: 0 }}
						renderItem={({ item }) => (
							<View>
								{dateFilterMode !== 'day' &&
									renderMonthHeader({ monthKey: item.monthKey })}
								{item.transactions.map((tx) => (
									<View key={tx.id}>{renderTransaction({ item: tx })}</View>
								))}
							</View>
						)}
						ListEmptyComponent={
							<View style={styles.empty}>
								<Ionicons name="document-outline" size={48} color="#ccc" />
								<Text style={{ color: '#888', marginTop: 8 }}>
									No transactions
								</Text>
							</View>
						}
					/>
				</View>
			</SafeAreaView>

			{/* Calendar Modal */}
			<Modal
				visible={modalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setModalVisible(false)}
			>
				<TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
					<View style={styles.modalOverlay}>
						<TouchableWithoutFeedback>
							<View style={styles.calendarModalContent}>
								<View style={styles.modalHeader}>
									<Text style={styles.modalTitle}>Select Date</Text>
									<TouchableOpacity
										onPress={() => setModalVisible(false)}
										style={styles.closeButton}
									>
										<Ionicons name="close" size={24} color="#666" />
									</TouchableOpacity>
								</View>
								<Calendar
									onDayPress={handleCalendarDayPress}
									markedDates={{
										[selectedDate]: {
											selected: true,
											selectedColor: '#007ACC',
										},
									}}
									theme={{
										todayTextColor: '#007ACC',
										arrowColor: '#007ACC',
										dotColor: '#007ACC',
										selectedDayBackgroundColor: '#007ACC',
										textDayFontSize: 16,
										textMonthFontSize: 16,
										textDayHeaderFontSize: 16,
										textDayFontWeight: 'bold',
										textMonthFontWeight: 'bold',
										textDayHeaderFontWeight: 'bold',
									}}
								/>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		</View>
	);
}

const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	safeArea: {
		flex: 1,
		backgroundColor: '#fff',
	},
	container: {
		flex: 1,
		backgroundColor: '#fff',
		paddingBottom: 0,
	},
	filtersContainer: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderColor: '#eee',
		backgroundColor: '#fafafa',
	},
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		backgroundColor: '#eee',
		marginHorizontal: 6,
	},
	chipSelected: {
		backgroundColor: '#32af29',
	},
	chipText: {
		fontSize: 14,
		color: '#333',
	},
	chipTextSelected: {
		color: '#fff',
	},
	pickerWrapper: {
		width: width * 0.5,
		alignSelf: 'center',
		marginTop: 8,
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 6,
		overflow: 'hidden',
	},
	txRow: {
		flexDirection: 'row',
		padding: 16,
		borderBottomWidth: 1,
		borderColor: '#f0f0f0',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	txDesc: { fontSize: 16, fontWeight: '500' },
	txTags: { fontSize: 12, color: '#666', marginTop: 4 },
	txRight: { alignItems: 'flex-end' },
	txAmount: {
		fontSize: 16,
		fontWeight: '600',
	},
	incomeAmount: {
		color: '#0ba000',
	},
	expenseAmount: {
		color: '#d50b00',
	},
	txDate: { fontSize: 12, color: '#999999', marginTop: 4 },
	empty: {
		flex: 1,
		marginTop: 80,
		alignItems: 'center',
	},
	headerContainer: {
		flexDirection: 'row',
		paddingRight: 16,
		paddingLeft: 8,
		paddingVertical: 8,
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
		backgroundColor: '#fff',
	},
	headerLeft: {
		width: 36,
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#000000',
		position: 'absolute',
		left: 0,
		right: 0,
		textAlign: 'center',
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
	},
	modalContent: {
		backgroundColor: 'white',
		borderRadius: 12,
		width: width * 0.8,
		maxHeight: height * 0.4,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
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
	calendarModalContent: {
		width: width * 0.9,
		maxHeight: height * 0.7,
		backgroundColor: '#fff',
	},
	monthHeader: {
		backgroundColor: '#f9f9f9',
		padding: 16,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	monthHeaderText: {
		fontSize: 20,
		fontWeight: '600',
		color: '#000000',
	},
	dateHeader: {
		backgroundColor: '#f9f9f9',
		padding: 16,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	dateHeaderText: {
		fontSize: 20,
		fontWeight: '600',
		color: '#000000',
	},
});
