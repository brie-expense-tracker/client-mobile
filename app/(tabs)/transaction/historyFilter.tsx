import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';

const dateFilterModes = [
	{ label: 'Day', value: 'day', icon: 'calendar-outline' },
	{ label: 'Month', value: 'month', icon: 'calendar' },
];

export default function HistoryFilterScreen() {
	const params = useLocalSearchParams<{
		selectedCategory: string;
		dateFilterMode: string;
		allCategories: string;
	}>();

	// Initialize local state from params
	const [localSelectedCategories, setLocalSelectedCategories] = useState<
		string[]
	>(params?.selectedCategory ? JSON.parse(params.selectedCategory) : []);
	const [localDateFilterMode, setLocalDateFilterMode] = useState<string>(
		params?.dateFilterMode ?? 'month'
	);
	const availableCategories = params?.allCategories
		? JSON.parse(params.allCategories)
		: [];

	const handleCategorySelect = (category: string) => {
		if (category === '') {
			// If "All Categories" is selected, clear all selections
			setLocalSelectedCategories([]);
		} else {
			// Toggle the selected category
			if (localSelectedCategories.includes(category)) {
				setLocalSelectedCategories(
					localSelectedCategories.filter((c) => c !== category)
				);
			} else {
				setLocalSelectedCategories([...localSelectedCategories, category]);
			}
		}
	};

	const handleDateModeSelect = (mode: string) => {
		setLocalDateFilterMode(mode);
	};

	const handleBackPress = () => {
		router.replace({
			pathname: '/transaction',
			params: {
				selectedCategory: JSON.stringify(localSelectedCategories),
				dateFilterMode: localDateFilterMode,
				allCategories: JSON.stringify(availableCategories),
			},
		});
	};

	return (
		<View style={styles.mainContainer}>
			{/* Filter Modes */}
			<View style={styles.filterModeList}>
				{dateFilterModes.map((mode) => (
					<TouchableOpacity
						key={mode.value}
						style={[
							styles.filterModeItem,
							localDateFilterMode === mode.value &&
								styles.filterModeItemSelected,
						]}
						onPress={() => handleDateModeSelect(mode.value)}
					>
						<Ionicons
							name={mode.icon as any}
							size={24}
							color={localDateFilterMode === mode.value ? '#fff' : '#555'}
						/>
						<Text
							style={[
								styles.filterModeText,
								localDateFilterMode === mode.value &&
									styles.filterModeTextSelected,
							]}
						>
							{mode.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<View style={styles.dropdownDivider} />

			{/* Categories Section */}
			<View style={styles.dropdownSection}>
				<Text style={styles.dropdownSectionTitle}>Filter by Categories</Text>
				<View style={styles.categoryList}>
					<TouchableOpacity
						style={[
							styles.categoryItem,
							localSelectedCategories.length === 0 &&
								styles.categoryItemSelected,
						]}
						onPress={() => handleCategorySelect('')}
					>
						<Text
							style={[
								styles.categoryText,
								localSelectedCategories.length === 0 &&
									styles.categoryTextSelected,
							]}
						>
							All Categories
						</Text>
					</TouchableOpacity>
					{availableCategories.length > 0 ? (
						availableCategories.map((category: string) => (
							<TouchableOpacity
								key={category}
								style={[
									styles.categoryItem,
									localSelectedCategories.includes(category) &&
										styles.categoryItemSelected,
								]}
								onPress={() => handleCategorySelect(category)}
							>
								<Text
									style={[
										styles.categoryText,
										localSelectedCategories.includes(category) &&
											styles.categoryTextSelected,
									]}
								>
									{category}
								</Text>
							</TouchableOpacity>
						))
					) : (
						<Text style={styles.noCategoriesText}>No categories available</Text>
					)}
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#f9fafb',
	},
	filterModeList: {
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
	filterModeText: {
		fontSize: 16,
		color: '#333',
	},
	filterModeItemSelected: {
		backgroundColor: '#0095FF',
	},
	filterModeTextSelected: {
		color: '#fff',
	},
	dropdownDivider: {
		height: 1,
		backgroundColor: '#e2e2e2',
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
	categoryList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	categoryItem: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: '#f0f0f0',
	},
	categoryText: {
		fontSize: 14,
		color: '#333',
	},
	categoryItemSelected: {
		backgroundColor: '#0095FF',
	},
	categoryTextSelected: {
		color: '#fff',
	},
	noCategoriesText: {
		color: '#666',
		fontStyle: 'italic',
		marginTop: 8,
	},
});
