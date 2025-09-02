import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RectButton } from 'react-native-gesture-handler';

export type ColorOption = {
	base: string;
	pastel: string;
	dark: string;
};

type ColorPickerProps = {
	selectedColor: string;
	onColorChange: (color: string) => void;
	colorPalette: Record<string, ColorOption>;
	showColorPicker: boolean;
	onToggleColorPicker: () => void;
};

type IconPickerProps = {
	selectedIcon: keyof typeof Ionicons.glyphMap;
	onIconChange: (icon: keyof typeof Ionicons.glyphMap) => void;
	iconOptions: (keyof typeof Ionicons.glyphMap)[];
	selectedColor: string;
	showIconPicker: boolean;
	onToggleIconPicker: () => void;
};

export const ColorPicker: React.FC<ColorPickerProps> = ({
	selectedColor,
	onColorChange,
	colorPalette,
	showColorPicker,
	onToggleColorPicker,
}) => (
	<View style={styles.colorPickerContainer}>
		<Text style={styles.label}>Choose Color</Text>
		<RectButton style={styles.colorButton} onPress={onToggleColorPicker}>
			<View style={styles.colorButtonContent}>
				<View
					style={[styles.colorPreview, { backgroundColor: selectedColor }]}
				/>
				<Text style={styles.colorButtonText}>Choose Color</Text>
				<Ionicons
					name={showColorPicker ? 'chevron-up' : 'chevron-down'}
					size={20}
					color="#757575"
				/>
			</View>
		</RectButton>

		{showColorPicker && (
			<View style={styles.colorGrid}>
				{Object.entries(colorPalette).map(([name, colors]) => (
					<View key={name} style={styles.colorColumn}>
						<RectButton
							style={styles.colorOptionContainer}
							onPress={() => {
								onColorChange(colors.base);
								onToggleColorPicker();
							}}
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
						</RectButton>
						<RectButton
							style={styles.colorOptionContainer}
							onPress={() => {
								onColorChange(colors.pastel);
								onToggleColorPicker();
							}}
						>
							<View
								style={[styles.colorSquare, { backgroundColor: colors.pastel }]}
							>
								{selectedColor === colors.pastel && (
									<View style={styles.selectedIndicator}>
										<Ionicons name="checkmark" size={20} color="#000" />
									</View>
								)}
							</View>
						</RectButton>
						<RectButton
							style={styles.colorOptionContainer}
							onPress={() => {
								onColorChange(colors.dark);
								onToggleColorPicker();
							}}
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
						</RectButton>
					</View>
				))}
			</View>
		)}
	</View>
);

export const IconPicker: React.FC<IconPickerProps> = ({
	selectedIcon,
	onIconChange,
	iconOptions,
	selectedColor,
	showIconPicker,
	onToggleIconPicker,
}) => (
	<View style={styles.iconPickerContainer}>
		<Text style={styles.label}>Choose Icon</Text>
		<RectButton style={styles.iconButton} onPress={onToggleIconPicker}>
			<View style={styles.iconButtonContent}>
				<View
					style={[
						styles.iconPreview,
						{ backgroundColor: selectedColor + '20' },
					]}
				>
					<Ionicons
						name={selectedIcon as any}
						size={20}
						color={selectedColor}
					/>
				</View>
				<Text style={styles.iconButtonText}>Choose Icon</Text>
				<Ionicons
					name={showIconPicker ? 'chevron-up' : 'chevron-down'}
					size={20}
					color="#757575"
				/>
			</View>
		</RectButton>

		{showIconPicker && (
			<View style={styles.iconGrid}>
				{iconOptions.map((icon) => (
					<RectButton
						key={icon}
						style={[
							styles.iconOption,
							selectedIcon === icon && {
								backgroundColor: selectedColor,
							},
						]}
						onPress={() => {
							onIconChange(icon);
							onToggleIconPicker();
						}}
					>
						<Ionicons
							name={icon as any}
							size={24}
							color={selectedIcon === icon ? 'white' : selectedColor}
						/>
					</RectButton>
				))}
			</View>
		)}
	</View>
);

const styles = StyleSheet.create({
	label: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	colorPickerContainer: {
		marginBottom: 10,
	},
	colorButton: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		marginBottom: 8,
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
		justifyContent: 'space-between',
		marginTop: 2,
		paddingRight: 10,
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
	iconPickerContainer: {
		marginBottom: 10,
	},
	iconButton: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		marginBottom: 8,
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
		gap: 8,
		marginTop: 2,
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
