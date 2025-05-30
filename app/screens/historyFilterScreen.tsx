import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';

const dateFilterModes = [
	{ label: 'Day', value: 'day', icon: 'calendar-outline' },
	{ label: 'Month', value: 'month', icon: 'calendar' },
];

export default function HistoryFilterScreen() {
	const params = useLocalSearchParams<{
		selectedTags: string;
		dateFilterMode: string;
		allTags: string;
	}>();

	const selectedTags = params?.selectedTags
		? JSON.parse(params.selectedTags)
		: [];
	const dateFilterMode = params?.dateFilterMode ?? 'month';
	const allTags = params?.allTags ? JSON.parse(params.allTags) : [];

	const handleTagSelect = (tag: string) => {
		let newSelectedTags;
		if (tag === '') {
			// If "All Tags" is selected, clear all selections
			newSelectedTags = [];
		} else {
			// Toggle the selected tag
			if (selectedTags.includes(tag)) {
				newSelectedTags = selectedTags.filter((t: string) => t !== tag);
			} else {
				newSelectedTags = [...selectedTags, tag];
			}
		}

		router.setParams({
			selectedTags: JSON.stringify(newSelectedTags),
			dateFilterMode,
			allTags: JSON.stringify(allTags),
		});
	};

	const handleDateModeSelect = (mode: string) => {
		router.setParams({
			selectedTags: JSON.stringify(selectedTags),
			dateFilterMode: mode,
			allTags: JSON.stringify(allTags),
		});
	};

	const handleBackPress = () => {
		router.setParams({
			selectedTags: JSON.stringify(selectedTags),
			dateFilterMode,
			allTags: JSON.stringify(allTags),
		});
		router.back();
	};

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
							<TouchableOpacity onPress={handleBackPress}>
								<Ionicons name="chevron-back-outline" size={36} color="#555" />
							</TouchableOpacity>
						</View>
						<Text style={styles.headerTitle}>Filters</Text>
						<View style={styles.headerRight} />
					</View>

					{/* Filter Modes */}
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

					{/* Tags Section */}
					<View style={styles.dropdownSection}>
						<Text style={styles.dropdownSectionTitle}>Filter by Tags</Text>
						<View style={styles.tagList}>
							<TouchableOpacity
								style={[
									styles.tagItem,
									selectedTags.length === 0 && styles.tagItemSelected,
								]}
								onPress={() => handleTagSelect('')}
							>
								<Text
									style={[
										styles.tagText,
										selectedTags.length === 0 && styles.tagTextSelected,
									]}
								>
									All Tags
								</Text>
							</TouchableOpacity>
							{allTags.length > 0 ? (
								allTags.map((tag: string) => (
									<TouchableOpacity
										key={tag}
										style={[
											styles.tagItem,
											selectedTags.includes(tag) && styles.tagItemSelected,
										]}
										onPress={() => handleTagSelect(tag)}
									>
										<Text
											style={[
												styles.tagText,
												selectedTags.includes(tag) && styles.tagTextSelected,
											]}
										>
											{tag}
										</Text>
									</TouchableOpacity>
								))
							) : (
								<Text style={styles.noTagsText}>No tags available</Text>
							)}
						</View>
					</View>
				</View>
			</SafeAreaView>
		</View>
	);
}

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
		zIndex: 1000,
	},
	headerRight: {
		width: 36,
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
	filterModeText: {
		fontSize: 16,
		color: '#333',
	},
	filterModeItemSelected: {
		backgroundColor: '#007ACC',
	},
	filterModeTextSelected: {
		color: '#fff',
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
	tagText: {
		fontSize: 14,
		color: '#333',
	},
	tagItemSelected: {
		backgroundColor: '#007ACC',
	},
	tagTextSelected: {
		color: '#fff',
	},
	noTagsText: {
		color: '#666',
		fontStyle: 'italic',
		marginTop: 8,
	},
});
