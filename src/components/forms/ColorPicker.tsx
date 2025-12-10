import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR_PALETTE } from '../../constants/uiConstants';
import { palette, radius, space, type as typography } from '../../ui/theme';

interface ColorPickerProps {
	selectedColor: string;
	onColorSelect: (color: string) => void;
	isOpen: boolean;
	onToggle: () => void;
	colors?: string[];
}

// Flatten COLOR_PALETTE into a single array of all colors
const getDefaultColors = (): string[] => {
	const colors: string[] = [];
	Object.values(COLOR_PALETTE).forEach((colorSet) => {
		colors.push(colorSet.base, colorSet.pastel, colorSet.dark);
	});
	return colors;
};

export const ColorPicker: React.FC<ColorPickerProps> = ({
	selectedColor,
	onColorSelect,
	isOpen,
	onToggle,
	colors = getDefaultColors(),
}) => {
	return (
		<View style={styles.container}>
			{/* Header row (swatch + label + chevron) */}
			<TouchableOpacity
				activeOpacity={0.9}
				style={styles.header}
				onPress={onToggle}
			>
				<View style={styles.headerLeft}>
					<View
						style={[
							styles.selectedSwatch,
							{ backgroundColor: selectedColor || palette.primary },
						]}
					/>
					<Text style={styles.headerLabel}>Choose Color</Text>
				</View>
				<Ionicons
					name={isOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
					size={18}
					color={palette.textMuted}
				/>
			</TouchableOpacity>

			{/* Swatch grid inside same card */}
			{isOpen && (
				<View style={styles.grid}>
					{colors.map((color) => {
						const isSelected = color === selectedColor;
						return (
							<TouchableOpacity
								key={color}
								activeOpacity={0.9}
								onPress={() => {
									onColorSelect(color);
									onToggle();
								}}
								style={[
									styles.swatchWrapper,
									isSelected && styles.swatchWrapperSelected,
								]}
							>
								<View style={[styles.swatch, { backgroundColor: color }]}>
									{isSelected && (
										<Ionicons name="checkmark" size={18} color="#FFFFFF" />
									)}
								</View>
							</TouchableOpacity>
						);
					})}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		borderRadius: radius.lg,
		backgroundColor: palette.surface,
		borderWidth: 1,
		borderColor: palette.border,
		overflow: 'hidden', // keeps grid inside the rounded card
	},
	header: {
		paddingHorizontal: space.lg,
		paddingVertical: space.md,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.md,
	},
	selectedSwatch: {
		width: 32,
		height: 32,
		borderRadius: radius.md,
		borderWidth: 2,
		borderColor: '#FFFFFF',
	},
	headerLabel: {
		fontSize: 16,
		color: palette.text,
		fontWeight: '400',
	},
	grid: {
		paddingHorizontal: space.lg,
		paddingBottom: space.md,
		paddingTop: space.sm,
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: space.sm,
	},
	swatchWrapper: {
		width: 40,
		height: 40,
		borderRadius: radius.md,
		justifyContent: 'center',
		alignItems: 'center',
	},
	swatchWrapperSelected: {
		borderWidth: 2,
		borderColor: palette.primary,
	},
	swatch: {
		width: '100%',
		height: '100%',
		borderRadius: radius.md - 2,
		justifyContent: 'center',
		alignItems: 'center',
	},
});
