import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
} from 'react-native';

interface AmountPresetsProps {
	presets: readonly number[];
	selectedAmount: string;
	onPresetSelect: (amount: string) => void;
	showCustom: boolean;
	onToggleCustom: () => void;
	onCustomAmountChange?: (amount: string) => void;
	customPlaceholder?: string;
}

export const AmountPresets: React.FC<AmountPresetsProps> = ({
	presets,
	selectedAmount,
	onPresetSelect,
	showCustom,
	onToggleCustom,
	onCustomAmountChange,
	customPlaceholder = 'e.g., 1500',
}) => {
	const isCustomSelected =
		showCustom ||
		(!presets.some((p) => p.toString() === selectedAmount) &&
			selectedAmount !== '');

	return (
		<View>
			<View style={styles.presetsContainer}>
				{presets.map((amountValue) => (
					<TouchableOpacity
						key={amountValue}
						style={[
							styles.preset,
							selectedAmount === amountValue.toString() &&
								styles.selectedPreset,
						]}
						onPress={() => onPresetSelect(amountValue.toString())}
					>
						<Text
							style={[
								styles.presetText,
								selectedAmount === amountValue.toString() &&
									styles.selectedPresetText,
							]}
						>
							${amountValue}
						</Text>
					</TouchableOpacity>
				))}
				<TouchableOpacity
					style={[styles.preset, isCustomSelected && styles.selectedPreset]}
					onPress={onToggleCustom}
				>
					<Text
						style={[
							styles.presetText,
							isCustomSelected && styles.selectedPresetText,
						]}
					>
						Custom
					</Text>
				</TouchableOpacity>
			</View>

			{showCustom && onCustomAmountChange && (
				<View style={styles.customInputContainer}>
					<Text style={styles.inputLabel}>Enter custom amount</Text>
					<TextInput
						style={styles.textInput}
						value={selectedAmount}
						onChangeText={onCustomAmountChange}
						placeholder={customPlaceholder}
						keyboardType="decimal-pad"
						placeholderTextColor="#999"
					/>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	presetsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 12,
	},
	preset: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	selectedPreset: {
		borderColor: '#00a2ff',
		backgroundColor: '#f0f9ff',
	},
	presetText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#212121',
	},
	selectedPresetText: {
		color: '#00a2ff',
		fontWeight: '600',
	},
	customInputContainer: {
		marginTop: 10,
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	textInput: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 12,
		fontSize: 16,
		color: '#0a0a0a',
		backgroundColor: '#ffffff',
	},
});
