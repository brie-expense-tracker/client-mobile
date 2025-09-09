import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dynamicTextStyle } from '../../../../src/utils/accessibility';

interface ReflectionNotesInputProps {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
}

export function ReflectionNotesInput({
	value,
	onChange,
	disabled = false,
}: ReflectionNotesInputProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [tempValue, setTempValue] = useState(value);

	const handleSave = () => {
		onChange(tempValue);
		setIsEditing(false);
	};

	const handleCancel = () => {
		setTempValue(value);
		setIsEditing(false);
	};

	const handleStartEdit = () => {
		if (!disabled) {
			setTempValue(value);
			setIsEditing(true);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={[styles.title, dynamicTextStyle]}>Reflection Notes</Text>
			<Text style={[styles.subtitle, dynamicTextStyle]}>
				Any additional thoughts or insights about your week?
			</Text>

			{isEditing ? (
				<View style={styles.editingContainer}>
					<TextInput
						style={[styles.textInput, dynamicTextStyle]}
						value={tempValue}
						onChangeText={setTempValue}
						placeholder="Share your thoughts, insights, or goals for next week..."
						placeholderTextColor="#999"
						multiline
						numberOfLines={4}
						textAlignVertical="top"
						editable={!disabled}
						accessibilityLabel="Reflection notes input"
						accessibilityHint="Enter your thoughts and insights about the week"
					/>
					<View style={styles.buttonContainer}>
						<TouchableOpacity
							style={[styles.button, styles.cancelButton]}
							onPress={handleCancel}
							disabled={disabled}
							accessibilityRole="button"
							accessibilityLabel="Cancel editing"
						>
							<Text style={styles.cancelButtonText}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.button, styles.saveButton]}
							onPress={handleSave}
							disabled={disabled}
							accessibilityRole="button"
							accessibilityLabel="Save reflection notes"
						>
							<Text style={styles.saveButtonText}>Save</Text>
						</TouchableOpacity>
					</View>
				</View>
			) : (
				<TouchableOpacity
					style={styles.displayContainer}
					onPress={handleStartEdit}
					disabled={disabled}
					accessibilityRole="button"
					accessibilityLabel="Edit reflection notes"
					accessibilityHint="Double tap to edit your reflection notes"
				>
					{value ? (
						<Text style={[styles.displayText, dynamicTextStyle]}>{value}</Text>
					) : (
						<View style={styles.placeholderContainer}>
							<Ionicons name="document-text-outline" size={24} color="#ccc" />
							<Text style={[styles.placeholderText, dynamicTextStyle]}>
								Tap to add your reflection notes
							</Text>
						</View>
					)}
					{!disabled && <Ionicons name="pencil" size={16} color="#00a2ff" />}
				</TouchableOpacity>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 20,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: '#666',
		marginBottom: 16,
	},
	editingContainer: {
		gap: 12,
	},
	textInput: {
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		color: '#1a1a1a',
		backgroundColor: '#fff',
		minHeight: 100,
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 12,
	},
	button: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 6,
	},
	cancelButton: {
		backgroundColor: '#f5f5f5',
	},
	cancelButtonText: {
		color: '#666',
		fontSize: 14,
		fontWeight: '500',
	},
	saveButton: {
		backgroundColor: '#00a2ff',
	},
	saveButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '500',
	},
	displayContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		padding: 16,
		backgroundColor: '#f8f9fa',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		minHeight: 80,
	},
	displayText: {
		flex: 1,
		fontSize: 16,
		color: '#1a1a1a',
		lineHeight: 22,
	},
	placeholderContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	placeholderText: {
		fontSize: 16,
		color: '#999',
		fontStyle: 'italic',
	},
});

export default ReflectionNotesInput;
