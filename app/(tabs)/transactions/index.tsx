import React, { useState, useMemo, useEffect, useContext } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Dimensions,
	Modal,
	TouchableWithoutFeedback,
	Alert,
	TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import * as Haptics from 'expo-haptics';
import {
	Gesture,
	GestureDetector,
	GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
	runOnJS,
	withSpring,
	Easing,
} from 'react-native-reanimated';
import {
	Transaction,
	transactions as dummyData,
} from '../../../data/transactions';
import axios from 'axios';
import { FilterContext } from './_layout';

// =============================================
// Type Definitions
// =============================================
type RootStackParamList = {
	Tracker: undefined;
	historyFilterScreen: {
		selectedCategory: string;
		dateFilterMode: string;
		allCategories: string[];
	};
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type DateInput = string | Date;

// =============================================
// Utility Functions
// =============================================
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
// Transaction Row Component
// =============================================
const TransactionRow = ({
	item,
	onDelete,
}: {
	item: Transaction;
	onDelete: (id: string, resetAnimation: () => void) => void;
}) => {
	const translateX = useSharedValue(0);
	const TRANSLATE_THRESHOLD = -70;
	const DELETE_WIDTH = 60;
	const hasTriggeredHaptic = useSharedValue(false);
	const iconScale = useSharedValue(1);

	const getCategoryIcon = (categories: string[]) => {
		const categoryMap: {
			[key: string]: { name: keyof typeof Ionicons.glyphMap; color: string };
		} = {
			Groceries: { name: 'cart-outline', color: '#4CAF50' },
			Utilities: { name: 'flash-outline', color: '#FFC107' },
			Entertainment: { name: 'game-controller-outline', color: '#9C27B0' },
			Travel: { name: 'airplane-outline', color: '#2196F3' },
			Health: { name: 'fitness-outline', color: '#F44336' },
			Dining: { name: 'restaurant-outline', color: '#FF9800' },
			Shopping: { name: 'bag-outline', color: '#E91E63' },
			Transportation: { name: 'car-outline', color: '#607D8B' },
			Housing: { name: 'home-outline', color: '#795548' },
			Education: { name: 'school-outline', color: '#3F51B5' },
			Salary: { name: 'cash-outline', color: '#4CAF50' },
			Investment: { name: 'trending-up-outline', color: '#009688' },
			Gifts: { name: 'gift-outline', color: '#E91E63' },
			Other: { name: 'ellipsis-horizontal-outline', color: '#9E9E9E' },
		};

		// Get the first category from the array
		const primaryCategory = categories[0];
		return categoryMap[primaryCategory] || categoryMap['Other'];
	};

	const categoryIcon = getCategoryIcon(item.category);

	const handleDelete = () => {
		onDelete(item.id, resetAnimation);
	};

	const resetAnimation = () => {
		translateX.value = 0;
		hasTriggeredHaptic.value = false;
		iconScale.value = withSpring(1, {
			damping: 15,
			stiffness: 150,
		});
	};

	const triggerHaptic = () => {
		try {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		} catch (error) {
			console.log('Haptic feedback not available');
		}
	};

	const panGesture = Gesture.Pan()
		.activeOffsetX([-15, 15])
		.failOffsetY([-10, 10])
		.onUpdate(({ translationX }) => {
			translateX.value = Math.min(0, translationX);

			// Trigger haptic and scale animation when crossing threshold
			if (translateX.value < TRANSLATE_THRESHOLD && !hasTriggeredHaptic.value) {
				hasTriggeredHaptic.value = true;
				iconScale.value = withSpring(1.5, {
					damping: 15,
					stiffness: 150,
				});
				runOnJS(triggerHaptic)();
			} else if (
				translateX.value >= TRANSLATE_THRESHOLD &&
				hasTriggeredHaptic.value
			) {
				hasTriggeredHaptic.value = false;
				iconScale.value = withSpring(1, {
					damping: 15,
					stiffness: 150,
				});
				runOnJS(triggerHaptic)();
			}
		})
		.onEnd(() => {
			if (translateX.value < TRANSLATE_THRESHOLD) {
				translateX.value = withTiming(
					-DELETE_WIDTH,
					{ duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
					() => runOnJS(handleDelete)()
				);
			} else {
				translateX.value = withSpring(0, { damping: 20 });
				iconScale.value = withSpring(1, {
					damping: 15,
					stiffness: 150,
				});
			}
		});

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }],
	}));

	const trashIconStyle = useAnimatedStyle(() => ({
		transform: [{ scale: iconScale.value }],
	}));

	return (
		<View style={styles.txRowContainer}>
			<View style={styles.deleteAction}>
				<Animated.View style={trashIconStyle}>
					<TouchableOpacity onPress={() => onDelete(item.id, resetAnimation)}>
						<Ionicons name="trash-outline" size={18} color="#fff" />
					</TouchableOpacity>
				</Animated.View>
			</View>
			<GestureDetector gesture={panGesture}>
				<Animated.View style={[styles.txRow, animatedStyle]}>
					<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
						<View
							style={[
								styles.iconContainer,
								{ backgroundColor: `${categoryIcon.color}20` },
							]}
						>
							<Ionicons
								name={categoryIcon.name}
								size={20}
								color={categoryIcon.color}
							/>
						</View>
						<View style={{ marginLeft: 12 }}>
							<Text style={styles.txDesc}>{item.description}</Text>
							<Text style={styles.txCategory}>{item.category.join(', ')}</Text>
						</View>
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
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isInitialLoad, setIsInitialLoad] = useState(true);
	const navigation = useNavigation<NavigationProp>();
	const params = useLocalSearchParams<{
		selectedCategory?: string;
		dateFilterMode?: string;
		allCategories?: string;
	}>();

	const {
		selectedCategories,
		setSelectedCategories,
		dateFilterMode,
		setDateFilterMode,
		availableCategories,
		setAvailableCategories,
	} = useContext(FilterContext);

	const [searchQuery, setSearchQuery] = useState('');

	// Initialize filter state from params if available
	useEffect(() => {
		if (
			params.selectedCategory &&
			JSON.parse(params.selectedCategory).length !== selectedCategories.length
		) {
			setSelectedCategories(JSON.parse(params.selectedCategory));
		}
		if (params.dateFilterMode && params.dateFilterMode !== dateFilterMode) {
			setDateFilterMode(params.dateFilterMode);
		}
		if (
			params.allCategories &&
			JSON.parse(params.allCategories).length !== availableCategories.length
		) {
			setAvailableCategories(JSON.parse(params.allCategories));
		}
	}, [params.selectedCategory, params.dateFilterMode, params.allCategories]);

	const fetchTransactions = async () => {
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
				category: Array.isArray(t.category)
					? t.category
					: [t.category || 'Uncategorized'], // Use category if no category array
				type: t.type === 'income' ? 'income' : 'expense', // Ensure type is either 'income' or 'expense'
			}));
			setTransactions(formattedTransactions);
		} catch (error) {
			// Fallback to dummy data if API call fails
			setTransactions(dummyData);
		} finally {
			setIsLoading(false);
			setIsInitialLoad(false);
		}
	};

	useEffect(() => {
		fetchTransactions();
	}, []);

	// derive unique categories from data
	const allCategories = useMemo(() => {
		const categorySet = new Set<string>();
		transactions.forEach((tx) => {
			if (tx.category && Array.isArray(tx.category)) {
				tx.category.forEach((cat) => {
					if (typeof cat === 'string' && cat.trim()) {
						categorySet.add(cat.trim());
					}
				});
			}
		});
		return Array.from(categorySet).sort((a, b) => a.localeCompare(b));
	}, [transactions]);

	const handleFilterPress = () => {
		router.push({
			pathname: './transactions/historyFilter',
			params: {
				selectedCategory: JSON.stringify(selectedCategories),
				dateFilterMode,
				allCategories: JSON.stringify(availableCategories),
			},
		});
	};

	// filter transactions
	const filtered = useMemo(() => {
		const filteredData = transactions.filter((tx) => {
			const txDate = tx.date.slice(0, 10); // YYYY-MM-DD
			const txMonth = tx.date.slice(0, 7); // YYYY-MM

			// Check if transaction has any of the selected categories
			const categoryMatch =
				selectedCategories.length === 0 ||
				(tx.category &&
					tx.category.some((cat) => selectedCategories.includes(cat)));

			// Apply date filtering based on mode
			let dateMatch = true;
			if (dateFilterMode === 'day' && selectedDate) {
				dateMatch = txDate === selectedDate;
			} else if (dateFilterMode === 'month') {
				dateMatch = true;
			}

			// Apply search filtering
			const searchMatch = searchQuery
				? tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
				  tx.category.some((cat) =>
						cat.toLowerCase().includes(searchQuery.toLowerCase())
				  )
				: true;

			return categoryMatch && dateMatch && searchMatch;
		});

		// Sort by date in descending order (newest first)
		return filteredData.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
		);
	}, [
		transactions,
		selectedCategories,
		selectedDate,
		dateFilterMode,
		searchQuery,
	]);

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

	const handleCalendarDayPress = (day: { dateString: string }) => {
		setSelectedDate(day.dateString);
		setModalVisible(false);
		setActivePicker(null);
	};

	const handleDeleteTransaction = async (id: string) => {
		try {
			// Try to delete from API first
			await axios.delete(`http://localhost:3000/api/transactions/${id}`);
		} catch (error) {
			// If API call fails, we're using mock data
			console.log('Using mock data - deleting locally');
		}
		// Update local state regardless of API success/failure
		setTransactions(transactions.filter((tx) => tx.id !== id));
	};

	const renderTransaction = ({ item }: { item: Transaction }) => (
		<TransactionRow
			item={item}
			onDelete={(id, resetAnimation) => {
				Alert.alert(
					'Delete Transaction',
					'Are you sure you want to delete this transaction?',
					[
						{
							text: 'Cancel',
							style: 'cancel',
							onPress: resetAnimation,
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
		<GestureHandlerRootView style={styles.rootContainer}>
			<View style={[styles.safeArea, { paddingTop: insets.top }]}>
				<View style={styles.mainContainer}>
					{/* Header */}
					<View style={styles.headerContainer}>
						<View style={styles.headerTextContainer}>
							<Text style={styles.headerText}></Text>
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
						<FlatList
							data={groupedTransactions}
							keyExtractor={(item) => item.monthKey}
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
								<View style={styles.emptyContainer}>
									{isLoading ? (
										<View style={styles.loadingContainer}>
											<Text style={styles.loadingText}>Loading...</Text>
										</View>
									) : (
										<View style={styles.empty}>
											<Ionicons
												name="document-outline"
												size={48}
												color="#e5e7eb"
											/>
											<Text style={{ color: '#9ca3af', marginTop: 8 }}>
												No transactions
											</Text>
										</View>
									)}
								</View>
							}
							contentContainerStyle={[
								styles.listContentContainer,
								isLoading && styles.listContentContainerLoading,
							]}
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
							<View style={styles.calendarModalContent}>
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
	calendarModalContent: {
		width: width * 0.9,
		maxHeight: height * 0.7,
		backgroundColor: '#fff',
		borderRadius: 24,
		overflow: 'hidden',
		position: 'absolute',
		top: '50%',
		left: '50%',
		transform: [{ translateX: -width * 0.45 }, { translateY: -height * 0.35 }],
	},
	monthHeader: {
		paddingTop: 8,
		marginTop: 8,
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
		// fontSize: 16,
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
		fontSize: 14,
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
});
