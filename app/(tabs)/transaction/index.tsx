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
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';
import {
	Transaction,
	transactions as dummyData,
} from '../../data/transactions';
import axios from 'axios';

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

const TransactionRow = ({
	item,
	onDelete,
}: {
	item: Transaction;
	onDelete: (id: string) => void;
}) => {
	const translateX = useSharedValue(0);
	const context = useSharedValue({ x: 0 });

	const gesture = Gesture.Pan()
		.onStart(() => {
			context.value = { x: translateX.value };
		})
		.onUpdate((event) => {
			translateX.value = event.translationX + context.value.x;
		})
		.onEnd(() => {
			if (translateX.value < -50) {
				translateX.value = withSpring(-80);
			} else {
				translateX.value = withSpring(0);
			}
		});

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }],
	}));

	return (
		<View style={styles.txRowContainer}>
			<View style={styles.deleteAction}>
				<TouchableOpacity onPress={() => onDelete(item.id)}>
					<Ionicons name="trash-outline" size={24} color="#fff" />
				</TouchableOpacity>
			</View>
			<GestureDetector gesture={gesture}>
				<Animated.View style={[styles.txRow, animatedStyle]}>
					<View style={{ flex: 1 }}>
						<Text style={styles.txDesc}>{item.description}</Text>
						<Text style={styles.txTags}>{item.tags.join(', ')}</Text>
					</View>
					<View style={styles.txRight}>
						<Text
							style={[
								styles.txAmount,
								item.type === 'income'
									? styles.incomeAmount
									: styles.expenseAmount,
							]}
						>
							{item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
						</Text>
						<Text style={styles.txDate}>{item.date.slice(5)}</Text>
					</View>
				</Animated.View>
			</GestureDetector>
		</View>
	);
};

export default function TransactionScreen() {
	const [selectedDate, setSelectedDate] = useState<string>(() => {
		return getLocalIsoDate();
	});
	const [modalVisible, setModalVisible] = useState(false);
	const [activePicker, setActivePicker] = useState<
		'calendar' | 'dateMode' | null
	>(null);
	const [tempSelection, setTempSelection] = useState<string>('');
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const navigation = useNavigation<NavigationProp>();
	const params = useLocalSearchParams<{
		selectedTags?: string;
		dateFilterMode?: string;
		allTags?: string;
	}>();
	const [selectedTags, setSelectedTags] = useState<string[]>(() =>
		params.selectedTags ? JSON.parse(params.selectedTags) : []
	);
	const [dateFilterMode, setDateFilterMode] = useState<string>(
		params.dateFilterMode ?? 'month'
	);

	const fetchTransactions = async () => {
		setIsLoading(true);
		try {
			const response = await axios.get(
				'http://localhost:3000/api/transactions'
			);
			// Format the response data to match our Transaction type exactly
			const formattedTransactions = response.data.map((t: any) => ({
				id: t._id, // Use the API's ID
				description: t.description || '',
				amount: Number(t.amount) || 0,
				date: new Date(t.date).toISOString().split('T')[0], // Format as YYYY-MM-DD
				tags: Array.isArray(t.tags) ? t.tags : [t.category || 'Uncategorized'], // Use category as tag if no tags
				type: t.type === 'income' ? 'income' : 'expense', // Ensure type is either 'income' or 'expense'
			}));
			setTransactions(formattedTransactions);
		} catch (error) {
			console.error('Error fetching transactions:', error);
			// Fallback to dummy data if API call fails
			setTransactions(dummyData);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchTransactions();
	}, []);

	// derive unique tags from data
	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		transactions.forEach((tx) => {
			if (tx.tags && Array.isArray(tx.tags)) {
				tx.tags.forEach((tag) => {
					if (typeof tag === 'string' && tag.trim()) {
						tagSet.add(tag.trim());
					}
				});
			}
		});
		return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
	}, [transactions]);

	const handleFilterPress = () => {
		router.push({
			pathname: './transaction/historyFilter',
			params: {
				selectedTags: JSON.stringify(selectedTags),
				dateFilterMode,
				allTags: JSON.stringify(allTags),
			},
		});
	};

	// filter transactions
	const filtered = useMemo(() => {
		const filteredData = transactions.filter((tx) => {
			const txDate = tx.date.slice(0, 10); // YYYY-MM-DD
			const txMonth = tx.date.slice(0, 7); // YYYY-MM

			// Check if transaction has any of the selected tags
			const tagMatch =
				selectedTags.length === 0 ||
				(tx.tags && tx.tags.some((tag) => selectedTags.includes(tag)));

			// Apply date filtering based on mode
			let dateMatch = true;
			if (dateFilterMode === 'day' && selectedDate) {
				dateMatch = txDate === selectedDate;
			} else if (dateFilterMode === 'month') {
				dateMatch = true;
			}

			return tagMatch && dateMatch;
		});

		// Sort by date in descending order (newest first)
		return filteredData.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
		);
	}, [transactions, selectedTags, selectedDate, dateFilterMode]);

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

	const handleDeleteTransaction = async (id: string) => {
		try {
			await axios.delete(`http://localhost:3000/api/transactions/${id}`);
			setTransactions(transactions.filter((tx) => tx.id !== id));
		} catch (error) {
			console.error('Error deleting transaction:', error);
			Alert.alert('Error', 'Failed to delete transaction');
		}
	};

	const renderTransaction = ({ item }: { item: Transaction }) => (
		<TransactionRow
			item={item}
			onDelete={(id) => {
				Alert.alert(
					'Delete Transaction',
					'Are you sure you want to delete this transaction?',
					[
						{
							text: 'Cancel',
							style: 'cancel',
						},
						{
							text: 'Delete',
							style: 'destructive',
							onPress: () => handleDeleteTransaction(id),
						},
					]
				);
			}}
		/>
	);

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
						<View style={styles.headerLeft} />
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
									{isLoading ? 'Loading...' : 'No transactions'}
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
	txRowContainer: {
		position: 'relative',
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
	deleteAction: {
		position: 'absolute',
		right: 0,
		top: 0,
		bottom: 0,
		width: 80,
		backgroundColor: '#ff3b30',
		justifyContent: 'center',
		alignItems: 'center',
	},
});
