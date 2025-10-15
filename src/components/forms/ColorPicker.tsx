import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR_PALETTE } from '../../constants/uiConstants';

interface ColorPickerProps {
	selectedColor: string;
	onColorSelect: (color: string) => void;
	isOpen: boolean;
	onToggle: () => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
	selectedColor,
	onColorSelect,
	isOpen,
	onToggle,
}) => {
	const handleColorSelect = (color: string) => {
		onColorSelect(color);
		onToggle();
	};

	return (
		<View>
			<TouchableOpacity style={styles.colorButton} onPress={onToggle}>
				<View style={styles.colorButtonContent}>
					<View
						style={[styles.colorPreview, { backgroundColor: selectedColor }]}
					/>
					<Text style={styles.colorButtonText}>Choose Color</Text>
					<Ionicons
						name={isOpen ? 'chevron-up' : 'chevron-down'}
						size={20}
						color="#757575"
					/>
				</View>
			</TouchableOpacity>

			{isOpen && (
				<View style={styles.colorGrid}>
					{Object.entries(COLOR_PALETTE).map(([name, colors]) => (
						<View key={name} style={styles.colorColumn}>
							<TouchableOpacity
								style={styles.colorOptionContainer}
								onPress={() => handleColorSelect(colors.base)}
							>
								<View
									style={[styles.colorSquare, { backgroundColor: colors.base }]}
								>
									{selectedColor === colors.base && (
										<View style={styles.selectedIndicator}>
											<Ionicons name="checkmark" size={20} color="#FFF" />
										</View>
									)}
								</View>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.colorOptionContainer}
								onPress={() => handleColorSelect(colors.pastel)}
							>
								<View
									style={[
										styles.colorSquare,
										{ backgroundColor: colors.pastel },
									]}
								>
									{selectedColor === colors.pastel && (
										<View style={styles.selectedIndicator}>
											<Ionicons name="checkmark" size={20} color="#000" />
										</View>
									)}
								</View>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.colorOptionContainer}
								onPress={() => handleColorSelect(colors.dark)}
							>
								<View
									style={[styles.colorSquare, { backgroundColor: colors.dark }]}
								>
									{selectedColor === colors.dark && (
										<View style={styles.selectedIndicator}>
											<Ionicons name="checkmark" size={20} color="#FFF" />
										</View>
									)}
								</View>
							</TouchableOpacity>
						</View>
					))}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	colorButton: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
	},
	colorButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	colorPreview: {
		width: 24,
		height: 24,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	colorButtonText: {
		fontSize: 16,
		color: '#212121',
		flex: 1,
		marginLeft: 12,
	},
	colorGrid: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginTop: 4,
		gap: 8,
	},
	colorColumn: {
		alignItems: 'center',
	},
	colorOptionContainer: {
		width: 36,
		height: 36,
		marginBottom: 4,
	},
	colorSquare: {
		width: '100%',
		height: '100%',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	selectedIndicator: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.2)',
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
});
