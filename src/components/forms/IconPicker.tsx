import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalizeIconName } from '../../constants/uiConstants';
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../ui/theme';

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
		<View style={styles.container}>
			<TouchableOpacity
				style={styles.iconButton}
				onPress={onToggle}
				activeOpacity={0.9}
			>
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
						color={palette.textMuted}
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
	container: {
		borderRadius: radius.lg,
		backgroundColor: palette.surface,
		borderWidth: 1,
		borderColor: palette.border,
		overflow: 'hidden',
	},
	iconButton: {
		paddingHorizontal: space.lg,
		paddingVertical: space.md,
	},
	iconButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	iconPreview: {
		width: 32,
		height: 32,
		borderRadius: radius.md,
		borderWidth: 2,
		borderColor: '#FFFFFF',
		justifyContent: 'center',
		alignItems: 'center',
	},
	iconButtonText: {
		...typography.body,
		color: palette.text,
		flex: 1,
		marginLeft: space.md,
	},
	iconGrid: {
		paddingHorizontal: space.lg,
		paddingBottom: space.md,
		paddingTop: space.sm,
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: space.sm,
	},
	iconOption: {
		width: 40,
		height: 40,
		borderRadius: radius.md,
		backgroundColor: palette.surface,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: palette.border,
	},
});
