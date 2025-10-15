import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface CategorySelectorProps {
	categories: readonly string[];
	selectedCategories: string[];
	onToggleCategory: (category: string) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
	categories,
	selectedCategories,
	onToggleCategory,
}) => {
	return (
		<View style={styles.chipsWrap}>
			{categories.map((category) => {
				const isSelected = selectedCategories.includes(category);
				return (
					<TouchableOpacity
						key={category}
						style={[styles.chip, isSelected && styles.chipSelected]}
						onPress={() => onToggleCategory(category)}
					>
						<Text
							style={[styles.chipText, isSelected && styles.chipTextSelected]}
						>
							{category}
						</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);
};

const styles = StyleSheet.create({
	chipsWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 16,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	chipSelected: {
		backgroundColor: '#f0f9ff',
		borderColor: '#00a2ff',
	},
	chipText: {
		color: '#212121',
		fontWeight: '600',
	},
	chipTextSelected: {
		color: '#00a2ff',
		fontWeight: '700',
	},
});
