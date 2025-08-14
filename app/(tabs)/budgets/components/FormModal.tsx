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
import { RectButton } from 'react-native-gesture-handler';
import CustomSlidingModal from './CustomSlidingModal';

type FormField = {
	id: string;
	label: string;
	placeholder?: string;
	value: string;
	onChangeText: (text: string) => void;
	type?: 'text' | 'numeric';
	subtext?: string;
	presets?: number[];
	showCustom?: boolean;
	onCustomToggle?: () => void;
	customValue?: string;
	onCustomChange?: (text: string) => void;
};

type FormModalProps = {
	isVisible: boolean;
	onClose: () => void;
	title: string;
	icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
	fields: FormField[];
	actionButton: {
		text: string;
		onPress: () => void;
		color: string;
	};
	secondaryActionButton?: {
		text: string;
		onPress: () => void;
		style: 'destructive' | 'secondary';
	};
	children?: React.ReactNode;
};

const FormModal: React.FC<FormModalProps> = ({
	isVisible,
	onClose,
	title,
	icon,
	fields,
	actionButton,
	secondaryActionButton,
	children,
}) => {
	const renderField = (field: FormField) => {
		return (
			<View key={field.id} style={styles.formGroup}>
				<Text style={styles.label}>{field.label}</Text>
				{field.subtext && <Text style={styles.subtext}>{field.subtext}</Text>}

				{field.presets ? (
					<>
						{/* Preset Buttons */}
						<View style={styles.presetsContainer}>
							{field.presets.map((preset) => (
								<RectButton
									key={preset}
									style={[
										styles.preset,
										field.value === preset.toString() && styles.selectedPreset,
									]}
									onPress={() => field.onChangeText(preset.toString())}
								>
									<Text
										style={[
											styles.presetText,
											field.value === preset.toString() &&
												styles.selectedPresetText,
										]}
									>
										${preset}
									</Text>
								</RectButton>
							))}

							{/* Custom Button */}
							<RectButton
								style={[
									styles.preset,
									field.showCustom && styles.selectedPreset,
								]}
								onPress={field.onCustomToggle}
							>
								<Text
									style={[
										styles.presetText,
										field.showCustom && styles.selectedPresetText,
									]}
								>
									Custom
								</Text>
							</RectButton>
						</View>

						{/* Custom Input */}
						{field.showCustom && (
							<View style={styles.customInputContainer}>
								<Text style={styles.inputLabel}>Enter custom amount</Text>
								<TextInput
									style={styles.input}
									value={field.customValue || ''}
									onChangeText={field.onCustomChange}
									placeholder="e.g., 1000"
									keyboardType="numeric"
									placeholderTextColor="#9E9E9E"
									autoComplete="off"
								/>
							</View>
						)}
					</>
				) : (
					<TextInput
						style={styles.input}
						value={field.value}
						onChangeText={field.onChangeText}
						placeholder={field.placeholder}
						placeholderTextColor="#9E9E9E"
						autoComplete="off"
						autoCorrect={false}
						keyboardType={field.type === 'numeric' ? 'numeric' : 'default'}
					/>
				)}
			</View>
		);
	};

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
					{fields.map(renderField)}
					{children}

					<View style={styles.buttonContainer}>
						<RectButton
							style={[
								styles.actionButton,
								{ backgroundColor: actionButton.color },
							]}
							onPress={actionButton.onPress}
						>
							<Text style={styles.actionButtonText}>{actionButton.text}</Text>
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
	subtext: {
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

export default FormModal;
