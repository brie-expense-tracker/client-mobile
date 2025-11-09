import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RectButton } from 'react-native-gesture-handler';
import CustomSlidingModal from './CustomSlidingModal';
import { normalizeIconName } from '../../../../src/constants/uiConstants';
import { DateField } from '../../../../src/components/DateField';

type ColorOption = {
	base: string;
	pastel: string;
	dark: string;
};

type GoalFormData = {
	name: string;
	target: string;
	deadline: string;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
	categories: string[];
};

type GoalFormModalProps = {
	isVisible: boolean;
	onClose: () => void;
	title: string;
	icon: keyof typeof Ionicons.glyphMap;
	formData: GoalFormData;
	onFormDataChange: (data: GoalFormData) => void;
	onSubmit: () => void;
	submitButtonText: string;
	targetPresets: number[];
	showCustomTarget: boolean;
	onToggleCustomTarget: () => void;
	showColorPicker: boolean;
	onToggleColorPicker: () => void;
	showIconPicker: boolean;
	onToggleIconPicker: () => void;
	onDateChange: (date: string) => void;
	goalIcons: (keyof typeof Ionicons.glyphMap)[];
	colorPalette: Record<string, ColorOption>;
	secondaryActionButton?: {
		text: string;
		onPress: () => void;
		style: 'destructive' | 'secondary';
	};
};

const GoalFormModal: React.FC<GoalFormModalProps> = ({
	isVisible,
	onClose,
	title,
	icon,
	formData,
	onFormDataChange,
	onSubmit,
	submitButtonText,
	targetPresets,
	showCustomTarget,
	onToggleCustomTarget,
	showColorPicker,
	onToggleColorPicker,
	showIconPicker,
	onToggleIconPicker,
	onDateChange,
	goalIcons,
	colorPalette,
	secondaryActionButton,
}) => {
	const ColorPicker = () => (
		<View style={styles.colorPickerContainer}>
			<Text style={styles.label}>Choose Color</Text>
			<RectButton style={styles.colorButton} onPress={onToggleColorPicker}>
				<View style={styles.colorButtonContent}>
					<View
						style={[styles.colorPreview, { backgroundColor: formData.color }]}
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
									onFormDataChange({ ...formData, color: colors.base });
									onToggleColorPicker();
								}}
							>
								<View
									style={[styles.colorSquare, { backgroundColor: colors.base }]}
								>
									{formData.color === colors.base && (
										<View style={styles.selectedIndicator}>
											<Ionicons name="checkmark" size={20} color="#FFF" />
										</View>
									)}
								</View>
							</RectButton>
							<RectButton
								style={styles.colorOptionContainer}
								onPress={() => {
									onFormDataChange({ ...formData, color: colors.pastel });
									onToggleColorPicker();
								}}
							>
								<View
									style={[
										styles.colorSquare,
										{ backgroundColor: colors.pastel },
									]}
								>
									{formData.color === colors.pastel && (
										<View style={styles.selectedIndicator}>
											<Ionicons name="checkmark" size={20} color="#000" />
										</View>
									)}
								</View>
							</RectButton>
							<RectButton
								style={styles.colorOptionContainer}
								onPress={() => {
									onFormDataChange({ ...formData, color: colors.dark });
									onToggleColorPicker();
								}}
							>
								<View
									style={[styles.colorSquare, { backgroundColor: colors.dark }]}
								>
									{formData.color === colors.dark && (
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

	const IconPicker = () => (
		<View style={styles.iconPickerContainer}>
			<Text style={styles.label}>Choose Icon</Text>
			<RectButton style={styles.iconButton} onPress={onToggleIconPicker}>
				<View style={styles.iconButtonContent}>
					<View
						style={[
							styles.iconPreview,
							{ backgroundColor: formData.color + '20' },
						]}
					>
						<Ionicons
							name={normalizeIconName(formData.icon || 'flag-outline')}
							size={20}
							color={formData.color}
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
					{goalIcons.map((icon) => (
						<RectButton
							key={icon}
							style={[
								styles.iconOption,
								formData.icon === icon && {
									backgroundColor: formData.color,
								},
							]}
							onPress={() => {
								onFormDataChange({ ...formData, icon });
								onToggleIconPicker();
							}}
						>
							<Ionicons
								name={icon}
								size={24}
								color={formData.icon === icon ? 'white' : formData.color}
							/>
						</RectButton>
					))}
				</View>
			)}
		</View>
	);

	const DatePicker = () => (
		<View style={styles.datePickerContainer}>
			<DateField
				value={formData.deadline}
				onChange={(isoDate) => {
					onDateChange(isoDate);
					onFormDataChange({ ...formData, deadline: isoDate });
				}}
				title="Target Date"
				placeholder="Select date"
				minDate={new Date().toISOString().split('T')[0]} // Today or later
			/>
		</View>
	);

	return (
		<CustomSlidingModal
			isVisible={isVisible}
			onClose={onClose}
			title={title}
			icon={icon}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={{ flex: 1 }}
			>
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{
						paddingBottom: 24,
					}}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.formGroup}>
						<Text style={styles.label}>Goal Name</Text>
						<TextInput
							style={styles.input}
							value={formData.name}
							onChangeText={(text) =>
								onFormDataChange({ ...formData, name: text })
							}
							placeholder="e.g., Emergency Fund"
							placeholderTextColor="#9E9E9E"
							autoComplete="off"
							autoCorrect={false}
						/>
					</View>

					<View style={styles.formGroup}>
						<Text style={styles.label}>Target Amount</Text>
						<Text style={styles.targetSubtext}>
							Set your target amount for this goal
						</Text>

						{/* Quick Target Presets */}
						<View style={styles.targetPresetsContainer}>
							{targetPresets.map((amount) => (
								<RectButton
									key={amount}
									style={[
										styles.targetPreset,
										formData.target === amount.toString() &&
											styles.selectedTargetPreset,
									]}
									onPress={() => {
										onFormDataChange({
											...formData,
											target: amount.toString(),
										});
										onToggleCustomTarget();
									}}
								>
									<Text
										style={[
											styles.targetPresetText,
											formData.target === amount.toString() &&
												styles.selectedTargetPresetText,
										]}
									>
										${amount}
									</Text>
								</RectButton>
							))}
							<RectButton
								style={[
									styles.targetPreset,
									showCustomTarget && styles.selectedTargetPreset,
								]}
								onPress={onToggleCustomTarget}
							>
								<Text
									style={[
										styles.targetPresetText,
										showCustomTarget && styles.selectedTargetPresetText,
									]}
								>
									Custom
								</Text>
							</RectButton>
						</View>

						{/* Custom Amount Input */}
						{showCustomTarget && (
							<View style={styles.customInputContainer}>
								<Text style={styles.inputLabel}>Enter custom amount</Text>
								<TextInput
									style={styles.input}
									value={formData.target}
									onChangeText={(text) =>
										onFormDataChange({ ...formData, target: text })
									}
									placeholder="e.g., 10000"
									keyboardType="numeric"
									placeholderTextColor="#9E9E9E"
									autoComplete="off"
								/>
							</View>
						)}
					</View>

					<DatePicker />
					<IconPicker />
					<ColorPicker />

					<View style={styles.buttonContainer}>
						<RectButton
							style={[styles.actionButton, { backgroundColor: formData.color }]}
							onPress={onSubmit}
						>
							<Text style={styles.actionButtonText}>{submitButtonText}</Text>
						</RectButton>

						{secondaryActionButton && (
							<RectButton
								style={[
									styles.secondaryButton,
									secondaryActionButton.style === 'destructive' &&
										styles.destructiveButton,
								]}
								onPress={secondaryActionButton.onPress}
							>
								<Text
									style={[
										styles.secondaryButtonText,
										secondaryActionButton.style === 'destructive' &&
											styles.destructiveButtonText,
									]}
								>
									{secondaryActionButton.text}
								</Text>
							</RectButton>
						)}
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</CustomSlidingModal>
	);
};

const styles = StyleSheet.create({
	formGroup: {
		marginBottom: 20,
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	targetSubtext: {
		fontSize: 12,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	input: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		color: '#212121',
	},
	targetPresetsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 12,
	},
	targetPreset: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	selectedTargetPreset: {
		borderColor: '#00a2ff',
		backgroundColor: '#f0f9ff',
	},
	targetPresetText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#212121',
	},
	selectedTargetPresetText: {
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
	datePickerContainer: {
		marginBottom: 20,
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
	buttonContainer: {
		marginTop: 8,
	},
	actionButton: {
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 8,
	},
	actionButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	secondaryButton: {
		backgroundColor: '#ffffff',
		borderColor: '#E0E0E0',
		borderWidth: 1,
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 12,
	},
	destructiveButton: {
		borderColor: '#E53935',
	},
	secondaryButtonText: {
		color: '#757575',
		fontSize: 16,
		fontWeight: '600',
	},
	destructiveButtonText: {
		color: '#E53935',
	},
});

export default GoalFormModal;
