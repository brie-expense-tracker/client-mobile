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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { router } from 'expo-router';

type RootStackParamList = {
	Tracker: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Transaction {
	id: string;
	description: string;
	amount: number;
	date: string; // ISO string
	tags: string[];
}

const dummyData: Transaction[] = [
	{
		id: '1',
		description: 'Groceries',
		amount: 76.23,
		date: '2025-05-03',
		tags: ['Food'],
	},
	{
		id: '2',
		description: 'Electric Bill',
		amount: 120.5,
		date: '2025-05-01',
		tags: ['Utilities'],
	},
	{
		id: '3',
		description: 'Coffee',
		amount: 4.75,
		date: '2025-04-27',
		tags: ['Food', 'Cafe'],
	},
	{
		id: '4',
		description: 'Netflix',
		amount: 15.99,
		date: '2025-05-02',
		tags: ['Entertainment'],
	},
	{
		id: '5',
		description: 'Gym Membership',
		amount: 45,
		date: '2025-03-15',
		tags: ['Health'],
	},
	// …add more as needed
];

const years = [
	{ label: 'All Years', value: '' },
	{ label: '2025', value: '2025' },
	{ label: '2024', value: '2024' },
	{ label: '2023', value: '2023' },
];

const months = [
	{ label: 'All Months', value: '' },
	{ label: 'January', value: '01' },
	{ label: 'February', value: '02' },
	{ label: 'March', value: '03' },
	{ label: 'April', value: '04' },
	{ label: 'May', value: '05' },
	{ label: 'June', value: '06' },
	{ label: 'July', value: '07' },
	{ label: 'August', value: '08' },
	{ label: 'September', value: '09' },
	{ label: 'October', value: '10' },
	{ label: 'November', value: '11' },
	{ label: 'December', value: '12' },
];

export default function TransactionScreen() {
	const [selectedTag, setSelectedTag] = useState<string>('');
	const [selectedYear, setSelectedYear] = useState<string>('');
	const [selectedMonth, setSelectedMonth] = useState<string>('');
	const [modalVisible, setModalVisible] = useState(false);
	const [activePicker, setActivePicker] = useState<'year' | 'month' | null>(
		null
	);
	const [tempSelection, setTempSelection] = useState<string>('');
	const navigation = useNavigation<NavigationProp>();

	// derive unique tags from data
	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		dummyData.forEach((tx) => tx.tags.forEach((t) => tagSet.add(t)));
		return Array.from(tagSet);
	}, []);

	// filter transactions
	const filtered = useMemo(() => {
		return dummyData.filter((tx) => {
			const txYear = tx.date.slice(0, 4);
			const txMonth = tx.date.slice(5, 7);
			const tagMatch = selectedTag === '' || tx.tags.includes(selectedTag);
			const yearMatch = selectedYear === '' || txYear === selectedYear;
			const monthMatch = selectedMonth === '' || txMonth === selectedMonth;
			return tagMatch && yearMatch && monthMatch;
		});
	}, [selectedTag, selectedYear, selectedMonth]);

	const handlePickerPress = (picker: 'year' | 'month') => {
		setActivePicker(picker);
		setTempSelection(picker === 'year' ? selectedYear : selectedMonth);
		setModalVisible(true);
	};

	const handlePickerSelect = (value: string) => {
		setTempSelection(value);
	};

	const handleModalClose = () => {
		if (activePicker === 'year') {
			setSelectedYear(tempSelection);
		} else if (activePicker === 'month') {
			setSelectedMonth(tempSelection);
		}
		setModalVisible(false);
		setActivePicker(null);
	};

	const renderPickerContent = () => {
		if (!activePicker) return null;

		const data = activePicker === 'year' ? years : months;

		return (
			<View style={styles.pickerContent}>
				<Picker
					selectedValue={tempSelection}
					onValueChange={handlePickerSelect}
					style={styles.picker}
				>
					{data.map((item) => (
						<Picker.Item
							key={item.value}
							label={item.label}
							value={item.value}
						/>
					))}
				</Picker>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
				{/* Header */}
				<View style={styles.headerContainer}>
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons name="chevron-back-outline" size={36} color="#555" />
					</TouchableOpacity>
					<View style={styles.headerSpacer} />
					<View style={styles.filterButtonsContainer}>
						<TouchableOpacity
							style={styles.filterButton}
							onPress={() => handlePickerPress('year')}
						>
							<Text style={styles.filterButtonText}>
								{selectedYear || 'All Years'}
							</Text>
							<Ionicons name="calendar" size={24} color="#555" />
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.filterButton}
							onPress={() => handlePickerPress('month')}
						>
							<Text style={styles.filterButtonText}>
								{months.find((m) => m.value === selectedMonth)?.label ||
									'All Months'}
							</Text>
							<Ionicons name="calendar" size={24} color="#555" />
						</TouchableOpacity>
					</View>
				</View>

				{/* Modal Picker */}
				<Modal
					visible={modalVisible}
					transparent
					animationType="fade"
					onRequestClose={handleModalClose}
				>
					<TouchableWithoutFeedback onPress={handleModalClose}>
						<View style={styles.modalOverlay}>
							<TouchableWithoutFeedback>
								<View style={styles.modalContent}>
									<View style={styles.modalHeader}>
										<Text style={styles.modalTitle}>
											{activePicker === 'year' ? 'Select Year' : 'Select Month'}
										</Text>
										<TouchableOpacity
											onPress={handleModalClose}
											style={styles.closeButton}
										>
											<Ionicons name="close" size={24} color="#666" />
										</TouchableOpacity>
									</View>
									{renderPickerContent()}
								</View>
							</TouchableWithoutFeedback>
						</View>
					</TouchableWithoutFeedback>
				</Modal>

				{/* Tag Chips */}
				<View style={styles.filtersContainer}>
					<FlatList
						data={['All Tags', ...allTags]}
						horizontal
						keyExtractor={(item) => item}
						showsHorizontalScrollIndicator={false}
						renderItem={({ item }) => {
							const isAll = item === 'All Tags';
							const tagValue = isAll ? '' : item;
							const selected = tagValue === selectedTag;
							return (
								<TouchableOpacity
									style={[styles.chip, selected && styles.chipSelected]}
									onPress={() => setSelectedTag(tagValue)}
								>
									<Text
										style={[
											styles.chipText,
											selected && styles.chipTextSelected,
										]}
									>
										{item}
									</Text>
								</TouchableOpacity>
							);
						}}
					/>
				</View>

				{/* Transaction List */}
				<FlatList
					data={filtered}
					keyExtractor={(item) => item.id}
					contentContainerStyle={{ paddingBottom: 80 }}
					renderItem={({ item }) => (
						<View style={styles.txRow}>
							<View style={{ flex: 1 }}>
								<Text style={styles.txDesc}>{item.description}</Text>
								<Text style={styles.txTags}>{item.tags.join(', ')}</Text>
							</View>
							<View style={styles.txRight}>
								<Text style={styles.txAmount}>${item.amount.toFixed(2)}</Text>
								<Text style={styles.txDate}>{item.date.slice(5)}</Text>
							</View>
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
	);
}

const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#f9f9f9',
	},
	container: {
		flex: 1,
		backgroundColor: '#f9f9f9',
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
	txAmount: { fontSize: 16, fontWeight: '600' },
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
	},
	headerSpacer: {
		flex: 1,
	},
	filterButtonsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	filterButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
	},
	filterButtonText: {
		marginRight: 6,
		fontSize: 16,
		fontWeight: '600',
		color: '#7a7a7a',
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
});
