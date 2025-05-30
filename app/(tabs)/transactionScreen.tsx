// transactionScreen.tsx
import React, { useState, useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Dimensions,
	Modal,
	TouchableWithoutFeedback,
	Animated,
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
	const [selectedTag, setSelectedTag] = useState<string>('');
	const [selectedDate, setSelectedDate] = useState<string>(() => {
		const today = getLocalIsoDate();
		return today;
	});
	const [dateFilterMode, setDateFilterMode] = useState<string>('month');
	const [modalVisible, setModalVisible] = useState(false);
	const [activePicker, setActivePicker] = useState<
		'calendar' | 'dateMode' | null
	>(null);
	const [tempSelection, setTempSelection] = useState<string>('');
	const navigation = useNavigation<NavigationProp>();
	const [isDropdownVisible, setIsDropdownVisible] = useState(false);
	const dropdownAnimation = useState(new Animated.Value(0))[0];

	// derive unique tags from data
	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		dummyData.forEach((tx) => tx.tags.forEach((t) => tagSet.add(t)));
		return Array.from(tagSet);
	}, []);

	// filter transactions
	const filtered = useMemo(() => {
		const filteredData = dummyData.filter((tx) => {
			const txMonth = tx.date.slice(5, 7);
			const txDate = tx.date.slice(0, 10);
			const tagMatch = selectedTag === '' || tx.tags.includes(selectedTag);

			// Apply date filtering based on mode
			let dateMatch = true;
			if (dateFilterMode === 'day' && selectedDate) {
				dateMatch = txDate === selectedDate;
			} else if (dateFilterMode === 'month' && txMonth) {
				dateMatch = txMonth === txMonth;
			}

			return tagMatch && dateMatch;
		});

		// Sort by date in descending order (newest first)
		return filteredData.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
		);
	}, [selectedTag, selectedDate, dateFilterMode]);

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

		return Object.entries(groups).map(([monthKey, transactions]) => ({
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

	const toggleDropdown = () => {
		const toValue = isDropdownVisible ? 0 : 1;
		Animated.timing(dropdownAnimation, {
			toValue,
			duration: 300,
			useNativeDriver: true,
		}).start();
		setIsDropdownVisible(!isDropdownVisible);
		StatusBar.setHidden(!isDropdownVisible);
	};

	const handleFilterPress = () => {
		toggleDropdown();
	};

	const handleDateModeSelect = (value: string) => {
		setDateFilterMode(value);
		toggleDropdown();
	};

	const handleCalendarDayPress = (day: { dateString: string }) => {
		setSelectedDate(day.dateString);
		setModalVisible(false);
		setActivePicker(null);
	};

	const renderDropdown = () => {
		const translateY = dropdownAnimation.interpolate({
			inputRange: [0, 1],
			outputRange: [-400, 0],
		});

		return (
			<Animated.View
				style={[
					styles.dropdown,
					{
						transform: [{ translateY }],
					},
				]}
			>
				<View style={styles.dropdownBackground} />
				<SafeAreaView style={styles.dropdownContent}>
					<View style={styles.dropdownHeader}>
						<Text style={styles.dropdownTitle}>Filters</Text>
						<TouchableOpacity
							onPress={toggleDropdown}
							style={styles.closeButton}
						>
							<Ionicons name="close" size={24} color="#666" />
						</TouchableOpacity>
					</View>
					<View style={styles.filterModeList}>
						{dateFilterModes.map((mode) => (
							<TouchableOpacity
								key={mode.value}
								style={[
									styles.filterModeItem,
									dateFilterMode === mode.value &&
										styles.filterModeItemSelected,
								]}
								onPress={() => handleDateModeSelect(mode.value)}
							>
								<Ionicons
									name={mode.icon as any}
									size={24}
									color={dateFilterMode === mode.value ? '#fff' : '#555'}
								/>
								<Text
									style={[
										styles.filterModeText,
										dateFilterMode === mode.value &&
											styles.filterModeTextSelected,
									]}
								>
									{mode.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					<View style={styles.dropdownDivider} />

					<View style={styles.dropdownSection}>
						<Text style={styles.dropdownSectionTitle}>Filter by Tags</Text>
						<View style={styles.tagList}>
							<TouchableOpacity
								style={[
									styles.tagItem,
									selectedTag === '' && styles.tagItemSelected,
								]}
								onPress={() => {
									setSelectedTag('');
								}}
							>
								<Text
									style={[
										styles.tagText,
										selectedTag === '' && styles.tagTextSelected,
									]}
								>
									All Tags
								</Text>
							</TouchableOpacity>
							{allTags.map((tag) => (
								<TouchableOpacity
									key={tag}
									style={[
										styles.tagItem,
										selectedTag === tag && styles.tagItemSelected,
									]}
									onPress={() => {
										setSelectedTag(tag);
									}}
								>
									<Text
										style={[
											styles.tagText,
											selectedTag === tag && styles.tagTextSelected,
										]}
									>
										{tag}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>
				</SafeAreaView>
			</Animated.View>
		);
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
			{isDropdownVisible && (
				<TouchableWithoutFeedback onPress={toggleDropdown}>
					<View style={styles.overlay} />
				</TouchableWithoutFeedback>
			)}
			<SafeAreaView style={styles.safeArea}>
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
						contentContainerStyle={{ paddingBottom: 80 }}
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

			{/* Dropdown Menu */}
			{isDropdownVisible && renderDropdown()}

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
		backgroundColor: '#E6F0FF',
	},
	safeArea: {
		flex: 1,
		backgroundColor: '#653535',
	},
	container: {
		flex: 1,
		backgroundColor: '#00ff95',
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
		backgroundColor: '#f9f9f9',
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
	filterModeList: {
		width: '100%',
		padding: 8,
	},
	filterModeItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderRadius: 8,
		marginBottom: 8,
		gap: 12,
	},
	filterModeItemSelected: {
		backgroundColor: '#32af29',
	},
	filterModeText: {
		fontSize: 16,
		color: '#333',
	},
	filterModeTextSelected: {
		color: '#fff',
		fontWeight: '600',
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
	dropdown: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 1000,
	},
	dropdownBackground: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'white',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	dropdownContent: {
		backgroundColor: 'white',
	},
	dropdownHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	dropdownTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
	},
	dropdownDivider: {
		height: 1,
		backgroundColor: '#eee',
		marginVertical: 16,
	},
	dropdownSection: {
		padding: 16,
	},
	dropdownSectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 12,
	},
	tagList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	tagItem: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: '#f0f0f0',
	},
	tagItemSelected: {
		backgroundColor: '#32af29',
	},
	tagText: {
		fontSize: 14,
		color: '#333',
	},
	tagTextSelected: {
		color: '#fff',
	},
	overlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		zIndex: 999,
	},
});
