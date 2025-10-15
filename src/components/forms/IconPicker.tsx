import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalizeIconName } from '../../constants/uiConstants';

interface IconPickerProps {
	selectedIcon: keyof typeof Ionicons.glyphMap;
	selectedColor: string;
	icons: readonly (keyof typeof Ionicons.glyphMap)[];
	onIconSelect: (icon: keyof typeof Ionicons.glyphMap) => void;
	isOpen: boolean;
	onToggle: () => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({
	selectedIcon,
	selectedColor,
	icons,
	onIconSelect,
	isOpen,
	onToggle,
}) => {
	const handleIconSelect = (icon: keyof typeof Ionicons.glyphMap) => {
		onIconSelect(normalizeIconName(icon));
		onToggle();
	};

	return (
		<View>
			<TouchableOpacity style={styles.iconButton} onPress={onToggle}>
				<View style={styles.iconButtonContent}>
					<View
						style={[
							styles.iconPreview,
							{ backgroundColor: selectedColor + '20' },
						]}
					>
						<Ionicons
							name={normalizeIconName(selectedIcon)}
							size={20}
							color={selectedColor}
						/>
					</View>
					<Text style={styles.iconButtonText}>Choose Icon</Text>
					<Ionicons
						name={isOpen ? 'chevron-up' : 'chevron-down'}
						size={20}
						color="#757575"
					/>
				</View>
			</TouchableOpacity>

			{isOpen && (
				<View style={styles.iconGrid}>
					{icons.map((iconName) => (
						<TouchableOpacity
							key={iconName}
							style={[
								styles.iconOption,
								selectedIcon === iconName && {
									backgroundColor: selectedColor,
								},
							]}
							onPress={() => handleIconSelect(iconName)}
						>
							<Ionicons
								name={iconName}
								size={24}
								color={selectedIcon === iconName ? 'white' : selectedColor}
							/>
						</TouchableOpacity>
					))}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	iconButton: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
	},
	iconButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	iconPreview: {
		width: 24,
		height: 24,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		justifyContent: 'center',
		alignItems: 'center',
	},
	iconButtonText: {
		fontSize: 16,
		color: '#212121',
		flex: 1,
		marginLeft: 12,
	},
	iconGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 8,
		marginTop: 4,
	},
	iconOption: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'white',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
});
