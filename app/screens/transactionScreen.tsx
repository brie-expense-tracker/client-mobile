// transactionScreen.tsx
import React, { useState, useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Link, router, Stack } from 'expo-router';

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

const months = [
	{ label: '2025', value: '' },
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
	const [selectedMonth, setSelectedMonth] = useState<string>('');
	const [showPicker, setShowPicker] = useState(false);
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
			const txMonth = tx.date.slice(5, 7); // "YYYY-MM-DD"
			const tagMatch = selectedTag === '' || tx.tags.includes(selectedTag);
			const monthMatch = selectedMonth === '' || txMonth === selectedMonth;
			return tagMatch && monthMatch;
		});
	}, [selectedTag, selectedMonth]);

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
				{/* Header */}
				<View style={styles.headerContainer}>
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons name="chevron-back-outline" size={36} color="#555" />
					</TouchableOpacity>
					<View style={styles.headerSpacer} />
					<TouchableOpacity
						style={styles.filterButton}
						onPress={() => setShowPicker(!showPicker)}
					>
						<Text style={styles.filterButtonText}>
							{months[selectedMonth.length].label}
						</Text>
						<Ionicons name="filter" size={36} color="#555" />
					</TouchableOpacity>
				</View>

				{/* Month Picker */}
				{showPicker && (
					<View style={styles.pickerWrapper}>
						<Picker
							selectedValue={selectedMonth}
							onValueChange={setSelectedMonth}
							mode="dropdown"
						>
							{months.map((m) => (
								<Picker.Item key={m.value} label={m.label} value={m.value} />
							))}
						</Picker>
					</View>
				)}

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

const { width } = Dimensions.get('window');
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
	filterButton: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	filterButtonText: {
		marginRight: 10,
		fontSize: 28,
		fontWeight: 'bold',
		color: '#7a7a7a',
	},
	addButton: {
		padding: 8,
	},
});
